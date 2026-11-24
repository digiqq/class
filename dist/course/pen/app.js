const $=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
const query=new URLSearchParams(location.search), validCode=s=>/^\d{6}$/.test(s||'');
const inviteCode=validCode(query.get('class'))?query.get('class'):null;
let room=null,poll=null,glyph=0,draft={},submitted=null,busy=false,sending=false,previous=0;
const status=$('#globalStatus'),syncStatus=$('#syncStatus');
const storage=(key,value)=>{try{if(value===undefined)return JSON.parse(localStorage.getItem(key)||'null');localStorage.setItem(key,JSON.stringify(value))}catch{return null}};
const src=id=>'./assets/'+id+'-0.jpg';
const highlight=(id,n)=>'./assets/highlight-'+id+'-'+n+'.png'+(id===5&&n===2?'?v=full-stroke':'');
function picture(f,stroke,interactive=false){
 const layers=(interactive?Array.from({length:f.count},(_,i)=>i+1):[stroke]).filter(Boolean);
 return `<div class="canvas${interactive?' interactive-canvas':''}"><div class="picture" ${interactive?'id="glyph" tabindex="0" role="img" aria-label="'+f.name+'：点选笔画，或用方向键切换高光"':''}>
 <img class="glyph-base" draggable="false" src="${src(f.id)}" alt="${interactive?'':f.name+(stroke?'笔画高亮':'例字')}">
 ${layers.map(n=>`<img class="highlight-layer${n===stroke?' active':''}" data-highlight="${n}" draggable="false" src="${highlight(f.id,n)}" alt="" aria-hidden="true">`).join('')}</div></div>`;
}
const selected=bool=>String(bool);
const figure=id=>figures.find(f=>f.id===id);
async function api(path,body,key){
 if(window.parent===window||!window.parent.coursePenRequest)throw Error('请从整堂课进入“用笔之美”。');
 const action=path.split('/')[4]||'state';
 return window.parent.coursePenRequest(action,body);
}

function activate(value){
 room=value;
 const saved=storage(practiceKey(room));
 glyph=figure(saved?.glyph)?.id||figures[0].id;draft=saved?.draft||{};submitted=saved?.submitted||null;
 $('#entry').hidden=true;$('#room').hidden=false;
 render();sync();
}
function sync(){
 const current=room;
 poll=setTimeout(async()=>{
  try{
   const state=await api('/api/room/'+current.code);
   syncStatus.textContent='';
   if(state.stage!==current.stage){current.stage=state.stage;render()}
   if(current.role==='teacher'&&[1,3].includes(current.stage))refreshCount(current);
  }catch(e){syncStatus.textContent=e.message}
  sync();
 },1500);
}
async function advance(stage,button){
 const current=room;if(button.disabled)return;
 button.disabled=true;
 try{
  const payload=await api('/api/room/'+current.code+'/advance',{stage},current.key);
  if(room===current&&payload.stage!==room.stage){Object.assign(room,payload);render()}
 }catch(e){status.textContent=e.message}
 finally{button.disabled=false}
}
const practiceKey=current=>(current.role==='teacher'?'pen-demo:':'pen-batch:')+current.code;
const persist=()=>storage(practiceKey(room),{glyph,draft,submitted});
const completed=f=>Boolean(draft[f.id]?.answer);
const allEntries=()=>figures.map(f=>({glyph:f.id,stroke:draft[f.id]?.stroke||0,answer:draft[f.id]?.answer}));
const isSaved=()=>submitted&&allEntries().every(entry=>submitted.some(saved=>saved.glyph===entry.glyph&&(saved.stroke||0)===entry.stroke&&saved.answer===entry.answer));
function gallery(interactive=false,teacher=false){
 return '<div class="gallery'+(!interactive||teacher?' teacher-gallery':'')+'">'+figures.map(f=>{
  const content=`<img src="${src(f.id)}" alt=""><span>${f.name}</span>`;
  return interactive?`<button class="glyph-card" type="button" data-glyph="${f.id}" data-completed="${completed(f)}" aria-pressed="${selected(f.id===glyph)}">${content}<small>${completed(f)?'已选':'待选'}</small></button>`:`<div class="glyph-card">${content}</div>`;
 }).join('')+'</div>';
}
function panel(content){$('#stage').innerHTML='<section class="card">'+content+'</section>'}
async function refreshCount(current){
 const out=$('#classCount');if(!out)return;
 try{const {total}=await api('/api/room/'+current.code+'/count',{},current.key);if(out.isConnected)out.textContent='已提交：'+total+' 人'}catch(e){if(out.isConnected)out.textContent=e.message}
}
function render(){
 if(room.role==='teacher'){
  if(room.stage===0){
   renderPractice(true);
  }else if([1,3].includes(room.stage)){
   const paused=room.stage===3;
   panel(gallery()+'<p id="classCount" class="status">正在读取提交人数……</p><div class="actions"><button id="pause">'+(paused?'继续开放学生答题':'暂停学生答题')+'</button><button class="primary" id="reveal">公布答案</button></div>');
   $('#pause').onclick=e=>advance(paused?1:3,e.currentTarget);
   $('#reveal').onclick=e=>advance(2,e.currentTarget);refreshCount(room);
  }else{
   panel('<h2>核对五组答案</h2><div class="answers pen-answer-gallery">'+figures.map(f=>`<figure><img src="${src(f.id)}" alt="${f.name}例字"><figcaption><strong>${f.name}</strong><p>${statements[f.answer-1][0]}</p></figcaption></figure>`).join('')+'</div><div class="actions"><button id="stats" aria-expanded="false">查看统计</button><button id="draw">随机看一位同学的选择</button></div><div id="statistics" hidden></div><div id="sample"></div><p class="pen-transition">刚才我们看的是一笔怎么写。现在把目光放回整个字：这些笔画是怎么安排在一起的？</p>');
   $('#draw').onclick=draw;$('#stats').onclick=showStats;
  }
  return;
 }
 if(room.stage===0){panel('<h2>请看大屏</h2><p>跟着老师看一笔是怎么走的。老师开放后，再自己动手试一试。</p>');return}
 if(room.stage===3){panel('<h2>学生答题已暂停</h2><p>请看大屏幕。你的选择已保留，老师重新开放后可以继续。</p>');return}
 if(room.stage===2){
  const correct=submitted?.filter(entry=>entry.answer===figure(entry.glyph).answer).length;
  panel('<h2>核对五组答案</h2><p>'+(submitted?'你答对了 '+correct+' / 5 组。以下以你最后一次提交为准。':'你还没有提交，可以对照下面的答案。')+'</p><div class="answers">'+figures.map(f=>{
   const entry=submitted?.find(x=>x.glyph===f.id);
   return `<p><strong>${f.name} · 表述${f.answer}</strong>　${statements[f.answer-1][0]}${entry?`<small class="result ${entry.answer===f.answer?'correct':'review'}">${entry.answer===f.answer?'答对了':'你的选择：表述'+entry.answer}</small>`:''}</p>`;
  }).join('')+'</div>');return;
 }
 renderPractice(false);
}
function practiceStatus(){
 if(sending)return '正在提交……';
 if(isSaved())return room.role==='teacher'?'五组已提交。':'五组已提交。老师公布答案前，还可以回去修改并重新提交。';
 return submitted?'你有修改尚未提交。':'';
}
function renderPractice(teacher){
 const f=figure(glyph),index=figures.indexOf(f),{stroke=0,answer=0}=draft[glyph]||{},done=figures.filter(completed).length;
 const intro=teacher?'':'<h2>点一笔，找线索</h2><p>给每个例字选一条最符合的表述。</p>';
 const progress=`<p class="progress">已完成 ${done} / 5 组</p>`;
 const canvas=teacher?`<div class="teacher-practice-view">${picture(f,stroke,true)}</div>`:
 `<div class="workspace">${picture(f,stroke,true)}<div><h3>看一看，选一选</h3><p>看懂了就直接选表述；想细看，可以点亮字里的一笔。</p></div></div>`;
 panel(`<div class="${teacher?'teacher-practice':'student-practice'}">${intro}${gallery(true,teacher)}
 ${teacher?'':progress}${canvas}
 <div class="option-list" aria-label="教材表述">${statements.map(([text],i)=>`<button class="option" data-answer="${i+1}" aria-pressed="${selected(answer===i+1)}">表述${i+1}：${text}</button>`).join('')}</div>
 ${teacher?progress:''}
 <div class="actions student-actions"><button id="prev" ${index?'':'disabled'}>上一字</button><button id="next" ${index<figures.length-1?'':'disabled'}>下一字</button><button id="submit" class="primary" ${done===figures.length&&!isSaved()&&!sending?'':'disabled'}>${submitted?'重新提交五组':'提交五组'}</button></div>
 <p id="submitStatus" class="status" role="status">${practiceStatus()}</p>
 ${teacher?'<div class="actions teacher-open"><button id="open">开放学生作答</button></div>':''}</div>`);
 const bind=(kind,update)=>qa('[data-'+kind+']').forEach(button=>button.onclick=()=>{
  const n=Number(button.dataset[kind]);update(n);persist();render();$('[data-'+kind+'="'+n+'"]')?.focus({preventScroll:true});
 });
 const setGlyph=n=>{glyph=n;persist();render();$('[data-glyph="'+n+'"]')?.focus()};
 bind('glyph',n=>{glyph=n});
 qa('[data-answer]').forEach(button=>button.onclick=()=>{
  draft[glyph]={...draft[glyph],answer:Number(button.dataset.answer)};syncPractice();
 });
 $('#prev').onclick=()=>setGlyph(figures[index-1].id);
 $('#next').onclick=()=>setGlyph(figures[index+1].id);
 $('#glyph').onclick=clickStroke;
 $('#glyph').onkeydown=e=>{
  const direction={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[e.key];
  if(!direction)return;
  e.preventDefault();
  const n=draft[glyph]?.stroke||0;
  chooseStroke(n?(n-1+direction+f.count)%f.count+1:direction>0?1:f.count);
 };
 $('#submit').onclick=submit;
 if(teacher)$('#open').onclick=e=>advance(1,e.currentTarget);
}
function syncPractice(){
 persist();
 const {stroke,answer}=draft[glyph]||{};
 qa('[data-highlight]').forEach(layer=>layer.classList.toggle('active',Number(layer.dataset.highlight)===stroke));
 qa('[data-answer]').forEach(button=>button.setAttribute('aria-pressed',selected(Number(button.dataset.answer)===answer)));
 $('#stage .progress').textContent='已完成 '+figures.filter(completed).length+' / 5 组';
 $('[data-glyph="'+glyph+'"] small').textContent=completed(figure(glyph))?'已选':'待选';
 $('[data-glyph="'+glyph+'"]').dataset.completed=String(completed(figure(glyph)));
 const saved=isSaved();
 $('#submit').disabled=saved||sending||!figures.every(completed);
 $('#submitStatus').textContent=practiceStatus();
}
function chooseStroke(n){
 if(draft[glyph]?.stroke===n)return;
 draft[glyph]={...draft[glyph],stroke:n};syncPractice();
}
function clickStroke(e){
 const im=e.currentTarget.querySelector('.glyph-base');
 if(!im?.naturalWidth)return;
 const r=im.getBoundingClientRect(),scale=Math.min(r.width/im.naturalWidth,r.height/im.naturalHeight),w=scale*im.naturalWidth,h=scale*im.naturalHeight;
 const n=hitMap.size,x=Math.floor((e.clientX-r.left-(r.width-w)/2)/w*n),y=Math.floor((e.clientY-r.top-(r.height-h)/2)/h*n);
 if(x<0||x>=n||y<0||y>=n)return;
 const data=hitMap.groups[glyph];
 let best=5, picked=0;
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
  const d=dx*dx+dy*dy;
  if(d>=best||x+dx<0||x+dx>=n||y+dy<0||y+dy>=n)continue;
  const hit=parseInt(data[(y+dy)*n+x+dx],16);
  if(hit){best=d;picked=hit}
 }
 if(picked)chooseStroke(picked);
}
async function submit(e){
 const current=room,entries=allEntries();
 if(e.currentTarget.disabled||sending||!figures.every(completed))return;
 if(current.role==='teacher'){submitted=entries;syncPractice();return}
 sending=true;render();
 let message='';
 try{
  await api('/api/room/'+current.code+'/answer',{entries,student:current.student});
  if(room===current){submitted=entries;persist()}
 }catch(e){message=e.message}
 finally{sending=false;if(room===current){render();if(message&&$('#submitStatus'))$('#submitStatus').textContent=message}}
}
async function showStats(e){
 const button=e.currentTarget,current=room,out=$('#statistics');
 if(!out.hidden){out.hidden=true;button.textContent='查看统计';button.setAttribute('aria-expanded','false');return}
 button.disabled=true;
 try{
  const {total,perfect,counts}=await api('/api/room/'+current.code+'/stats',{},current.key);
  if(!out.isConnected)return;
  out.innerHTML=total?`<h3>课堂统计</h3><p><strong>五组全对：${perfect} / ${total} 人（${Math.round(100*perfect/total)}%）</strong></p>
  <p class="tip">按已提交的 ${total} 人统计。下面是每组答对的人数。</p>
  <ul class="chart">${counts.map(({glyph,correct})=>`<li><label for="bar-${glyph}">${figure(glyph).name}</label><meter id="bar-${glyph}" min="0" max="${total}" value="${correct}"></meter><span>${correct} / ${total} 人</span></li>`).join('')}</ul>${counts.some(x=>x.correct<total)?`<h3>选一题，看看错在哪里</h3><div class="actions">${counts.filter(x=>x.correct<total).map(x=>`<button type="button" data-review="${x.glyph}">${figure(x.glyph).name} · ${total-x.correct} 人选错</button>`).join('')}</div><div id="penErrorReview"></div>`:'<p>五组都没有出现错选。</p>'}`:'<p>目前还没有同学提交。</p>';
  out.querySelectorAll('[data-review]').forEach(btn=>btn.onclick=()=>{
   const row=counts.find(x=>x.glyph===Number(btn.dataset.review)), f=figure(row.glyph);
   out.querySelectorAll('[data-review]').forEach(b=>b.setAttribute('aria-pressed',selected(b===btn)));
   const target=$('#penErrorReview');
   target.innerHTML=`<h4>${f.name}</h4>${picture(f,0)}<div class="option-list" aria-label="五个可选表述">${statements.map(([word],i)=>`<button type="button" class="option" aria-pressed="false" data-review-option="${i+1}">表述${i+1}：${word} <small>· ${row.choices[i]} 人</small></button>`).join('')}</div><p class="status" role="status"></p>`;
   target.querySelectorAll('[data-review-option]').forEach(b=>b.onclick=()=>{
    target.querySelectorAll('[data-review-option]').forEach(item=>item.setAttribute('aria-pressed',selected(item===b)));
    target.querySelector('[role=status]').textContent=Number(b.dataset.reviewOption)===f.answer?'该表述符合这个例字的用笔特点。':'再看看例字的笔画，试试另一条表述。';
   });
  });
 }catch(e){out.textContent=e.message}
 finally{if(out.isConnected){out.hidden=false;button.textContent='收起统计';button.setAttribute('aria-expanded','true');button.disabled=false}}
}
async function draw(e){
 const button=e.currentTarget,current=room,out=$('#sample');
 button.disabled=true;
 try{
  const {sample}=await api('/api/room/'+current.code+'/draw',{previous},current.key);
  if(!out.isConnected)return;
  if(!sample){out.textContent='还没有同学提交。';return}
  previous=sample.id;
  const f=figure(sample.glyph);
  out.innerHTML=`<div class="sample workspace">${picture(f,sample.stroke)}<div><h3>${f.name}</h3><p>同学选的是表述${sample.answer}：${statements[sample.answer-1][0]}</p><p class="tip">你从哪里看出来的？</p></div></div>`;
 }catch(e){out.textContent=e.message}
 finally{button.disabled=false}
}
$('#entry').hidden=true;
(async()=>{
 try{
  const code=query.get('class'), role=query.get('role');
  if(!validCode(code)||!['teacher','student'].includes(role))throw Error('请从整堂课进入“用笔之美”。');
  activate({...await api('/api/room/'+code),code,role});
 }catch(e){status.textContent=e.message}
})();
