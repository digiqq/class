(() => {
 const query=new URLSearchParams(location.search);
 const role=query.get('role')||'preview', connected=role==='teacher', teacher=role!=='student';
 const variants=['whole','phrase','ink'], firstThree=versions.slice(0,3);
 const observation=$('[data-panel="2"]');
 const status=$('#liveActionStatus'),next=$('#liveAdvance'),back=$('#liveBack');
 let round=0,view=0,selected='',busy=false;
 document.body.classList.add('live-lanting',teacher?'projecting':'following','lanting-oral');

 observation.innerHTML=`<div class="prompt-card">
   <span class="prompt-no">观察任务 02 · 细分辨</span>
   <h2>仔细观察前三幅，它们真的一模一样吗？</h2>
 </div><div class="works-grid oral-whole-grid" id="oralImages">${firstThree.map(v=>`<figure class="work-card"><img alt=""><figcaption>${v.name.replace('（局部）','')}</figcaption></figure>`).join('')}</div>
 <section class="oral-recap" id="oralRecap" hidden><button type="button" class="ghost-btn" id="revealOralRecap" aria-expanded="false">观察小结</button><p id="oralRecapText" hidden>形相近，美不同。</p></section>`;
 $('#revealOralRecap').onclick=()=>{
  $('#oralRecapText').hidden=false;
  $('#revealOralRecap').setAttribute('aria-expanded','true');
 };
 $('.topbar').hidden=!teacher;
 const choices=$$('#worksGrid .work-card');
 for(const button of choices)button.onclick=()=>{
  selected=button.dataset.id;
  choices.forEach(b=>setPressed(b,b===button));
  paintControls();
 };
 function paintImages(){
  const images=$('#oralImages');
  images.dataset.view=variants[view];
  $$('#oralImages img').forEach((img,i)=>{
   const v=firstThree[i];
   img.src=`assets/${v.id}-${variants[view]}.${view===2?'jpeg':'jpg'}`;
   img.tabIndex=view===0?0:-1;
   img.onclick=view===0?()=>navigate(1):null;
   img.onkeydown=view===0?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();navigate(1)}}:null;
   img.alt=v.name.replace('（局部）','')+(view?'中的永和九年':'全文图');
  });
  $('#oralRecap').hidden=view!==2;
 }
 function paintControls(){
  next.disabled=busy||(round===1&&selected!=='dingwu');
  next.textContent=round===1?'再看前三幅':['去繁就简，只看“永和九年”','去除干扰','进入用笔之美'][view];
  next.hidden=role==='preview'&&view===2;
  back.hidden=role==='preview'&&round===1;
  back.disabled=busy;
 }
 async function navigate(direction){
  if(!teacher||busy||(direction>0&&next.disabled))return;
  busy=true;status.textContent='';paintControls();
  try{
   if(direction<0){
    if(view===1){view=0;paintImages()}
    else if(connected)await parent.previousClassroomPage();
    else window.setLantingStage(round===4?2:1);
   }else if(round===1){
    if(connected)await parent.advanceLanting(2);else window.setLantingStage(2);
   }else if(view===0){
    view=1;paintImages();
   }else if(view===1){
    if(connected)await parent.advanceLanting(4);else window.setLantingStage(4);
   }else if(connected)await parent.nextAfterLanting();
  }catch(err){status.textContent=err.message}
  finally{busy=false;paintControls()}
 }
 back.onclick=()=>navigate(-1);
 next.onclick=()=>navigate(1);
 window.setLantingStage=value=>{
  const stage=value===3?2:value===5?4:value;
  if(round===stage||![1,2,4].includes(stage))return;
  round=stage;view=stage===4?2:0;status.textContent='';
  document.body.dataset.round=String(round);
  $$('.panel').forEach(p=>p.classList.toggle('active',teacher&&Number(p.dataset.panel)===(round===1?1:2)));
  $('#liveWaiting').hidden=teacher;
  if(!teacher)$('#liveWaitingText').textContent='这一环节请看大屏幕，一起观察《兰亭序》的不同版本。老师进入用笔之美后，你的页面会自动切换。';
  $('#liveActions').hidden=!teacher;
  if(teacher&&round!==1)paintImages();
  paintControls();
 };
 window.setLantingStage(Number(query.get('round'))||1);
})();
