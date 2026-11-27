const practiceWorks=[
 {name:'《鸭头丸帖》',by:'东晋 · 王献之 · 行草书',src:'/assets/yatouwan.jpeg',w:1290,h:2204},
 {name:'《曹全碑》',by:'东汉 · 隶书拓片（局部）',src:'/assets/caoquan.jpeg',w:1080,h:2166}
];
const practiceSections=[
 {id:'script',name:'书体',hint:'先辨一辨：它可能是哪一种书体？你从哪些特征看出来？',observation:'我判断的书体和依据'},
 {id:'stroke',name:'用笔',hint:'挑一笔仔细看：它哪里粗、哪里细？笔画怎样相连或断开？'},
 {id:'structure',name:'结字',hint:'挑一个字仔细看：字形偏宽还是偏长？笔画和部件怎样安排？'},
 {id:'layout',name:'章法',hint:'看看整幅作品：字怎样排成行？字距和行距有哪些变化？'}
];
let practiceState=null;
function practiceHeader(){
 document.querySelector('nav').hidden=true;document.querySelector('footer').hidden=true;
 document.querySelector('h1').textContent='艺术实践';$('#intro').hidden=true;
 return '<p class="sub">从两幅作品中任选一幅，指出一个你看到的细节，说说它给你怎样的感受。</p>';
}
function practiceCards(interactive=false,chosen=-1,hideScript=false){
 return '<div class="practice-gallery">'+practiceWorks.map((w,i)=>{
  const content=`<img src="${w.src}" alt="${w.name}局部"><strong>${w.name}</strong><small>${hideScript?(i===0?'东晋 · 王献之':'东汉 · 拓片（局部）'):w.by}</small>`;
  return interactive?`<button type="button" class="practice-card" data-practice-work="${i}" aria-pressed="${chosen===i}">${content}</button>`:`<figure class="practice-card">${content}</figure>`;
 }).join('')+'</div>';
}
function practiceDraft(){
 const key='zhangfa-practice:'+room.code+':'+room.student;
 if(practiceState?.key!==key){let data;try{data=JSON.parse(sessionStorage.getItem(key))}catch{}
  practiceState={key,work:-1,drafts:[{},{}],...data};
 }return practiceState;
}
function savePracticeDraft(s){try{sessionStorage.setItem(s.key,JSON.stringify({work:s.work,drafts:s.drafts}))}catch{}}
function bindPracticeZoom(work){
 const el=$('#practiceViewport'),img=$('#practiceImage'),label=$('#practiceScale');
 const pointers=new Map();let gesture,zoom=1,base=0;
 const resize=()=>{base=Math.min(el.clientWidth,el.clientHeight*work.w/work.h);img.style.width=(base*zoom)+'px';img.style.height=(base*zoom*work.h/work.w)+'px';label.textContent=Math.round(zoom*100)+'%';};
 function setZoom(next,x,y,anchorX=(el.scrollLeft+x)/zoom,anchorY=(el.scrollTop+y)/zoom){
  zoom=Math.min(8,Math.max(1,next));resize();el.scrollLeft=anchorX*zoom-x;el.scrollTop=anchorY*zoom-y;
 }
 const point=e=>{const r=el.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]};
 function begin(){
  const [a,b]=pointers.values();
  if(b){const x=(a[0]+b[0])/2,y=(a[1]+b[1])/2;gesture={zoom,dist:Math.max(1,Math.hypot(a[0]-b[0],a[1]-b[1])),x:(el.scrollLeft+x)/zoom,y:(el.scrollTop+y)/zoom}}
  else gesture=a?{a,left:el.scrollLeft,top:el.scrollTop}:null;
 }
 el.onpointerdown=e=>{if(e.pointerType==='mouse'&&e.button!==0)return;pointers.set(e.pointerId,point(e));el.setPointerCapture(e.pointerId);begin()};
 el.onpointermove=e=>{if(!pointers.has(e.pointerId)||!gesture)return;pointers.set(e.pointerId,point(e));const [a,b]=pointers.values();
  if(b&&gesture.dist)setZoom(gesture.zoom*Math.hypot(a[0]-b[0],a[1]-b[1])/gesture.dist,(a[0]+b[0])/2,(a[1]+b[1])/2,gesture.x,gesture.y);
  else if(gesture.a){el.scrollLeft=gesture.left+gesture.a[0]-a[0];el.scrollTop=gesture.top+gesture.a[1]-a[1]}
 };
 el.onpointerup=el.onpointercancel=el.onlostpointercapture=e=>{pointers.delete(e.pointerId);begin()};
 for(const [id,change] of [['practiceIn',.5],['practiceOut',-.5]])$('#'+id).onclick=()=>setZoom(zoom+change,el.clientWidth/2,el.clientHeight/2);
 $('#practiceFit').onclick=()=>{zoom=1;resize();el.scrollLeft=el.scrollTop=0};
 resize();
}
function practiceSectionsFor(d){
 if(!d.rows){
  d.rows={};if(d.observation||d.feeling){
   const id=practiceSections.find(s=>s.name===d.lens)?.id||'legacy';
   d.rows[id]={observation:d.observation||'',feeling:d.feeling||''};
  }
 }
 return d.rows.legacy?[{id:'legacy',name:'之前的记录',hint:'你可以继续完善已有的观察和感受。'},...practiceSections]:practiceSections;
}
function practiceFields(d,id,obsLabel,feelLabel){
 const row=d.rows[id]||{};
 return `<label for="practice-${id}-observation">${obsLabel}</label><textarea id="practice-${id}-observation" data-practice-note="${id}" data-note-field="observation" maxlength="180" rows="2">${esc(row.observation||'')}</textarea><label for="practice-${id}-feeling">${feelLabel}</label><textarea id="practice-${id}-feeling" data-practice-note="${id}" data-note-field="feeling" maxlength="150" rows="2">${esc(row.feeling||'')}</textarea>`;
}
function practiceAngles(d){
 const topics=practiceSectionsFor(d).filter(s=>!['legacy','script'].includes(s.id));
 const angle=topics.find(s=>s.id===d.angle)||topics.find(s=>d.rows[s.id]?.observation||d.rows[s.id]?.feeling)||topics[0];
 d.angle=angle.id;
 return `<div class="choices practice-angles" aria-label="观察角度">${topics.map(t=>`<button type="button" data-practice-angle="${t.id}" aria-pressed="${t.id===angle.id}">${t.name}</button>`).join('')}</div><fieldset class="practice-note"><legend>${angle.name}</legend><p class="muted">${angle.hint}</p>${practiceFields(d,angle.id,'我观察到的细节','这个细节让我感到……')}</fieldset>`;
}
function renderPracticeStudent(){
 const s=practiceDraft(),w=practiceWorks[s.work],d=s.drafts[s.work];
 $('#stage').innerHTML=practiceHeader()+practiceCards(true,s.work,true)+(w?`<div id="practiceWorkspace" class="artcard spaced"><div class="practice-work-top"><h2>${w.name} · 细看作品</h2><button id="practiceBack">上一页</button></div><div id="practiceViewport" class="manuscript-viewport practice-viewport practice-selected-view" tabindex="0" aria-label="作品放大观察区"><img id="practiceImage" src="${w.src}" alt="${w.name}局部" draggable="false"></div><div class="image-zoom-controls"><button id="practiceOut" aria-label="缩小">−</button><span id="practiceScale">100%</span><button id="practiceIn" aria-label="放大">＋</button><button id="practiceFit">看全图</button><span class="minor">可双指缩放，放大后可拖动。</span></div></div><div class="panel spaced"><h3>我的观察与感受</h3><p>从用笔、结字、章法中选一个最有发现的角度。</p><div class="practice-notes">${practiceAngles(d)}</div><h3 class="spaced">我的表达</h3><p>把你的观察和感受说成一段话，你也可以自己写。</p><button id="practiceCompose">生成我的表达</button><label for="practiceExpression">我的评述</label><textarea id="practiceExpression" maxlength="3000" rows="6">${esc(d.expression||'')}</textarea><p class="muted">提交后，老师可以匿名投屏。请勿填写姓名或其他个人信息。</p><button id="practiceSubmit" class="primary">提交我的艺术实践</button><p id="practiceStatus" role="status"></p></div>`:'');
 document.querySelectorAll('[data-practice-work]').forEach(b=>b.onclick=()=>{s.work=Number(b.dataset.practiceWork);savePracticeDraft(s);renderPracticeStudent();$('#practiceWorkspace').scrollIntoView({block:'start'})});
 if(!w)return;
 $('#practiceBack').onclick=()=>{s.work=-1;savePracticeDraft(s);renderPracticeStudent();$('#stage').scrollIntoView({block:'start'})};
 bindPracticeZoom(w);
 const message=$('#practiceStatus');
 document.querySelectorAll('[data-practice-angle]').forEach(button=>button.onclick=()=>{
  d.angle=button.dataset.practiceAngle;savePracticeDraft(s);renderPracticeStudent();
  $('[data-practice-angle="'+d.angle+'"]').focus({preventScroll:true});
 });
 document.querySelectorAll('[data-practice-note]').forEach(el=>el.oninput=()=>{(d.rows[el.dataset.practiceNote]??={})[el.dataset.noteField]=el.value;savePracticeDraft(s)});
 $('#practiceExpression').oninput=e=>{d.expression=e.target.value;savePracticeDraft(s)};
 function validate(){
  const angle=practiceSections.find(s=>s.id===d.angle),notes=d.rows[d.angle]||{};
  const observation=notes.observation?.trim(),feeling=notes.feeling?.trim();
  if(!observation||!feeling){
   message.textContent='请写下一个具体细节和它带给你的感受。';
   $('#practice-'+d.angle+'-'+(observation?'feeling':'observation')).focus();return null;
  }
  return [{label:angle.name,observation,feeling}];
 }
 const finish=v=>/[。！？.!?]$/.test(v)?v:v+'。';
 $('#practiceCompose').onclick=()=>{const rows=validate();if(!rows)return;
  d.expression=`我欣赏的是${w.name}。
`+rows.map(r=>`${r.label}：我看到${finish(r.observation)}这让我感到${finish(r.feeling)}`).join('\n');
  $('#practiceExpression').value=d.expression;savePracticeDraft(s);message.textContent='已生成表达，你可以继续修改。';
 };
 $('#practiceSubmit').onclick=async e=>{const button=e.currentTarget,current=room,rows=validate();
  if(!rows)return;
  if(!d.expression?.trim()){message.textContent='请先生成或写下你的完整评述。';return}
  button.disabled=true;message.textContent='正在提交…';try{
   await roomRequest('/api/room/'+current.code+'/practice',{student:current.student,work:s.work,lens:'',observation:rows.map(r=>r.label+'：'+r.observation).join('\n'),feeling:rows.map(r=>r.label+'：'+r.feeling).join('\n'),expression:d.expression.trim()});
   message.textContent='已提交，老师可以匿名展示。';
  }catch(err){message.textContent=err.message}finally{button.disabled=false}
 };
}
function renderPracticeTeacher(){
 $('#stage').innerHTML=practiceHeader()+practiceCards(true)+`<div class="expression-actions spaced" id="reflectionGate"><button id="practiceGate" data-gate="${room.activityOpen?'pause':'open'}" class="primary">开放学生端作答</button><button id="practiceDraw" class="primary">随机展示赏评</button></div><p id="practiceTeacherStatus" role="status"></p><div id="practiceProjection"></div><dialog id="practiceTeacherZoom" aria-label="放大作品"><button type="button" aria-label="缩小作品"></button></dialog><div class="expression-actions spaced"><button id="revisitOpening" aria-expanded="false" aria-controls="practiceClosing">回到开场</button></div><section id="practiceClosing" class="intro-panel spaced" hidden><figure><img class="intro-post" src="/course/intro/yatou.jpg" alt="《鸭头丸帖》局部"></figure><h2>现在再看这张千年前的留言条</h2><p>你能指着一个地方，说说它美在哪里吗？</p></section>`;
 const current=room,message=$('#practiceTeacherStatus'),draw=$('#practiceDraw'),projection=$('#practiceProjection');
 const cards=[...$('#stage').querySelectorAll('[data-practice-work]')];
 const closing=$('#practiceClosing'),revisit=$('#revisitOpening');
 revisit.onclick=()=>{closing.hidden=!closing.hidden;revisit.setAttribute('aria-expanded',String(!closing.hidden));if(!closing.hidden)closing.scrollIntoView({block:'nearest'})};
 let previous=0,opener=null;
 const zoom=$('#practiceTeacherZoom'),zoomButton=zoom.querySelector('button');
 cards.forEach(card=>card.onclick=()=>{
  const w=practiceWorks[Number(card.dataset.practiceWork)];opener=card;
  zoomButton.innerHTML=`<img src="${w.src}" alt="${w.name}局部">`;
  zoom.showModal();
 });
 zoomButton.onclick=()=>zoom.close();
 zoom.onclose=()=>opener?.focus({preventScroll:true});
 draw.onclick=async()=>{
  if(draw.disabled)return;
  draw.disabled=true;message.textContent='正在抽取…';
  try{
   const {sample}=await roomRequest('/api/room/'+current.code+'/practice-show',{previous},current.key);
   if(room!==current||current.phase!==7||!draw.isConnected)return;
   if(!sample){message.textContent=previous?'暂无其他已提交的同学。':'还没有收到赏评，请同学们完成后提交。';return}
   previous=sample.id;const w=practiceWorks[sample.work];message.textContent='';
   projection.innerHTML=`<article class="artcard projected-expression"><h2>课堂学号：${Number(sample.studentNumber)} · ${w.name}</h2><figure class="practice-teacher-zoom"><img src="${w.src}" alt="${w.name}局部"></figure><p class="preserve-lines">${esc(sample.expression)}</p></article>`;
   projection.scrollIntoView({block:'nearest'});
  }catch(e){if(draw.isConnected)message.textContent=e.message}finally{draw.disabled=false}
 };
}
