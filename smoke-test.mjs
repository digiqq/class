import assert from 'node:assert/strict';

const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:3080').origin;
async function request(path, body, key, expectedStatus = 200) {
  const options = body === undefined ? undefined : {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      ...(key ? { Authorization: 'Bearer ' + key } : {}),
    },
    body: JSON.stringify(body),
  };
  const response = await fetch(origin + '/api/room' + path, options);
  const data = await response.json();
  assert.equal(response.status, expectedStatus, JSON.stringify(data));
  return data;
}

assert.equal((await fetch(origin + '/?join=1')).status, 200);
const video = await fetch(origin + '/assets/jizhi-story.mp4', { headers: { Range: 'bytes=0-63' } });
assert.equal(video.status, 206);
assert.equal((await video.arrayBuffer()).byteLength, 64);

let state = await request('', { course: true });
const { code, key } = state;
const classroom = '/' + code;
assert.equal((await request(classroom)).introStage, state.introStage);
for (let stage = state.introStage + 1; stage <= 7; stage++) {
  state = await request(classroom + '/intro-stage', { stage, revision: state.navRevision }, key);
}
const answer = { student: crypto.randomUUID(), answers: ['zhuan', 'li', 'kai', 'xing', 'cao'] };
await request(classroom + '/script-submit', answer, undefined, 409);
state = await request(classroom + '/script-gate', { open: true, revision: state.navRevision }, key);
assert.equal((await request(classroom)).scriptOpen, true);
assert.equal((await request(classroom + '/script-submit', answer)).ok, true);
assert.equal((await request(classroom + '/script-stats', {}, key)).total, 1);
await request(classroom + '/script-gate', { open: false, revision: state.navRevision }, key);
await request(classroom + '/script-submit', answer, undefined, 409);
console.log('PASS: student entry, video range, classroom creation, gated submissions, and teacher results');

state = await request(classroom);
state = await request(classroom + '/intro-stage', { stage: 8 }, key);
state = await request(classroom + '/lanting-stage', { round: 2 }, key);
state = await request(classroom + '/lanting-stage', { round: 4 }, key);
state = await request(classroom + '/course-step', { step: 2 }, key);
const pen = (suffix, body, teacher = false, http = 200) => request(classroom+'/pen-match'+suffix,body,teacher?key:undefined,http);
const entries = [1,2,3,4,5].map(glyph=>({glyph,answer:1}));
const batch = {student:answer.student,entries};
await pen('-advance',{stage:1},true);
await pen('-answer',batch);
await pen('-advance',{stage:3},true);
assert.equal((await pen('')).stage,3);
await pen('-answer',batch,false,409);
await pen('-advance',{stage:1},true);
await pen('-answer',batch);
await pen('-advance',{stage:3},true);
await pen('-advance',{stage:2},true);
await pen('-answer',batch,false,409);
const stats=await pen('-stats',{},true);
assert.equal(stats.total,1);
assert.ok(stats.counts.every(group=>group.choices[0]===1));
console.log('PASS: pause blocks submissions; resume preserves classroom data; answer reveal and answer distribution');

state = await request(classroom + '/course-step', { step: 3 }, key);
assert.equal(state.activityOpen,false);
const structure={student:answer.student,answers:['C','A','B','E','D']};
await request(classroom+'/structure',structure,undefined,409);
state=await request(classroom+'/activity-gate',{open:true,revision:state.navRevision},key);
await request(classroom+'/structure',structure);
state=await request(classroom+'/activity-gate',{open:false,revision:state.navRevision},key);
assert.equal((await request(classroom)).activityOpen,false);
await request(classroom+'/structure',structure,undefined,409);
state=await request(classroom+'/activity-gate',{open:true,revision:state.navRevision},key);
await request(classroom+'/structure',structure);
assert.deepEqual(await request(classroom+'/structure-stats',{},key),{total:1,perfect:1,wrong:[0,0,0,0,0]});
console.log('PASS: structure exercise starts closed, pause blocks submissions, resume and accuracy work');

const chapter = await request(classroom + '/course-step', { step: 4 }, key);
assert.equal(chapter.courseStep,4);
assert.equal(chapter.phase,1);
const follower = await request(classroom);
assert.equal(follower.courseStep,4);
assert.equal(follower.phase,1);
console.log('PASS: teacher advances from structure to composition; student sees the new chapter');

const delivered = await (await fetch(origin+'/course/jiezi/app.js')).text();
assert.ok(delivered.includes('下一步：章法之美'));
assert.equal((await fetch(origin+'/server/index.js')).status,404);
assert.equal((await fetch(origin+'/course/lanting/assets/yu-whole.jpg')).status,200);
console.log('PASS: server delivers updated classroom assets without exposing backend source');

const phase2=await request(classroom,{phase:2},key);
const expression={student:answer.student,work:2,observation:['有行有列'],feelings:['整齐'],ownFeeling:'',expression:'我看见字排列得很整齐。'};
await request(classroom+'/expression',expression,undefined,409);
const opened=await request(classroom+'/activity-gate',{open:true,revision:phase2.navRevision},key);
await request(classroom+'/expression',expression);
await request(classroom+'/expression',{...expression,work:1});
const sample=(await request(classroom+'/draw',{work:2},key)).sample;
assert.equal(sample.studentNumber,1);
assert.equal((await request(classroom+'/draw',{work:1},key)).sample.studentNumber,sample.studentNumber);
await request(classroom+'/activity-gate',{open:false,revision:opened.navRevision},key);
await request(classroom+'/expression',expression,undefined,409);
for(const name of ['feng','yu','chu']){
 const response=await fetch(origin+'/course/lanting/assets/'+name+'-whole.jpg');
 assert.equal(response.status,200);
 assert.equal(response.headers.get('content-type'),'image/jpeg');
 const bytes=new Uint8Array(await response.arrayBuffer());
 assert.deepEqual([...bytes.slice(0,3)],[255,216,255]);
}
console.log('PASS: composition controls, consistent classroom number, and three Lanting full-image downloads');
