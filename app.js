let DATA=[], sortKey='net', sortDir=-1, openCode=null, unit='toman', gsortKey='net', gsortDir=-1;
let openG=new Set();
const $=s=>document.querySelector(s);
const fa=n=>Number(n).toLocaleString('fa-IR');
// مبالغ ERP به ریال است: میلیون ریال = ریال/1,000,000 ، میلیون تومان = ریال/10,000,000
const fmtM=t=> unit==='rial' ? Math.round(Number(t||0)/1000000) : Math.round(Number(t||0)/10000000);
const unitLabel=()=> unit==='rial' ? 'میلیون ریال' : 'میلیون تومان';
const unitBtnLabel=()=> unit==='rial' ? 'میلیون ریال ⇄' : 'میلیون تومان ⇄';
const pct=r=> r.gross ? Math.round(r.disc/r.gross*100) : 0;
const gpct=g=> g.gross ? Math.round((g.gross-g.net)/g.gross*100) : 0;
const HUES=[45,205,160,285,5,30,130,190,315,95,250];
const hue=i=>HUES[i%HUES.length];
const SORTS=[
 {k:'qty',t:'تعداد فروش'},{k:'inv',t:'تعداد فاکتور'},{k:'gross',t:'ناخالص'},
 {k:'net',t:'خالص'},{k:'disc',t:'تخفیف'},{k:'pct',t:'٪ تخفیف'}
];
const GSORTS=[
 {k:'name',t:'کارگروه'},{k:'qty',t:'فروش'},{k:'inv',t:'فاکتور'},{k:'gross',t:'ناخالص'},
 {k:'net',t:'خالص'},{k:'disc',t:'تخفیف'},{k:'pct',t:'٪'}
];
function val(r,k){ if(k==='pct') return pct(r); return r[k]; }
function gval(g,k){ if(k==='pct') return gpct(g); if(k==='name') return g.name; return g[k]; }
function sortGroups(list){
 const a=[...list]; const d=gsortDir;
 if(gsortKey==='name'){ a.sort((x,y)=> String(x.name).localeCompare(String(y.name),'fa')*d); }
 else{ a.sort((x,y)=> (gval(x,gsortKey)-gval(y,gsortKey))*d); }
 return a;
}
function sortModels(list){
 const a=[...(list||[])]; const d=gsortDir;
 if(gsortKey==='name'){ a.sort((x,y)=> String(x.name).localeCompare(String(y.name),'fa',{numeric:true})*d); }
 else{ a.sort((x,y)=> (gval(x,gsortKey)-gval(y,gsortKey))*d); }
 return a;
}
async function fetchData(){
 try{const r=await fetch('data.json?t='+Date.now(),{cache:'no-store'});DATA=await r.json();}catch(e){}
 DATA.forEach(r=>{r.disc=(r.gross-r.net);(r.groups||[]).forEach(g=>{g.disc=g.gross-g.net;(g.models||[]).forEach(m=>{m.disc=m.gross-m.net;});});});
}
function tickClock(){
 const d=new Date();
 const c=$('#clock'); if(c) c.textContent=d.toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});
 const ld=$('#livedate');
 if(ld){ try{ ld.textContent=d.toLocaleDateString('fa-IR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }catch(e){} }
}
function setTheme(t){document.documentElement.dataset.theme=t;try{localStorage.setItem('bf-theme',t);}catch(e){}
 const b=$('#themeBtn');if(b)b.textContent=(t==='dark'?'🌙 تاریک':'☀️ روشن');}
function setUnit(u){unit=u;try{localStorage.setItem('bf-unit',u);}catch(e){}
 const b=$('#unitBtn');if(b)b.textContent=unitBtnLabel();renderTotals();renderBoard();}
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
 const ul=$('#unitLine'); if(ul) ul.textContent=u;
}
function metric(label,v,hot){return `<div class="m${hot?' hot':''}"><small>${label}</small><b>${v}</b></div>`;}
function renderBoard(){
 const rows=[...DATA].sort((x,y)=>(val(x,sortKey)-val(y,sortKey))*sortDir);
 const u=unitLabel();
 $('#sortbar').innerHTML=SORTS.map(s=>`<button class="sbtn${sortKey===s.k?' on':''}" data-k="${s.k}">${s.t}${sortKey===s.k?(sortDir===-1?' ▼':' ▲'):''}</button>`).join('');
 document.querySelectorAll('#sortbar .sbtn').forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(sortKey===k)sortDir*=-1;else{sortKey=k;sortDir=-1;}renderBoard();});
 $('#headRow').innerHTML=`<div>رتبه</div><div>فروشگاه</div>`+SORTS.map(s=>`<div><button class="${sortKey===s.k?'on':''}" data-k="${s.k}">${s.t}${sortKey===s.k?(sortDir===-1?' ▼':' ▲'):''}</button></div>`).join('')+`<div></div>`;
 document.querySelectorAll('#headRow button').forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(sortKey===k)sortDir*=-1;else{sortKey=k;sortDir=-1;}renderBoard();});
 const el=$('#league');
 if(!rows.length){el.innerHTML='<p style="color:var(--muted);text-align:center">فروشگاهی پیدا نشد.</p>';return;}
 el.innerHTML=rows.map((r,i)=>{
  const rank=i+1,h=hue(DATA.indexOf(r));
  const cells=
   metric('تعداد فروش',fa(r.qty))+
   metric('تعداد فاکتور',fa(r.inv))+
   metric('ناخالص',fa(fmtM(r.gross)))+
   metric('خالص',fa(fmtM(r.net)),true)+
   metric('تخفیف',fa(fmtM(r.disc)))+
   metric('٪ تخفیف','٪'+fa(pct(r)));
  const glist=sortGroups(r.groups||[]);
  const ghead=`<div class="grow ghead">`+GSORTS.map(s=>`<div><button class="${gsortKey===s.k?'on':''}" data-gk="${s.k}">${s.t}${gsortKey===s.k?(gsortDir===-1?' ▼':' ▲'):''}</button></div>`).join('')+`</div>`;
  const gitems=glist.map(g=>{
   const gk=r.code+'|'+g.name;
   const isOpen=openG.has(gk);
   const mlist=sortModels(g.models||[]);
   let mbody='';
   if(!mlist.length){
    mbody=`<div style="padding:10px;text-align:center;color:var(--muted);font-size:11px">برای این کارگروه مدلی ثبت نشده — data.json جدید (مدل‌دار) را جایگزین کنید</div>`;
   } else {
    const mhead=`<div class="mrow mhead"><div>مدل</div><div>فروش</div><div>فاکتور</div><div>ناخالص</div><div>خالص</div><div>تخفیف</div><div>٪</div><div>عکس</div></div>`;
    const mrows=mlist.map(m=>{
     const kw='https://www.sergestyle.com/product?keyword='+encodeURIComponent(m.name);
     return `<div class="mrow"><div><b>${m.name}</b></div><div>${fa(m.qty)}</div><div>${fa(m.inv)}</div><div>${fa(fmtM(m.gross))}</div><div>${fa(fmtM(m.net))}</div><div>${fa(fmtM(m.disc))}</div><div>٪${fa(gpct(m))}</div><div><a class="pbtn" href="${kw}" target="_blank" rel="noopener">📷 عکس</a></div></div>`;
    }).join('');
    mbody=mhead+mrows;
   }
   return `<div class="gitem${isOpen?' open':''}">
    <button class="grow" data-gk2="${gk.replace(/"/g,'')}">
     <div><b>${g.name} <span class="mini">▾</span></b></div><div>${fa(g.qty)}</div><div>${fa(g.inv)}</div><div>${fa(fmtM(g.gross))}</div><div>${fa(fmtM(g.net))}</div><div>${fa(fmtM(g.disc))}</div><div>٪${fa(gpct(g))}</div>
    </button>
    <div class="mwrap"><div class="mtable">${mbody}</div></div>
   </div>`;
  }).join('');
  return `<div class="row${openCode===r.code?' open':''}" style="--h:${h}">
   <button class="rowhead" data-code="${r.code}">
    <span class="rank ${rank<=3?'r'+rank:''}">${fa(rank)}</span>
    <span class="storebox"><span class="store">${r.store}</span></span>
    <span class="mgrid">${cells}</span>
    <span class="chevwrap"><span class="chevlabel">کارگروه و کد مدل</span><span class="chev">▾</span></span>
   </button>
   <div class="drawer"><h3>📦 کارگروه ${r.store} <span class="tag">${u}</span></h3>
    <div class="gwrap"><div class="gtable">${ghead}${gitems}</div></div>
   </div></div>`;
 }).join('');
 document.querySelectorAll('.rowhead').forEach(b=>b.onclick=()=>{
  const c=b.dataset.code;
  openCode=(openCode===c?null:c);
  document.querySelectorAll('.row').forEach(x=>x.classList.remove('open'));
  if(openCode){b.parentElement.classList.add('open');}
 });
 document.querySelectorAll('.ghead button').forEach(b=>b.onclick=(e)=>{
  e.stopPropagation();
  const k=b.dataset.gk;
  if(gsortKey===k)gsortDir*=-1;else{gsortKey=k;gsortDir=(k==='name'?1:-1);}
  renderBoard();
 });
 document.querySelectorAll('button.grow[data-gk2]').forEach(b=>b.onclick=(e)=>{
  e.stopPropagation();
  const k=b.dataset.gk2;
  const item=b.parentElement;
  if(openG.has(k)){openG.delete(k);item.classList.remove('open');}
  else{openG.add(k);item.classList.add('open');}
 });
 document.querySelectorAll('.pbtn').forEach(a=>a.onclick=(e)=>{e.stopPropagation();});
}
async function load(){
 let st=null,un=null;try{st=localStorage.getItem('bf-theme');un=localStorage.getItem('bf-unit');}catch(e){}
 setTheme(st||'dark');
 unit=(un==='rial'?'rial':'toman');
 const ub=$('#unitBtn'); if(ub) ub.textContent=unitBtnLabel();
 $('#themeBtn').onclick=()=>{setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');};
 $('#unitBtn').onclick=()=>{setUnit(unit==='rial'?'toman':'rial');};
 await fetchData();
 renderTotals();renderBoard();
 setInterval(async()=>{await fetchData();renderTotals();renderBoard();},60000);
 tickClock(); setInterval(tickClock,10000);
}
load();
