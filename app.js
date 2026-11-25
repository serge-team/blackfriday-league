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
let LAST_UPDATE=null;
let LEAGUE_DATE='';
async function fetchData(){
 try{
  const r=await fetch('data.json?t='+Date.now(),{cache:'no-store'});
  const lm=r.headers.get('last-modified');
  const j=await r.json();
  if(Array.isArray(j)){ DATA=j; LAST_UPDATE=lm?new Date(lm):null; }
  else{
   DATA=(j.stores||j.data||[]);
   if(j.updated_at){ LAST_UPDATE=new Date(j.updated_at); } else if(lm){ LAST_UPDATE=new Date(lm); }
   // تک‌فایل: تاریخچه داخل همان data.json است
   try{
    if(j.rows&&j.rows.length){
     HROWS=j.rows.map(x=>({...x,d:normD(x.d)}));
     HDATES=[...((j.dates&&j.dates.length?j.dates:j.rows.map(x=>x.d)))].map(normD).filter(Boolean);
     HDATES=[...new Set(HDATES)].sort();
     LEAGUE_DATE=normD(j.league_date||j.max_date||HDATES[HDATES.length-1]||'');
    } else if(j.min_date&&j.max_date){
     HDATES=[]; LEAGUE_DATE=normD(j.league_date||j.max_date||'');
    }
   }catch(e){}
  }
 }catch(e){}
 DATA.forEach(r=>{r.disc=(r.gross-r.net);(r.groups||[]).forEach(g=>{g.disc=g.gross-g.net;(g.models||[]).forEach(m=>{m.disc=m.gross-m.net;});});});
}
function renderUpdateTime(){
 const d=(LAST_UPDATE&&!isNaN(LAST_UPDATE))?LAST_UPDATE:new Date();
 const c=$('#clock'); if(c) c.textContent=d.toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tehran'});
 const ld=$('#livedate');
 if(ld){ try{ ld.textContent=d.toLocaleDateString('fa-IR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Tehran'}); }catch(e){} }
}
const tickClock=renderUpdateTime;
function setTheme(t){document.documentElement.dataset.theme=t;try{localStorage.setItem('bf-theme',t);}catch(e){}
 const b=$('#themeBtn');if(b)b.textContent=(t==='dark'?'🌙 تاریک':'☀️ روشن');}
function setUnit(u){unit=u;try{localStorage.setItem('bf-unit',u);}catch(e){}
 const b=$('#unitBtn');if(b)b.textContent=unitBtnLabel();renderTotals();renderBoard();
 try{if(typeof renderHTotals==='function'&&typeof HDATA!=='undefined'&&HDATA.length)renderHTotals();}catch(e){}
 try{if(typeof renderHBoard==='function'&&typeof HDATA!=='undefined'&&HDATA.length)renderHBoard();}catch(e){}
 try{if(typeof renderCompare==='function'&&typeof CMP!=='undefined'&&CMP.rows)renderCompare();}catch(e){}
 try{if(typeof syncUnitLines==='function')syncUnitLines();}catch(e){}}
function renderTotals(){
 const q=DATA.reduce((s,r)=>s+r.qty,0),iv=DATA.reduce((s,r)=>s+r.inv,0);
 const g=DATA.reduce((s,r)=>s+r.gross,0),n=DATA.reduce((s,r)=>s+r.net,0),dd=g-n;
 const cr=DATA.reduce((s,r)=>s+(Number(r.credit)||0),0);
 const p=g?Math.round(dd/g*100):0, u=unitLabel();
 const shr=n?Math.round(cr/n*100):0;
 const items=[
  {h:45,l:'تعداد فروش',v:fa(q),u:'قلم'},
  {h:205,l:'تعداد فاکتور',v:fa(iv),u:'فاکتور'},
  {h:160,l:'ناخالص',v:fa(fmtM(g)),u:u},
  {h:285,l:'خالص',v:fa(fmtM(n)),u:u},
  {h:5,l:'مبلغ تخفیف',v:fa(fmtM(dd)),u:u},
  {h:30,l:'٪ تخفیف',v:'٪'+fa(p),u:'میانگین'},
  {h:200,l:'فروش اعتباری',v:fa(fmtM(cr)),u:'٪'+fa(shr)+' از خالص'}
 ];
 $('#totals').innerHTML=items.map(o=>`<div class="kpi" style="--h:${o.h}"><small>${o.l}</small><b>${o.v}</b><span>${o.u}</span></div>`).join('');
 { const lc=$('#countLine'); if(lc) lc.textContent=fa(DATA.length)+' فروشگاه'+(LEAGUE_DATE?' • '+fmtD(LEAGUE_DATE):''); }
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
    const mhead=`<div class="mrow mhead"><div>مدل</div><div>فروش</div><div>فاکتور</div><div>ناخالص</div><div>خالص</div><div>تخفیف</div><div>٪</div><div>📷</div></div>`;
    const mrows=mlist.map(m=>{
     const kw='https://www.sergestyle.com/product?keyword='+encodeURIComponent(m.name);
     return `<div class="mrow"><div><b>${m.name}</b></div><div>${fa(m.qty)}</div><div>${fa(m.inv)}</div><div>${fa(fmtM(m.gross))}</div><div>${fa(fmtM(m.net))}</div><div>${fa(fmtM(m.disc))}</div><div>٪${fa(gpct(m))}</div><div><a class="pbtn" href="${kw}" target="_blank" rel="noopener">📷</a></div></div>`;
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
 renderTotals();renderBoard();renderUpdateTime();
 try{ if(typeof bootTabs==='function') bootTabs(); }catch(e){ console.warn(e); }
 setInterval(async()=>{await fetchData();renderTotals();renderBoard();renderUpdateTime();try{if(typeof refreshHistoryLive==='function')refreshHistoryLive();}catch(e){}},60000);
}
load();

/* ================= تب‌ها + تاریخ شمسی + سابقه و مقایسه ================= */
let HROWS=[], HDATES=[], HDATA=[];
let H_FROM='', H_TO='', hsortKey='net', hsortDir=-1, hOpenCode=null, hOpenG=new Set();
let C_AFROM='', C_ATO='', C_BFROM='', C_BTO='', CMP={a:[],b:[],rows:[],tot:{}}, cmpSortKey='netB', cmpSortDir=-1;
let CAL_FOR=null, CAL_Y=1405, CAL_M=9;
const FA_D='۰۱۲۳۴۵۶۷۸۹';
const en2fa=s=>String(s).replace(/[0-9]/g,d=>FA_D[d]);
const fa2en=s=>String(s||'').replace(/[۰-۹]/g,d=>FA_D.indexOf(d)).replace(/[^0-9\/]/g,'');
const JM=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const DOW=['ش','ی','د','س','چ','پ','ج'];
function jdiv(a,b){return ~~(a/b);}function jmod(a,b){return a-~~(a/b)*b;}
function jalCal(jy){const breaks=[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];const bl=breaks.length;const gy=jy+621;let leapJ=-14,jp=breaks[0],jm=0,jump=0,leap=0,leapG=0,march=0,n=0,i=0;if(jy<jp||jy>=breaks[bl-1])throw new Error('Invalid Jalaali year '+jy);for(i=1;i<bl;i++){jm=breaks[i];jump=jm-jp;if(jy<jm)break;leapJ=leapJ+jdiv(jump,33)*8+jdiv(jmod(jump,33),4);jp=jm;}n=jy-jp;leapJ=leapJ+jdiv(n,33)*8+jdiv(jmod(n,33)+3,4);if(jmod(jump,33)===4&&jump-n===4)leapJ+=1;leapG=jdiv(gy,4)-jdiv((jdiv(gy,100)+1)*3,4)-150;march=20+leapJ-leapG;if(jump-n<6)n=n-jump+jdiv(jump+4,33)*33;leap=jmod(jmod(n+1,33)-1,4);if(leap===-1)leap=4;return{leap:leap,gy:gy,march:march};}
function g2d(gy,gm,gd){let d=jdiv((gy+jdiv(gm-8,6)+100100)*1461,4)+jdiv(153*jmod(gm+9,12)+2,5)+gd-34840408;d=d-jdiv(jdiv(gy+100100+jdiv(gm-8,6),100)*3,4)+752;return d;}
function d2g(jdn){let j=4*jdn+139361631;j=j+jdiv(jdiv(4*jdn+183187720,146097)*3,4)*4-3908;const i=jdiv(jmod(j,1461),4)*5+308;const gd=jdiv(jmod(i,153),5)+1;const gm=jmod(jdiv(i,153),12)+1;const gy=jdiv(j,1461)-100100+jdiv(8-gm,6);return[gy,gm,gd];}
function j2d(jy,jm,jd){const r=jalCal(jy);return g2d(r.gy,3,r.march)+(jm-1)*31-jdiv(jm,7)*(jm-7)+jd-1;}
function d2j(jdn){const gy=d2g(jdn)[0];let jy=gy-621;let r=jalCal(jy);const jdn1f=g2d(gy,3,r.march);let jd,jm,k=k0(jdn,jdn1f);function k0(a,b){return a-b;}k=jdn-jdn1f;if(k>=0){if(k<=185){jm=1+jdiv(k,31);jd=jmod(k,31)+1;return[jy,jm,jd];}else k-=186;}else{jy-=1;k+=179;if(r.leap===1)k+=1;r=jalCal(jy);}jm=7+jdiv(k,30);jd=jmod(k,30)+1;return[jy,jm,jd];}
function jal2greg(jy,jm,jd){return d2g(j2d(jy,jm,jd));}
function greg2jal(gy,gm,gd){return d2j(g2d(gy,gm,gd));}
function jLeap(jy){try{return jalCal(jy).leap===0;}catch(e){return false;}}
function jDays(jy,jm){if(jm<=6)return 31;if(jm<=11)return 30;return jLeap(jy)?30:29;}
function cmpD(a,b){a=fa2en(a);b=fa2en(b);const x=a.replace(/\//g,''),y=b.replace(/\//g,'');if(x<y)return -1;if(x>y)return 1;return 0;}
function inRange(d,a,b){return cmpD(d,a)>=0&&cmpD(d,b)<=0;}
function normD(s){s=fa2en(s);const p=s.split('/').filter(x=>x!=='');if(p.length<3)return'';return `${p[0].padStart(4,'0')}/${p[1].padStart(2,'0')}/${p[2].padStart(2,'0')}`;}
function todayJal(){try{const n=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Tehran'}));return greg2jal(n.getFullYear(),n.getMonth()+1,n.getDate());}catch(e){const n=new Date();return greg2jal(n.getFullYear(),n.getMonth()+1,n.getDate());}}
function parseJ(s){s=fa2en(s);const p=s.split('/');return [parseInt(p[0]||'1405'),parseInt(p[1]||'1'),parseInt(p[2]||'1')];}
function fmtD(s){return en2fa(s);}
function jWeekday(jy,jm,jd){const[gy,gm,gd]=jal2greg(jy,jm,jd);const dt=new Date(Date.UTC(gy,gm-1,gd));const w=dt.getUTCDay();return (w+1)%7;}
function switchTab(which){
  ['League','History','Compare'].forEach(k=>{
    const sec=$('#sec'+k), tab=$('#tab'+k);
    const on=(k===which);
    if(sec)sec.classList.toggle('hid',!on);
    if(tab)tab.classList.toggle('on',on);
  });
  try{localStorage.setItem('bf-tab',which);}catch(e){}
  window.scrollTo({top:0,behavior:'smooth'});
}
/* ---------- تقویم ---------- */
function openCal(forId){
  CAL_FOR=forId;
  const cur=$( '#'+forId)?.value || H_TO || HDATES[HDATES.length-1] || '';
  let y=1405,m=9;
  if(cur){const[a,b]=parseJ(cur);y=a;m=b;}
  else{const t=todayJal();y=t[0];m=t[1];}
  CAL_Y=y;CAL_M=m;
  renderCal();
  $('#calPop').classList.add('open');
}
function closeCal(){$('#calPop')?.classList.remove('open');CAL_FOR=null;}
function renderCal(){
  const ys=$('#calYear'), ms=$('#calMonth');
  ys.innerHTML='';ms.innerHTML='';
  for(let y=1402;y<=1407;y++){const o=document.createElement('option');o.value=y;o.textContent=en2fa(y);if(y===CAL_Y)o.selected=true;ys.appendChild(o);}
  JM.forEach((n,i)=>{const o=document.createElement('option');o.value=i+1;o.textContent=n;if(i+1===CAL_M)o.selected=true;ms.appendChild(o);});
  ys.onchange=()=>{CAL_Y=parseInt(ys.value);renderCal();};
  ms.onchange=()=>{CAL_M=parseInt(ms.value);renderCal();};
  const g=$('#calGrid');g.innerHTML=DOW.map(d=>`<div class="cdow">${d}</div>`).join('');
  const first=jWeekday(CAL_Y,CAL_M,1), dim=jDays(CAL_Y,CAL_M);
  for(let i=0;i<first;i++)g.innerHTML+=`<div></div>`;
  const selRaw=$(CAL_FOR?('#'+CAL_FOR):'#hFrom')?.value||'';
  const sel=normD(selRaw);
  const t=todayJal();const tStr=`${t[0]}/${String(t[1]).padStart(2,'0')}/${String(t[2]).padStart(2,'0')}`;
  for(let d=1;d<=dim;d++){
    const ds=`${CAL_Y}/${String(CAL_M).padStart(2,'0')}/${String(d).padStart(2,'0')}`;
    const cls=['cday'];if(ds===sel)cls.push('sel');if(ds===tStr)cls.push('today');
    if(HDATES.length&& (cmpD(ds,HDATES[0])<0||cmpD(ds,HDATES[HDATES.length-1])>0))cls.push('dis');
    g.innerHTML+=`<button class="${cls.join(' ')}" data-d="${ds}">${en2fa(d)}</button>`;
  }
  g.querySelectorAll('.cday').forEach(b=>b.onclick=()=>{
    const inp=$('#'+CAL_FOR);if(inp)inp.value=en2fa(b.dataset.d);
    try{localStorage.setItem('bf-'+CAL_FOR,inp.value);}catch(e){}
    closeCal();
  });
}
function bindDateInputs(){
  ['hFrom','hTo','cAFrom','cATo','cBFrom','cBTo'].forEach(id=>{
    const el=document.getElementById(id);if(!el||el.dataset.bound)return;el.dataset.bound='1';
    el.addEventListener('click',e=>{e.stopPropagation();openCal(id);});
  });
  document.addEventListener('click',e=>{
    const pop=$('#calPop');if(!pop||!pop.classList.contains('open'))return;
    if(pop.contains(e.target))return;
    if(e.target.classList&&e.target.classList.contains('dinput'))return;
    closeCal();
  });
  $('#calClose').onclick=closeCal;
  $('#calToday').onclick=()=>{const t=todayJal();const ds=`${t[0]}/${String(t[1]).padStart(2,'0')}/${String(t[2]).padStart(2,'0')}`;const inp=$('#'+CAL_FOR);if(inp)inp.value=en2fa(ds);closeCal();};
}

/* ---------- سابقه: تجمیع بازه ---------- */
function aggRange(a,b){
  a=normD(fa2en(a));b=normD(fa2en(b));
  if(!a||!b)return [];
  if(cmpD(a,b)>0){const t=a;a=b;b=t;}
  const map=new Map();
  const tkey=(r,sr)=>r.d+'|'+r.code+'-'+sr;
  for(const r of HROWS){
    if(!inRange(r.d,a,b))continue;
    const k=r.code+'|'+r.store;
    let s=map.get(k);
    if(!s){s={code:r.code,store:r.store,qty:0,inv:0,gross:0,net:0,credit:0,cats:new Map(),_ss:new Set(),_ex:0};map.set(k,s);}
    s.qty+=r.qty;s.gross+=r.gross;s.net+=r.net;s.credit+=(r.credit||0);
    if(r.s&&r.s.length){ for(const sr of r.s){ s._ss.add(tkey(r,sr)); } } else { s._ex+= (r.inv||0); }
    let c=s.cats.get(r.cat);
    if(!c){c={name:r.cat,qty:0,inv:0,gross:0,net:0,serials:0,models:new Map(),_ss:new Set(),_ex:0};s.cats.set(r.cat,c);}
    c.qty+=r.qty;c.gross+=r.gross;c.net+=r.net;
    if(r.s&&r.s.length){ for(const sr of r.s){ c._ss.add(tkey(r,sr)); } } else { c._ex+=(r.inv||0); }
    let m=c.models.get(r.model);
    if(!m){m={name:r.model,qty:0,inv:0,gross:0,net:0,_ss:new Set(),_ex:0};c.models.set(r.model,m);}
    m.qty+=r.qty;m.gross+=r.gross;m.net+=r.net;
    if(r.s&&r.s.length){ for(const sr of r.s){ m._ss.add(tkey(r,sr)); } } else { m._ex+=(r.inv||0); }
  }
  const out=[...map.values()].map(s=>{
    const cats=[...s.cats.values()].map(c=>{
      const mods=[...c.models.values()].map(m=>({name:m.name,qty:m.qty,inv:(m._ss.size+m._ex),gross:m.gross,net:m.net,disc:m.gross-m.net})).sort((x,y)=>y.net-x.net);
      return {name:c.name,qty:c.qty,inv:(c._ss.size+c._ex),gross:c.gross,net:c.net,disc:c.gross-c.net,models:mods};
    }).sort((x,y)=>y.net-x.net);
    return {code:s.code,store:s.store,qty:s.qty,inv:(s._ss.size+s._ex),gross:s.gross,net:s.net,disc:s.gross-s.net,credit:s.credit,groups:cats};
  }).sort((x,y)=>y.net-x.net);
  out.forEach((r,i)=>r.id=i+1);
  return out;
}
function hval(r,k){if(k==='pct')return r.gross?Math.round(r.disc/r.gross*100):0;return r[k];}
function renderHTotals(){
  const q=HDATA.reduce((s,r)=>s+r.qty,0),iv=HDATA.reduce((s,r)=>s+r.inv,0);
  const g=HDATA.reduce((s,r)=>s+r.gross,0),n=HDATA.reduce((s,r)=>s+r.net,0),dd=g-n;
  const cr=HDATA.reduce((s,r)=>s+(+r.credit||0),0);
  const p=g?Math.round(dd/g*100):0,u=unitLabel();
  const shr=n?Math.round(cr/n*100):0;
  const items=[
    {h:45,l:'تعداد فروش',v:fa(q),u:'قلم'},
    {h:205,l:'تعداد فاکتور',v:fa(iv),u:'فاکتور'},
    {h:160,l:'ناخالص',v:fa(fmtM(g)),u},
    {h:285,l:'خالص',v:fa(fmtM(n)),u},
    {h:5,l:'مبلغ تخفیف',v:fa(fmtM(dd)),u},
    {h:30,l:'٪ تخفیف',v:'٪'+fa(p),u:'میانگین'},
    {h:200,l:'فروش اعتباری',v:fa(fmtM(cr)),u:'٪'+fa(shr)+' از خالص'}
  ];
  const el=$('#htotals');if(el)el.innerHTML=items.map(o=>`<div class="kpi" style="--h:${o.h}"><small>${o.l}</small><b>${o.v}</b><span>${o.u}</span></div>`).join('');
  const c=$('#hcountLine');if(c)c.textContent=fa(HDATA.length)+' فروشگاه';
  syncUnitLines();
}
function renderHBoard(){
  const rows=[...HDATA].sort((x,y)=>(hval(x,hsortKey)-hval(y,hsortKey))*hsortDir);
  const u=unitLabel();
  const sb=$('#hsortbar');
  if(sb){sb.innerHTML=SORTS.map(s=>`<button class="sbtn${hsortKey===s.k?' on':''}" data-k="${s.k}">${s.t}${hsortKey===s.k?(hsortDir===-1?' ▼':' ▲'):''}</button>`).join('');
  sb.querySelectorAll('.sbtn').forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(hsortKey===k)hsortDir*=-1;else{hsortKey=k;hsortDir=-1;}renderHBoard();});}
  const hr=$('#hheadRow');
  if(hr)hr.innerHTML=`<div>رتبه</div><div>فروشگاه</div>`+SORTS.map(s=>`<div><button class="${hsortKey===s.k?'on':''}" data-k="${s.k}">${s.t}${hsortKey===s.k?(hsortDir===-1?' ▼':' ▲'):''}</button></div>`).join('')+`<div></div>`;
  if(hr)hr.querySelectorAll('button').forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(hsortKey===k)hsortDir*=-1;else{hsortKey=k;hsortDir=-1;}renderHBoard();});
  const el=$('#hleague');if(!el)return;
  if(!rows.length){el.innerHTML='<p style="color:var(--muted);text-align:center">در این بازه فروشی ثبت نشده است.</p>';return;}
  el.innerHTML=rows.map((r,i)=>{
    const rank=i+1,h=hue(HDATA.indexOf(r));
    const cells=metric('تعداد فروش',fa(r.qty))+metric('تعداد فاکتور',fa(r.inv))+metric('ناخالص',fa(fmtM(r.gross)))+metric('خالص',fa(fmtM(r.net)),true)+metric('تخفیف',fa(fmtM(r.disc)))+metric('٪ تخفیف','٪'+fa(hval(r,'pct')));
    const glist=sortGroups(r.groups||[]);
    const ghead=`<div class="grow ghead">`+GSORTS.map(s=>`<div><button class="${gsortKey===s.k?'on':''}" data-gk="${s.k}">${s.t}${gsortKey===s.k?(gsortDir===-1?' ▼':' ▲'):''}</button></div>`).join('')+`</div>`;
    const gitems=glist.map(g=>{
      const gk='H|'+r.code+'|'+g.name,isOpen=hOpenG.has(gk);
      const mlist=sortModels(g.models||[]);
      const mhead=`<div class="mrow mhead"><div>مدل</div><div>فروش</div><div>فاکتور</div><div>ناخالص</div><div>خالص</div><div>تخفیف</div><div>٪</div><div>📷</div></div>`;
      const mrows=mlist.map(m=>{const kw='https://www.sergestyle.com/product?keyword='+encodeURIComponent(m.name);return `<div class="mrow"><div><b>${m.name}</b></div><div>${fa(m.qty)}</div><div>${fa(m.inv)}</div><div>${fa(fmtM(m.gross))}</div><div>${fa(fmtM(m.net))}</div><div>${fa(fmtM(m.disc))}</div><div>٪${fa(gpct(m))}</div><div><a class="pbtn" href="${kw}" target="_blank" rel="noopener">📷</a></div></div>`;}).join('');
      return `<div class="gitem${isOpen?' open':''}"><button class="grow" data-hgk="${gk.replace(/"/g,'')}"><div><b>${g.name} <span class="mini">▾</span></b></div><div>${fa(g.qty)}</div><div>${fa(g.inv)}</div><div>${fa(fmtM(g.gross))}</div><div>${fa(fmtM(g.net))}</div><div>${fa(fmtM(g.disc))}</div><div>٪${fa(gpct(g))}</div></button><div class="mwrap"><div class="mtable">${mhead}${mrows}</div></div></div>`;
    }).join('');
    return `<div class="row${hOpenCode===r.code?' open':''}" style="--h:${h}"><button class="rowhead" data-hcode="${r.code}"><span class="rank ${rank<=3?'r'+rank:''}">${fa(rank)}</span><span class="storebox"><span class="store">${r.store}</span></span><span class="mgrid">${cells}</span><span class="chevwrap"><span class="chevlabel">کارگروه و کد مدل</span><span class="chev">▾</span></span></button><div class="drawer"><h3>📦 کارگروه ${r.store} <span class="tag">${u}</span></h3><div class="gwrap"><div class="gtable">${ghead}${gitems}</div></div></div></div>`;
  }).join('');
  el.querySelectorAll('.rowhead').forEach(b=>b.onclick=()=>{
    const c=b.dataset.hcode;hOpenCode=(hOpenCode===c?null:c);
    el.querySelectorAll('.row').forEach(x=>x.classList.remove('open'));
    if(hOpenCode)b.parentElement.classList.add('open');
  });
  el.querySelectorAll('.ghead button').forEach(b=>b.onclick=e=>{e.stopPropagation();const k=b.dataset.gk;if(gsortKey===k)gsortDir*=-1;else{gsortKey=k;gsortDir=(k==='name'?1:-1);}renderHBoard();});
  el.querySelectorAll('button.grow[data-hgk]').forEach(b=>b.onclick=e=>{e.stopPropagation();const k=b.dataset.hgk;const it=b.parentElement;if(hOpenG.has(k)){hOpenG.delete(k);it.classList.remove('open');}else{hOpenG.add(k);it.classList.add('open');}});
  el.querySelectorAll('.pbtn').forEach(a=>a.onclick=e=>e.stopPropagation());
}
function applyHistory(silent){
  const f=normD(fa2en($('#hFrom').value)),t2=normD(fa2en($('#hTo').value));
  if(!f||!t2){if(!silent)$('#hrangeNote').innerHTML='⚠️ هر دو تاریخ را انتخاب کنید.';return;}
  H_FROM=f;H_TO=t2;
  try{localStorage.setItem('bf-hFrom',en2fa(f));localStorage.setItem('bf-hTo',en2fa(t2));}catch(e){}
  HDATA=aggRange(f,t2);
  hOpenCode=null;
  renderHTotals();renderHBoard();
  const n=$('#hrangeNote');
  if(n){const q=HDATA.reduce((s,r)=>s+r.qty,0);n.innerHTML=`گزارش بازه <b>${fmtD(f)}</b> تا <b>${fmtD(t2)}</b> — <b>${fa(HDATA.length)}</b> فروشگاه، <b>${fa(q)}</b> قلم فروش`;markHChip();}
}

/* ---------- مقایسه دو بازه ---------- */
function aggSimple(a,b){
  a=normD(fa2en(a));b=normD(fa2en(b));
  if(!a||!b)return new Map();
  if(cmpD(a,b)>0){const t=a;a=b;b=t;}
  const m=new Map();
  for(const r of HROWS){
    if(!inRange(r.d,a,b))continue;
    const k=r.code+'|'+r.store;
    let s=m.get(k);
    if(!s){s={code:r.code,store:r.store,qty:0,inv:0,gross:0,net:0};m.set(k,s);}
    s.qty+=r.qty;s.inv+=r.inv;s.gross+=r.gross;s.net+=r.net;
  }
  return m;
}
function pctOf(s){return s.gross?Math.round((s.gross-s.net)/s.gross*100):0;}
function signFa(n){n=Math.round(n);if(n===0)return fa(0);if(n>0)return '+'+fa(n);return fa(n);}
function applyCompare(){
  const af=normD(fa2en($('#cAFrom').value)),at=normD(fa2en($('#cATo').value));
  const bf=normD(fa2en($('#cBFrom').value)),bt=normD(fa2en($('#cBTo').value));
  if(!af||!at||!bf||!bt){$('#crangeNote').innerHTML='⚠️ هر چهار تاریخ را انتخاب کنید.';return;}
  C_AFROM=af;C_ATO=at;C_BFROM=bf;C_BTO=bt;
  try{localStorage.setItem('bf-cAFrom',en2fa(af));localStorage.setItem('bf-cATo',en2fa(at));localStorage.setItem('bf-cBFrom',en2fa(bf));localStorage.setItem('bf-cBTo',en2fa(bt));}catch(e){}
  const A=aggSimple(af,at),B=aggSimple(bf,bt);
  const keys=new Set([...A.keys(),...B.keys()]);
  const rows=[...keys].map(k=>{
    const a=A.get(k)||{code:'',store:'',qty:0,gross:0,net:0};
    const b=B.get(k)||{code:a.code,store:a.store,qty:0,gross:0,net:0};
    const store=a.store||b.store,code=a.code||b.code;
    const pa=pctOf(a),pb=pctOf(b);
    return {code,store,aq:a.qty,an:a.net,ap:pa,bq:b.qty,bn:b.net,bp:pb,dq:b.qty-a.qty,dn:b.net-a.net,dp:pb-pa,netB:b.net};
  });
  CMP={a:A,b:B,rows};
  let tq=0,tn=0,tg=0;
  // totals
  let Aq={qty:0,net:0,gross:0},Bq={qty:0,net:0,gross:0};
  rows.forEach(r=>{});
  A.forEach(s=>{Aq.qty+=s.qty;Aq.net+=s.net;Aq.gross+=s.gross;});
  B.forEach(s=>{Bq.qty+=s.qty;Bq.net+=s.net;Bq.gross+=s.gross;});
  CMP.tot={aq:Aq.qty,an:Aq.net,ap:pctOf(Aq),bq:Bq.qty,bn:Bq.net,bp:pctOf(Bq),dq:Bq.qty-Aq.qty,dn:Bq.net-Aq.net,dp:pctOf(Bq)-pctOf(Aq)};
  renderCompare();
  $('#crangeNote').innerHTML=`بازه اول <b>${fmtD(af)}</b> تا <b>${fmtD(at)}</b> &nbsp;|&nbsp; بازه دوم <b>${fmtD(bf)}</b> تا <b>${fmtD(bt)}</b> — <b>${fa(rows.length)}</b> فروشگاه`;
}
function renderCompare(){
  const el=$('#cmpWrap');if(!el||!CMP.rows)return;
  const u=unitLabel();
  const rows=[...CMP.rows].sort((x,y)=>{
    let vx=x[cmpSortKey],vy=y[cmpSortKey];
    if(cmpSortKey==='store'){return String(x.store).localeCompare(String(y.store),'fa')*cmpSortDir;}
    return (vx-vy)*cmpSortDir;
  });
  const sorts=[{k:'netB',t:'خالص بازه دوم'},{k:'dn',t:'اختلاف خالص'},{k:'bq',t:'فروش بازه دوم'},{k:'store',t:'نام فروشگاه'}];
  const t=CMP.tot;
  const totHtml=t?`<div class="row totalrow" style="--h:45"><button class="rowhead" style="cursor:default"><span class="rank r1">★</span><span class="storebox"><span class="store">جمع کل (${fa(rows.length)} فروشگاه)</span></span><span class="mgrid">${metric('فروش A',fa(t.aq))+metric('خالص A',fa(fmtM(t.an)),true)+metric('٪ A','٪'+fa(t.ap))+metric('فروش B',fa(t.bq))+metric('خالص B',fa(fmtM(t.bn)),true)+metric('٪ B','٪'+fa(t.bp))}</span><span class="chevwrap"><span class="chevlabel">${u}</span></span></button></div>`:'';
  el.innerHTML=`<div class="toolbar"><div class="sortlabel">سورت بر اساس:</div><div class="sortbar">${sorts.map(s=>`<button class="sbtn${cmpSortKey===s.k?' on':''}" data-ck="${s.k}">${s.t}${cmpSortKey===s.k?(cmpSortDir===-1?' ▼':' ▲'):''}</button>`).join('')}</div></div>${totHtml}<div id="cmplist" style="display:flex;flex-direction:column;gap:8px;margin-top:8px"></div>`;
  el.querySelectorAll('[data-ck]').forEach(b=>b.onclick=()=>{const k=b.dataset.ck;if(cmpSortKey===k)cmpSortDir*=-1;else{cmpSortKey=k;cmpSortDir=(k==='store'?1:-1);}renderCompare();});
  const list=el.querySelector('#cmplist');
  const ranges=`<div style="font-size:10.5px;color:var(--muted);text-align:center">A: ${fmtD(C_AFROM)} تا ${fmtD(C_ATO)} &nbsp;•&nbsp; B: ${fmtD(C_BFROM)} تا ${fmtD(C_BTO)} &nbsp;•&nbsp; اختلاف = B − A (${u})</div>`;
  list.innerHTML=ranges+rows.map((r,i)=>{
    const h=hue(i);
    const dqCls=r.dq>0?'up':(r.dq<0?'dn':''),dnCls=r.dn>0?'up':(r.dn<0?'dn':''),dpCls=r.dp>0?'up':(r.dp<0?'dn':'');
    return `<div class="row" style="--h:${h}"><div style="padding:9px 10px 10px">`
    +`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span class="rank ${i<3?'r'+(i+1):''}" style="width:24px;height:24px;font-size:12px">${fa(i+1)}</span><b style="font-size:14px">${r.store}</b><span style="margin-inline-start:auto" class="tag">${u}</span></div>`
    +`<div class="cmpgrid">`
    +`<div class="cmpSec a"><h5>بازه اول A</h5><small>${fmtD(C_AFROM)} تا ${fmtD(C_ATO)}</small><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px">${metric('تعداد فروش',fa(r.aq))+metric('خالص',fa(fmtM(r.an)),true)+metric('٪ تخفیف','٪'+fa(r.ap))}</div></div>`
    +`<div class="cmpSec b"><h5>بازه دوم B</h5><small>${fmtD(C_BFROM)} تا ${fmtD(C_BTO)}</small><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px">${metric('تعداد فروش',fa(r.bq))+metric('خالص',fa(fmtM(r.bn)),true)+metric('٪ تخفیف','٪'+fa(r.bp))}</div></div>`
    +`<div class="cmpSec d"><h5>اختلاف (B−A)</h5><small>مثبت یعنی رشد بازه دوم</small><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px"><div class="m"><small>تعداد فروش</small><b class="${dqCls}">${signFa(r.dq)}</b></div><div class="m"><small>خالص (${u})</small><b class="${dnCls}">${signFa(fmtM(r.dn))}</b></div><div class="m"><small>٪ تخفیف</small><b class="${dpCls}">${(r.dp>0?'+':'')+'٪'+fa(r.dp)}</b></div></div></div>`
    +`</div></div></div>`;
  }).join('');
  const cl=$('#cunitLine');if(cl)cl.textContent=u;
}
/* ---------- چیپ‌ها ---------- */
function markHChip(){
  const box=$('#hChips');if(!box)return;
  box.querySelectorAll('.chip').forEach(c=>{
    const a=c.dataset.a;c.classList.toggle('on',!!(H_FROM&&H_TO&&normD(fa2en(H_FROM))===normD(fa2en(a.split('|')[0]))&&normD(fa2en(H_TO))===normD(fa2en(a.split('|')[1]))));
  });
}
function buildChips(){
  const box=$('#hChips');if(!box||!HDATES.length)return;
  const mx=HDATES[HDATES.length-1],mn=HDATES[0];
  const sub=(ds,n)=>{const[a,b,c]=parseJ(normD(fa2en(ds)));let dd=c-n;let mm=b,yy=a;while(dd<1){mm--;if(mm<1){mm=12;yy--;}dd+=jDays(yy,mm);}return `${yy}/${String(mm).padStart(2,'0')}/${String(dd).padStart(2,'0')}`;};
  const defs=[
    {t:'امروز',a:mx+'|'+mx},
    {t:'۷ روز اخیر',a:sub(mx,6)+'|'+mx},
    {t:'۳۰ روز اخیر',a:sub(mx,29)+'|'+mx},
    {t:'کل بازه',a:mn+'|'+mx},
  ];
  box.innerHTML=defs.map(d=>`<button class="chip" data-a="${d.a}">${d.t}</button>`).join('');
  box.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{
    const[a,b]=c.dataset.a.split('|');
    $('#hFrom').value=en2fa(a);$('#hTo').value=en2fa(b);
    applyHistory();
  });
  markHChip();
}
/* ---------- بوت ---------- */
function syncUnitLines(){const u=unitLabel();const a=$('#unitLine');if(a)a.textContent=u;const b=$('#hunitLine');if(b)b.textContent=u;const c=$('#cunitLine');if(c)c.textContent=u;}
async function fetchHistory(){
  if(HROWS&&HROWS.length&&HDATES&&HDATES.length) return; // از تک‌فایل خوانده شده
  try{
    const r=await fetch('history.json?t='+Date.now(),{cache:'no-store'});
    if(!r.ok) return;
    const j=await r.json();
    HROWS=(j.rows||[]).map(x=>({...x,d:normD(x.d)}));
    HDATES=[...(j.dates||[])].map(normD).filter(Boolean).sort();
    if(!HDATES.length)HDATES=[...new Set(HROWS.map(x=>x.d))].sort();
  }catch(e){ if(!HROWS.length){HROWS=[];HDATES=[];} }
}
function refreshHistoryLive(){/* تاریخ‌ها ثابت می‌مانند؛ فقط اگر داده تازه آمد بازخوانی کن */ }
function bootTabs(){
  bindDateInputs();
  try{
    const st=localStorage.getItem('bf-tab');
    if(st&&['League','History','Compare'].includes(st))switchTab(st);else switchTab('League');
  }catch(e){switchTab('League');}
  $('#tabLeague').onclick=()=>switchTab('League');
  $('#tabHistory').onclick=()=>switchTab('History');
  $('#tabCompare').onclick=()=>switchTab('Compare');
  fetchHistory().then(()=>{
    let hf='',ht='';
    try{hf=localStorage.getItem('bf-hFrom')||'';ht=localStorage.getItem('bf-hTo')||'';}catch(e){}
    const mx=HDATES.length?HDATES[HDATES.length-1]:'',mn=HDATES.length?HDATES[0]:'';
    H_FROM=hf?normD(fa2en(hf)):mx;H_TO=ht?normD(fa2en(ht)):mx;
    if(!H_FROM)H_FROM=mx;if(!H_TO)H_TO=mx;
    if($('#hFrom'))$('#hFrom').value=H_FROM?en2fa(H_FROM):'';
    if($('#hTo'))$('#hTo').value=H_TO?en2fa(H_TO):'';
    buildChips();
    if(H_FROM&&H_TO&&HROWS.length){applyHistory(true);
      const n=$('#hrangeNote');
      if(!HDATA.length&&n)n.innerHTML='در این بازه فروشی ثبت نشده است.';
    } else {
      const n=$('#hrangeNote');
      if(n)n.innerHTML=HDATES.length?`بازه موجود: <b>${fmtD(mn)}</b> تا <b>${fmtD(mx)}</b> — «نمایش گزارش بازه» را بزنید.`:'فایل data.json پیدا نشد.';
    }
    // compare defaults
    let af='',at2='',bf2='',bt='';
    try{af=localStorage.getItem('bf-cAFrom')||'';at2=localStorage.getItem('bf-cATo')||'';bf2=localStorage.getItem('bf-cBFrom')||'';bt=localStorage.getItem('bf-cBTo')||'';}catch(e){}
    C_AFROM=af?normD(fa2en(af)):mx;C_ATO=at2?normD(fa2en(at2)):mx;
    C_BFROM=bf2?normD(fa2en(bf2)):mx;C_BTO=bt?normD(fa2en(bt)):mx;
    if($('#cAFrom'))$('#cAFrom').value=C_AFROM?en2fa(C_AFROM):'';
    if($('#cATo'))$('#cATo').value=C_ATO?en2fa(C_ATO):'';
    if($('#cBFrom'))$('#cBFrom').value=C_BFROM?en2fa(C_BFROM):'';
    if($('#cBTo'))$('#cBTo').value=C_BTO?en2fa(C_BTO):'';
    if(HROWS.length&&C_AFROM&&C_ATO&&C_BFROM&&C_BTO){try{applyCompare();}catch(e){}}
    else{const n=$('#crangeNote');if(n&&HDATES.length)n.innerHTML=`بازه موجود: <b>${fmtD(mn)}</b> تا <b>${fmtD(mx)}</b> — تاریخ‌ها را انتخاب و «مقایسه کن» را بزنید.`;}
    syncUnitLines();
  });
  const ha=$('#hApply');if(ha)ha.onclick=()=>applyHistory(false);
  const ca=$('#cApply');if(ca)ca.onclick=()=>applyCompare();
}
