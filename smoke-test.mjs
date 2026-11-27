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

const mine=await request(classroom+'/activity-gate',{open:true,revision:(await request(classroom)).navRevision},key);
assert.ok(mine.activityOpen);
assert.equal((await request(classroom+'/expression',expression)).studentNumber,sample.studentNumber);
assert.deepEqual(Object.keys(sample).sort(),['student','studentNumber']);
const called = await request(classroom+'/draw',{work:2},key);
assert.equal(called.sample.studentNumber,sample.studentNumber);
const checkCallout = student => request(classroom+'/my-callout',{student});
assert.deepEqual((await checkCallout(answer.student)).callout,{work:2,expression:expression.expression});
assert.equal((await checkCallout(crypto.randomUUID())).callout,null);
await request(classroom+'/activity-gate',{open:false,revision:mine.navRevision},key);
assert.equal((await checkCallout(answer.student)).callout.work,2);
await request(classroom+'/draw',{clear:true},key);
assert.equal((await checkCallout(answer.student)).callout,null);
await request(classroom+'/draw',{work:1},key);
assert.equal((await checkCallout(answer.student)).callout.work,1);
await request(classroom,{phase:3},key);
assert.equal((await checkCallout(answer.student)).callout,null);
console.log('PASS: private student callout, saved answer, pause persistence, and clearing');
const firstPhase=await request(classroom,{phase:4},key);
assert.equal(firstPhase.activityOpen,false);
const initial={student:answer.student,findings:['字有大有小','线条有粗有细','笔画有断有连'],feelings:['杂乱'],ownFeeling:'',ownFinding:'',impression:'初看比较乱，笔画有断有连。'};
await request(classroom+'/first-impression',initial,undefined,409);
await request(classroom+'/activity-gate',{open:true,revision:firstPhase.navRevision},key,409);
const sharedObservation='初感受：乱。\n乱在哪儿？字有大有小、线条有粗有细、笔画有断有连。';
await request(classroom+'/shared-observation',{observation:sharedObservation},undefined,403);
await request(classroom+'/shared-observation',{observation:sharedObservation,first:sharedObservation+'\n我还感受到：教师个人感受'},key);
const publicRoom=await request(classroom);
assert.equal(publicRoom.sharedObservation,sharedObservation);
assert.ok(!JSON.stringify(publicRoom).includes('教师个人感受'));
await request(classroom+'/activity-gate',{open:true,revision:firstPhase.navRevision},key);
await request(classroom+'/first-impression',{...initial,findings:[],feelings:[],ownFeeling:'心里有些沉重',impression:'我还感受到：心里有些沉重'});
await request(classroom+'/first-impression',initial);
const firstDraw=(await request(classroom+'/draw-first',{},key)).sample;
assert.deepEqual(Object.keys(firstDraw).sort(),['student','studentNumber']);
assert.equal((await checkCallout(initial.student)).callout.expression,initial.impression);
assert.equal((await checkCallout(crypto.randomUUID())).callout,null);
await request(classroom,{phase:5},key);
const reviewPhase=await request(classroom,{phase:6},key);
const review={student:answer.student,review:'了解背景后，我更能理解这些涂改所表达的感情。',reason:''};
assert.equal(reviewPhase.activityOpen,true);
const reviewLive=reviewPhase;
await request(classroom+'/review-impression',review);
await request(classroom+'/compare-review',{},key,409);
await request(classroom+'/review-impression',{...review,student:crypto.randomUUID()});
await request(classroom+'/activity-gate',{open:false,revision:reviewLive.navRevision},key);
await request(classroom+'/review-impression',review,undefined,409);
assert.deepEqual((await request(classroom+'/compare-review',{},key)).sample,{studentNumber:1,first:initial.impression,sharedObservation,review:review.review});
assert.equal((await request(classroom+'/compare-review',{previous:1},key)).sample,null);
const practice=await request(classroom,{phase:7},key);
const practiceOpen=await request(classroom+'/activity-gate',{open:true,revision:practice.navRevision},key);
const participants=[crypto.randomUUID(),crypto.randomUUID()];
for(const [work,student] of participants.entries())await request(classroom+'/practice',{student,work,lens:'',observation:'观察',feeling:'感受',expression:'赏评'+work});
const firstPractice=(await request(classroom+'/practice-show',{},key)).sample;
assert.ok(firstPractice.studentNumber>0);
assert.equal((await checkCallout(participants[firstPractice.work])).callout.expression,firstPractice.expression);
assert.equal((await checkCallout(participants[1-firstPractice.work])).callout,null);
const nextPractice=(await request(classroom+'/practice-show',{previous:firstPractice.id},key)).sample;
assert.notEqual(nextPractice.id,firstPractice.id);
assert.equal((await checkCallout(participants[firstPractice.work])).callout,null);
assert.equal((await checkCallout(participants[nextPractice.work])).callout.practice,true);
assert.equal((await request(classroom+'/previous-page',{revision:practiceOpen.navRevision},key)).phase,6);
console.log('PASS: locked initial and review stages, authorized submission, paired draw after pause');
