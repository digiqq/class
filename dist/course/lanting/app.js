const versions=[
 {id:'feng',short:'第1幅',name:'冯承素摹本（局部）',sub:'唐摹本',img:'assets/feng.jpg'},
 {id:'yu',short:'第2幅',name:'虞世南摹本（局部）',sub:'唐摹本',img:'assets/yu.jpg'},
 {id:'chu',short:'第3幅',name:'褚遂良摹本（局部）',sub:'传为唐摹本',img:'assets/chu.jpg'},
 {id:'dingwu',short:'第4幅',name:'定武本（局部）',sub:'宋拓本',img:'assets/dingwu.jpg'}
];

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function setPressed(button,selected){button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected))}
$('#worksGrid').innerHTML=versions.map((v,i)=>`<button type="button" class="work-card" data-id="${v.id}" aria-pressed="false"><span class="badge">${i+1}</span><img src="${v.img}" alt=""><h3>${v.name}</h3><p>${v.sub}</p></button>`).join('');
