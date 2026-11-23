import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
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

createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url, origin);
    if (!incoming.url.startsWith('/') || url.origin !== origin) {
      outgoing.writeHead(400).end();
      return;
    }
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
