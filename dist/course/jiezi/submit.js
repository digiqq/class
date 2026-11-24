const projection=new URLSearchParams(location.search).get('role')==='teacher';
if(projection)document.body.classList.add('projector');
async function submitClass(){
 const out=document.getElementById('submitStatus'), button=document.getElementById('submitClass');
 if(!data.every((_,i)=>answers[i])){out.textContent='请完成五个例字的选择后再提交。';return}
 if(projection||!window.parent.submitCourseStructure){out.textContent='请从学生端加入课堂后提交。';return}
 button.disabled=true;
 try{await window.parent.submitCourseStructure(data.map((_,i)=>answers[i]));out.textContent='已提交到本堂课。可以修改后重新提交。'}
 catch(e){out.textContent=e.message}
 finally{button.disabled=false}
}

let structureOpen=window.parent.classroom?.activityOpen??true;
async function structureAction(action){
 const button=document.getElementById(action==='toggle'?'structureGate':'structureStats');
 if(button.disabled)return;
 button.disabled=true;
 try{
  const result=await window.parent.structureClassroom(action);
  if(action==='toggle')structureOpen=result.open;
  else{
   const {total,perfect,wrong}=result;
   const percent=n=>Math.round(100*n/total)+'%';
   statsHtml=total?`<section class="good"><h3>课堂正确率</h3><p>已提交 ${total} 人 · 五题全对 ${perfect} 人（${percent(perfect)}）</p><ul>${data.map((d,i)=>`<li>${d.name}：${total-wrong[i]} / ${total} 人答对（${percent(total-wrong[i])}）</li>`).join('')}</ul></section>`:'<p>还没有同学提交。</p>';
  }
  render();
 }catch(e){document.getElementById('submitStatus').textContent=e.message}
 finally{button.disabled=false}
}
window.setStructureOpen=open=>{
 if(structureOpen===open)return;
 structureOpen=open;
 if(step===1)render();
};
