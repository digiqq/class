import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { DatabaseSync } from 'node:sqlite';
import { createReadStream, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import worker from './dist/server/index.js';

const origin = new URL(process.env.CLASSROOM_ORIGIN).origin;
const port = Number(process.env.CLASSROOM_PORT ?? 3080);
const db = new DatabaseSync(process.env.CLASSROOM_DATABASE ?? './classroom.sqlite');
db.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON');

const migrations = new URL('./drizzle/', import.meta.url);
db.exec('BEGIN IMMEDIATE');
try {
  db.exec('CREATE TABLE IF NOT EXISTS classroom_schema_migrations (name TEXT PRIMARY KEY)');
  const hasMigration = db.prepare('SELECT 1 FROM classroom_schema_migrations WHERE name = ?');
  const recordMigration = db.prepare('INSERT INTO classroom_schema_migrations VALUES (?)');
  for (const name of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) {
    if (hasMigration.get(name)) continue;
    db.exec(readFileSync(new URL(name, migrations), 'utf8'));
    recordMigration.run(name);
  }
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}

const databaseBinding = {
  prepare(sql) {
    const statement = db.prepare(sql);
    return {
      bind(...values) {
        return {
          first: () => statement.get(...values) ?? null,
          all: () => ({ results: statement.all(...values) }),
          run: () => ({ meta: { changes: statement.run(...values).changes } }),
        };
      },
    };
  },
};

const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.webp':'image/webp', '.mp4':'video/mp4' };
async function staticResponse(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.writeHead(405).end();
  const path = pathname === '/' || pathname === '/zhangfa' ? '/index.html' : pathname;
  if (!/^\/(?:(?:assets|course)\/)?(?:[a-z0-9_-]+\/)*[a-z0-9_.-]+$/i.test(path) ||
      (path.slice(1).includes('/') && !/^\/(assets|course)\//.test(path))) return res.writeHead(404).end();
  const type = mime[extname(path).toLowerCase()];
  if (!type) return res.writeHead(404).end();
  const file = new URL('./dist' + path, import.meta.url);
  let stat;
  try { stat = statSync(file); } catch (e) { if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return res.writeHead(404).end(); throw e; }
  if (!stat.isFile()) return res.writeHead(404).end();
  const size = stat.size;
  const headers = {'Content-Type':type,'Content-Length':size,'Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'};
  let start=0, end=size-1, status=200;
  if (type === 'video/mp4') {
    headers['Accept-Ranges']='bytes';
    const [,a,b] = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/) || [];
    if (a || b) {
      start = a ? Number(a) : Math.max(0,size-Number(b));
      end = a && b ? Math.min(end,Number(b)) : end;
      if (start>end) return res.writeHead(416,{'Content-Range':'bytes */'+size}).end();
      status=206; headers['Content-Range']=`bytes ${start}-${end}/${size}`;
      headers['Content-Length']=end-start+1;
    }
  }
  res.writeHead(status,headers);
  if (req.method === 'HEAD' || size===0) return res.end();
  await pipeline(createReadStream(file,{start,end}),res);
}

createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url, origin);
    if (!incoming.url.startsWith('/') || url.origin !== origin) {
      outgoing.writeHead(400).end();
      return;
    }
    if (!url.pathname.startsWith('/api/')) return await staticResponse(incoming,outgoing,url.pathname);
    const method = incoming.method;
    const options = { method, headers: incoming.headers };
    if (method !== 'GET' && method !== 'HEAD') {
      const chunks = [];
      let length = 0;
      for await (const chunk of incoming) {
        length += chunk.length;
        if (length > 64 * 1024) {
          outgoing.writeHead(413, { Connection: 'close' }).end();
          return;
        }
        chunks.push(chunk);
      }
      options.body = Buffer.concat(chunks);
    }
    const response = await worker.fetch(new Request(url, options), { DB: databaseBinding });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) await pipeline(Readable.fromWeb(response.body), outgoing);
    else outgoing.end();
  } catch (error) {
    if (!outgoing.headersSent) outgoing.writeHead(500);
    outgoing.end();
    console.error(error.message);
  }
}).listen(port, '127.0.0.1');
