let DATA=[], sortKey='net', sortDir=-1, query='', openCode=null, unit='rial';
const $=s=>document.querySelector(s);
const fa=n=>Number(n).toLocaleString('fa-IR');
const fmtM=t=> unit==='rial' ? Math.round(Number(t||0)/100000) : Math.round(Number(t||0)/1000000);
const unitLabel=()=> unit==='rial' ? 'میلیون ریال' : 'میلیون تومان';
const pct=r=> r.gross ? Math.round(r.disc/r.gross*100) : 0;
const gpct=g=> g.gross ? Math.round((g.gross-g.net)/g.gross*100) : 0;
const HUES=[45,205,160,285,5,30,130,190,315,95,250];
const hue=i=>HUES[i%HUES.length];
const SORTS=[
 {k:'qty',t:'تعداد فروش'},{k:'inv',t:'تعداد فاکتور'},{k:'gross',t:'ناخالص'},
 {k:'net',t:'خالص'},{k:'disc',t:'تخفیف'},{k:'pct',t:'٪ تخفیف'}
];
function val(r,k){ if(k==='pct') return pct(r); return r[k]; }
async function fetchData(){
 try{const r=await fetch('data.json?t='+Date.now(),{cache:'no-store'});DATA=await r.json();}catch(e){}
 DATA.forEach(r=>{r.disc=(r.gross-r.net);(r.groups||[]).forEach(g=>{g.disc=g.gross-g.net;});});
}
function clock(){const d=new Date();const el=$('#clock');if(el)el.textContent=d.toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});}
function setTheme(t){document.documentElement.dataset.theme=t;try{localStorage.setItem('bf-theme',t);}catch(e){}
 const b=$('#themeBtn');if(b)b.textContent=(t==='dark'?'🌙 تاریک':'☀️ روشن');}
function setUnit(u){unit=u;try{localStorage.setItem('bf-unit',u);}catch(e){}
 const b=$('#unitBtn');if(b)b.textContent=unitLabel();renderTotals();renderPods();renderBoard();}
function filtered(){
 let a=[...DATA];
 if(query){a=a.filter(r=>r.store.includes(query)||(r.groups||[]).some(g=>g.name.includes(query)));}
 const d=sortDir;
 a.sort((x,y)=>(val(x,sortKey)-val(y,sortKey))*d);
 return a;
}
function renderTotals(){
 const q=DATA.reduce((s,r)=>s+r.qty,0),iv=DATA.reduce((s,r)=>s+r.inv,0);
 const g=DATA.reduce((s,r)=>s+r.gross,0),n=DATA.reduce((s,r)=>s+r.net,0),dd=g-n;
 const p=g?Math.round(dd/g*100):0, u=unitLabel();
 const items=[
  {h:45,l:'تعداد فروش',v:fa(q),u:'قلم'},
  {h:205,l:'تعداد فاکتور',v:fa(iv),u:'فاکتور'},
  {h:160,l:'ناخالص',v:fa(fmtM(g)),u:u},
  {h:285,l:'خالص',v:fa(fmtM(n)),u:u},
  {h:5,l:'تخفیف',v:fa(fmtM(dd)),u:u},
  {h:30,l:'٪ تخفیف',v:'٪'+fa(p),u:'میانگین'}
 ];
 $('#totals').innerHTML=items.map(o=>`<div class="kpi" style="--h:${o.h}"><small>${o.l}</small><b>${o.v}</b><span>${o.u}</span></div>`).join('');
 $('#countLine').textContent=fa(DATA.length)+' فروشگاه';
}
function renderPods(){
 const top=[...DATA].sort((a,b)=>b.net-a.net).slice(0,3);
 const slots=[
  {r:top[0],cls:'gold',em:'🥇',rk:'اول'},
  {r:top[1],cls:'silver',em:'🥈',rk:'دوم'},
  {r:top[2],cls:'bronze',em:'🥉',rk:'سوم'}
 ];
 $('#pods').innerHTML=slots.map(s=>{
  const r=s.r; if(!r) return '<div></div>';
  return `<div class="pod ${s.cls}"><div class="md">${s.em}</div><div class="nm">${r.store}</div><span class="rk">رتبه ${s.rk}</span>
  <div class="grid">
   <div class="pcell"><small>تعداد فروش</small><b>${fa(r.qty)}</b></div>
   <div class="pcell"><small>تعداد فاکتور</small><b>${fa(r.inv)}</b></div>
   <div class="pcell"><small>ناخالص</small><b>${fa(fmtM(r.gross))}</b></div>
   <div class="pcell"><small>خالص</small><b>${fa(fmtM(r.net))}</b></div>
   <div class="pcell"><small>تخفیف</small><b>${fa(fmtM(r.disc))}</b></div>
   <div class="pcell"><small>٪ تخفیف</small><b>٪${fa(pct(r))}</b></div>
  </div><span class="unit">${unitLabel()}</span></div>`;
 }).join('');
}
function metric(label,v,hot){return `<div class="m${hot?' hot':''}"><small>${label}</small><b>${v}</b></div>`;}
function renderBoard(){
 const rows=filtered(), u=unitLabel();
 $('#sortbar').innerHTML=SORTS.map(s=>`<button class="sbtn${sortKey===s.k?' on':''}" data-k="${s.k}">${s.t}${sortKey===s.k?(sortDir===-1?' ▼':' ▲'):''}</button>`).join('');
 document.querySelectorAll('#sortbar .sbtn').forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(sortKey===k)sortDir*=-1;else{sortKey=k;sortDir=-1;}renderBoard();});
 $('#headRow').innerHTML=`<div>رتبه</div><div>فروشگاه</div>`+SORTS.map(s=>`<div><button class="${sortKey===s.k?'on':''}" data-k="${s.k}">${s.t}${sortKey===s.k?(sortDir===-1?' ▼':' ▲'):''}</button></div>`).join('')+`<div></div>`;
 document.querySelectorAll('#headRow button').forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(sortKey===k)sortDir*=-1;else{sortKey=k;sortDir=-1;}renderBoard();});
 const el=$('#league');
 if(!rows.length){el.innerHTML='<p style="color:var(--muted);text-align:center">فروشگاهی پیدا نشد.</p>';return;}
 el.innerHTML=rows.map((r,i)=>{
  const rank=i+1,h=hue(DATA.indexOf(r));
  const topG=(r.groups||[])[0];
  const cells=
   metric('تعداد فروش',fa(r.qty))+
   metric('تعداد فاکتور',fa(r.inv))+
   metric('ناخالص',fa(fmtM(r.gross)))+
   metric('خالص',fa(fmtM(r.net)),true)+
   metric('تخفیف',fa(fmtM(r.disc)))+
   metric('٪ تخفیف','٪'+fa(pct(r)));
  const grows=(r.groups||[]).map(g=>`<div class="grow"><div><b>${g.name}</b></div><div>${fa(g.qty)}</div><div>${fa(g.inv)}</div><div>${fa(fmtM(g.gross))}</div><div>${fa(fmtM(g.net))}</div><div>${fa(fmtM(g.disc))}</div><div>٪${fa(gpct(g))}</div></div>`).join('');
  return `<div class="row${openCode===r.code?' open':''}" style="--h:${h}">
   <button class="rowhead" data-code="${r.code}">
    <span class="rank ${rank<=3?'r'+rank:''}">${fa(rank)}</span>
    <span class="storebox"><span class="store">${r.store}</span><br><span class="sub">${fa((r.groups||[]).length)} کارگروه • صدر: ${(topG?topG.name:'—')}</span></span>
    <span class="mgrid">${cells}</span>
    <span class="chev">▾</span>
   </button>
   <div class="drawer"><h3>📦 کارگروه ${r.store} <span class="tag">سورت بر اساس خالص • ${u}</span></h3>
    <div class="gwrap"><div class="gtable"><div class="grow ghead"><div>کارگروه</div><div>فروش</div><div>فاکتور</div><div>ناخالص</div><div>خالص</div><div>تخفیف</div><div>٪</div></div>${grows}</div></div>
   </div></div>`;
 }).join('');
 document.querySelectorAll('.rowhead').forEach(b=>b.onclick=()=>{
  const c=b.dataset.code;
  openCode=(openCode===c?null:c);
  document.querySelectorAll('.row').forEach(x=>x.classList.remove('open'));
  if(openCode){b.parentElement.classList.add('open');}
 });
}
async function load(){
 let st=null,un=null;try{st=localStorage.getItem('bf-theme');un=localStorage.getItem('bf-unit');}catch(e){}
 setTheme(st||'dark'); unit=(un==='toman'?'toman':'rial');
 const ub=$('#unitBtn'); if(ub) ub.textContent=unitLabel();
 $('#themeBtn').onclick=()=>{setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');};
 $('#unitBtn').onclick=()=>{setUnit(unit==='rial'?'toman':'rial');};
 $('#q').addEventListener('input',e=>{query=e.target.value.trim();openCode=null;renderBoard();});
 await fetchData();
 renderTotals();renderPods();renderBoard();
 setInterval(async()=>{await fetchData();renderTotals();renderPods();renderBoard();},60000);
 setInterval(clock,1000);clock();
}
load();
