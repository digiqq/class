const phases=['课堂等候','解词义 · 明章法','选一选 · 说感受','初看《祭侄文稿》','初发现 · 初感受','了解背景','再感受','艺术实践'];
const params=new URLSearchParams(location.search);
let activeDictation=null;
function stopDictation(){if(activeDictation){const engine=activeDictation;activeDictation=null;try{engine.abort()}catch{}}}
let room=null,timer=null,busy=false,teacherWork=0,requestEpoch=0,projectedExpression=null,lastDrawn=null,projectedFirst=null,lastFirst=null,projectedReview=null,reviewComparison=false,reviewBusy=false;
const lesson=$('#lesson'), controls=$('#classroomControls'), status=$('#classroomStatus');
const fullCourse=location.pathname!=='/zhangfa';
const scannedCode=/^\d{6}$/.test(params.get('class')||'')?params.get('class'):'';
const wantsJoin=!!scannedCode||params.has('join');
const isCourseCover=fullCourse&&!wantsJoin&&!params.has('preview');
function loadRoom(){try{return JSON.parse(sessionStorage.getItem('zhangfa-classroom')||'null')}catch{return null}}
function storeRoom(){try{sessionStorage.setItem('zhangfa-classroom',JSON.stringify(room))}catch{}}
async function roomRequest(path,body,key){
 const res=await fetch(path,body===undefined?{cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})},body:JSON.stringify(body)});
 const data=await res.json();if(!res.ok)throw Object.assign(Error(data.error||'连接失败，请重试。'),{httpStatus:res.status});return data;
}
function activate(next){
 clearTimeout(timer);showStudentCallout(null);requestEpoch++;room=next;projectedExpression=null;lastDrawn=null;projectedFirst=null;lastFirst=null;projectedReview=null;reviewComparison=false;
 if(room?.role==='student'){
  try{room.student=localStorage.getItem('zhangfa-student-'+room.code)||sessionStorage.getItem('zhangfa-student-'+room.code)||room.student||crypto.randomUUID();localStorage.setItem('zhangfa-student-'+room.code,room.student)}catch{room.student=room.student||crypto.randomUUID()}
  room.draftKey='zhangfa-v3:'+room.code+':'+room.student;
 }
 try{records=JSON.parse(localStorage.getItem(room?.draftKey||'zhangfa-v3')||'{}')}catch{records={}}
 chosen=0;try{chosen=Math.max(0,Math.min(4,Number(localStorage.getItem(room?.draftKey+':work'))||0))}catch{}
 const draft=records[chosen];
 selected=[...(draft?.selected||[])];feelings=[...(draft?.feelings||[])];feeling=draft?.feeling||'';reason=draft?.reason||'';judged=!!(draft?.judged||feelings.length||feeling);finished=false;
 teacherArtOpened=!!(room?.role==='teacher'&&room.phase>=4);teacherWork=0;wordChosen=false;group=0;variant=0;guide=false;window.classroom=room;loadEmotionDraft();storeRoom();status.textContent='';drawControls();applyPhase();if(room)schedulePoll();
}
async function createClassroom(){
 if(room||busy)return;
 const button=$('#createRoom');
 busy=true;
 if(button)button.disabled=true;
 status.textContent='正在生成课堂码…';
 try{activate({...await roomRequest('/api/room',{course:fullCourse}),role:'teacher'})}
 catch(e){status.textContent=e.message;if(button)button.disabled=false}
 finally{busy=false}
}
async function joinClassroom(code){
 if(room||busy)return;
 busy=true;status.textContent='正在加入课堂…';
 try{activate({...await roomRequest('/api/room/'+code),role:'student',code})}
 catch(e){status.textContent=e.message}
 finally{busy=false}
}
const invite=()=>{const url=new URL(room.courseStep?'/':'/zhangfa',location.origin);url.searchParams.set('class',room.code);return url};
function drawControls(){
 const bar=$('#classroomBar');
 bar.classList.toggle('classroom-compact',fullCourse);
 if(!room){
  if(isCourseCover){
   controls.innerHTML='<button type="button" id="createRoom">生成课堂码</button>';
   $('#createRoom').onclick=createClassroom;
   return;
  }
  const canCreate=!fullCourse&&!wantsJoin;
  controls.innerHTML=(canCreate?'<button id="createRoom">开课</button>':'')+`<form id="joinRoom"><label for="roomCode">课堂码</label><input id="roomCode" name="code" maxlength="6" pattern="[0-9]{6}" required inputmode="numeric" placeholder="6 位数字" value="${esc(scannedCode)}"><button>加入课堂</button></form>`;
  if(canCreate)$('#createRoom').onclick=createClassroom;
  $('#joinRoom').onsubmit=e=>{e.preventDefault();joinClassroom($('#roomCode').value.trim())};
  return;
 }
 if(fullCourse){
  controls.innerHTML=room.role==='teacher'?`<button type="button" id="showJoinQr" aria-label="放大入课二维码">${classroomQrGraphic(invite())}</button><a class="cover-room-code" href="/?join=1" target="_blank" rel="noopener" aria-label="课堂码 ${esc(room.code)}，打开手动加入页面">课堂码 <strong>${esc(room.code)}</strong></a><span id="livePhase" hidden></span>`:'<span id="livePhase" hidden></span>';
  if($('#showJoinQr'))$('#showJoinQr').onclick=()=>openClassroomQr(invite(),room.code);
  return;
 }
 controls.innerHTML=`<span class="room-badge">课堂码 <strong>${esc(room.code)}</strong></span><span id="livePhase">${phases[room.phase]}</span>${room.role==='teacher'?'<button id="showJoinQr">显示课堂二维码</button>':''}<button id="leaveRoom">退出课堂</button>`;
 if($('#showJoinQr'))$('#showJoinQr').onclick=()=>openClassroomQr(invite(),room.code);
 $('#leaveRoom').onclick=()=>activate(null);
}
function schedulePoll(){
 const epoch=requestEpoch, code=room.code;
 timer=setTimeout(async()=>{try{
  const data=await roomRequest('/api/room/'+code);if(epoch!==requestEpoch)return;
  status.textContent='';
  const observationChanged=typeof data.sharedObservation==='string'&&room.sharedObservation!==data.sharedObservation;
  if(observationChanged){room.sharedObservation=data.sharedObservation;storeRoom()}
  acceptNavigation(data,room);
  if(observationChanged&&room.role==='student'){const shared=$('#sharedFirstObservation');if(shared)shared.textContent=room.sharedObservation;restoreInitialCard()}
  const current=room;
  if(current.role==='student'&&current.phase===2){
   const {callout}=await roomRequest('/api/room/'+code+'/my-callout',{student:current.student});
   if(epoch!==requestEpoch||room!==current||room.phase!==2)return;
   showStudentCallout(callout);
  }else showStudentCallout(null);
 }catch(e){if(epoch!==requestEpoch)return;status.textContent=e.message}
 if(epoch===requestEpoch)schedulePoll();
 },1800);
}
function showStudentCallout(callout){
 const panel=$('#studentCallout');
 if(!callout){panel.hidden=true;panel.replaceChildren();delete panel.dataset.work;return}
 if(!panel.hidden&&panel.dataset.work===String(callout.work)&&panel.lastElementChild?.textContent===callout.expression)return;
 panel.dataset.work=String(callout.work);
 panel.innerHTML=`<h2>你被抽到了！</h2><p>请看大屏幕上的作品 ${Number(callout.work)+1}，结合你提交的回答，说说你的发现和感受。</p><blockquote>${esc(callout.expression)}</blockquote>`;
 panel.hidden=false;
 panel.scrollIntoView({block:'nearest'});
}
function acceptNavigation(data,current){
 if(room!==current||(data.navRevision||0)<(current.navRevision||0))return;
 if(data.navRevision===current.navRevision&&data.activityOpen===current.activityOpen)return;
 projectedExpression=null;lastDrawn=null;projectedFirst=null;lastFirst=null;projectedReview=null;reviewComparison=false;
 Object.assign(current,data);if(current.phase!==2)showStudentCallout(null);storeRoom();applyPhase();
}
window.previousClassroomPage=async ()=>{
 const current=room;
 if(current?.role!=='teacher'||busy)throw Error('请由开课教师操作。');
 busy=true;
 try{
  const data=await roomRequest('/api/room/'+current.code+'/previous-page',{revision:current.navRevision||0},current.key);
  acceptNavigation(data,current);
 }finally{busy=false}
};
const previousButton='<button type="button" data-room-back>← 上一页</button>';
function bindPreviousPage(button){
 if(!button)return;
 button.onclick=async()=>{if(busy)return;button.disabled=true;try{await previousClassroomPage()}catch(e){status.textContent=e.message}finally{button.disabled=false}};
}
function forceImageStart(){imageScale=1;viewCenter={x:.5,y:.5};fitPending=false;flashWord=null;spot=-1}
function applyPhase(){
 stopDictation();
 if(renderCourseShell())return;
 if(!room){lesson.hidden=false;page=0;started=false;wordChosen=false;render();return}
 $('#livePhase').hidden=false;
 $('#livePhase').textContent=phases[room.phase];
 lesson.hidden=false;
 if(room.role==='teacher'){if(room.phase!==4||!teacherInitialState().observing)forceImageStart();renderTeacher();window.scrollTo(0,0);return}
 const phase=room.phase;
 if([2,7].includes(phase)&&!room.activityOpen){
  document.querySelector('nav').hidden=true;document.querySelector('footer').hidden=true;$('#intro').hidden=true;
  document.querySelector('h1').textContent=phases[phase];
  $('#stage').innerHTML='<div class="panel"><h2>请看大屏幕</h2><p>老师开放这个环节后，这里会自动显示活动。</p></div>';
  return;
 }
 if(phase===0||phase===1||phase===3||phase===5||(phase===4&&!room.activityOpen)){
  document.querySelector('nav').hidden=true;document.querySelector('footer').hidden=true;$('#intro').hidden=true;
  document.querySelector('h1').textContent=phase>=5?'了解背景':phase>=3?'初看《祭侄文稿》':'章法之美';
  $('#stage').innerHTML=(phase===3||phase===4)?'<div class="panel"><h2>请看大屏幕</h2><p>老师开放后再在自己的设备上记录初感受。</p></div>':phase===0?'<div class="panel"><h2>已加入课堂</h2><p>请等待老师开始课堂活动。</p></div>':phase===1?'<div class="panel"><h2>请看大屏幕</h2><p>跟着老师观察作品和排列示意。老师开启“选一选 · 说感受”后，这里会直接打开作品选择和表达页面。</p></div>':'<div class="panel"><h2>请看大屏幕</h2><p>我们一起观看《祭侄文稿》的背景视频。看完视频后，跟随老师进入“再感受”。</p></div>';
  if(phase===4||phase===5){$('#stage').insertAdjacentHTML('beforeend','<div id="reviewInitialCard" hidden></div>');restoreInitialCard()}
 }else if(phase===2){const draft=records[chosen];go(1);if(draft){selected=[...draft.selected];feelings=[...(draft.feelings||[])];feeling=draft.feeling||'';reason=draft.reason||'';judged=!!(draft.judged||feelings.length||feeling);render()}}
 else if(phase===4){if(page!==2||specialStep!==0)go(2,0);initialOpen=true;render();$('#openInitial').hidden=true;restoreInitialCard()}
 else if(phase===6){renderStudentReview()}
 else if(phase===7){renderPracticeStudent();window.scrollTo(0,0);return}
 window.scrollTo(0,0);
}
async function submitClassExpression(work,data,message,button){
 const current=room;if(!current||current.role!=='student'||button.disabled)return;
 button.disabled=true;message.textContent='正在提交本条表达…';
 try{
  const {studentNumber}=await roomRequest('/api/room/'+current.code+'/expression',{student:current.student,work,...data});
  if(room===current&&message.isConnected)message.innerHTML=`已保存这幅作品的观察。你的课堂学号：<strong>${Number(studentNumber)}</strong>。<strong class="expression-encouragement">观察有依据，表达有力量。</strong>`;
 }catch(e){if(room===current&&message.isConnected)message.textContent='已保存在本机。'+e.message+' 如仍在本环节，请再点一次“完成我的表达”。'}
 finally{button.disabled=false}
}
async function submitFirstImpression(button,message){
 const current=room;if(!current||current.role!=='student'||button.disabled)return;
 const ownFinding=firstFinding.trim(),ownFeeling=firstFeel.trim();
 if(!initialFeelings.length&&!ownFeeling){
  message.textContent='请先选择或写下一种感受。';return;
 }
 const data={student:current.student,findings:[...initialFindings],feelings:[...initialFeelings],ownFinding,ownFeeling,impression:[ownFinding&&'我还观察到：'+ownFinding,ownFeeling&&'我还感受到：'+ownFeeling].filter(Boolean).join('\n')||firstText()};
 button.disabled=true;message.textContent='正在提交初感受…';
 try{
  await roomRequest('/api/room/'+current.code+'/first-impression',data);
  if(room===current){reflectionWrite('initial',data.impression);if(message.isConnected){message.textContent='初感受已提交。';restoreInitialCard()}}
 }catch(e){if(message.isConnected)message.textContent=e.message}
 finally{button.disabled=false}
}
function firstProjection(){
 if(!projectedFirst)return '';
 const s=projectedFirst;
 return `<article class="artcard projected-expression" aria-label="匿名学生初印象"><h2>同学的初印象</h2><dl><dt>初发现</dt><dd>${esc([...s.findings,s.ownFinding].filter(Boolean).join('、'))}</dd><dt>初感受</dt><dd>${esc([...s.feelings,s.ownFeeling].filter(Boolean).join('、'))}</dd><dt>初印象</dt><dd>${esc(s.impression)}</dd></dl></article>`;
}
async function drawFirstImpression(button){
 if(button.disabled)return;
 const current=room;button.disabled=true;$('#drawFirstStatus').textContent='正在抽取…';
 try{
  const {sample}=await roomRequest('/api/room/'+current.code+'/draw-first',{previous:lastFirst},current.key);
  if(room!==current||current.phase!==4||!button.isConnected)return;
  projectedFirst=sample;lastFirst=sample?.student||null;
  $('#firstProjection').innerHTML=firstProjection();
  $('#closeFirst').hidden=!sample;
  $('#drawFirstStatus').textContent=sample?'已抽到一位同学的初印象。':'还没有收到初印象。请同学们点击“提交初感受”。';
  button.textContent=sample?'再抽一位同学':'随机展示初感受';
 }catch(e){if(button.isConnected)$('#drawFirstStatus').textContent=e.message}
 finally{button.disabled=false}
}
async function submitReviewImpression(button,message,final=false){
 const current=room;if(!current||current.role!=='student'||button.disabled||reviewBusy)return;
 const hasFeeling=detailChoices.some(choices=>choices.some(word=>{const f=feelingsByWord[word];return f?.moods.length||f?.own.trim()}))||
   (extraFinding.trim()&&(detailFeelings[3].length||detailOwn[3].trim()));
 if(!hasFeeling){message.textContent='请先记录至少一个发现和它带给你的感受。';return}
 reviewBusy=true;button.disabled=true;message.textContent='正在提交再赏感受…';
 try{
  await roomRequest('/api/room/'+current.code+'/review-impression',{student:current.student,review:reviewText(),reason:laterFeel.trim()});
  if(room===current&&message.isConnected)message.textContent=final?'已提交再赏感受和对比原因。':'已提交再赏感受，老师可以匿名抽看。';
 }catch(e){if(message.isConnected)message.textContent=e.message}
 finally{reviewBusy=false;button.disabled=false}
}
function reviewProjection(){
 if(!projectedReview)return '';
 const {review,first,reason}=projectedReview;
 if(!reviewComparison)return `<article class="artcard projected-expression"><h2>同学的再赏感受</h2><p class="preserve-lines">${esc(review)}</p></article>`;
 return `<article class="artcard projected-expression"><h2>同一位同学的两次感受</h2><div class="reflection-pair"><div><h3>初看作品</h3><p>${esc(first||'这位同学还未提交初印象。')}</p></div><div><h3>了解故事后，再赏原作</h3><p class="preserve-lines">${esc(review)}</p></div></div><p><strong>两次感受一样吗？哪一次更深刻？为什么？</strong></p>${reason?`<p class="preserve-lines">这位同学写道：${esc(reason)}</p>`:''}</article>`;
}
async function drawReviewImpression(compare){
 const current=room, left=$('#drawReview'),right=$('#compareReview'),output=$('#reviewProjection'),message=$('#drawReviewStatus');
 if(!left||!right||left.disabled)return;
 left.disabled=right.disabled=true;message.textContent=compare?'正在查找两次感受…':'正在抽取…';
 try{
  const path='/api/room/'+current.code+(compare?'/compare-review':'/draw-review');
  const {sample}=await roomRequest(path,compare?{student:projectedReview?.student}:{previous:projectedReview?.student},current.key);
  if(room!==current||current.phase!==6||!left.isConnected)return;
  if(!sample){message.textContent=compare?'还没有同学提交两次感受。':'还没有收到再赏感受。请同学们点击“提交我的再赏感受”。';return}
  projectedReview=sample;reviewComparison=compare;output.innerHTML=reviewProjection();
  message.textContent=compare?(sample.first?'已对照同一位同学的两次记录。':'这位同学尚未提交初印象，可以再抽一位。'):'已匿名抽取一位同学。';
  left.textContent='再抽一位同学';
 }catch(e){if(message.isConnected)message.textContent=e.message}
 finally{left.disabled=right.disabled=false}
}
async function drawExpression(button){
 if(busy||button.disabled)return;
 const current=room,work=teacherWork,label='作品'+(work+1);button.disabled=true;$('#drawStatus').textContent='正在抽取'+label+'的表达…';
 try{
  const {sample}=await roomRequest('/api/room/'+current.code+'/draw',{work,previous:lastDrawn},current.key);
  if(room!==current||current.phase!==2||teacherWork!==work||!button.isConnected)return;
  projectedExpression=sample;lastDrawn=sample?.student||null;
  $('#drawStatus').textContent=sample?'':label+'还没有收到表达，请同学们点击“完成我的表达”。';
  if($('#drawStudentNumber'))$('#drawStudentNumber').textContent=sample?`课堂学号：${sample.studentNumber}`:'';
 }catch(e){if(button.isConnected)$('#drawStatus').textContent=e.message}
 finally{button.disabled=false}
}
const phaseButton=(next,label)=>`<div class="class-page-actions">${room.phase>0?previousButton:''}<button class="primary" data-advance="${next}">${label} →</button></div>`;
function bindTeacherArrangement(){
 const target=$('#teacherArrangement'),buttons=[...document.querySelectorAll('[data-teacher-word]')];
 function update(focusId){
  buttons.forEach(b=>b.setAttribute('aria-pressed',String(wordChosen&&Number(b.dataset.teacherWord)===group*2+variant)));
  target.innerHTML=wordChosen?diagram():'';
  if($('#guide'))$('#guide').onclick=()=>{guide=!guide;update('guide')};
  if($('#contrast'))$('#contrast').onclick=()=>{variant=1-variant;update('contrast')};
  if(focusId)$('#'+focusId)?.focus({preventScroll:true});
 }
 buttons.forEach(b=>b.onclick=()=>{const n=Number(b.dataset.teacherWord);group=Math.floor(n/2);variant=n%2;wordChosen=true;guide=false;update()});
 update();
}
function bindActivityGate(){
 if(![2,4,6,7].includes(room.phase))return;
 const current=room, button=document.createElement('button');
 button.type='button';button.className='primary';
 button.textContent=current.activityOpen?'暂停学生端作答':'开放学生端作答';
 const container=$('#compositionGate')||$('#reflectionGate'), controls=container?[...container.querySelectorAll('button')]:[button];
 if(!container)$('#stage').prepend(button);
 for(const button of controls){
 const open=container?button.dataset.gate==='open':!current.activityOpen;
 if(container)button.disabled=open===current.activityOpen;
 button.onclick=async()=>{if(busy)return;busy=true;button.disabled=true;try{
  const data=await roomRequest('/api/room/'+current.code+'/activity-gate',{open,revision:current.navRevision},current.key);
  acceptNavigation(data,current);
 }catch(e){status.textContent=e.message}finally{busy=false;button.disabled=false}};
 }
}
function renderTeacher(){
 if(!room||room.role!=='teacher')return;
 const phase=room.phase;
 document.querySelector('nav').hidden=true;document.querySelector('footer').hidden=true;
 document.querySelector('h1').textContent=phase>=3?'赏章法 · 悟表达':'章法之美';
 $('#intro').hidden=phase>1;
 let body='';
 if(phase===0)body=phaseButton(1,'解词义 · 明章法');
 if(phase===1)body=`<div class="originals-static">${works.slice(0,5).map((w,i)=>`<figure>${art(i)}<figcaption>${w.name}</figcaption></figure>`).join('')}</div><h2 class="spaced">想一想</h2><p>借助下方示意图了解每个词代表的排列形式。</p><div class="choices teacher-word-buttons">${terms.map((t,i)=>`<button type="button" data-teacher-word="${i}" aria-pressed="false">${t}</button>`).join('')}</div><div id="teacherArrangement"></div>`+phaseButton(2,'选一选 · 说感受');
 if(phase===2)body=`<h2>选一选，说感受</h2><p>选一幅作品观察，在自己的设备上记录发现和感受。</p><div id="compositionGate" class="expression-actions"><button type="button" data-gate="open" class="primary">开放学生端作答</button><button type="button" data-gate="pause">暂停学生端作答</button></div><div class="work-strip">${works.slice(0,5).map((w,i)=>`<button class="thumb" data-project="${i}" aria-pressed="${teacherWork===i}">${art(i)}<span>${w.name}</span></button>`).join('')}</div><article class="artcard projected-art" id="projectedWork"><h3>${works[teacherWork].name}</h3>${art(teacherWork)}</article>`+`<div class="expression-actions spaced"><button id="drawExpression" class="primary">抽学号</button><span id="drawStudentNumber" aria-live="polite">${projectedExpression?'课堂学号：'+projectedExpression.studentNumber:''}</span></div><p id="drawStatus" role="status"></p>`+phaseButton(3,'赏章法 · 悟表达');
 if(phase===3)body=`<p class="sub">有这样一幅与众不同的作品，被誉为“天下第二行书”。它究竟美在哪里？我们一起来看一看。</p><button id="teacherOpen" class="primary">观看《祭侄文稿》</button><div class="class-page-actions">${previousButton}</div>`;
 if(phase===4)body=teacherInitialView();
 if(phase===5)body='<h2>了解背景</h2><div class="story-video"><video controls playsinline preload="metadata" aria-label="祭侄文稿创作背景视频" src="/assets/jizhi-story.mp4"></video></div>'+phaseButton(6,'再感受');
 if(phase===6)body=`<h2>再感受</h2><div id="reflectionGate" class="expression-actions"><button data-gate="open" class="primary">开放学生端作答</button><button data-gate="pause">暂停学生端作答</button></div><button id="drawReflectionPair" ${room.activityOpen?'disabled':''}>随机抽学号</button><p id="reflectionDrawStatus" role="status"></p><div id="reflectionPair"></div>`+phaseButton(7,'进入艺术实践');
 if(phase===7){renderPracticeTeacher();bindActivityGate();$('#stage').insertAdjacentHTML('beforeend',`<div class="class-page-actions">${previousButton}</div>`);bindPreviousPage($('[data-room-back]'));return}
 $('#stage').innerHTML=body;
 bindPreviousPage($('[data-room-back]'));
 bindActivityGate();
 if(phase===1)bindTeacherArrangement();
 if($('#drawReview'))$('#drawReview').onclick=()=>drawReviewImpression(false);
 if($('#showClassRecap')){
  const trigger=$('#showClassRecap'), recap=$('#classRecap'), next=$('[data-advance="7"]');
  next.hidden=true;
  trigger.onclick=()=>{
   recap.hidden=false;trigger.setAttribute('aria-expanded','true');trigger.hidden=true;
   next.hidden=false;next.focus({preventScroll:true});recap.scrollIntoView({block:'nearest'});
  };
 }
 if($('#compareReview'))$('#compareReview').onclick=()=>drawReviewImpression(true);
 if($('#drawFirst'))$('#drawFirst').onclick=e=>drawFirstImpression(e.currentTarget);
 if($('#closeFirst'))$('#closeFirst').onclick=()=>{projectedFirst=null;$('#firstProjection').innerHTML='';$('#closeFirst').hidden=true;$('#drawFirst').textContent='随机展示初感受';$('#drawFirstStatus').textContent=''};
 if($('#drawExpression'))$('#drawExpression').onclick=e=>drawExpression(e.currentTarget);
 document.querySelectorAll('[data-advance]').forEach(b=>b.onclick=async()=>{if(busy)return;const current=room;busy=true;b.disabled=true;try{const data=await roomRequest('/api/room/'+current.code,{phase:Number(b.dataset.advance)},current.key);acceptNavigation(data,current)}catch(e){status.textContent=e.message;b.disabled=false}finally{busy=false}});
 document.querySelectorAll('[data-project]').forEach(b=>b.onclick=async()=>{
  if(busy||$('#drawExpression')?.disabled)return;
  const next=Number(b.dataset.project),current=room;
  if(next!==teacherWork){
   busy=true;
   try{
    await roomRequest('/api/room/'+current.code+'/draw',{clear:true},current.key);
    if(room!==current||current.phase!==2)return;
    teacherWork=next;projectedExpression=null;lastDrawn=null;
   }catch(e){status.textContent=e.message;return}
   finally{busy=false}
  }
  renderTeacher();$('#projectedWork').scrollIntoView({block:'start'});
 });
 if(phase===3)$('#teacherOpen').onclick=async e=>{
  if(busy)return;
  busy=true;const button=e.currentTarget,current=room;button.disabled=true;
  try{acceptNavigation(await roomRequest('/api/room/'+current.code,{phase:4},current.key),current)}
  catch(err){status.textContent=err.message;button.disabled=false}
  finally{busy=false}
 };
 if(phase===4)bindTeacherInitial();
 if(phase===6)$("#drawReflectionPair").onclick=drawReflectionPair;
 if(phase===7)bindImage();
}
const observationSequence=['字有大有小','线条有粗有细','笔画有断有连'];
function reflectionRead(key,fallback=''){
 try{const id='manuscript:'+room.code+':'+room.role+':'+(room.student||'')+':'+key;return JSON.parse(localStorage.getItem(id)??sessionStorage.getItem(id))??fallback}catch{return fallback}
}
function reflectionWrite(key,value){
 try{localStorage.setItem('manuscript:'+room.code+':'+room.role+':'+(room.student||'')+':'+key,JSON.stringify(value))}catch{}
}
function teacherInitialState(){return reflectionRead('teacherInitial',{index:-1,observing:false,collected:[],extra:'',first:''})}
window.manuscriptTeacherCue=()=>room?.role==='teacher'&&room.phase===4?observationSequence[teacherInitialState().index]:null;
function teacherInitialView(){
 const draft=teacherInitialState();
 return `<h2>初看《祭侄文稿》</h2><article class="artcard teacher-initial-art">${specialArt()}${zoomControls()}<p class="manuscript-caption">颜真卿《祭侄文稿》</p></article>
 <div class="expression-actions"><button id="nextObservation" ${draft.index>=2||draft.observing&&!draft.collected.includes(observationSequence[draft.index])?'disabled':''}>细观察</button><button id="collectObservation" ${!draft.observing||draft.collected.includes(observationSequence[draft.index])?'disabled':''}>记发现</button></div>
 <section class="panel"><h3>我的观察</h3><p>初次观察，我感觉这幅作品比较乱，因为我看到了：</p><ul>${draft.collected.map(word=>`<li>${esc(word)}</li>`).join('')}</ul><label for="teacherExtraObservation"><strong>我还感受到</strong>（可打字或听写）</label><textarea id="teacherExtraObservation" rows="3" maxlength="500">${esc(draft.extra||'')}</textarea><p class="muted">可以打字，也可以用键盘的麦克风听写。</p><div class="right-action"><button id="generateFirst" class="primary" ${draft.collected.length!==3?'disabled':''}>提交初感受总结</button></div></section>
 ${draft.first?reflectionCard('我的初感受记录卡',draft.first)+'<p role="status">初感受已提交。</p>':''}
 <div id="reflectionGate" class="expression-actions">${draft.first?'<button data-gate="open" class="primary">开放学生端问答</button><button data-gate="pause">暂停学生端作答</button>':''}</div>
 ${draft.first?phaseButton(5,'观看背景视频'):`<div class="class-page-actions">${previousButton}</div>`}`;
}
function bindTeacherInitial(){
 bindImage(renderTeacher);
 const update=fn=>{const draft=teacherInitialState();fn(draft);reflectionWrite('teacherInitial',draft);renderTeacher()};
 $('#nextObservation').onclick=()=>update(d=>{if(d.index<2){d.index++;d.observing=true;fitPending=true}});
 $('#collectObservation').onclick=()=>update(d=>{const word=observationSequence[d.index];if(word&&!d.collected.includes(word))d.collected.push(word)});
 $('#teacherExtraObservation').oninput=e=>{
  const draft=teacherInitialState();draft.extra=e.target.value;reflectionWrite('teacherInitial',draft);
 };
 $('#generateFirst').onclick=async e=>{
  if(busy)return;
  const draft=teacherInitialState(),current=room,button=e.currentTarget,field=$('#teacherExtraObservation');
  const extra=field.value.trim();
  const observation='初感受：乱。\n乱在哪儿？'+draft.collected.join('、')+'。';
  const first=observation+(extra?'\n我还感受到：'+extra:'');
  busy=true;button.disabled=field.disabled=true;
  try{
   const response=await roomRequest('/api/room/'+current.code+'/shared-observation',{observation,first},current.key);
   if(room!==current||current.phase!==4)return;
   current.sharedObservation=response.sharedObservation;storeRoom();
   update(d=>{d.first=first});
  }catch(err){status.textContent=err.message}
  finally{busy=false;button.disabled=field.disabled=false}
 };
}
function reflectionCard(title,text){return `<section class="panel reflection-record"><h3>${esc(title)}</h3><p class="preserve-lines">${esc(text)}</p></section>`}
function sharedInitialText(saved,extra){
 return [extra,saved].filter(Boolean).join('\n');
}
function restoreInitialCard(){
 const saved=reflectionRead('initial'),hook=$('#firstSubmitStatus')||$('#reviewInitialCard');
 if(!saved||!hook)return;
 const content=reflectionCard('初感受记录卡',sharedInitialText(saved,room.sharedObservation));
 const card=$('#studentInitialCard');if(card){card.innerHTML=content;return}
 hook.insertAdjacentHTML('afterend',`<div id="studentInitialCard">${content}</div>`);
}
function renderStudentReview(){
 document.querySelector('#lesson h1').textContent='再感受';
 document.querySelector('nav').hidden=true;document.querySelector('footer').hidden=true;$('#intro').hidden=true;
 const draft=reflectionRead('reviewDraft'),saved=reflectionRead('reviewSaved'),open=room.activityOpen;
 $('#stage').innerHTML=`<section class="panel"><label for="oralReview"><strong>再感受</strong></label><textarea id="oralReview" rows="7" maxlength="6500" ${open?'':'readonly'}></textarea>
 ${open?'<div class="expression-actions"><button id="dictateReview">语音输入</button><button id="sendOralReview" class="primary">提交再感受</button></div>':''}
 <p id="oralReviewStatus" role="status">${open?'':'等待老师开放作答。'}</p><div id="savedOralReview">${saved?reflectionCard('再感受',saved):''}</div></section>`;
 $('#stage').insertAdjacentHTML('beforeend','<div id="reviewInitialCard" hidden></div>');restoreInitialCard();
 const field=$('#oralReview'), message=$('#oralReviewStatus'), current=room;field.value=draft;
 if(!open)return;
 field.oninput=()=>reflectionWrite('reviewDraft',field.value);
 const mic=$('#dictateReview'), send=$('#sendOralReview');
 let recognition=null;
 mic.onclick=()=>{
  if(recognition){recognition.stop();return}
  const Recorder=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recorder){message.textContent='当前浏览器不支持网页语音转文字。可用手机键盘的麦克风听写，或直接输入。';field.focus();return}
  const engine=new Recorder();engine.lang='zh-CN';engine.continuous=false;engine.interimResults=false;
  engine.onresult=e=>{
   if(!field.isConnected||room!==current||!current.activityOpen)return;
   const spoken=Array.from(e.results).slice(e.resultIndex).map(r=>r[0].transcript).join('');
   field.value=(field.value+(field.value?'\n':'')+spoken).slice(0,6500);field.oninput();
  };
  engine.onerror=()=>{if(message.isConnected)message.textContent='未能完成识别，可重试或使用键盘听写。'};
  engine.onend=()=>{if(activeDictation===engine)activeDictation=null;recognition=null;if(mic.isConnected){mic.textContent='语音输入';send.disabled=false}};
  try{engine.start();recognition=activeDictation=engine;mic.textContent='结束语音输入';send.disabled=true;message.textContent='正在听写…'}
  catch{message.textContent='无法启动语音输入，可使用键盘听写。'}
 };
 send.onclick=async()=>{
  const review=field.value.trim();if(!review){message.textContent='请先输入你的再感受。';return}
  send.disabled=true;
  try{
   await roomRequest('/api/room/'+current.code+'/review-impression',{student:current.student,review,reason:''});
   if(room!==current)return;
   reflectionWrite('reviewSaved',review);
   if(message.isConnected){message.textContent='再感受已提交。';$('#savedOralReview').innerHTML=reflectionCard('再感受',review)}
  }catch(e){if(message.isConnected)message.textContent=e.message}
  finally{send.disabled=false}
 };
}
async function drawReflectionPair(e){
 const button=e.currentTarget,current=room;
 if(current.activityOpen||button.disabled)return;
 button.disabled=true;
 const output=$('#reflectionPair'),message=$('#reflectionDrawStatus');
 try{
  const {sample}=await roomRequest('/api/room/'+current.code+'/compare-review',{previous:Number(output.dataset.student||0)},current.key);
  if(!output.isConnected||room!==current||current.activityOpen)return;
  if(!sample){message.textContent=output.dataset.student?'暂时没有其他同学提交了两次感受。':'还没有同一位同学提交两次感受。';return}
  message.textContent='';output.dataset.student=sample.studentNumber;button.textContent='再抽一位同学';
  output.innerHTML=`<h3>课堂学号：${Number(sample.studentNumber)}</h3><div class="reflection-pair">${reflectionCard('初感受记录卡',sharedInitialText(sample.first,sample.sharedObservation))}${reflectionCard('再感受',sample.review)}</div>`;
 }catch(e){if(message.isConnected)message.textContent=e.message}
 finally{button.disabled=false}
}
let teacherArtOpened=false;
async function bootClassroom(){
 const prior=loadRoom();
 const reusable=prior&&!params.has('preview')&&/^\d{6}$/.test(prior.code)&&phases[prior.phase]&&['teacher','student'].includes(prior.role)&&(fullCourse===!!prior.courseStep||scannedCode)&&(!wantsJoin||(prior.role==='student'&&(!scannedCode||scannedCode===prior.code)));
 if(reusable&&!(isCourseCover&&prior.role==='teacher')){activate(prior);return}
 drawControls();applyPhase();
 if(reusable){
  const button=$('#createRoom');
  if(button)button.disabled=true;
  status.textContent='正在读取课堂码…';busy=true;
  try{activate({...prior,...await roomRequest('/api/room/'+prior.code)});return}
  catch(e){if(e.httpStatus!==404){status.textContent=e.message;if(button)button.disabled=false;return}}
  finally{busy=false}
 }
 if(isCourseCover)await createClassroom();
 else if(scannedCode)await joinClassroom(scannedCode);
}
bootClassroom();
