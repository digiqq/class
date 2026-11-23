(() => {
 const query=new URLSearchParams(location.search);
 const role=query.get('role')||'preview';
 if(!['preview','teacher','student'].includes(role))return;
 const teacher=role!=='student',connected=role==='teacher';
 const firstThree=versions.slice(0,3);
 const whole=$('[data-panel="2"]');
 const detail=$('[data-panel="3"]');
 const status=$('#liveActionStatus'),next=$('#liveAdvance'),back=$('#liveBack');
 let round=0,selected='',ink=false,busy=false;
 document.body.classList.add('live-lanting',teacher?'projecting':'following','lanting-oral');

 whole.innerHTML=`<div class="prompt-card">
   <span class="prompt-no">观察任务 02</span>
   <h2>再看这三幅，它们真的一样吗？</h2>
   <p>先整体看一看。如果一眼看不清，我们就去繁就简。</p>
 </div><div class="works-grid oral-whole-grid">${firstThree.map(v=>`<figure class="work-card"><img src="${v.img}" alt="${v.name}"><figcaption>${v.name}</figcaption></figure>`).join('')}</div>`;
 detail.innerHTML=`<div class="prompt-card"><h2>只看“永和九年”</h2>
 <p id="oralDetailPrompt">先保留底纹和印章，看看这四个字。</p></div>
 <div class="toolbar"><button type="button" class="ghost-btn" id="oralInk" aria-pressed="false">去除干扰</button></div>
 <div class="phrase-grid" id="phraseGrid">${firstThree.map(v=>`<figure class="phrase-card"><img alt="${v.name}中的永和九年"><figcaption>${v.name}</figcaption></figure>`).join('')}</div>
 <div class="teacher-tip" id="oralQuestion" hidden>这三个版本给你的感受一样吗？你从哪儿看出来的？</div><details class="oral-recap" id="oralRecap" hidden><summary>观察小结</summary><p>字形相近，美感亦异。</p></details>`;
 $('.topbar').hidden=!teacher;
 const choices=$$('#worksGrid .work-card');
 function paintControls(){
  next.disabled=busy||(round===1&&selected!=='dingwu');
  next.textContent=round===1?'再看前三幅':round===2?'去繁就简，只看“永和九年”':'进入用笔之美';
  next.hidden=role==='preview'&&round===4;
  back.hidden=role==='preview'&&round===1;
  back.disabled=busy;
 }
 for(const button of choices){
  button.onclick=()=>{
   selected=button.dataset.id;
   choices.forEach(b=>setPressed(b,b===button));
   status.textContent=selected==='dingwu'?'宋拓定武本：深色的拓片上，字迹是浅色的。':'再看一看：哪一幅的纸色和字色，跟另外三幅最不一样？';
   paintControls();
  };
 }
 function paintDetail(){
  $$('#phraseGrid img').forEach((img,i)=>{
   const v=firstThree[i];
   img.src=ink?`assets/${v.id}-ink.jpeg`:`assets/${v.id}-phrase.jpg`;
   img.classList.toggle('ink-only',ink);
  });
  $('#oralInk').textContent=ink?'恢复原貌':'去除干扰';
  $('#oralInk').setAttribute('aria-pressed',String(ink));
  $('#oralDetailPrompt').textContent=ink?'现在只看文字，仔细比一比。':'先保留底纹和印章，看看这四个字。';
  $('#oralQuestion').hidden=!ink;
  $('#oralRecap').hidden=!ink;if(!ink)$('#oralRecap').open=false;
 }
 $('#oralInk').onclick=()=>{ink=!ink;paintDetail()};
 async function navigate(direction){
  if(!teacher||busy||(direction>0&&next.disabled))return;
  busy=true;status.textContent='';paintControls();
  try{
   if(!connected)window.setLantingStage(direction<0?(round===4?2:1):(round===1?2:4));
   else if(direction<0)await parent.previousClassroomPage();
   else if(round===4)await parent.nextAfterLanting();
   else await parent.advanceLanting(round===1?2:4);
  }catch(err){status.textContent=err.message}
  finally{busy=false;paintControls()}
 }
 back.onclick=()=>navigate(-1);
 next.onclick=()=>navigate(1);
 window.setLantingStage=value=>{
  const stage=value===3?2:value===5?4:value;
  if(round===stage||![1,2,4].includes(stage))return;
  round=stage;ink=false;status.textContent='';
  document.body.dataset.round=String(round);
  $$('.panel').forEach(p=>p.classList.toggle('active',teacher&&Number(p.dataset.panel)===(round===4?3:round)));
  $('#liveWaiting').hidden=teacher;
  if(!teacher)$('#liveWaitingText').textContent='这一环节请看大屏幕，一起观察《兰亭序》的不同版本。老师进入用笔之美后，你的页面会自动切换。';
  $('#liveActions').hidden=!teacher;
  if(teacher&&round===4)paintDetail();
  paintControls();
 };
 window.setLantingStage(Number(query.get('round'))||1);
})();
