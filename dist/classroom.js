const phases=['课堂等候','解词义 · 明章法','选一选 · 说感受','初看《祭侄文稿》','初发现 · 初感受','了解背景','再赏原作','艺术实践'];
const params=new URLSearchParams(location.search);
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
 clearTimeout(timer);requestEpoch++;room=next;projectedExpression=null;lastDrawn=null;projectedFirst=null;lastFirst=null;projectedReview=null;reviewComparison=false;
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
  acceptNavigation(data,room);
 }catch(e){if(epoch!==requestEpoch)return;status.textContent=e.message}
 if(epoch===requestEpoch)schedulePoll();
 },1800);
}
function acceptNavigation(data,current){
 if(room!==current||(data.navRevision||0)<(current.navRevision||0))return;
 projectedExpression=null;lastDrawn=null;projectedFirst=null;lastFirst=null;projectedReview=null;reviewComparison=false;
 if(data.navRevision===current.navRevision&&data.activityOpen===current.activityOpen)return;
 Object.assign(current,data);storeRoom();applyPhase();
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
 if(renderCourseShell())return;
 if(!room){lesson.hidden=false;page=0;started=false;wordChosen=false;render();return}
 $('#livePhase').hidden=false;
 $('#livePhase').textContent=phases[room.phase];
 lesson.hidden=false;
 if(room.role==='teacher'){if(room.phase!==4)forceImageStart();renderTeacher();window.scrollTo(0,0);return}
 const phase=room.phase;
 if([2,4,6,7].includes(phase)&&!room.activityOpen){
  document.querySelector('nav').hidden=true;document.querySelector('footer').hidden=true;$('#intro').hidden=true;
  document.querySelector('h1').textContent=phases[phase];
  $('#stage').innerHTML='<div class="panel"><h2>请看大屏幕</h2><p>老师开放这个环节后，这里会自动显示活动。</p></div>';
  return;
 }
 if(phase===0||phase===1||phase===5){
  document.querySelector('nav').hidden=true;document.querySelector('footer').hidden=true;$('#intro').hidden=true;
  document.querySelector('h1').textContent=phase===5?'了解背景':'章法之美';
  $('#stage').innerHTML=phase===0?'<div class="panel"><h2>已加入课堂</h2><p>请等待老师开始课堂活动。</p></div>':phase===1?'<div class="panel"><h2>请看大屏幕</h2><p>跟着老师观察作品和排列示意。老师开启“选一选 · 说感受”后，这里会直接打开作品选择和表达页面。</p></div>':'<div class="panel"><h2>请看大屏幕</h2><p>我们一起观看《祭侄文稿》的背景视频。老师点击“再赏析”后，你可以继续观察原作。</p></div>';
 }else if(phase===2){const draft=records[chosen];go(1);if(draft){selected=[...draft.selected];feelings=[...(draft.feelings||[])];feeling=draft.feeling||'';reason=draft.reason||'';judged=!!(draft.judged||feelings.length||feeling);render()}}
 else if(phase===3){initialOpen=false;go(2,0);$('#openInitial').hidden=true;$('#stage').insertAdjacentHTML('beforeend','<p class="muted">先看一看原作，等老师开启“初发现 · 初感受”。</p>')}
 else if(phase===4){if(page!==2||specialStep!==0)go(2,0);initialOpen=true;render();$('#openInitial').hidden=true}
 else if(phase===7){renderPracticeStudent();window.scrollTo(0,0);return}
 else if(phase===6){go(2,1)}
 window.scrollTo(0,0);
}
async function submitClassExpression(work,data,message,button){
 const current=room;if(!current||current.role!=='student'||button.disabled)return;
 button.disabled=true;message.textContent='正在提交本条表达…';
 try{
  await roomRequest('/api/room/'+current.code+'/expression',{student:current.student,work,...data});
  if(room===current&&message.isConnected)message.innerHTML='已保存这幅作品的观察。<strong class="expression-encouragement">观察有依据，表达有力量。</strong>';
 }catch(e){if(room===current&&message.isConnected)message.textContent='已保存在本机。'+e.message+' 如仍在本环节，请再点一次“完成我的表达”。'}
 finally{button.disabled=false}
}
async function submitFirstImpression(button,message){
 const current=room;if(!current||current.role!=='student'||button.disabled)return;
 const ownFinding=firstFinding.trim(),ownFeeling=firstFeel.trim();
 if((!initialFindings.length&&!ownFinding)||(!initialFeelings.length&&!ownFeeling)){
  message.textContent='请先写下至少一个发现和一种感受。';return;
 }
 const data={student:current.student,findings:[...initialFindings],feelings:[...initialFeelings],ownFinding,ownFeeling,impression:firstText()};
 button.disabled=true;message.textContent='正在提交初印象…';
 try{
  await roomRequest('/api/room/'+current.code+'/first-impression',data);
  if(room===current){if(message.isConnected)message.textContent='已提交初印象，老师可以匿名抽看。'}
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
  $('#drawFirstStatus').textContent=sample?'已抽到一位同学的初印象。':'还没有收到初印象。请同学们点击“提交我的初印象”。';
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
function projectionPanel(){
 if(!projectedExpression)return '';
 const s=projectedExpression;
 return `<article class="artcard projected-expression" aria-label="匿名学生表达"><h2>同学的观察与表达 · ${works[s.work].name}</h2>${art(s.work)}<dl><dt>我观察到</dt><dd>${esc(s.observation.join('、'))}</dd><dt>我感受到</dt><dd>${esc([...s.feelings,s.ownFeeling].filter(Boolean).join('、'))}</dd><dt>我的表达</dt><dd>${esc(s.expression)}</dd></dl></article>`;
}
async function drawExpression(button){
 if(button.disabled)return;
 const current=room,work=teacherWork,label='作品'+(work+1);button.disabled=true;$('#drawStatus').textContent='正在抽取'+label+'的表达…';
 try{
  const {sample}=await roomRequest('/api/room/'+current.code+'/draw',{work,previous:lastDrawn},current.key);
  if(room!==current||current.phase!==2||teacherWork!==work||!button.isConnected)return;
  projectedExpression=sample;lastDrawn=sample?.student||null;
  $('#expressionProjection').innerHTML=projectionPanel();$('#closeExpression').hidden=!sample;
  $('#drawStatus').textContent=sample?'已随机展示'+label+'的一份学生表达。':label+'还没有收到表达，请同学们点击“完成我的表达”。';
  button.textContent=sample?'再抽一位同学':'随机展示作品'+(work+1)+'的表达';
  if(sample)$('#expressionProjection').scrollIntoView({block:'start'});
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
 button.textContent=current.activityOpen?'暂停学生作答':'开放学生端作答';
 $('#stage').prepend(button);
 button.onclick=async()=>{if(busy)return;busy=true;button.disabled=true;try{
  const data=await roomRequest('/api/room/'+current.code+'/activity-gate',{open:!current.activityOpen,revision:current.navRevision},current.key);
  acceptNavigation(data,current);
 }catch(e){status.textContent=e.message}finally{busy=false;button.disabled=false}};
}
function renderTeacher(){
 if(!room||room.role!=='teacher')return;
 const phase=room.phase;
 document.querySelector('nav').hidden=true;document.querySelector('footer').hidden=true;
 document.querySelector('h1').textContent=phase>=3?'赏章法 · 悟表达':'章法之美';
 $('#intro').hidden=phase>1;
 let body='';
 if(phase===0)body=phaseButton(1,'解词义 · 明章法');
 if(phase===1)body=`<div class="originals-static">${works.slice(0,5).map((w,i)=>`<figure>${art(i)}<figcaption>${w.name}</figcaption></figure>`).join('')}</div><h2 class="spaced">想一想</h2><p>你会用下列哪些词语描述这些作品的排列？点一个词，借助下方的示意图，了解它代表的排列形式。</p><div class="choices teacher-word-buttons">${terms.map((t,i)=>`<button type="button" data-teacher-word="${i}" aria-pressed="false">${t}</button>`).join('')}</div><div id="teacherArrangement"></div>`+phaseButton(2,'选一选 · 说感受');
 if(phase===2)body=`<h2>选一选，说感受</h2><p>选一幅作品观察，在自己的设备上记录发现和感受。</p><div class="work-strip">${works.slice(0,5).map((w,i)=>`<button class="thumb" data-project="${i}" aria-pressed="${teacherWork===i}">${art(i)}<span>${w.name}</span></button>`).join('')}</div><article class="artcard projected-art" id="projectedWork"><h3>${works[teacherWork].name}</h3>${art(teacherWork)}</article>`+`<div class="expression-actions spaced"><button id="drawExpression" class="primary">${projectedExpression?'再抽一位同学':'随机展示作品'+(teacherWork+1)+'的表达'}</button><button id="closeExpression" ${projectedExpression?'':'hidden'}>收起表达</button></div><p id="drawStatus" role="status"></p><div id="expressionProjection">${projectionPanel()}</div>`+phaseButton(3,'赏章法 · 悟表达');
 if(phase===3||phase===4){
  body=`<p class="sub">有这样一幅与众不同的作品，被誉为“天下第二行书”。它又会带给我们怎样的章法之美呢？让我们一起走进它。</p><button id="teacherOpen" aria-expanded="false">颜真卿《祭侄文稿》</button><article class="artcard spaced" id="teacherArtwork" hidden><h2>初看作品</h2>${specialArt()}${zoomControls()}</article>`+(phase===4?`<div class="expression-actions spaced"><button id="drawFirst" class="primary">${projectedFirst?'再抽一位同学':'随机展示初感受'}</button><button id="closeFirst" ${projectedFirst?'':'hidden'}>收起初印象</button></div><p id="drawFirstStatus" role="status"></p><div id="firstProjection">${firstProjection()}</div>`:'')+(phase===3?phaseButton(4,'初发现 · 初感受'):phaseButton(5,'了解背景'));
 }
 if(phase===5)body='<h2>了解背景</h2><div class="story-video"><video controls playsinline preload="metadata" aria-label="祭侄文稿创作背景视频" src="/assets/jizhi-story.mp4"></video></div>'+phaseButton(6,'再赏析');
 if(phase===6)body=`<article class="artcard"><h2>再赏原作</h2>${specialArt()}${zoomControls()}</article><h2 class="spaced">找一找</h2><p>带着对故事的了解，再看看这些笔迹。你会有什么不同的感受呢？</p>${phase===6?`<div class="review-project-actions"><button id="drawReview" class="primary">${projectedReview?'再抽一位同学':'随机展示再赏感受'}</button><button id="compareReview">对照两次感受</button></div><p id="drawReviewStatus" role="status"></p><div id="reviewProjection">${reviewProjection()}</div>`:''}` +`<div class="classroom-recap"><button type="button" id="showClassRecap" aria-expanded="false" aria-controls="classRecap">本课小结</button><div id="classRecap" hidden><p>一笔有生命，<br>一字有姿态，<br>一篇有情感。</p></div></div>`+phaseButton(7,'进入艺术实践');
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
 if($('#closeExpression'))$('#closeExpression').onclick=()=>{projectedExpression=null;$('#expressionProjection').innerHTML='';$('#closeExpression').hidden=true;$('#drawExpression').textContent='随机展示作品'+(teacherWork+1)+'的表达';$('#drawStatus').textContent=''};
 document.querySelectorAll('[data-advance]').forEach(b=>b.onclick=async()=>{if(busy)return;const current=room;busy=true;b.disabled=true;try{const data=await roomRequest('/api/room/'+current.code,{phase:Number(b.dataset.advance)},current.key);acceptNavigation(data,current)}catch(e){status.textContent=e.message;b.disabled=false}finally{busy=false}});
 document.querySelectorAll('[data-project]').forEach(b=>b.onclick=()=>{const next=Number(b.dataset.project);if(next!==teacherWork){teacherWork=next;projectedExpression=null;lastDrawn=null}renderTeacher();$('#projectedWork').scrollIntoView({block:'start'})});
 if($('#teacherOpen')){
  const advance=$('[data-advance]');if(phase===3)advance.disabled=true;const reveal=()=>{$('#teacherArtwork').hidden=false;$('#teacherOpen').setAttribute('aria-expanded','true');advance.disabled=false;bindImage()};
  $('#teacherOpen').onclick=reveal;if(phase===4||teacherArtOpened){teacherArtOpened=true;reveal()}
  else $('#teacherOpen').onclick=()=>{teacherArtOpened=true;reveal()};
 }else if(phase===6||phase===7)bindImage();
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
