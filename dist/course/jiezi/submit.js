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
