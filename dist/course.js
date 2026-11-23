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
 route.hidden=!integrated||firstActivity;
 if(!integrated){document.title='章法之美';module.replaceChildren();shownCourse='';module.hidden=true;return false}
 document.title='书法艺术的魅力 · 互动课堂';
 const index=Math.max(0,room?.phase===7?4:step-1);
 if(!route.hidden)route.innerHTML='<ol aria-label="课堂进度">'+courseLabels.map((label,i)=>'<li '+(i===index?'aria-current="step"':i<index?'data-done="true"':'')+'><span>'+(i+1)+'</span>'+label+'</li>').join('')+'</ol>';
 if(room?.role==='teacher'&&step>=2){
  route.insertAdjacentHTML('beforeend','<button type="button" id="backToLanting">回看《兰亭序》三幅对比</button>');
  $('#backToLanting').onclick=()=>returnToLanting();
 }
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
   module.innerHTML=`<iframe class="course-frame" title="${courseLabels[0]}" src="/course/lanting/index.html?v=lesson-recap-shapes-20261123&amp;role=${room?.role||'preview'}&amp;round=${round}"></iframe>`;
   bindCourseFrame(module,iframe=>iframe.contentWindow.setLantingStage?.(room?.lantingRound||1));
  }else if(room){
   module.querySelector('iframe')?.contentWindow?.setLantingStage?.(round);
   window.scrollTo(0,0);
  }
  return true;
 }
 $('#livePhase').hidden=false;
 $('#livePhase').textContent=courseLabels[index];
 const identity=room.code+':'+room.role+':'+step;
 if(shownCourse===identity)return true;
 shownCourse=identity;
 const teacher=room.role==='teacher';
 const frame=`<iframe class="course-frame" title="${courseLabels[index]}" src="/course/${courseFiles[index]}/index.html?v=${step===2?'pen-match2':'project1'}&amp;role=${room.role}&amp;class=${room.code}"></iframe>`;
 const advance=teacher?`<button type="button" id="advanceCourse" class="primary">进入${courseLabels[step]}</button>`:'';
 module.innerHTML=`<div class="course-lead"><p>${teacher?'在大屏上示范；学生在自己的设备上操作。':'请跟随老师，在当前活动中观察和尝试。'}</p></div>`+frame;
 if(teacher)module.insertAdjacentHTML('beforeend',`<div class="course-lead course-page-actions">${previousButton}${advance}</div>`);
 bindPreviousPage(module.querySelector('[data-room-back]'));
 bindCourseFrame(module);
 if(teacher&&step===3){
  module.insertAdjacentHTML('beforeend','<section class="course-stats"><h2>结字练习 · 课堂汇总</h2><div class="expression-actions"><button type="button" id="refreshStructure">查看统计</button><button type="button" id="drawStructure">随机展示一位同学的判断</button></div><div id="structureStats" aria-live="polite"></div><div id="structureProjection" aria-live="polite"></div></section>');
  $('#refreshStructure').onclick=getStructureStats;
  bindStructureDraw();
 }
 if(teacher)$('#advanceCourse').onclick=async e=>{
  if(busy)return;
  const button=e.currentTarget,current=room;busy=true;button.disabled=true;
  try{const result=await roomRequest('/api/room/'+current.code+'/course-step',{step:step+1},current.key);acceptNavigation(result,current)}
  catch(err){if(room===current)status.textContent=err.message;button.disabled=false}
  finally{busy=false}
 };
 window.scrollTo(0,0);
 return true;
}
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
async function getStructureStats(){
 const target=$('#structureStats'),button=$('#refreshStructure'),current=room;
 if(!target||!button||button.disabled)return;
 const draw=$('#drawStructure');
 if(draw?.disabled)return;
 $('#structureProjection').replaceChildren();
 button.disabled=true;if(draw)draw.disabled=true;
 try{
  const {total,perfect,wrong}=await roomRequest('/api/room/'+current.code+'/structure-stats',{},current.key);
  if(!target.isConnected)return;
  button.textContent='刷新统计';
  target.innerHTML=total?`<p>已有 <strong>${total}</strong> 份提交，五题全对 <strong>${perfect}</strong> 人（${Math.round(100*perfect/total)}%）。</p><table><thead><tr><th scope="col">例字</th><th scope="col">选错人数</th></tr></thead><tbody>${['篆书','隶书','楷书','行书','草书'].map((k,i)=>'<tr><th scope="row">'+k+'</th><td>'+wrong[i]+'</td></tr>').join('')}</tbody></table>`:'<p>还没有同学提交。</p>';
 }catch(err){target.textContent=err.message}
 finally{button.disabled=false;if(draw)draw.disabled=false}
}

function bindStructureDraw(){
 const button=$('#drawStructure'), output=$('#structureProjection'), stats=$('#refreshStructure'),current=room;
 const names=['篆书','隶书','楷书','行书','草书'];
 const choices={A:'横向取势，字形较扁',B:'结构严谨，形体方整',C:'纵向取势，对称修长',D:'变化莫测，奥妙绝伦',E:'左低右高，刚柔并济'};
 let previous=0;
 button.onclick=async()=>{
  if(button.disabled||stats.disabled)return;
  button.disabled=stats.disabled=true;$('#structureStats').replaceChildren();stats.textContent='查看统计';output.textContent='正在抽取……';
  try{
   const {sample}=await roomRequest('/api/room/'+current.code+'/structure-draw',{previous},current.key);
   if(!output.isConnected)return;
   if(!sample){output.textContent='还没有同学提交判断。';return}
   previous=sample.id;
   output.innerHTML=`<h3>一位同学的判断</h3><table><thead><tr><th scope="col">书体</th><th scope="col">同学的选择</th><th scope="col">判断结果</th></tr></thead><tbody>${names.map((name,i)=>`<tr><th scope="row">${name}</th><td>${esc(choices[sample.answers[i]])}</td><td>${sample.answers[i]===sample.expected[i]?'相符':'可再观察'}</td></tr>`).join('')}</tbody></table>`;
  }catch(e){output.textContent=e.message}
  finally{button.disabled=stats.disabled=false}
 };
}
