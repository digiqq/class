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
