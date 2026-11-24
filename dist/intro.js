const introAssets='/course/intro/';
const scriptWorks=[
 ['zhuan','篆书','《峄山碑》局部'],['li','隶书','《张迁碑》局部'],
 ['kai','楷书','《九成宫醴泉铭》局部'],['xing','行书','《寒食帖》局部'],['cao','草书','《苦笋帖》局部']
];
const shuffledScripts=[4,2,0,3,1];
const introButtons=['','','','','','','活动一｜辨书体','进入《兰亭序》'];
let introPreview=-1,scriptObserver;
function introPhoto(file,alt,cls=''){return `<img class="${cls}" src="${introAssets}${file}.jpg" alt="${alt}">`}
function classroomNote(){
 return introPhoto('classroom-note','美术课代表：请帮我通知同学们明天带齐美术用具。谢谢！美术老师','intro-note-art');
}
function artworkNext(cls,label){
 return `<button type="button" id="introArtworkNext" class="${cls}" aria-label="${label}">${introPhoto('yatou','《鸭头丸帖》局部')}</button>`;
}
function introPaperScene(){
 return `<section class="intro-panel"><figure id="introPaperScene" class="intro-paper-scene">
 <div class="intro-paper-frame">
 <button type="button" id="introNoteNext" class="intro-note-target" aria-label="留言条：显示有用">${classroomNote()}</button>
 <video id="introVideo" muted playsinline preload="auto" disablepictureinpicture disableremoteplayback aria-hidden="true" src="${introAssets}paper-turn.mp4"></video>
 <link rel="preload" as="image" href="${introAssets}yatou.jpg">
 </div>
 <p id="introUseful" class="intro-keyword" role="status" hidden>有用</p>
 </figure></section>`;
}
const titlePaper=introAssets+'ppt-title-paper.jpg';
const titleInk=introAssets+'ppt-title-ink.webp';
const titleCleanPaper=introAssets+'ppt-title-inkstone-paper.jpg';
function introTitlePage(){
 return `<section class="intro-title-page">
 <h1 class="cover-heading">书法艺术的魅力</h1>
 <svg viewBox="0 0 2848 1600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <defs>
   <clipPath id="introTitleClip"><rect id="introTitleWipe" x="485" y="410" width="0" height="391"/></clipPath>
   <clipPath id="introSubtitleClip"><rect x="624" y="804" width="1632" height="196"/></clipPath>
   <clipPath id="introOriginalBrush">
    <path d="M0 568 C123 695 344 915 475 1041 Q482 1035 492 1040
     C556 1087 618 1139 673 1171 Q685 1185 677 1194
     C730 1214 763 1260 800 1316 C829 1357 861 1385 892 1394
     C846 1403 804 1395 767 1380 C701 1353 650 1309 617 1252
     Q611 1260 604 1252 C547 1197 501 1145 461 1090 Q454 1081 462 1067
     C314 950 119 778 0 654Z"/>
   </clipPath>
  </defs>
  <image width="2848" height="1600" href="${titleCleanPaper}"/>
  <svg x="2147" y="1506" width="690" height="89" viewBox="1867 1509 690 89" preserveAspectRatio="none"><image width="2848" height="1600" href="${titlePaper}"/></svg>
  <text x="206" y="207" fill="#9e2f22" font-size="35" font-weight="700" letter-spacing="4">中国艺术撷英 · 五年级上册</text>
  <image width="2848" height="1600" href="${titleInk}" clip-path="url(#introTitleClip)"/>
  <image id="introTitleSubtitle" width="2848" height="1600" href="${titleInk}" clip-path="url(#introSubtitleClip)" opacity="0"/>
  <g id="introWritingBrush" opacity="0">
   <image width="2848" height="1600" href="${titlePaper}" clip-path="url(#introOriginalBrush)"/>
  </g>
 </svg></section>`;
}
function playIntroTitle(module){
 const frame=module.querySelector('.intro-title-page');
 const wipe=frame.querySelector('#introTitleWipe'),brush=frame.querySelector('#introWritingBrush'),subtitle=frame.querySelector('#introTitleSubtitle');
 const positionBrush=(x,y,angle)=>{
  brush.setAttribute('transform',`translate(${x} ${y}) rotate(${angle}) scale(-.74 .74) translate(-890 -1393)`);
  brush.setAttribute('opacity','1');
 };
 const inkX=660,inkY=1336,writeAngle=7,restX=1890,restY=1310,restAngle=36;
 const finish=()=>{
  wipe.setAttribute('width','1960');
  positionBrush(restX,restY,restAngle);
  subtitle.setAttribute('opacity','1');
  frame.dataset.written='true';
 };
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return}
 const duration=5700,starts=[485,772,1050,1320,1580,1850,2140,2445];
 const ease=t=>t*t*(3-2*t);
 let start;
 positionBrush(inkX,inkY-38,writeAngle);
 const tick=time=>{
  if(!frame.isConnected)return;
  start??=time;
  const p=Math.min(1,(time-start)/duration);
  if(p===1){finish();return}
  if(p<.09){
   positionBrush(inkX+p*65,inkY-38+38*ease(p/.09),writeAngle);
  }else if(p<.23){
   const t=ease((p-.09)/.14);
   positionBrush(inkX+6+(485-inkX-6)*t,inkY+(596-inkY)*t,writeAngle);
  }else if(p<.82){
   const travel=(p-.23)/.59*7,i=Math.min(6,Math.floor(travel)),t=travel-i;
   const x=starts[i]+(starts[i+1]-starts[i])*ease(t);
   positionBrush(x,596+Math.sin(t*Math.PI*2)*52,writeAngle);
   wipe.setAttribute('width',String(x-485));
  }else{
   const t=ease((p-.82)/.18);
   wipe.setAttribute('width','1960');
   positionBrush(2445+(restX-2445)*t,596+(restY-596)*t,writeAngle+(restAngle-writeAngle)*t);
   subtitle.setAttribute('opacity',String(t));
  }
  requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);
}
function introFrame(stage){
 const note=classroomNote();
 const post=introPhoto('yatou','《鸭头丸帖》局部','intro-post');
 const caption='<figcaption>《鸭头丸帖》 · 东晋王献之</figcaption>';
 if(stage===3)return `<div class="intro-art-detail"><figure>
 ${artworkNext('intro-detail-art','显示《鸭头丸帖》的原帖释文')}${caption}
 </figure><div class="intro-art-copy">
 <div id="introOriginalTranscript" class="intro-original-copy" hidden><h2>原帖释文</h2><p class="intro-transcription">鸭头丸，故不佳。明当必集，当与君相见。</p></div>
 </div></div>`;
 if(stage===4)return `<figure class="intro-gallery-frame">${introPhoto('gallery','课件中的《鸭头丸帖》展馆示意图','intro-gallery')}<figcaption class="intro-gallery-caption"><span id="introGalleryCaption" hidden>《鸭头丸帖》 · 现藏于上海博物馆</span></figcaption></figure><button type="button" id="introScreenNext" class="intro-screen-hit" aria-label="显示馆藏说明"></button>`;
 return `<div class="intro-comparison intro-comparison-vs"><figure>${note}<figcaption>今天的留言条</figcaption></figure><span class="intro-versus">VS</span><figure>${post}<figcaption>《鸭头丸帖》</figcaption></figure></div>
 <div class="intro-keywords intro-comparison-keywords"><span id="introComparisonBeauty" hidden>有美</span></div>
 <button type="button" id="introScreenNext" class="intro-screen-hit" aria-label="显示有美"></button>`;
}
function preloadIntroImage(src){
 const img=new Image();
 img.src=src;
 return img.decode().catch(()=>{});
}
function renderCourseIntro(module,paperComplete=false){
 const currentStage=room?.introStage??introPreview, role=room?.role||'preview';
 const prefix=`intro:${room?.code||''}:${role}:`;
 // The animation and the enlarged original are one classroom step.
 const stage=currentStage===2&&role!=='student'&&(paperComplete||shownCourse===prefix+'3')?3:currentStage;
 const id=prefix+stage+(role==='student'&&stage===7?':'+(room.scriptOpen?'open':'wait'):'');
 if(shownCourse===id){
  if(role==='teacher'&&stage===7)updateScriptGate();
  return;
 }
 const fromNext=shownCourse===`intro:${room?.code||''}:${role}:${stage+1}`;
 shownCourse=id;
 const bar=$('#classroomBar');
 if(module.contains(bar))module.after(bar);
 scriptObserver?.disconnect();
 const teacher=role!=='student';
 const paperStep=teacher&&stage>=0&&stage<=2;
 if(!teacher&&(stage<7||!room.scriptOpen)){
  module.innerHTML='<div class="course-lead intro-panel"><h2>已加入课堂，请看大屏幕</h2><p>老师开放作答后，这里会自动进入连线页面。请保留此页面，无需再次扫码。</p></div>';
  window.scrollTo(0,0);
  return;
 }
 if(stage===-1)module.innerHTML=`<section class="intro-cover"><h1 id="coverTitle" class="cover-heading">书法艺术的魅力</h1><img class="cover-scroll-art" src="/course/intro/brush-cover.jpg" alt="" width="1672" height="941" fetchpriority="high"><span class="intro-paper" aria-hidden="true"></span><button type="button" id="introNoteNext" class="intro-cover-hit" aria-labelledby="coverTitle" aria-describedby="coverAction"></button><span id="coverAction" hidden>进入课堂开场</span></section>`;
 else if(paperStep){
  if(!module.querySelector('#introPaperScene'))module.innerHTML=introPaperScene();
  const scene=module.querySelector('#introPaperScene');
  if(stage<2){
   scene.classList.remove('is-playing');
   const video=scene.querySelector('#introVideo');
   video.pause();
   if(video.readyState)video.currentTime=0;
  }
  const note=scene.querySelector('#introNoteNext');
  note.disabled=stage===2;
  note.setAttribute('aria-label',stage===1?'让留言条翻到千年前':'留言条：显示有用');
  scene.querySelector('#introUseful').hidden=stage!==1;
  if(stage<2)module.querySelector('.intro-actions')?.remove();
 }
 else if(stage===6)module.innerHTML=introTitlePage();
 else if(stage===7)renderScriptMatch(module,role);
 else module.innerHTML=`<section class="intro-panel${stage===3?' intro-panel-zoom':stage===4?' intro-screen-panel intro-gallery-panel':stage===5?' intro-screen-panel intro-pair-panel':''}">${introFrame(stage)}</section>`;
 if(stage===-1&&bar.classList.contains('cover-invite'))module.querySelector('.intro-cover').append(bar);
 if(teacher&&stage>=3)module.insertAdjacentHTML('beforeend',`<div class="course-lead course-page-actions intro-actions">${previousButton}${stage>=6?`<button type="button" id="introNext" class="primary">${introButtons[stage]}</button>`:''}</div>`);
 if(teacher&&room)bindPreviousPage(module.querySelector('[data-room-back]'));
 else if(teacher&&stage>=3)module.querySelector('[data-room-back]').onclick=()=>{introPreview=stage===3?1:stage-1;renderCourseShell()};
 if(teacher&&stage!==2){
  const trigger=module.querySelector('#'+(stage<2?'introNoteNext':stage<=3?'introArtworkNext':stage<=5?'introScreenNext':'introNext'));
  const nextImageReady=stage===3?preloadIntroImage(introAssets+'gallery.jpg'):stage===5?Promise.all([preloadIntroImage(titleCleanPaper),preloadIntroImage(titlePaper),preloadIntroImage(titleInk)]):null;
  const cueId={3:'introOriginalTranscript',4:'introGalleryCaption',5:'introComparisonBeauty'}[stage];
  const cue=cueId?module.querySelector('#'+cueId):null;
  const nextLabel={3:'查看《鸭头丸帖》的展馆图',4:'并排比较两张留言条',5:'揭晓课题'}[stage];
  const revealCue=()=>{
   cue.hidden=false;
   trigger.removeAttribute('aria-controls');trigger.removeAttribute('aria-expanded');
   trigger.setAttribute('aria-label',nextLabel);
  };
  if(cue){
   if(fromNext)revealCue();
   else{trigger.setAttribute('aria-controls',cue.id);trigger.setAttribute('aria-expanded','false')}
  }
  trigger.onclick=async e=>{
  if(busy)return;
  if(cue?.hidden){
   revealCue();
   if(stage===3)cue.scrollIntoView({block:'nearest'});
   return;
  }
  if(!room){
   if(nextImageReady){
    busy=true;
    try{await nextImageReady}finally{busy=false}
    if(shownCourse!==id)return;
   }
   if(stage===-1&&isCourseCover){await createClassroom();return}
   if(stage===7){location.search='?preview=1';return}
   introPreview++;renderCourseShell();return;
  }
  const current=room,button=e.currentTarget;button.disabled=true;busy=true;
  try{
   if(nextImageReady)await nextImageReady;
   if(room!==current||shownCourse!==id)return;
   const state=await roomRequest('/api/room/'+current.code+'/intro-stage',{stage:stage+1},current.key);
   acceptNavigation(state,current);
  }
  catch(err){status.textContent=err.message;button.disabled=false}
  finally{busy=false}
  };
 }
 if(stage>=3&&stage<=6)window.scrollTo(0,0);
 if(stage===6&&teacher)playIntroTitle(module);
 if(stage===2&&teacher){
  const scene=$('#introPaperScene'),video=scene.querySelector('#introVideo');
  let timer,settled=false;
  const finish=()=>{
   if(settled)return;
   settled=true;clearTimeout(timer);video.onplaying=video.onended=video.onerror=null;
   if(!scene.isConnected||shownCourse!==id)return;
   video.pause();
   if(!room)introPreview=3;
   renderCourseIntro(module,true);
  };
  video.muted=true;
  video.onplaying=()=>{
   if(settled||!scene.isConnected||shownCourse!==id)return;
   scene.classList.add('is-playing');
   clearTimeout(timer);timer=setTimeout(finish,6500);
  };
  video.onended=video.onerror=finish;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return}
  timer=setTimeout(finish,2300);
  if(video.readyState)video.currentTime=0;
  video.play().catch(finish);
 }
}
function renderScriptMatch(module,role){
 const teacher=role==='teacher', key='script-match-v1:'+(room?.code||'preview')+':'+(room?.student||'local');
 let saved;try{saved=JSON.parse(localStorage.getItem(key)||'null')}catch{}
 const links=Array.isArray(saved?.links)?saved.links:Array(5).fill(null);
 let sent=Array.isArray(saved?.sent)?saved.sent:null, active=-1,valuesPending=false;
 const cards=scriptWorks.map(([file,,title],i)=>teacher?
  `<figure class="script-card">${introPhoto(file,title)}<figcaption>${title}</figcaption></figure>`:
  `<button type="button" class="script-card" data-card="${i}" aria-pressed="false">${introPhoto(file,title)}<span>${title}</span></button>`).join('');
 const chips=shuffledScripts.map(i=>teacher?`<span class="script-chip">${scriptWorks[i][1]}</span>`:
  `<button type="button" class="script-chip" data-script="${i}">${scriptWorks[i][1]}</button>`).join('');
 module.innerHTML=`<section class="intro-panel script-panel"><h1>活动一｜辨书体</h1><p>你能认出下面五种代表性书体吗？</p>${teacher?'':'<p>点一幅作品，再点下面的书体名称。五幅都连好后提交。</p>'}
 <div id="scriptBoard"><svg id="scriptLines" aria-hidden="true"></svg><div class="script-grid">${cards}</div><div class="script-grid script-names">${chips}</div></div>
 ${teacher?'<div class="expression-actions script-controls"><button type="button" id="toggleScriptGate" class="primary"></button><button type="button" id="seeScriptStats">查看统计结果</button><span id="scriptGateStatus" role="status"></span></div><div id="scriptStats" aria-live="polite"></div><details class="classroom-recap"><summary>辨书体小结</summary><p>形有变，美不同。</p></details>':
 '<div class="expression-actions script-controls"><span id="scriptProgress"></span><button type="button" id="clearScript">重新连线</button><button type="button" id="submitScript" class="primary">提交连线</button></div><p id="scriptFeedback" role="status"></p>'}</section>`;
 if(teacher){
  const toggle=$('#toggleScriptGate'), stats=$('#seeScriptStats');
  toggle.disabled=stats.disabled=!room;
  toggle.onclick=toggleScriptGate;stats.onclick=showScriptStats;updateScriptGate();
  return;
 }
 window.scrollTo(0,0);
 const board=$('#scriptBoard'), svg=$('#scriptLines'), workButtons=[...board.querySelectorAll('[data-card]')],nameButtons=[...board.querySelectorAll('[data-script]')];
 const save=()=>{try{localStorage.setItem(key,JSON.stringify({links,sent}))}catch{}};
 const draw=()=>{
  const r=board.getBoundingClientRect();svg.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);
  svg.innerHTML=links.map((choice,i)=>{
   if(choice==null)return '';
   const a=workButtons[i].getBoundingClientRect(), b=board.querySelector(`[data-script="${choice}"]`).getBoundingClientRect();
   const ax=a.left+a.width/2-r.left,ay=a.bottom-r.top,bx=b.left+b.width/2-r.left,by=b.top-r.top;
   return `<path class="script-line color-${i}" d="M ${ax} ${ay} C ${ax} ${ay+22}, ${bx} ${by-22}, ${bx} ${by}"/>`;
  }).join('');
 };
 const update=()=>{
  const count=links.filter(v=>v!=null).length, unchanged=sent&&links.every((v,i)=>v===sent[i]);
  $('#scriptProgress').textContent=`已连线 ${count} / 5`;
  $('#submitScript').disabled=count!==5||valuesPending||!!unchanged;
  $('#clearScript').disabled=count===0||valuesPending;
  workButtons.forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===active));b.toggleAttribute('data-linked',links[i]!=null);b.setAttribute('aria-label',scriptWorks[i][2]+(links[i]!=null?'，已连'+scriptWorks[links[i]][1]:''))});
  nameButtons.forEach(b=>b.toggleAttribute('data-linked',links.includes(Number(b.dataset.script))));
  draw();
 };
 workButtons.forEach((b,i)=>b.onclick=()=>{active=active===i?-1:i;update()});
 nameButtons.forEach(b=>b.onclick=()=>{
  if(active<0){$('#scriptFeedback').textContent='请先点一幅作品。';return}
  const choice=Number(b.dataset.script),used=links.indexOf(choice);
  if(used!==-1&&used!==active)links[used]=links[active];
  links[active]=choice;active=-1;$('#scriptFeedback').textContent='';save();update();
 });
 $('#clearScript').onclick=()=>{links.fill(null);active=-1;$('#scriptFeedback').textContent='';save();update()};
 $('#submitScript').onclick=async()=>{
  const current=room,out=$('#scriptFeedback'),answers=[...links];
  valuesPending=true;update();
  try{
   if(current)await roomRequest('/api/room/'+current.code+'/script-submit',{student:current.student,answers:answers.map(i=>scriptWorks[i][0])});
   sent=answers;save();out.textContent=current?'已提交，可在老师切换前修改并重交。':'已完成预览。';
  }catch(e){out.textContent=e.message}
  finally{valuesPending=false;if(board.isConnected)update()}
 };
 if(sent&&links.every((choice,i)=>choice===sent[i]))$('#scriptFeedback').textContent='已提交';
 scriptObserver=new ResizeObserver(draw);scriptObserver.observe(board);update();
}
function updateScriptGate(){
 const open=!!room?.scriptOpen, control=$('#toggleScriptGate');
 if(!control)return;
 control.textContent=open?'暂停学生作答':'开放学生端';
 $('#scriptGateStatus').textContent=open?'已开放连线':'学生端等候中';
}
async function toggleScriptGate(e){
 const current=room, button=e.currentTarget;
 if(current?.role!=='teacher'||busy)return;
 busy=true;button.disabled=true;
 try{
  const data=await roomRequest('/api/room/'+current.code+'/script-gate',{open:!current.scriptOpen,revision:current.navRevision||0},current.key);
  acceptNavigation(data,current);
 }catch(err){if(room===current)status.textContent=err.message}
 finally{busy=false;button.disabled=false}
}
async function showScriptStats(e){
 const current=room,button=e.currentTarget,target=$('#scriptStats');
 button.disabled=true;
 try{
  const {total,perfect,wrong,pairs}=await roomRequest('/api/room/'+current.code+'/script-stats',{},current.key);
  if(!target.isConnected)return;
  button.textContent='刷新统计结果';
  const ranked=Object.entries(pairs).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  target.innerHTML=total?`<h2>课堂统计</h2><p>已提交 <strong>${total}</strong> 人 · 五幅全对 <strong>${perfect}</strong> 人</p>
   <h3>各幅作品的错误率</h3><div class="script-bars">${wrong.map((n,i)=>`<div><span>${scriptWorks[i][1]}</span><meter min="0" max="${total}" value="${n}" aria-label="${scriptWorks[i][1]}认错人数"></meter><span>${n}/${total} 人 · ${Math.round(n/total*100)}%</span></div>`).join('')}</div>
   <h3>哪些书体容易混淆？</h3>${ranked.length?'<ul class="script-pairs">'+ranked.map(([pair,n])=>{const [a,b]=pair.split(':').map(Number);return `<li>${scriptWorks[a][1]}和${scriptWorks[b][1]} · ${n} 人</li>`}).join('')+'</ul>':'<p>这次没有出现书体混淆。</p>'}`:'<p>还没有收到提交。</p>';
 }catch(err){target.textContent=err.message}
 finally{button.disabled=false}
}
