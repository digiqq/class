const courseLabels=['《兰亭集序》版本对比','用笔之美','结字之美','章法之美','艺术实践'];
const courseFiles=['lanting','pen','jiezi'];
let shownCourse='';
function renderCourseShell(){
 const route=$('#courseRoute'), module=$('#courseModule');
 const integrated=!!room?.courseStep||(!room&&fullCourse);
 const step=room?.courseStep||0,firstActivity=integrated&&step<=1;
 const bar=$('#classroomBar');
 const isOpeningCover=firstActivity&&(room?.role==='teacher'?room.introStage===-1:!room&&isCourseCover&&introPreview===-1);
 if(!isOpeningCover&&bar.parentElement!==document.body)route.before(bar);
 if(firstActivity&&!isOpeningCover&&module.nextElementSibling!==bar)module.after(bar);
 if(!firstActivity&&bar.nextElementSibling!==route)route.before(bar);
 bar.classList.toggle('cover-invite',isOpeningCover);
 bar.classList.toggle('classroom-flow',!!room?.courseStep&&!isOpeningCover);
 bar.hidden=false;
 route.hidden=true;
 if(!integrated){document.title='章法之美';module.replaceChildren();shownCourse='';module.hidden=true;return false}
 document.title='书法艺术的魅力 · 互动课堂';
 const index=Math.max(0,room?.phase===7?4:step-1);
 if(step>=4){module.hidden=true;module.replaceChildren();shownCourse='';return false}
 lesson.hidden=true;module.hidden=false;
 if(step<=1&&((room&&(room.introStage??8)<8)||(!room&&!params.has('preview')&&!wantsJoin))){
  if(room)$('#livePhase').hidden=true;
  renderCourseIntro(module);
  return true;
 }
 if(step<=1){
  const round=room?.lantingRound||1;
  const identity=room?room.code+':'+room.role+':lanting':'lanting-preview';
  if(room)$('#livePhase').hidden=true;
  if(!room&&wantsJoin&&!params.has('preview')){
   module.innerHTML='<div class="course-lead"><p>加入后，请跟随老师开始课堂活动。</p></div>';
   shownCourse='';return true;
  }
  if(identity!==shownCourse){
   shownCourse=identity;
   module.innerHTML=`<iframe class="course-frame" title="${courseLabels[0]}" src="/course/lanting/index.html?v=classroom-oral-20261125&amp;role=${room?.role||'preview'}&amp;round=${round}"></iframe>`;
   bindCourseFrame(module,iframe=>iframe.contentWindow.setLantingStage?.(room?.lantingRound||1));
  }else if(room){
   module.querySelector('iframe')?.contentWindow?.setLantingStage?.(round);
   window.scrollTo(0,0);
  }
  return true;
 }
 $('#livePhase').hidden=true;
 $('#livePhase').textContent=courseLabels[index];
 const identity=room.code+':'+room.role+':'+step;
 if(shownCourse===identity){if(step===3)module.querySelector('iframe')?.contentWindow?.setStructureOpen?.(room.activityOpen);return true}
 shownCourse=identity;
 const teacher=room.role==='teacher';
 const frame=`<iframe class="course-frame" title="${courseLabels[index]}" src="/course/${courseFiles[index]}/index.html?v=classroom-oral-20261125&amp;role=${room.role}&amp;class=${room.code}"></iframe>`;
 const advance=teacher&&step!==3?`<button type="button" id="advanceCourse" class="primary">进入${courseLabels[step]}</button>`:'';
 module.innerHTML=frame;
 if(teacher&&step!==3)module.insertAdjacentHTML('beforeend',`<div class="course-lead course-page-actions">${previousButton}${advance}</div>`);
 bindPreviousPage(module.querySelector('[data-room-back]'));
 bindCourseFrame(module);
 if(teacher&&step!==3)$('#advanceCourse').onclick=async e=>{
  const button=e.currentTarget;button.disabled=true;
  try{await advanceCourseStep(step)}catch(err){status.textContent=err.message}
  finally{button.disabled=false}
 };
 window.scrollTo(0,0);
 return true;
}
async function advanceCourseStep(step){
 const current=room;
 if(current?.role!=='teacher'||current.courseStep!==step||busy)throw Error('请由开课教师切换，或稍后重试。');
 busy=true;
 try{
  const result=await roomRequest('/api/room/'+current.code+'/course-step',{step:step+1},current.key);
  acceptNavigation(result,current);
  window.scrollTo(0,0);
 }finally{busy=false}
}
window.advanceToComposition=()=>advanceCourseStep(3);
async function returnToLanting(){
 const current=room;if(busy||current?.role!=='teacher')return;
 busy=true;try{
  const data=await roomRequest('/api/room/'+current.code+'/lanting-return',{revision:current.navRevision},current.key);
  acceptNavigation(data,current);
 }catch(e){status.textContent=e.message}finally{busy=false}
}
function bindCourseFrame(module,onReady){
 const frame=module.querySelector('iframe');
 frame.addEventListener('load',()=>{
  if(!frame.isConnected)return;
  const doc=frame.contentDocument, body=doc?.body;
  if(!body)return;
  doc.documentElement.style.overflowY='hidden';
  body.style.display='flow-root';body.style.minHeight='0';
  const fit=()=>{if(frame.isConnected){const h=Math.ceil(body.getBoundingClientRect().height+parseFloat(frame.contentWindow.getComputedStyle(body).marginTop||0)+parseFloat(frame.contentWindow.getComputedStyle(body).marginBottom||0));if(h)frame.style.height=h+'px'}};
  const observer=new ResizeObserver(fit);observer.observe(body);fit();
  onReady?.(frame);
  doc.addEventListener('click',e=>{if(!doc.documentElement.classList.contains('course-pen')&&e.target.closest('nav button, #prev, #next, #prevBtn, #nextBtn, .step'))window.scrollTo({top:module.offsetTop,behavior:'smooth'})});
 },{once:true});
}
window.advanceLanting=async round=>{
 const current=room;
 if(current?.role!=='teacher'||current.courseStep!==1||busy)throw Error('请由开课教师操作。');
 busy=true;
 try{
  const data=await roomRequest('/api/room/'+current.code+'/lanting-stage',{round},current.key);
  acceptNavigation(data,current)
 }finally{busy=false}
};
window.nextAfterLanting=async ()=>{
 const current=room;
 if(current?.role!=='teacher'||current.courseStep!==1||busy)throw Error('请由开课教师操作。');
 busy=true;
 try{
  const data=await roomRequest('/api/room/'+current.code+'/course-step',{step:2},current.key);
  acceptNavigation(data,current)
 }finally{busy=false}
};
window.submitLanting=async entry=>{
 if(room?.role!=='student'||room.courseStep!==1||room.lantingRound<4)throw Error('请在“三幅回看”环节提交。');
 return roomRequest('/api/room/'+room.code+'/lanting-expression',{...entry,student:room.student});
};
window.getMyLantingExpressions=async ()=>{
 if(room?.role!=='student'||room.courseStep!==1||room.lantingRound<4)throw Error('请在“三幅回看”环节查看自己的提交。');
 return roomRequest('/api/room/'+room.code+'/lanting-mine',{student:room.student});
};
window.showLantingSample=async (action,payload)=>{
 if(room?.role!=='teacher'||room.courseStep!==1)throw Error('请由开课教师操作。');
 const path=action==='compare'?'lanting-compare':'lanting-draw';
 return roomRequest('/api/room/'+room.code+'/'+path,payload,room.key);
};
window.coursePenRequest=async (action,payload)=>{
 const current=room,teacher=current?.role==='teacher';
 if(current?.courseStep!==2)throw Error('请先进入“用笔之美”。');
 const base='/api/room/'+current.code+'/pen-match';
 if(action==='state')return roomRequest(base);
 if(action==='answer'&&!teacher)return roomRequest(base+'-answer',{entries:payload?.entries,student:current.student});
 if(teacher&&['advance','count','stats','draw'].includes(action))return roomRequest(base+'-'+action,payload,current.key);
 throw Error('无法执行此课堂操作。');
};
window.submitCourseStructure=async answers=>{
 if(room?.role!=='student'||room.courseStep!==3)throw Error('请在结字活动中提交。');
 return roomRequest('/api/room/'+room.code+'/structure',{student:room.student,answers});
};
window.structureClassroom=async (action,open)=>{
 const current=room;
 if(current?.courseStep!==3)throw Error('请先进入“结字之美”。');
 if(action==='state')return {open:current.activityOpen};
 if(current.role!=='teacher')throw Error('请由开课教师操作。');
 if(action==='stats')return roomRequest('/api/room/'+current.code+'/structure-stats',{},current.key);
 if(action==='toggle'||action==='set'){
  if(action==='set'&&open===current.activityOpen)return {open};
  const next=await roomRequest('/api/room/'+current.code+'/activity-gate',{open:action==='set'?open:!current.activityOpen,revision:current.navRevision},current.key);
  acceptNavigation(next,current);
  return {open:next.activityOpen};
 }
 throw Error('无法执行此课堂操作。');
};
