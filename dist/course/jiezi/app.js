const data=[{name:'篆书',box:[65,637,540,620],shape:'tall',answer:'C',plain:'修长',question:'这个字更修长，还是更扁宽？',detail:'看看整个字的外形：上下舒展，左右围绕中间相互呼应。',term:'纵向取势，对称修长',tip:'“纵向取势”就是字形整体向上下伸展。对称是观察左右的呼应，并非要求两边完全相同。'},{name:'隶书',box:[778,617,555,566],shape:'wide',answer:'A',plain:'扁宽',question:'这个字主要向上下伸展，还是向左右展开？',detail:'把整个字连起来看，字形较扁，笔画向左右展开。',term:'横向取势，字形较扁',tip:'现在看的是整字的宽窄与布局，不只是一笔的长短。'},{name:'楷书',box:[1455,620,504,552],shape:'square',answer:'B',plain:'方整',question:'各部分放在一起，给你怎样的整体感觉？',detail:'看看左右部件的位置和彼此配合：安排有序，整体方整、稳当。',term:'结构严谨，形体方整',tip:'方整是一种整体感受，不是每个字都必须填满一个正方形。'},{name:'行书',box:[2080,635,558,571],shape:'slope',answer:'E',plain:'高低呼应',question:'看这个例字，左右部件的高低有什么变化？',detail:'留意左边与右边的高低安排，体会字形在变化中彼此呼应。',term:'左低右高，刚柔并济',tip:'“左低右高”针对教材这个例字的观察，不是所有行书都必须遵循的规则。'},{name:'草书',box:[2790,665,400,566],shape:'free',answer:'D',plain:'变化丰富',question:'这个例字连起来看，外形有什么收放变化？',detail:'看看字形的收拢与放开、上下的穿插变化，感受自由生动的整体形态。',term:'变化莫测，奥妙绝伦',tip:'可以先用自己的话说“变化多”“有收有放”，不必急着解释所有专业词。'}];
const options={A:'横向取势，字形较扁',B:'结构严谨，形体方整',C:'纵向取势，对称修长',D:'变化莫测，奥妙绝伦',E:'左低右高，刚柔并济'};const shapeFrames={修长:'tall',扁宽:'wide'};let activeGlyph=null, revealed=false, statsHtml="";let step=0,focus=0,guides=false,matched={},answers={},checked=false;const $=s=>document.querySelector(s);
function picture(d,frame=null){const files=['zhuan','li','kai','xing','cao'];return `<div class="picture ${d.shape} ${frame?'frame-'+frame:''}"><img src="assets/${files[data.indexOf(d)]}.jpg" alt="教材${d.name}例字"/>${frame?'<div class="trial-frame" aria-hidden="true"></div>':''}</div>`}
const jieziKey='jiezi-draft:'+parent.classroom?.role+':'+parent.classroom?.code+':'+parent.classroom?.student;
 try{const d=JSON.parse(localStorage.getItem(jieziKey)||'null');if(d){({step,focus,guides,matched,answers,checked}=d)}}catch{}
 function render(){try{localStorage.setItem(jieziKey,JSON.stringify({step,focus,guides,matched,answers,checked}))}catch{}const describing=step===1;
 $('#intro').hidden=describing;
 $('#jieziKicker').hidden=!describing;
 $('#jieziSubtitle').hidden=!describing;
 $('#shapeFooter').hidden=describing;
 document.querySelectorAll('nav button').forEach(b=>{
  const active=+b.dataset.step===step;
  b.classList.toggle('active',active);
  b.setAttribute('aria-current',active?'step':'false');
 });
 let s='';
 if(!describing){
  s=`<p class="sub shape-task">试一试用辅助框来框选一下这两个字，看看它们的外形有什么特点。</p>
  <div class="grid shape-grid">${data.slice(0,2).map((d,i)=>`<article class="card">
   <h3>${d.name}</h3>${picture(d,shapeFrames[matched[i]])}
   <div class="shape-judgment" role="group" aria-label="${d.name}字形判断">
    <span>我判断：这个字的外形是</span>
    ${Object.keys(shapeFrames).map(t=>`<button type="button" data-match="${i}" data-value="${t}" aria-pressed="${matched[i]===t}">${t}</button>`).join('')}
    <span>的。</span>
   </div></article>`).join('')}</div>
  <div class="good first-summary"><p>修长还是扁宽？我们从一笔一画构成的字形中感受到了不同的美。再看看更多的笔画穿插，你还能发现哪些结字之美呢？</p></div>`;
 }

if(describing){
  const locked=!projection&&!structureOpen;
  s=`<h2>看五个例字，选出对应的结字描述</h2>
   <p class="sub">从整个字形，到笔画与部件的安排：它们各有什么特点？选出合适的描述。</p>
   <div class="all-five" aria-label="例字">${data.map((d,i)=>`<button type="button" class="card description-glyph" data-glyph="${i}" aria-pressed="${activeGlyph===i}" ${locked?'disabled':''}><strong>${d.name}</strong>${picture(d)}<span class="chosen-code">已选 <b>${answers[i]||''}</b></span></button>`).join('')}</div>
   <div class="bank description-bank" aria-label="五个描述">${Object.entries(options).map(([k,v])=>`<button type="button" data-answer="${k}" aria-pressed="${activeGlyph!==null&&answers[activeGlyph]===k}" ${locked||activeGlyph===null?'disabled':''}><b>${k}</b>　${v}</button>`).join('')}</div>
   <div class="submit-row">${projection?`<button type="button" id="structureGate">${structureOpen?'暂停学生答题':'继续学生答题'}</button><button type="button" id="structureReveal">公布正确答案</button><button type="button" id="structureStats">查看正确率</button>`:`<button type="button" id="submitClass" ${locked||!data.every((_,i)=>answers[i])?'disabled':''}>提交到课堂</button>`}</div>
   <p id="submitStatus" role="status">${locked?'老师已暂停答题，之前的选择会保留。':''}</p>
   ${projection&&revealed?`<div class="bank" aria-label="正确答案">${data.map(d=>`<p><b>${d.name} · ${d.answer}</b>　${options[d.answer]}</p>`).join('')}</div>`:''}
   ${projection?statsHtml:''}
   <div class="summary lesson-end"><small>我们的发现</small><p>从一笔一画看到一个完整的字，笔画怎么安排，彼此怎么呼应，会让整个字呈现出不同的美，这就是<strong>结字之美</strong>。</p></div>
   ${projection&&parent!==window?`<div class="composition-next"><button type="button" id="toComposition">下一步：章法之美 →</button><p id="compositionStatus" role="status"></p></div>`:parent===window?'<div class="composition-next"><a href="/zhangfa">下一步：章法之美 →</a></div>':''}`;
 }
 $('#stage').innerHTML=s;
 bind();
}
function bind(){
 const bindChoice=(selector,update)=>document.querySelectorAll(selector).forEach(b=>b.onclick=()=>{
  update(b.dataset);render();
  document.querySelector(selector+Object.entries(b.dataset).map(([k,v])=>'[data-'+k+'="'+v+'"]').join(''))?.focus({preventScroll:true});
 });
 bindChoice('[data-match]',({match,value})=>{matched[match]=value});
 bindChoice('[data-glyph]',({glyph})=>{activeGlyph=Number(glyph)});
 bindChoice('[data-answer]',({answer})=>{if(activeGlyph!==null)answers[activeGlyph]=answer});
 if($('#submitClass'))$('#submitClass').onclick=submitClass;
 if($('#structureGate'))$('#structureGate').onclick=()=>structureAction('toggle');
 if($('#structureReveal'))$('#structureReveal').onclick=()=>{revealed=true;render()};
 if($('#structureStats'))$('#structureStats').onclick=()=>structureAction('stats');
 if($('#toComposition'))$('#toComposition').onclick=async e=>{
  const button=e.currentTarget;
  button.disabled=true;
  try{await parent.advanceToComposition()}
  catch(err){$('#compositionStatus').textContent=err.message}
  finally{button.disabled=false}
 };
}
function showStep(next){step=next;render();window.scrollTo(0,0)}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>showStep(+b.dataset.step));
$('#next').onclick=()=>showStep(1);
render();
