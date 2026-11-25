const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store'}});
const allowedObservations=['有行有列','有行无列','直线式行款','曲线式行款','字距平均','行距不等'];
const allowedFeelings=['整齐','有秩序','舒展','疏朗','紧凑','错落','有变化'];
const validList=(list,allowed)=>Array.isArray(list)&&list.length<=allowed.length&&new Set(list).size===list.length&&list.every(v=>allowed.includes(v));
const lantingVersions=['feng','yu','chu'];
const lantingEvidence=['笔画的粗细','字形的宽窄','字形的宽窄','字的倾斜方向','线条的轻重','转折的样子','纸色与痕迹'];
const lantingFeelings=['有力量','轻盈','舒展','紧凑','轻快','沉稳','柔和','清晰','古朴','斑驳'];
const lantingResponse=row=>({id:row.id,version:row.version,evidence:JSON.parse(row.evidence),feelings:JSON.parse(row.feelings),ownEvidence:row.own_evidence||'',ownFeeling:row.own_feeling||''});
const state=(phase,courseStep,lantingRound,navRevision)=>({phase,courseStep,lantingRound,navRevision});
const scripts=['zhuan','li','kai','xing','cao'];
const previousLantingRound=round=>round>=4?2:1;
const penFigures=[
 {id:1,name:'篆书',count:5,answer:2},
 {id:3,name:'隶书',count:5,answer:1},
 {id:2,name:'楷书',count:14,answer:5},
 {id:4,name:'行书',count:6,answer:3},
 {id:5,name:'草书',count:3,answer:4}
];
const structureKey=['C','A','B','E','D'];
const expiry=12*60*60*1000;
async function hash(s){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),v=>v.toString(16).padStart(2,'0')).join('')}
async function api(req,env,url){
 if(!env.DB)return json({error:'课堂服务暂不可用，请稍后重试。'},503);
 if(req.method==='POST'&&req.headers.get('Origin')!==url.origin)return json({error:'请从课堂网页操作。'},403);
 if(url.pathname==='/api/room'&&req.method==='POST'){
  let body;try{body=await req.json()}catch{return json({error:'请求格式错误。'},400)}
  const courseStep=body?.course===true?1:0, introStage=courseStep?-1:8;
  await env.DB.prepare('DELETE FROM zhangfa_rooms WHERE created_at < ?').bind(Date.now()-expiry).run();
  const key=crypto.randomUUID()+crypto.randomUUID(), digest=await hash(key);
  for(let i=0;i<5;i++){
   const code=String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000);
   const r=await env.DB.prepare('INSERT OR IGNORE INTO zhangfa_rooms(code,teacher_key,created_at,course_step,intro_stage) VALUES(?,?,?,?,?)').bind(code,digest,Date.now(),courseStep,introStage).run();
   if(r.meta.changes)return json({code,key,...state(0,courseStep,1,0),introStage});
  }
  return json({error:'开课繁忙，请重试。'},503);
 }
 const m=url.pathname.match(/^\/api\/room\/(\d{6})(?:\/(expression|draw|my-callout|shared-observation|first-impression|draw-first|review-impression|draw-review|compare-review|practice|practice-list|practice-show|course-step|structure|structure-stats|lanting-stage|lanting-expression|lanting-mine|lanting-draw|lanting-compare|previous-page|activity-gate|lanting-return|pen-observation|pen-draw|pen-match(?:-answer|-advance|-count|-stats|-draw)?|structure-draw|intro-stage|script-gate|script-submit|script-stats))?$/);if(!m)return json({error:'未找到此功能。'},404);
 const room=await env.DB.prepare('SELECT phase,teacher_key,created_at,course_step,lanting_round,nav_revision,pen_stage,intro_stage,script_open,activity_open,shared_observation,teacher_first_impression FROM zhangfa_rooms WHERE code=?').bind(m[1]).first();
 if(!room||Date.now()-room.created_at>=expiry)return json({error:'课堂码无效或已过期，请向老师确认。'},404);
 const action=m[2], teacherKey=req.headers.get('Authorization')?.match(/^Bearer ([\da-f-]{72})$/)?.[1];
 if(['activity-gate','lanting-return'].includes(action)&&req.method==='POST'){
  if(!teacherKey||await hash(teacherKey)!==room.teacher_key)return json({error:'请由开课教师操作。'},403);
  let body;try{body=await req.json()}catch{return json({error:'请求格式错误。'},400)}
  if(body?.revision!==room.nav_revision)return json({error:'课堂已切换，请重试。'},409);
  const returning=action==='lanting-return';
  if(returning?room.course_step<2:((room.course_step!==3&&![2,4,6,7].includes(room.phase))||typeof body.open!=='boolean'))return json({error:'此环节不能执行这项操作。'},409);
  const step=returning?1:room.course_step,phase=returning?0:room.phase,round=returning?4:room.lanting_round,open=!returning&&body.open;
  if(open&&phase===4&&!room.teacher_first_impression)return json({error:'请先提交教师的初感受总结。'},409);
  const saved=await env.DB.prepare('UPDATE zhangfa_rooms SET course_step=?,phase=?,lanting_round=?,activity_open=?,nav_revision=nav_revision+1 WHERE code=? AND nav_revision=?').bind(step,phase,round,Number(open),m[1],room.nav_revision).run();
  return saved.meta.changes?json({...state(phase,step,round,room.nav_revision+1),introStage:room.intro_stage,activityOpen:open}):json({error:'课堂已切换，请重试。'},409);
 }
 if(action==='previous-page'&&req.method==='POST'){
  if(!teacherKey||await hash(teacherKey)!==room.teacher_key)return json({error:'只有开课教师可以返回上一页。'},403);
  let body;try{body=await req.json()}catch{return json({error:'请求格式错误。'},400)}
  if(body?.revision!==room.nav_revision)return json({error:'课堂环节已变更，请稍后重试。'},409);
  let step=room.course_step, phase=room.phase, round=room.lanting_round,intro=room.intro_stage;
  if(step===1&&intro===3)intro=1;
  else if(step===1&&intro<8&&intro>0)intro--;
  else if(step===1&&round>1)round=previousLantingRound(round);
  else if(step===1&&intro===8)intro=7;
  else if(step===2){step=1;round=4}
  else if(step===3)step=2;
  else if(step===4&&phase===1){step=3;phase=0}
  else if(phase===7)phase=6;
  else if(phase===4)phase=3;
  else if(phase>0)phase--;
  else return json({error:'已经在第一页。'},409);
  const result=await env.DB.prepare('UPDATE zhangfa_rooms SET phase=?,course_step=?,lanting_round=?,intro_stage=?,script_open=0,activity_open=?,nav_revision=nav_revision+1 WHERE code=? AND nav_revision=?')
   .bind(phase,step,round,intro,0,m[1],room.nav_revision).run();
  return result.meta.changes?json({...state(phase,step,round,room.nav_revision+1),introStage:intro,scriptOpen:false,activityOpen:false}):json({error:'课堂环节已变更，请稍后重试。'},409);
 }
 if(['intro-stage','script-gate','script-submit','script-stats'].includes(action)&&req.method==='POST'){
  const db=env.DB,code=m[1];
  if(room.course_step!==1||room.intro_stage>=8)return json({error:'当前不在导入或辨书体环节。'},409);
  let body;try{body=await req.json()}catch{return json({error:'请求格式错误。'},400)}
  if(action==='script-submit'){
   const {student,answers}=body||{};
   if(room.intro_stage!==7||room.script_open!==1)return json({error:'老师还没有开放连线，或已暂停作答。'},409);
   if(typeof student!=='string'||!/^[-a-f0-9]{36}$/.test(student)||!Array.isArray(answers)||answers.length!==5||new Set(answers).size!==5||!answers.every(value=>scripts.includes(value)))return json({error:'请为五幅作品各连一个不同的书体名称。'},400);
   const saved=await db.prepare(`INSERT INTO zhangfa_script_answers(room_code,student_key,answers)
    SELECT code,?,? FROM zhangfa_rooms WHERE code=? AND course_step=1 AND intro_stage=7 AND script_open=1
    ON CONFLICT(room_code,student_key) DO UPDATE SET answers=excluded.answers`).bind(await hash(student),JSON.stringify(answers),code).run();
   return saved.meta.changes?json({ok:true}):json({error:'连线已经结束。'},409);
  }
  if(!teacherKey||await hash(teacherKey)!==room.teacher_key)return json({error:'请由开课教师操作。'},403);
  if(action==='script-gate'){
   if(room.intro_stage!==7||typeof body?.open!=='boolean'||body.revision!==room.nav_revision)return json({error:'课堂状态已变更，请稍后重试。'},409);
   const changed=await db.prepare('UPDATE zhangfa_rooms SET script_open=?,nav_revision=nav_revision+1 WHERE code=? AND course_step=1 AND intro_stage=7 AND nav_revision=?')
     .bind(Number(body.open),code,room.nav_revision).run();
   return changed.meta.changes?json({...state(room.phase,room.course_step,room.lanting_round,room.nav_revision+1),introStage:7,scriptOpen:body.open}):json({error:'课堂状态已变更，请稍后重试。'},409);
  }
  if(action==='intro-stage'){
   const stage=body?.stage;
   if((stage!==room.intro_stage+1&&!(room.intro_stage===2&&stage===4))||stage>8)return json({error:'课堂已经切换，请刷新。'},409);
   const changed=await db.prepare('UPDATE zhangfa_rooms SET intro_stage=?,script_open=0,activity_open=0,nav_revision=nav_revision+1 WHERE code=? AND course_step=1 AND nav_revision=?').bind(stage,code,room.nav_revision).run();
   return changed.meta.changes?json({...state(room.phase,room.course_step,room.lanting_round,room.nav_revision+1),introStage:stage,scriptOpen:false}):json({error:'课堂已经切换，请刷新。'},409);
  }
  if(room.intro_stage!==7)return json({error:'请先进入辨书体。'},409);
  const rows=(await db.prepare('SELECT answers FROM zhangfa_script_answers WHERE room_code=?').bind(code).all()).results;
  const wrong=scripts.map(()=>0);let perfect=0;
  for(const {answers} of rows){
   const values=JSON.parse(answers);
   values.forEach((value,i)=>{if(value!==scripts[i])wrong[i]++});
   if(values.every((value,i)=>value===scripts[i]))perfect++;
  }
  return json({total:rows.length,perfect,wrong});
 }
 if(action?.startsWith('lanting-')&&req.method==='POST'){
  if(room.course_step!==1||room.intro_stage!==8)return json({error:'《兰亭序》活动已经结束。'},409);
  let body;try{body=await req.json()}catch{return json({error:'请求格式错误。'},400)}
  if(action==='lanting-mine'){
   if(room.lanting_round<4)return json({error:'请先进入“三幅回看”。'},409);
   const student=body?.student;
   if(typeof student!=='string'||!/^[-a-f0-9]{36}$/.test(student))return json({error:'无法确认本设备的课堂身份。'},400);
   const result=await env.DB.prepare('SELECT id,version,evidence,feelings,own_evidence,own_feeling FROM lanting_expressions WHERE room_code=? AND student_key=?')
    .bind(m[1],await hash(student)).all();
   return json({entries:result.results.map(lantingResponse)});
  }
  if(action==='lanting-expression')return json({error:'本环节请看大屏幕，口头交流。'},409);
  if(!teacherKey||await hash(teacherKey)!==room.teacher_key)return json({error:'只有开课教师可以进行这项操作。'},403);
  if(action==='lanting-stage'){
   const round=body?.round;
   const next={1:2,2:4,3:4}[room.lanting_round];
   if(next===undefined||round!==next)return json({error:'环节已变更，请刷新后重试。'},409);
   const result=await env.DB.prepare('UPDATE zhangfa_rooms SET lanting_round=?,nav_revision=nav_revision+1 WHERE code=? AND course_step=1 AND lanting_round=? AND nav_revision=?').bind(round,m[1],room.lanting_round,room.nav_revision).run();
   return result.meta.changes?json(state(room.phase,room.course_step,round,room.nav_revision+1)):json({error:'环节已变更，请刷新后重试。'},409);
  }
  if(action==='lanting-draw'){
   if(room.lanting_round<4)return json({error:'请在“三幅回看”环节展示。'},409);
   if(!lantingVersions.includes(body?.version))return json({error:'请先选择一个版本。'},400);
   const previous=Number.isSafeInteger(body.previous)?body.previous:0;
   const row=await env.DB.prepare('SELECT id,version,evidence,feelings,own_evidence,own_feeling FROM lanting_expressions WHERE room_code=? AND version=? ORDER BY id=? ASC,RANDOM() LIMIT 1').bind(m[1],body.version,previous).first();
   return json({sample:row?lantingResponse(row):null});
  }
  if(room.lanting_round<4)return json({error:'请先进入“三幅回看”。'},409);
  const preferred=Number.isSafeInteger(body?.preferred)?body.preferred:0;
  const seen=body?.seen??[];
  if(!Array.isArray(seen)||seen.length>1000||!seen.every(id=>Number.isSafeInteger(id)&&id>0))
   return json({error:'展示记录格式有误，请重新打开此页。'},400);
  const result=await env.DB.prepare(`SELECT id,version,evidence,feelings,own_evidence,own_feeling FROM lanting_expressions WHERE room_code=? AND student_key=(
    SELECT student_key FROM lanting_expressions WHERE room_code=? GROUP BY student_key
    HAVING min(id) NOT IN (SELECT value FROM json_each(?))
    ORDER BY count(*) DESC,max(id=?) DESC,RANDOM() LIMIT 1)`).bind(m[1],m[1],JSON.stringify(seen),preferred).all();
  const samples=result.results.map(lantingResponse);
  return json({samples,sampleId:samples.length?Math.min(...samples.map(item=>item.id)):null});
 }
 if(action==='course-step'&&req.method==='POST'){
  if(!teacherKey||await hash(teacherKey)!==room.teacher_key)return json({error:'只有开课教师可以切换环节。'},403);
  let step;try{step=(await req.json())?.step}catch{return json({error:'请求格式错误。'},400)}
  if(room.phase!==0||room.course_step<1||(room.course_step===1&&(room.lanting_round<4||room.intro_stage!==8))||step!==room.course_step+1||step>4)return json({error:'课堂环节已变更，请刷新后重试。'},409);
  const phase=step===4?1:0;
  const r=await env.DB.prepare('UPDATE zhangfa_rooms SET course_step=?,phase=?,activity_open=?,nav_revision=nav_revision+1 WHERE code=? AND course_step=? AND phase=0 AND nav_revision=?').bind(step,phase,0,m[1],room.course_step,room.nav_revision).run();
  return r.meta.changes?json({...state(phase,step,room.lanting_round,room.nav_revision+1),activityOpen:false}):json({error:'课堂环节已变更，请刷新后重试。'},409);
 }
 if(action?.startsWith('pen-match')){
  if(room.course_step!==2)return json({error:'请先进入“用笔之美”。'},409);
  if(action==='pen-match'&&req.method==='GET')return json({stage:room.pen_stage});
  if(req.method!=='POST')return json({error:'操作不受支持。'},405);
  let body;try{body=await req.json()}catch{return json({error:'请求格式错误。'},400)}
  const db=env.DB,code=m[1];
  if(action==='pen-match-answer'){
   if(room.pen_stage!==1)return json({error:'当前未开放学生作答。'},409);
   const {student,entries}=body||{};
   if(typeof student!=='string'||!/^[-0-9a-f]{36}$/.test(student)||!Array.isArray(entries)||entries.length!==penFigures.length||
    new Set(entries.map(entry=>entry?.glyph)).size!==penFigures.length||!entries.every(entry=>{
     const f=penFigures.find(x=>x.id===entry?.glyph);
     return f&&(entry.stroke===undefined||(Number.isInteger(entry.stroke)&&entry.stroke>=0&&entry.stroke<=f.count))&&Number.isInteger(entry.answer)&&entry.answer>=1&&entry.answer<=5;
    }))return json({error:'请为五个例字各选一条教材表述。'},400);
   const clean=entries.map(({glyph,stroke=0,answer})=>({glyph,stroke,answer}));
   const written=await db.prepare('INSERT INTO zhangfa_pen_matches(room_code,student_key,entries) SELECT code,?,? FROM zhangfa_rooms WHERE code=? AND course_step=2 AND pen_stage=1 ON CONFLICT(room_code,student_key) DO UPDATE SET entries=excluded.entries').bind(await hash(student),JSON.stringify(clean),code).run();
   return written.meta.changes?json({ok:true}):json({error:'老师已结束快配。'},409);
  }
  const key=req.headers.get('Authorization')?.match(/^Bearer ([0-9a-f-]{72})$/)?.[1];
  if(!key||await hash(key)!==room.teacher_key)return json({error:'请由开课教师操作。'},403);
  if(action==='pen-match-advance'){
   const stage=body?.stage;
   if(!({0:[1],1:[2,3],2:[],3:[1,2]}[room.pen_stage]||[]).includes(stage))return json({error:'课堂环节已切换。'},409);
   const result=await db.prepare('UPDATE zhangfa_rooms SET pen_stage=? WHERE code=? AND course_step=2 AND pen_stage=?').bind(stage,code,room.pen_stage).run();
   return result.meta.changes?json({stage}):json({error:'课堂环节已切换。'},409);
  }
  if(action==='pen-match-count'){
   const row=await db.prepare('SELECT COUNT(*) AS total FROM zhangfa_pen_matches WHERE room_code=?').bind(code).first();
   return json({total:row.total});
  }
  if(action==='pen-match-stats'){
   if(room.pen_stage!==2)return json({error:'请先公布答案。'},409);
   const {results}=await db.prepare('SELECT entries FROM zhangfa_pen_matches WHERE room_code=?').bind(code).all();
   const counts=penFigures.map(f=>({glyph:f.id,correct:0,choices:[0,0,0,0,0]}));
   let perfect=0;
   for(const row of results){
    const entries=JSON.parse(row.entries);
    let score=0;
    penFigures.forEach((f,i)=>{
     const chosen=entries.find(x=>x.glyph===f.id)?.answer;
     if(chosen>=1&&chosen<=5)counts[i].choices[chosen-1]++;
     if(chosen===f.answer){counts[i].correct++;score++}
    });
    if(score===penFigures.length)perfect++;
   }
   return json({total:results.length,perfect,counts});
  }
  if(action==='pen-match-draw'){
   if(room.pen_stage!==2)return json({error:'请先揭晓教材配对。'},409);
   const previous=Number.isSafeInteger(body?.previous)?body.previous:0;
   const row=await db.prepare('SELECT id,entries FROM zhangfa_pen_matches WHERE room_code=? ORDER BY id=? ASC,RANDOM() LIMIT 1').bind(code,previous).first();
   const entries=row?JSON.parse(row.entries):[];
   return json({sample:entries.length?{id:row.id,...entries[Math.floor(Math.random()*entries.length)]}:null});
  }
  return json({error:'未找到此功能。'},404);
 }
 if((action==='pen-observation'||action==='pen-draw')&&req.method==='POST'){
  if(room.course_step!==2)return json({error:'请先进入“用笔之美”。'},409);
  let body;try{body=await req.json()}catch{return json({error:'请求格式错误。'},400)}
  const glyph=body?.glyph,counts=[0,5,14,5,6,3];
  const penWords=['轻盈','厚重','舒展','有力','圆润','爽利'];
  if(action==='pen-draw'){
   if(!teacherKey||await hash(teacherKey)!==room.teacher_key)return json({error:'只有开课教师可以展示同学的观察。'},403);
   if(!Number.isInteger(glyph)||!counts[glyph])return json({error:'请先选择一个例字。'},400);
   const previous=Number.isSafeInteger(body.previous)?body.previous:0;
   const row=await env.DB.prepare('SELECT id,glyph,stroke,feelings,note FROM zhangfa_pen_observations WHERE room_code=? AND glyph=? ORDER BY id=? ASC,RANDOM() LIMIT 1')
    .bind(m[1],glyph,previous).first();
   return json({sample:row?{...row,feelings:JSON.parse(row.feelings)}:null});
  }
  const {student,stroke,feelings,note}=body||{};
  if(typeof student!=='string'||!/^[-a-f0-9]{36}$/.test(student)||!Number.isInteger(glyph)||!counts[glyph]||
    !Number.isInteger(stroke)||stroke<1||stroke>counts[glyph]||!validList(feelings,penWords)||
    typeof note!=='string'||note.length>240||(!feelings.length&&!note.trim()))
   return json({error:'请选一笔，并记录你的发现或感受。'},400);
  const result=await env.DB.prepare(`INSERT INTO zhangfa_pen_observations(room_code,student_key,glyph,stroke,feelings,note)
   SELECT code,?,?,?,?,? FROM zhangfa_rooms WHERE code=? AND course_step=2
   ON CONFLICT(room_code,student_key,glyph,stroke) DO UPDATE SET feelings=excluded.feelings,note=excluded.note`)
   .bind(await hash(student),glyph,stroke,JSON.stringify(feelings),note.trim(),m[1]).run();
  return result.meta.changes?json({ok:true}):json({error:'老师已切换环节，本次观察没有提交。'},409);
 }
 if(action==='structure'&&req.method==='POST'){
  if(room.course_step!==3||!room.activity_open)return json({error:'结字活动当前未开放提交。'},409);
  let body;try{body=await req.json()}catch{return json({error:'请求格式错误。'},400)}
  const {student,answers}=body||{};
  if(typeof student!=='string'||!/^[-a-f0-9]{36}$/.test(student)||!Array.isArray(answers)||answers.length!==5||!answers.every(a=>['A','B','C','D','E'].includes(a)))return json({error:'请选择五个例字的描述。'},400);
  const result=await env.DB.prepare(`INSERT INTO zhangfa_structure_answers (room_code,student_key,answers)
    SELECT code,?,? FROM zhangfa_rooms WHERE code=? AND course_step=3 AND activity_open=1
    ON CONFLICT(room_code,student_key) DO UPDATE SET answers=excluded.answers`)
    .bind(await hash(student),JSON.stringify(answers),m[1]).run();
  return result.meta.changes?json({ok:true}):json({error:'结字活动当前未开放提交。'},409);
 }
 if(action==='structure-stats'&&req.method==='POST'){
  if(!teacherKey||await hash(teacherKey)!==room.teacher_key)return json({error:'只有开课教师可以查看课堂汇总。'},403);
  if(room.course_step!==3)return json({error:'请先进入“结字之美”。'},409);
  const rows=await env.DB.prepare('SELECT answers FROM zhangfa_structure_answers WHERE room_code=?').bind(m[1]).all();
  const key=structureKey, wrong=[0,0,0,0,0];
  let perfect=0;
  for(const row of rows.results){const answers=JSON.parse(row.answers);let all=true;key.forEach((a,i)=>{if(answers[i]!==a){wrong[i]++;all=false}});if(all)perfect++}
  return json({total:rows.results.length,perfect,wrong});
 }
 if(action==='structure-draw'&&req.method==='POST'){
  if(!teacherKey||await hash(teacherKey)!==room.teacher_key)return json({error:'只有开课教师可以展示同学的判断。'},403);
  if(room.course_step!==3)return json({error:'请先进入“结字之美”。'},409);
  let body;try{body=await req.json()}catch{return json({error:'请求格式错误。'},400)}
  const previous=Number.isSafeInteger(body?.previous)?body.previous:0;
  const row=await env.DB.prepare('SELECT rowid AS id,answers FROM zhangfa_structure_answers WHERE room_code=? ORDER BY rowid=? ASC,RANDOM() LIMIT 1')
   .bind(m[1],previous).first();
  return json({sample:row?{id:row.id,answers:JSON.parse(row.answers),expected:structureKey}:null});
 }
 if(action==='expression'&&req.method==='POST'){
  if(room.phase!==2||room.activity_open!==1)return json({error:'老师已切换环节，本次表达没有提交到课堂。'},409);
  let body;try{body=await req.json()}catch{return json({error:'请求格式错误。'},400)}
  const {student,work,observation,feelings,ownFeeling,expression}=body||{};
  if(typeof student!=='string'||!/^[-a-f0-9]{36}$/.test(student)||!Number.isInteger(work)||work<0||work>4||
     !validList(observation,allowedObservations)||!observation.length||!validList(feelings,allowedFeelings)||
     typeof ownFeeling!=='string'||ownFeeling.length>500||(!feelings.length&&!ownFeeling.trim())||
     typeof expression!=='string'||!expression.trim()||expression.length>1000)return json({error:'请检查观察和感受，自填感受最多 500 字。'},400);
  const studentKey=await hash(student);
  const saved=await env.DB.prepare(`INSERT INTO zhangfa_expressions(room_code,student_key,work,observation,feelings,own_feeling,expression)
   SELECT code,?,?,?,?,?,? FROM zhangfa_rooms WHERE code=? AND phase=2 AND activity_open=1
   ON CONFLICT(room_code,student_key,work) DO UPDATE SET observation=excluded.observation,feelings=excluded.feelings,own_feeling=excluded.own_feeling,expression=excluded.expression`)
   .bind(studentKey,work,JSON.stringify(observation),JSON.stringify(feelings),ownFeeling,expression,m[1]).run();
  if(!saved.meta.changes)return json({error:'老师已切换环节，本次表达没有提交到课堂。'},409);
  const row=await env.DB.prepare(`WITH roster AS (
    SELECT student_key, ROW_NUMBER() OVER (ORDER BY MIN(rowid)) AS student_no
    FROM zhangfa_expressions WHERE room_code=? GROUP BY student_key
   ) SELECT student_no FROM roster WHERE student_key=?`).bind(m[1],studentKey).first();
  return json({ok:true,studentNumber:row.student_no});
 }
 if(action==='practice'&&req.method==='POST'){
  if(room.phase!==7||room.activity_open!==1)return json({error:'请等待老师开启艺术实践。'},409);
  let body;try{body=await req.json()}catch{return json({error:'请求格式错误。'},400)}
  const {student,work,lens,observation,feeling,expression}=body||{};
  if(typeof student!=='string'||!/^[-a-f0-9]{36}$/.test(student)||![0,1].includes(work)||
    !['','用笔','结字','章法'].includes(lens)||![observation,feeling,expression].every(v=>typeof v==='string'&&v.trim())||
    observation.length>2400||feeling.length>2000||expression.length>3000)return json({error:'请补全你的观察、感受和表达。'},400);
  const r=await env.DB.prepare(`INSERT INTO zhangfa_practice(room_code,student_key,work,lens,observation,feeling,expression)
   SELECT code,?,?,?,?,?,? FROM zhangfa_rooms WHERE code=? AND phase=7 AND activity_open=1
   ON CONFLICT(room_code,student_key) DO UPDATE SET work=excluded.work,lens=excluded.lens,observation=excluded.observation,feeling=excluded.feeling,expression=excluded.expression`)
   .bind(await hash(student),work,lens,observation,feeling,expression,m[1]).run();
  return r.meta.changes?json({ok:true}):json({error:'当前环节未开放提交。'},409);
 }
 if((action==='practice-list'||action==='practice-show')&&req.method==='POST'){
  if(!teacherKey||await hash(teacherKey)!==room.teacher_key)return json({error:'只有开课教师可以查看实践表达。'},403);
  if(room.phase!==7)return json({error:'请先进入艺术实践。'},409);
  if(action==='practice-list'){
   const result=await env.DB.prepare('SELECT id,work FROM zhangfa_practice WHERE room_code=? ORDER BY id').bind(m[1]).all();
   return json({entries:result.results});
  }
  let body;try{body=await req.json()}catch{return json({error:'请求格式错误。'},400)}
  const work=body?.work;if(work!==0&&work!==1)return json({error:'请先选择一幅作品。'},400);
  const prev=Number.isSafeInteger(body?.previous)?body.previous:0;
  const row=await env.DB.prepare('SELECT id,work,lens,observation,feeling,expression FROM zhangfa_practice WHERE room_code=? AND work=? ORDER BY id=? ASC,RANDOM() LIMIT 1')
   .bind(m[1],work,prev).first();
  return json({sample:row||null});
 }
 if(action==='review-impression'&&req.method==='POST'){
  if(room.phase!==6||room.activity_open!==1)return json({error:'当前环节未开放再赏感受提交。'},409);
  let body;try{body=await req.json()}catch{return json({error:'请求格式错误。'},400)}
  const {student,review,reason}=body||{};
  if(typeof student!=='string'||!/^[-a-f0-9]{36}$/.test(student)||typeof review!=='string'||
     !review.trim()||review.length>6500||typeof reason!=='string'||reason.length>1500)
   return json({error:'请检查再赏感受和对比原因，原因最多 1500 字。'},400);
  const saved=await env.DB.prepare(`INSERT INTO zhangfa_review_impressions(room_code,student_key,review,reason)
   SELECT code,?,?,? FROM zhangfa_rooms WHERE code=? AND phase=6 AND activity_open=1
   ON CONFLICT(room_code,student_key) DO UPDATE SET review=excluded.review,reason=excluded.reason`)
   .bind(await hash(student),review,reason,m[1]).run();
  return saved.meta.changes?json({ok:true}):json({error:'老师已切换环节，感受没有提交到课堂。'},409);
 }
 if(action==='shared-observation'&&req.method==='POST'){
  if(!teacherKey||await hash(teacherKey)!==room.teacher_key)return json({error:'只有开课教师可以发布补充观察。'},403);
  if(room.phase!==4)return json({error:'请在初感受环节发布。'},409);
  let body;try{body=await req.json()}catch{return json({error:'请求格式错误。'},400)}
  if(typeof body?.observation!=='string'||body.observation.length>500)return json({error:'补充观察最多 500 字。'},400);
  if(body.first!==undefined&&(typeof body.first!=='string'||!body.first.trim()||body.first.length>1300))return json({error:'初感受记录格式不正确。'},400);
  const observation=body.observation.trim();
  const result=await env.DB.prepare('UPDATE zhangfa_rooms SET shared_observation=?,teacher_first_impression=COALESCE(?,teacher_first_impression) WHERE code=? AND phase=4').bind(observation,body.first?.trim()??null,m[1]).run();
  return result.meta.changes?json({sharedObservation:observation}):json({error:'课堂环节已切换。'},409);
 }
 if((action==='draw-review'||action==='compare-review')&&req.method==='POST'){
  if(!teacherKey||await hash(teacherKey)!==room.teacher_key)return json({error:'只有开课教师可以抽看课堂表达。'},403);
  if(room.phase!==6||room.activity_open)return json({error:'请先暂停学生作答，再抽学号。'},409);
  let body;try{body=await req.json()}catch{return json({error:'请求格式错误。'},400)}
  const previous=Number.isInteger(body?.previous)?body.previous:0;
  const row=await env.DB.prepare(`WITH roster AS (
     SELECT student_key, impression, ROW_NUMBER() OVER (ORDER BY rowid) AS student_no
     FROM zhangfa_first_impressions WHERE room_code=?
   )
   SELECT f.student_no, f.impression AS first_impression, r.review
   FROM roster f JOIN zhangfa_review_impressions r ON r.student_key=f.student_key
   WHERE r.room_code=? AND f.student_no<>? ORDER BY RANDOM() LIMIT 1`)
   .bind(m[1],m[1],previous).first();
  return json({sample:row?{studentNumber:row.student_no,first:row.first_impression,sharedObservation:room.shared_observation,review:row.review}:null});
 }
 if(action==='first-impression'&&req.method==='POST'){
  if(room.phase!==4||room.activity_open!==1)return json({error:'当前环节未开放初印象提交。'},409);
  let body;try{body=await req.json()}catch{return json({error:'请求格式错误。'},400)}
  const {student,findings,feelings,ownFinding,ownFeeling,impression}=body||{};
  const options=['修改较多','字有大有小','线条有粗有细','笔画有断有连','排列有变化','有的地方密，有的地方疏','笔迹有轻有重'];
  const moods=['平静','沉重','急切','激动','复杂','杂乱','悲痛','有力量'];
  if(typeof student!=='string'||!/^[-a-f0-9]{36}$/.test(student)||!validList(findings,options)||!validList(feelings,moods)||
     ![ownFinding,ownFeeling].every(v=>typeof v==='string'&&v.length<=500)||
     (!feelings.length&&!ownFeeling.trim())||
     typeof impression!=='string'||!impression.trim()||impression.length>1300)return json({error:'请写下至少一种感受，自填内容每栏最多 500 字。'},400);
  const saved=await env.DB.prepare(`INSERT INTO zhangfa_first_impressions(room_code,student_key,findings,feelings,own_finding,own_feeling,impression)
   SELECT code,?,?,?,?,?,? FROM zhangfa_rooms WHERE code=? AND phase=4 AND activity_open=1
   ON CONFLICT(room_code,student_key) DO UPDATE SET findings=excluded.findings,feelings=excluded.feelings,own_finding=excluded.own_finding,own_feeling=excluded.own_feeling,impression=excluded.impression`)
   .bind(await hash(student),JSON.stringify(findings),JSON.stringify(feelings),ownFinding,ownFeeling,impression,m[1]).run();
  return saved.meta.changes?json({ok:true}):json({error:'老师已切换环节，初印象没有提交到课堂。'},409);
 }
 if(action==='draw-first'&&req.method==='POST'){
  if(!teacherKey||await hash(teacherKey)!==room.teacher_key)return json({error:'只有开课教师可以抽看初印象。'},403);
  if(room.phase!==4)return json({error:'请在“初发现 · 初感受”环节抽看。'},409);
  let previous;try{({previous}=await req.json())}catch{return json({error:'请求格式错误。'},400)}
  const row=await env.DB.prepare('SELECT student_key,findings,feelings,own_finding,own_feeling,impression FROM zhangfa_first_impressions WHERE room_code=? ORDER BY student_key=? ASC, RANDOM() LIMIT 1')
   .bind(m[1],typeof previous==='string'?previous:'').first();
  return json({sample:row?{student:row.student_key,findings:JSON.parse(row.findings),feelings:JSON.parse(row.feelings),ownFinding:row.own_finding,ownFeeling:row.own_feeling,impression:row.impression}:null});
 }
 if(action==='my-callout'&&req.method==='POST'){
  if(room.phase!==2)return json({callout:null});
  let body;try{body=await req.json()}catch{return json({error:'请求格式错误。'},400)}
  if(typeof body?.student!=='string'||!/^[-a-f0-9]{36}$/.test(body.student))return json({error:'课堂身份无效。'},400);
  const selected=await env.DB.prepare(`SELECT e.work,e.expression
    FROM zhangfa_callouts c JOIN zhangfa_expressions e
     ON e.room_code=c.room_code AND e.student_key=c.student_key AND e.work=c.work
    WHERE c.room_code=? AND c.student_key=?`).bind(m[1],await hash(body.student)).first();
  return json({callout:selected||null});
 }
 if(action==='draw'&&req.method==='POST'){
  if(!teacherKey||await hash(teacherKey)!==room.teacher_key)return json({error:'只有开课教师可以抽看表达。'},403);
  if(room.phase!==2)return json({error:'请在“选一选 · 说感受”环节抽看。'},409);
  let body;try{body=await req.json()}catch{return json({error:'请求格式错误。'},400)}
  if(body?.clear===true){
   await env.DB.prepare('DELETE FROM zhangfa_callouts WHERE room_code=?').bind(m[1]).run();
   return json({sample:null});
  }
  const work=body?.work,previous=typeof body?.previous==='string'?body.previous:'';
  if(!Number.isInteger(work)||work<0||work>4)return json({error:'请先选择要展示的作品。'},400);
  const row=await env.DB.prepare(`WITH roster AS (
    SELECT student_key, ROW_NUMBER() OVER (ORDER BY MIN(rowid)) AS student_no
    FROM zhangfa_expressions WHERE room_code=? GROUP BY student_key
   )
   SELECT e.student_key,student_no
    FROM zhangfa_expressions e JOIN roster r ON e.student_key=r.student_key WHERE e.room_code=? AND work=?
    ORDER BY e.student_key=? ASC,RANDOM() LIMIT 1`).bind(m[1],m[1],work,previous).first();
  if(row)await env.DB.prepare(`INSERT INTO zhangfa_callouts(room_code,student_key,work)
   SELECT code,?,? FROM zhangfa_rooms WHERE code=? AND phase=2
   ON CONFLICT(room_code) DO UPDATE SET student_key=excluded.student_key,work=excluded.work`).bind(row.student_key,work,m[1]).run();
  else await env.DB.prepare('DELETE FROM zhangfa_callouts WHERE room_code=?').bind(m[1]).run();
  return json({sample:row?{student:row.student_key,studentNumber:row.student_no}:null});
 }
 if(action)return json({error:'请求方法不支持。'},405);
 if(req.method==='GET')return json({...state(room.phase,room.course_step,room.lanting_round,room.nav_revision),introStage:room.intro_stage,scriptOpen:room.script_open===1,activityOpen:room.activity_open===1,sharedObservation:room.shared_observation});
 if(req.method!=='POST')return json({error:'请求方法不支持。'},405);
 const key=req.headers.get('Authorization')?.match(/^Bearer ([\da-f-]{72})$/)?.[1];
 if(!key||await hash(key)!==room.teacher_key)return json({error:'只有开课教师可以切换环节。'},403);
 let phase;try{({phase}=await req.json())}catch{return json({error:'请求格式错误。'},400)}
 if((room.course_step>0&&room.course_step<4)||!Number.isInteger(phase)||phase>7||phase!==room.phase+1)return json({error:'课堂环节已变更，请刷新后重试。'},409);
 const r=await env.DB.prepare('UPDATE zhangfa_rooms SET phase=?,activity_open=?,nav_revision=nav_revision+1 WHERE code=? AND phase=? AND nav_revision=?').bind(phase,0,m[1],room.phase,room.nav_revision).run();
 return r.meta.changes?json({...state(phase,room.course_step,room.lanting_round,room.nav_revision+1),activityOpen:false}):json({error:'课堂环节已变更，请刷新后重试。'},409);
}
export default {async fetch(req,env){
 const url=new URL(req.url);
 try{return await api(req,env,url)}
 catch(e){console.error(e.message);return json({error:'暂时无法连接课堂，请稍后重试。'},503)}
}};
