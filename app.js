let DATA=[], sortKey='net', sortDir=-1, query='', openCode=null;
const $=s=>document.querySelector(s);
const fa=n=>Number(n).toLocaleString('fa-IR');
const fa1=n=>Number(n).toLocaleString('fa-IR',{minimumFractionDigits:1,maximumFractionDigits:1});
const M=t=>Math.round(Number(t||0)/100000); // تومان -> میلیون ریال، بدون اعشار
const pct=r=>r.gross?(r.disc/r.gross*100):0;
const gpct=g=>g.gross?((g.gross-g.net)/g.gross*100):0;
const HUES=[45,205,160,285,5,30,130,190,315,95,250];
const hue=i=>HUES[i%HUES.length];
const SORTS=[
 {k:'qty',t:'تعداد فروش'},{k:'inv',t:'تعداد فاکتور'},{k:'gross',t:'ناخالص'},
 {k:'net',t:'خالص'},{k:'disc',t:'تخفیف'},{k:'pct',t:'٪ تخفیف'}
];
async function fetchData(){
 try{const r=await fetch('data.json?t='+Date.now(),{cache:'no-store'});DATA=await r.json();}catch(e){}
 DATA.forEach(r=>{r.disc=(r.gross-r.net);r.pct=r.gross?(r.disc/r.gross*100):0;(r.groups||[]).forEach(g=>{g.disc=g.gross-g.net;});});
}
function clock(){const d=new Date();const el=$('#clock');if(el)el.textContent=d.toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});}
function setTheme(t){document.documentElement.dataset.theme=t;try{localStorage.setItem('bf-theme',t);}catch(e){}
 const b=$('#themeBtn');if(b)b.textContent=(t==='dark'?'🌙 تاریک':'☀️ روشن');}
function filtered(){
 let a=[...DATA];
 if(query){a=a.filter(r=>r.store.includes(query)||(r.groups||[]).some(g=>g.name.includes(query)));}
 const dir=sortDir;
 a.sort((x,y)=>{
  let vx,vy;
  if(sortKey==='pct'){vx=x.pct;vy=y.pct;}
  else{vx=x[sortKey];vy=y[sortKey];}
  return (vx-vy)*dir;
 });
 return a;
}
function renderTotals(){
 const q=DATA.reduce((s,r)=>s+r.qty,0),iv=DATA.reduce((s,r)=>s+r.inv,0);
 const g=DATA.reduce((s,r)=>s+r.gross,0),n=DATA.reduce((s,r)=>s+r.net,0),d=g-n,p=g?(d/g*100):0;
 const items=[
  {h:45,l:'تعداد فروش',v:fa(q),u:'قلم'},
  {h:205,l:'تعداد فاکتور',v:fa(iv),u:'فاکتور'},
  {h:160,l:'ناخالص',v:fa(M(g)),u:'میلیون ریال'},
  {h:285,l:'خالص',v:fa(M(n)),u:'میلیون ریال'},
  {h:5,l:'تخفیف',v:fa(M(d)),u:'میلیون ریال'},
  {h:30,l:'٪ تخفیف',v:'٪'+fa1(p),u:'میانگین'},
 ];
 $('#totals').innerHTML=items.map(o=>`<div class="kpi" style="--h:${o.h}"><small>${o.l}</small><b>${o.v}</b> <span>${o.u}</span></div>`).join('');
 $('#countLine').textContent=fa(DATA.length)+' فروشگاه';
}
function renderPods(){
 const top=[...DATA].sort((a,b)=>b.net-a.net).slice(0,3);
 const slots=[
  {r:top[1],cls:'silver',em:'🥈',rk:'دوم'},
  {r:top[0],cls:'gold',em:'🥇',rk:'اول'},
  {r:top[2],cls:'bronze',em:'🥉',rk:'سوم'}
 ];
 $('#pods').innerHTML=slots.map(s=>{
  const r=s.r;
  if(!r)return '<div></div>';
  const p=r.pct;
  return `<div class="pod ${s.cls}"><div class="md">${s.em}</div><div class="nm">${r.store}</div><span class="rk">رتبه ${s.rk}</span>
  <div class="grid">
   <div class="cell"><small>تعداد فروش</small><b>${fa(r.qty)}</b></div>
   <div class="cell"><small>تعداد فاکتور</small><b>${fa(r.inv)}</b></div>
   <div class="cell"><small>ناخالص</small><b>${fa(M(r.gross))}</b></div>
   <div class="cell"><small>خالص</small><b>${fa(M(r.net))}</b></div>
   <div class="cell"><small>تخفیف</small><b>${fa(M(r.disc))}</b></div>
   <div class="cell"><small>٪ تخفیف</small><b>٪${fa1(p)}</b></div>
  </div><div class="tag" style="margin-top:7px;background:rgba(255,255,255,.5)">میلیون ریال</div></div>`;
 }).join('');
}
function metric(label,val,hot){
 return `<div class="m${hot?' hot':''}"><small>${label}</small><b>${val}</b></div>`;
}
function renderBoard(){
 const rows=filtered();
 // sortbar
 $('#sortbar').innerHTML=SORTS.map(s=>`<button class="sbtn${sortKey===s.k?' on':''}" data-k="${s.k}">${s.t}${sortKey===s.k?(sortDir===-1?' ▼':' ▲'):''}</button>`).join('');
 document.querySelectorAll('#sortbar .sbtn').forEach(b=>b.onclick=()=>{
  const k=b.dataset.k;
  if(sortKey===k)sortDir*=-1;else{sortKey=k;sortDir=-1;}
  renderBoard();
 });
 // desktop head
 $('#headRow').innerHTML=`<div>رتبه</div><div>فروشگاه</div>`+SORTS.map(s=>`<div><button class="${sortKey===s.k?'on':''}" data-k="${s.k}">${s.t}${sortKey===s.k?(sortDir===-1?' ▼':' ▲'):''}</button></div>`).join('')+`<div></div>`;
 document.querySelectorAll('#headRow button').forEach(b=>b.onclick=()=>{
  const k=b.dataset.k;
  if(sortKey===k)sortDir*=-1;else{sortKey=k;sortDir=-1;}
  renderBoard();
 });
 const el=$('#league');
 if(!rows.length){el.innerHTML='<p style="color:var(--muted)">فروشگاهی پیدا نشد.</p>';return;}
 el.innerHTML=rows.map((r,i)=>{
  const rank=i+1,h=hue(DATA.indexOf(r));
  const topG=(r.groups||[])[0];
  const cells=
   metric('تعداد فروش',fa(r.qty))+
   metric('تعداد فاکتور',fa(r.inv))+
   metric('ناخالص',fa(M(r.gross)))+
   metric('خالص',fa(M(r.net)),true)+
   metric('تخفیف',fa(M(r.disc)))+
   metric('٪ تخفیف','٪'+fa1(r.pct));
  const grows=(r.groups||[]).map(g=>`<div class="grow"><div class="gn">${g.name}</div><div>فروش <b>${fa(g.qty)}</b></div><div>فاکتور <b>${fa(g.inv)}</b></div><div>ناخالص <b>${fa(M(g.gross))}</b></div><div>خالص <b>${fa(M(g.net))}</b></div><div>تخفیف <b>${fa(M(g.disc))}</b></div><div>٪ <b>٪${fa1(gpct(g))}</b></div></div>`).join('');
  return `<div class="row${openCode===r.code?' open':''}" style="--h:${h}">
   <button class="rowhead" data-code="${r.code}">
    <span class="rank ${rank<=3?'r'+rank:''}">${fa(rank)}</span>
    <span class="storebox"><span class="store">${r.store}</span><br><span class="sub">${fa((r.groups||[]).length)} کارگروه • صدر: ${(topG?topG.name:'—')} • میلیون ریال</span></span>
    <span class="mgrid">${cells}</span>
    <span class="chev">▾</span>
   </button>
   <div class="drawer"><h3>📦 کارگروه ${r.store} <span class="tag">سورت بر اساس خالص • میلیون ریال</span></h3>
    <div class="gtable"><div class="grow ghead"><div>کارگروه</div><div>تعداد فروش</div><div>تعداد فاکتور</div><div>ناخالص</div><div>خالص</div><div>تخفیف</div><div>٪</div></div>${grows}</div>
   </div></div>`;
 }).join('');
 document.querySelectorAll('.rowhead').forEach(b=>b.onclick=()=>{
  const c=b.dataset.code;
  openCode=(openCode===c?null:c);
  document.querySelectorAll('.row').forEach(x=>x.classList.remove('open'));
  if(openCode){const p=b.parentElement;p.classList.add('open');}
 });
}
async function load(){
 let saved=null;try{saved=localStorage.getItem('bf-theme');}catch(e){}
 setTheme(saved||'dark');
 $('#themeBtn').onclick=()=>{setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');};
 $('#q').addEventListener('input',e=>{query=e.target.value.trim();openCode=null;renderBoard();});
 await fetchData();
 renderTotals();renderPods();renderBoard();
 setInterval(async()=>{await fetchData();renderTotals();renderPods();renderBoard();},60000);
 setInterval(clock,1000);clock();
}
load();
