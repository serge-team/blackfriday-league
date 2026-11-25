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
async function loadOne(url){
  const r=await fetch(url+'?t='+Date.now(),{cache:'no-store'});
  if(!r.ok) return null;
  const lm=r.headers.get('last-modified');
  const j=await r.json();
  return {j,lm};
}
async function fetchData(){
 try{
  const base=await loadOne('data.json');
  // فایل زنده: فقط امروز (اختیاری، اگر نباشد سایت با همان پایه کار می‌کند)
  let live=null;
  try{ live=await loadOne('data-live.json'); }catch(e){ live=null; }
  let lm=base&&base.lm, j=base&&base.j;
  let lj=live&&live.j;
  if(!j&&!lj){ return; }
  if(!j&&lj){ j=lj; lm=live&&live.lm; live=null; lj=null; } // فقط فایل زنده موجود است
  if(Array.isArray(j)){ DATA=j; LAST_UPDATE=lm?new Date(lm):null; }
  else if(j){
   DATA=(j.stores||j.data||[]);
   if(j.updated_at){ LAST_UPDATE=new Date(j.updated_at); } else if(lm){ LAST_UPDATE=new Date(lm); }
   // تک‌فایل v2: daily=جمع روزانه کل تاریخ، rows=جزئیات مدل روزهای اخیر
   try{
    HDAILY=Array.isArray(j.daily)?j.daily.map(x=>({...x,d:normD(x.d)})):[];
    HROWS=Array.isArray(j.rows)?j.rows.map(x=>({...x,d:normD(x.d)})):[];
    // سازگاری عقب‌رو: فایل قدیمی بدون daily
    if(!HDAILY.length&&HROWS.length){
     const m=new Map();
     for(const r of HROWS){
       const k=r.code+'|'+r.store;
       let s=m.get(k); if(!s){s={d:r.d,code:r.code,store:r.store,qty:0,inv:0,gross:0,net:0,credit:0};m.set(k,s);}
     }
     // جمع روزانه را از روی سطرهای جزئیات می‌سازیم (تک‌روزه دقیق است)
     const dmap=new Map();
     for(const r of HROWS){
       const k=r.d+'|'+r.code+'|'+r.store;
       let s=dmap.get(k); if(!s){s={d:r.d,code:r.code,store:r.store,qty:0,inv:0,gross:0,net:0,credit:0};dmap.set(k,s);}
       s.qty+=r.qty;s.gross+=r.gross;s.net+=r.net;s.credit+=(r.credit||0);s.inv+=(r.inv||0);
     }
     HDAILY=[...dmap.values()];
    }
    HDATES=[...((j.dates&&j.dates.length?j.dates:[...HDAILY.map(x=>x.d),...HROWS.map(x=>x.d)]))].map(normD).filter(Boolean);
    HDATES=[...new Set(HDATES)].sort();
    LEAGUE_DATE=normD(j.league_date||j.max_date||HDATES[HDATES.length-1]||'');
    DETAIL_FROM=normD(j.detail_from||'');
    DETAIL_DAYS=+(j.detail_days||0)||0;
   }catch(e){}
   // --- ادغام فایل زنده (data-live.json) ---
   try{
    if(lj&&!Array.isArray(lj)){
      const ld=(Array.isArray(lj.daily)?lj.daily:[]).map(x=>({...x,d:normD(x.d)}));
      const lr=(Array.isArray(lj.rows)?lj.rows:[]).map(x=>({...x,d:normD(x.d)}));
      if(ld.length||lr.length){
        const liveDates=new Set([...ld.map(x=>x.d),...lr.map(x=>x.d)].filter(Boolean));
        if(liveDates.size){
          HDAILY=HDAILY.filter(x=>!liveDates.has(x.d)).concat(ld);
          HROWS=HROWS.filter(x=>!liveDates.has(x.d)).concat(lr);
          const ldates=((lj.dates&&lj.dates.length?lj.dates:[...liveDates])).map(normD).filter(Boolean);
          HDATES=[...new Set([...HDATES,...ldates])].sort();
        }
        const lMax=normD(lj.league_date||lj.max_date||'');
        if(lMax&&(!LEAGUE_DATE||cmpD(lMax,LEAGUE_DATE)>=0)){
          if(Array.isArray(lj.stores)&&lj.stores.length){ DATA=lj.stores; }
          LEAGUE_DATE=lMax;
        }
        if(!DETAIL_FROM){ DETAIL_FROM=normD(lj.detail_from||''); DETAIL_DAYS=+(lj.detail_days||0)||DETAIL_DAYS; }
        try{
          const lu=lj.updated_at?new Date(lj.updated_at):(live&&live.lm?new Date(live.lm):null);
          if(lu&&!isNaN(lu)&&(!LAST_UPDATE||isNaN(LAST_UPDATE)||lu>LAST_UPDATE)) LAST_UPDATE=lu;
        }catch(e){}
      }
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
let HROWS=[], HDATES=[], HDATA=[], HDAILY=[], DETAIL_FROM='', DETAIL_DAYS=45;
let H_FROM='', H_TO='', hsortKey='net', hsortDir=-1, hOpenCode=null, hOpenG=new Set();
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
  const useDaily=(HDAILY&&HDAILY.length)?true:false;
  // جمع فروشگاهی دقیق از daily (کل تاریخ) + جزئیات کارگروه/مدل از rows (روزهای اخیر)
  const smap=new Map();
  if(useDaily){
    for(const r of HDAILY){
      if(!inRange(r.d,a,b))continue;
      const k=r.code+'|'+r.store;
      let s=smap.get(k);
      if(!s){s={code:r.code,store:r.store,qty:0,inv:0,gross:0,net:0,credit:0};smap.set(k,s);}
      s.qty+=r.qty;s.inv+=(r.inv||0);s.gross+=r.gross;s.net+=r.net;s.credit+=(r.credit||0);
    }
  }
  const dmap=new Map();
  const tkey=(r,sr)=>r.d+'|'+r.code+'-'+sr;
  for(const r of HROWS){
    if(!inRange(r.d,a,b))continue;
    const k=r.code+'|'+r.store;
    let s=dmap.get(k);
    if(!s){s={cats:new Map()};dmap.set(k,s);}
    let c=s.cats.get(r.cat);
    if(!c){c={name:r.cat,qty:0,gross:0,net:0,models:new Map(),_ss:new Set(),_ex:0};s.cats.set(r.cat,c);}
    c.qty+=r.qty;c.gross+=r.gross;c.net+=r.net;
    if(r.s&&r.s.length){ for(const sr of r.s){ c._ss.add(tkey(r,sr)); } } else { c._ex+=(r.inv||0); }
    let m=c.models.get(r.model);
    if(!m){m={name:r.model,qty:0,gross:0,net:0,_ss:new Set(),_ex:0};c.models.set(r.model,m);}
    m.qty+=r.qty;m.gross+=r.gross;m.net+=r.net;
    if(r.s&&r.s.length){ for(const sr of r.s){ m._ss.add(tkey(r,sr)); } } else { m._ex+=(r.inv||0); }
  }
  let out=[];
  if(useDaily){
    out=[...smap.values()].map(s=>{
      const dd=dmap.get(s.code+'|'+s.store);
      let cats=[];
      if(dd){
        cats=[...dd.cats.values()].map(c=>{
          const mods=[...c.models.values()].map(m=>({name:m.name,qty:m.qty,inv:(m._ss.size+m._ex),gross:m.gross,net:m.net,disc:m.gross-m.net})).sort((x,y)=>y.net-x.net);
          return {name:c.name,qty:c.qty,inv:(c._ss.size+c._ex),gross:c.gross,net:c.net,disc:c.gross-c.net,models:mods};
        }).sort((x,y)=>y.net-x.net);
      }
      return {code:s.code,store:s.store,qty:s.qty,inv:s.inv,gross:s.gross,net:s.net,disc:s.gross-s.net,credit:s.credit,groups:cats,noDetail:!dd};
    }).sort((x,y)=>y.net-x.net);
  } else {
    // سازگاری عقب‌رو: فایل قدیمی بدون daily
    const map=new Map();
    for(const r of HROWS){
      if(!inRange(r.d,a,b))continue;
      const k=r.code+'|'+r.store;
      let s=map.get(k);
      if(!s){s={code:r.code,store:r.store,qty:0,inv:0,gross:0,net:0,credit:0,cats:new Map(),_ss:new Set(),_ex:0};map.set(k,s);}
      s.qty+=r.qty;s.gross+=r.gross;s.net+=r.net;s.credit+=(r.credit||0);
      if(r.s&&r.s.length){ for(const sr of r.s){ s._ss.add(tkey(r,sr)); } } else { s._ex+= (r.inv||0); }
      let c=s.cats.get(r.cat);
      if(!c){c={name:r.cat,qty:0,gross:0,net:0,models:new Map(),_ss:new Set(),_ex:0};s.cats.set(r.cat,c);}
      c.qty+=r.qty;c.gross+=r.gross;c.net+=r.net;
      if(r.s&&r.s.length){ for(const sr of r.s){ c._ss.add(tkey(r,sr)); } } else { c._ex+=(r.inv||0); }
      let m=c.models.get(r.model);
      if(!m){m={name:r.model,qty:0,gross:0,net:0,_ss:new Set(),_ex:0};c.models.set(r.model,m);}
      m.qty+=r.qty;m.gross+=r.gross;m.net+=r.net;
      if(r.s&&r.s.length){ for(const sr of r.s){ m._ss.add(tkey(r,sr)); } } else { m._ex+=(r.inv||0); }
    }
    out=[...map.values()].map(s=>{
      const cats=[...s.cats.values()].map(c=>{
        const mods=[...c.models.values()].map(m=>({name:m.name,qty:m.qty,inv:(m._ss.size+m._ex),gross:m.gross,net:m.net,disc:m.gross-m.net})).sort((x,y)=>y.net-x.net);
        return {name:c.name,qty:c.qty,inv:(c._ss.size+c._ex),gross:c.gross,net:c.net,disc:c.gross-c.net,models:mods};
      }).sort((x,y)=>y.net-x.net);
      return {code:s.code,store:s.store,qty:s.qty,inv:(s._ss.size+s._ex),gross:s.gross,net:s.net,disc:s.gross-s.net,credit:s.credit,groups:cats,noDetail:false};
    }).sort((x,y)=>y.net-x.net);
  }
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
    const noDet=!!r.noDetail;
    const ghead=`<div class="grow ghead">`+GSORTS.map(s=>`<div><button class="${gsortKey===s.k?'on':''}" data-gk="${s.k}">${s.t}${gsortKey===s.k?(gsortDir===-1?' ▼':' ▲'):''}</button></div>`).join('')+`</div>`;
    const gitems=glist.map(g=>{
      const gk='H|'+r.code+'|'+g.name,isOpen=hOpenG.has(gk);
      const mlist=sortModels(g.models||[]);
      const mhead=`<div class="mrow mhead"><div>مدل</div><div>فروش</div><div>فاکتور</div><div>ناخالص</div><div>خالص</div><div>تخفیف</div><div>٪</div><div>📷</div></div>`;
      const mrows=mlist.map(m=>{const kw='https://www.sergestyle.com/product?keyword='+encodeURIComponent(m.name);return `<div class="mrow"><div><b>${m.name}</b></div><div>${fa(m.qty)}</div><div>${fa(m.inv)}</div><div>${fa(fmtM(m.gross))}</div><div>${fa(fmtM(m.net))}</div><div>${fa(fmtM(m.disc))}</div><div>٪${fa(gpct(m))}</div><div><a class="pbtn" href="${kw}" target="_blank" rel="noopener">📷</a></div></div>`;}).join('');
      return `<div class="gitem${isOpen?' open':''}"><button class="grow" data-hgk="${gk.replace(/"/g,'')}"><div><b>${g.name} <span class="mini">▾</span></b></div><div>${fa(g.qty)}</div><div>${fa(g.inv)}</div><div>${fa(fmtM(g.gross))}</div><div>${fa(fmtM(g.net))}</div><div>${fa(fmtM(g.disc))}</div><div>٪${fa(gpct(g))}</div></button><div class="mwrap"><div class="mtable">${mhead}${mrows}</div></div></div>`;
    }).join('');
    const drawerInner=noDet?`<div style="padding:12px;text-align:center;color:var(--muted);font-size:12px">جزئیات کارگروه/مدل برای این بازه قدیمی ذخیره نشده — جمع فروشگاه کامل است.${DETAIL_FROM?` جزئیات از ${fmtD(DETAIL_FROM)} به بعد موجود است.`:''}</div>`:`<div class="gwrap"><div class="gtable">${ghead}${gitems}</div></div>`;
    return `<div class="row${hOpenCode===r.code?' open':''}" style="--h:${h}"><button class="rowhead" data-hcode="${r.code}"><span class="rank ${rank<=3?'r'+rank:''}">${fa(rank)}</span><span class="storebox"><span class="store">${r.store}</span></span><span class="mgrid">${cells}</span><span class="chevwrap"><span class="chevlabel">${noDet?'جمع فروشگاه':'کارگروه و کد مدل'}</span><span class="chev">▾</span></span></button><div class="drawer"><h3>📦 کارگروه ${r.store} <span class="tag">${u}</span></h3>${drawerInner}</div></div>`;
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
  if(n){const q=HDATA.reduce((s,r)=>s+r.qty,0);
    let extra='';
    if(DETAIL_FROM&&cmpD(f,DETAIL_FROM)<0){extra=`<br><span style="font-size:11px;color:var(--muted)">⚠️ جزئیات کارگروه/مدل فقط از ${fmtD(DETAIL_FROM)} به بعد ذخیره شده — جمع فروشگاه‌ها برای کل بازه کامل است.</span>`;}
    n.innerHTML=`گزارش بازه <b>${fmtD(f)}</b> تا <b>${fmtD(t2)}</b> — <b>${fa(HDATA.length)}</b> فروشگاه، <b>${fa(q)}</b> قلم فروش${extra}`;markHChip();}
}

/* ---------- مقایسه دو بازه: جدول تک‌ردیفه ---------- */
let C_AFROM='', C_ATO='', C_BFROM='', C_BTO='', CMP={a:new Map(),b:new Map(),rows:[],tot:null};
let C_SEL_A=new Set(), C_SEL_B=new Set(), C_OPTS={gross:false,net:false,disc:false}, C_BUILT=false, C_UI=false;
function ckey(code,store){return String(code==null?'':code)+'|'+String(store==null?'':store);}
function getAllStores(){
  const m=new Map();
  const push=(c,s)=>{
    s=String(s==null?'':s).trim(); if(!s||s==='None')return;
    const k=ckey(c,s); if(!m.has(k))m.set(k,{code:String(c==null?'':c),store:s});
  };
  try{
    if(HDAILY&&HDAILY.length)HDAILY.forEach(r=>push(r.code,r.store));
    if(!m.size&&HROWS&&HROWS.length)HROWS.forEach(r=>push(r.code,r.store));
    if(!m.size&&typeof DATA!=='undefined'&&DATA&&DATA.length)DATA.forEach(r=>push(r.code,r.store));
  }catch(e){}
  return [...m.values()].sort((x,y)=>String(x.store).localeCompare(String(y.store),'fa'));
}
function leagueRank(){
  const o=new Map();
  try{(DATA||[]).forEach((r,i)=>{const k=ckey(r.code,r.store); if(!o.has(k))o.set(k,i);});}catch(e){}
  return o;
}
function loadSel(key,all){
  try{
    const raw=localStorage.getItem(key);
    if(raw==null)return new Set(all);
    const arr=JSON.parse(raw);
    if(!Array.isArray(arr))return new Set(all);
    const ok=arr.filter(x=>all.includes(x));
    return new Set(ok.length?ok:all);
  }catch(e){return new Set(all);}
}
function saveSel(){
  try{
    localStorage.setItem('bf-cSelA',JSON.stringify([...C_SEL_A]));
    localStorage.setItem('bf-cSelB',JSON.stringify([...C_SEL_B]));
    localStorage.setItem('bf-cOpts',JSON.stringify(C_OPTS));
  }catch(e){}
}
function updateSelCounts(){
  const n=getAllStores().length||0;
  const a=$('#cASelCount'),b=$('#cBSelCount');
  if(a)a.textContent=fa(C_SEL_A.size)+'/'+fa(n);
  if(b)b.textContent=fa(C_SEL_B.size)+'/'+fa(n);
  const aa=$('#cASelAll'),bb=$('#cBSelAll');
  if(aa){aa.checked=C_SEL_A.size>0&&C_SEL_A.size===n; aa.indeterminate=C_SEL_A.size>0&&C_SEL_A.size<n;}
  if(bb){bb.checked=C_SEL_B.size>0&&C_SEL_B.size===n; bb.indeterminate=C_SEL_B.size>0&&C_SEL_B.size<n;}
}
function wasKeyKnown(k,which){
  try{
    const raw=localStorage.getItem(which==='A'?'bf-cKeysA':'bf-cKeysB');
    if(!raw)return false;
    return JSON.parse(raw).includes(k);
  }catch(e){return true;}
}
function buildCompareStores(){
  const all=getAllStores();
  const keys=all.map(s=>ckey(s.code,s.store));
  if(!C_BUILT){
    C_SEL_A=loadSel('bf-cSelA',keys);
    C_SEL_B=loadSel('bf-cSelB',keys);
    try{
      const o=JSON.parse(localStorage.getItem('bf-cOpts')||'{}');
      C_OPTS={gross:!!o.gross,net:!!o.net,disc:!!o.disc};
    }catch(e){}
    C_BUILT=true;
  }else{
    keys.forEach(k=>{ if(!C_SEL_A.has(k)&&!wasKeyKnown(k,'A'))C_SEL_A.add(k); });
    keys.forEach(k=>{ if(!C_SEL_B.has(k)&&!wasKeyKnown(k,'B'))C_SEL_B.add(k); });
  }
  try{localStorage.setItem('bf-cKeysA',JSON.stringify(keys));localStorage.setItem('bf-cKeysB',JSON.stringify(keys));}catch(e){}
  const la=$('#cASelList'),lb=$('#cBSelList');
  if(la)la.innerHTML=all.map(s=>{
    const k=ckey(s.code,s.store);
    const on=C_SEL_A.has(k);
    return `<label class="sopt"><input type="checkbox" data-k="${k.replace(/"/g,'')}"${on?' checked':''}><span>${s.store}</span></label>`;
  }).join('')||'<div style="padding:6px;color:var(--muted);font-size:11px">فروشگاهی نیست</div>';
  if(lb)lb.innerHTML=all.map(s=>{
    const k=ckey(s.code,s.store);
    const on=C_SEL_B.has(k);
    return `<label class="sopt"><input type="checkbox" data-k="${k.replace(/"/g,'')}"${on?' checked':''}><span>${s.store}</span></label>`;
  }).join('')||'<div style="padding:6px;color:var(--muted);font-size:11px">فروشگاهی نیست</div>';
  if(la)la.querySelectorAll('input').forEach(inp=>inp.onchange=()=>{
    const k=inp.dataset.k;
    if(inp.checked)C_SEL_A.add(k); else C_SEL_A.delete(k);
    saveSel();updateSelCounts();autoRecompare();
  });
  if(lb)lb.querySelectorAll('input').forEach(inp=>inp.onchange=()=>{
    const k=inp.dataset.k;
    if(inp.checked)C_SEL_B.add(k); else C_SEL_B.delete(k);
    saveSel();updateSelCounts();autoRecompare();
  });
  updateSelCounts();
}
function autoRecompare(){
  if(!CMP||!CMP.tot)return;
  if(!($('#cAFrom')&&$('#cAFrom').value&&$('#cATo')&&$('#cATo').value&&$('#cBFrom')&&$('#cBFrom').value&&$('#cBTo')&&$('#cBTo').value))return;
  try{applyCompare();}catch(e){}
}
function wireCompareUI(){
  if(C_UI)return; C_UI=true;
  const g1=$('#cOptGross'),g2=$('#cOptNet'),g3=$('#cOptDisc');
  if(g1)g1.checked=!!C_OPTS.gross;
  if(g2)g2.checked=!!C_OPTS.net;
  if(g3)g3.checked=!!C_OPTS.disc;
  const h=()=>{C_OPTS={gross:!!(g1&&g1.checked),net:!!(g2&&g2.checked),disc:!!(g3&&g3.checked)};saveSel();syncUnitLines();if(CMP&&CMP.tot){try{renderCompare();}catch(e){}}};
  if(g1)g1.onchange=h; if(g2)g2.onchange=h; if(g3)g3.onchange=h;
  const bA=$('#cASelBtn'),pA=$('#cASelPanel'),bB=$('#cBSelBtn'),pB=$('#cBSelPanel');
  if(bA&&pA)bA.onclick=e=>{e.stopPropagation();pA.classList.toggle('open');if(pB)pB.classList.remove('open');};
  if(bB&&pB)bB.onclick=e=>{e.stopPropagation();pB.classList.toggle('open');if(pA)pA.classList.remove('open');};
  document.addEventListener('click',e=>{
    if(e.target&&e.target.closest&&e.target.closest('.selWrap'))return;
    if(pA)pA.classList.remove('open'); if(pB)pB.classList.remove('open');
  });
  const aA=$('#cASelAll'),aB=$('#cBSelAll');
  if(aA)aA.onchange=()=>{
    const all=getAllStores().map(s=>ckey(s.code,s.store));
    C_SEL_A=new Set(aA.checked?all:[]);
    saveSel();buildCompareStores();autoRecompare();
  };
  if(aB)aB.onchange=()=>{
    const all=getAllStores().map(s=>ckey(s.code,s.store));
    C_SEL_B=new Set(aB.checked?all:[]);
    saveSel();buildCompareStores();autoRecompare();
  };
}
function aggSimpleFiltered(a,b,sel){
  a=normD(fa2en(a));b=normD(fa2en(b));
  const m=new Map();
  if(!a||!b)return m;
  if(cmpD(a,b)>0){const t=a;a=b;b=t;}
  const src=(HDAILY&&HDAILY.length)?HDAILY:HROWS;
  for(const r of src){
    if(!inRange(r.d,a,b))continue;
    const k=ckey(r.code,r.store);
    if(sel&&sel.size&&!sel.has(k))continue;
    let s=m.get(k);
    if(!s){s={code:r.code,store:r.store,qty:0,inv:0,gross:0,net:0};m.set(k,s);}
    s.qty+=r.qty;s.inv+=(r.inv||0);s.gross+=r.gross;s.net+=r.net;
  }
  return m;
}
function pctOf(s){const g=+s.gross||0;return g?Math.round(((g-(+s.net||0))/g)*100):0;}
function signFa(n){n=Math.round(+n||0);if(n===0)return fa(0);if(n>0)return '+'+fa(n);return fa(n);}
function cmpMoneyOn(){return !!(C_OPTS.gross||C_OPTS.net||C_OPTS.disc);}
function syncCmpUnit(){const c=$('#cunitLine');if(c)c.textContent=cmpMoneyOn()?unitLabel():'';}
function applyCompare(){
  const af=normD(fa2en($('#cAFrom').value)),at=normD(fa2en($('#cATo').value));
  const bf=normD(fa2en($('#cBFrom').value)),bt=normD(fa2en($('#cBTo').value));
  const note=$('#crangeNote');
  if(!af||!at||!bf||!bt){if(note)note.innerHTML='⚠️ هر چهار تاریخ را انتخاب کنید.';return;}
  if(!C_SEL_A.size||!C_SEL_B.size){if(note)note.innerHTML='⚠️ حداقل یک فروشگاه در هر بازه تیک بزنید.';return;}
  C_AFROM=af;C_ATO=at;C_BFROM=bf;C_BTO=bt;
  try{localStorage.setItem('bf-cAFrom',en2fa(af));localStorage.setItem('bf-cATo',en2fa(at));localStorage.setItem('bf-cBFrom',en2fa(bf));localStorage.setItem('bf-cBTo',en2fa(bt));}catch(e){}
  const A=aggSimpleFiltered(af,at,C_SEL_A),B=aggSimpleFiltered(bf,bt,C_SEL_B);
  const keys=new Set([...A.keys(),...B.keys()]);
  const rank=leagueRank();
  const rows=[...keys].map(k=>{
    const a=A.get(k)||{code:'',store:'',qty:0,gross:0,net:0};
    const b=B.get(k)||{code:a.code,store:a.store,qty:0,gross:0,net:0};
    const store=a.store||b.store,code=a.code||b.code;
    const pa=pctOf(a),pb=pctOf(b);
    const ag=+a.gross||0,bg=+b.gross||0,an=+a.net||0,bn=+b.net||0;
    const ad=ag-an,bd=bg-bn;
    return {code,store,
      aq:+a.qty||0,bq:+b.qty||0,dq:(+b.qty||0)-(+a.qty||0),
      ap:pa,bp:pb,dp:pb-pa,
      ag,bg,dg:bg-ag,an,bn,dn:bn-an,ad,bd,dd:bd-ad};
  }).sort((x,y)=>{
    const rx=rank.has(ckey(x.code,x.store))?rank.get(ckey(x.code,x.store)):1e9;
    const ry=rank.has(ckey(y.code,y.store))?rank.get(ckey(y.code,y.store)):1e9;
    if(rx!==ry)return rx-ry;
    return String(x.store).localeCompare(String(y.store),'fa');
  });
  const T={aq:0,bq:0,ag:0,bg:0,an:0,bn:0,ad:0,bd:0};
  rows.forEach(r=>{T.aq+=r.aq;T.bq+=r.bq;T.ag+=r.ag;T.bg+=r.bg;T.an+=r.an;T.bn+=r.bn;T.ad+=r.ad;T.bd+=r.bd;});
  const tap=T.ag?Math.round(T.ad/T.ag*100):0, tbp=T.bg?Math.round(T.bd/T.bg*100):0;
  CMP={a:A,b:B,rows,tot:Object.assign({},T,{dq:T.bq-T.aq,dg:T.bg-T.ag,dn:T.bn-T.an,dd:T.bd-T.ad,ap:tap,bp:tbp,dp:tbp-tap,n:rows.length})};
  if(note)note.innerHTML='';
  renderCompare();
}
function cmpCols(){
  const cols=[
    {k:'aq',t:'فروش A',c:'ca'},
    {k:'bq',t:'فروش B',c:'cb'},
    {k:'dq',t:'Δ فروش',c:'cd',diff:1},
    {k:'ap',t:'٪ A',c:'ca',pct:1},
    {k:'bp',t:'٪ B',c:'cb',pct:1},
    {k:'dp',t:'Δ ٪',c:'cd',pctdiff:1}
  ];
  if(C_OPTS.gross)cols.push({k:'ag',t:'ناخالص A',c:'ca',money:1},{k:'bg',t:'ناخالص B',c:'cb',money:1},{k:'dg',t:'Δ ناخالص',c:'cd',money:1,diff:1});
  if(C_OPTS.net)cols.push({k:'an',t:'خالص A',c:'ca',money:1},{k:'bn',t:'خالص B',c:'cb',money:1},{k:'dn',t:'Δ خالص',c:'cd',money:1,diff:1});
  if(C_OPTS.disc)cols.push({k:'ad',t:'تخفیف A',c:'ca',money:1},{k:'bd',t:'تخفیف B',c:'cb',money:1},{k:'dd',t:'Δ تخفیف',c:'cd',money:1,diff:1});
  return cols;
}
function cmpCell(r,c){
  const v=+r[c.k]||0;
  if(c.pct)return `<td>٪${fa(v)}</td>`;
  if(c.pctdiff)return `<td><b class="${v>0?'up':(v<0?'dn':'')}">${(v>0?'+':'')+'٪'+fa(v)}</b></td>`;
  if(c.money){
    const n=fmtM(v);
    if(c.diff)return `<td><b class="${v>0?'up':(v<0?'dn':'')}">${signFa(n)}</b></td>`;
    return `<td>${fa(n)}</td>`;
  }
  if(c.diff)return `<td><b class="${v>0?'up':(v<0?'dn':'')}">${signFa(v)}</b></td>`;
  return `<td>${fa(v)}</td>`;
}
function renderCompare(){
  const tw=$('#cmpTotal'),el=$('#cmpWrap');
  if(!tw||!el)return;
  if(!CMP.rows||!CMP.rows.length){tw.innerHTML='';el.innerHTML='<p style="color:var(--muted);text-align:center">فروشگاهی برای مقایسه نیست.</p>';syncCmpUnit();return;}
  const u=unitLabel();
  const cols=cmpCols();
  const t=CMP.tot;
  const boxes=[];
  boxes.push(metric('فروش A',fa(t.aq)));
  boxes.push(metric('فروش B',fa(t.bq)));
  boxes.push(`<div class="m"><small>اختلاف فروش</small><b class="${t.dq>0?'up':(t.dq<0?'dn':'')}">${signFa(t.dq)}</b></div>`);
  boxes.push(metric('٪ A','٪'+fa(t.ap)));
  boxes.push(metric('٪ B','٪'+fa(t.bp)));
  boxes.push(`<div class="m"><small>اختلاف ٪</small><b class="${t.dp>0?'up':(t.dp<0?'dn':'')}">${(t.dp>0?'+':'')+'٪'+fa(t.dp)}</b></div>`);
  if(C_OPTS.gross){
    boxes.push(metric('ناخالص A',fa(fmtM(t.ag))));
    boxes.push(metric('ناخالص B',fa(fmtM(t.bg))));
    boxes.push(`<div class="m"><small>اختلاف ناخالص</small><b class="${t.dg>0?'up':(t.dg<0?'dn':'')}">${signFa(fmtM(t.dg))}</b></div>`);
  }
  if(C_OPTS.net){
    boxes.push(metric('خالص A',fa(fmtM(t.an)),true));
    boxes.push(metric('خالص B',fa(fmtM(t.bn)),true));
    boxes.push(`<div class="m"><small>اختلاف خالص</small><b class="${t.dn>0?'up':(t.dn<0?'dn':'')}">${signFa(fmtM(t.dn))}</b></div>`);
  }
  if(C_OPTS.disc){
    boxes.push(metric('تخفیف A',fa(fmtM(t.ad))));
    boxes.push(metric('تخفیف B',fa(fmtM(t.bd))));
    boxes.push(`<div class="m"><small>اختلاف تخفیف</small><b class="${t.dd>0?'up':(t.dd<0?'dn':'')}">${signFa(fmtM(t.dd))}</b></div>`);
  }
  tw.innerHTML=`<div class="cmptotal"><h4>★ جمع کل — ${fa(t.n)} فروشگاه <span class="tag">${cmpMoneyOn()?u:'تعداد و ٪'}</span></h4><div class="tgrid">${boxes.join('')}</div></div>`;
  const cls=cols.length>12?'xmany':(cols.length>6?'many':'');
  const head=`<thead><tr><th style="text-align:right">فروشگاه</th>${cols.map(c=>`<th class="${c.c}">${c.t}</th>`).join('')}</tr></thead>`;
  const body=CMP.rows.map(r=>`<tr><td class="store">${r.store}</td>${cols.map(c=>cmpCell(r,c)).join('')}</tr>`).join('');
  const tds=cols.map(c=>cmpCell(t,c)).join('');
  el.innerHTML=`<div class="cmpScroll"><table class="cmptable ${cls}">${head}<tbody>${body}<tr class="total"><td class="store">جمع کل</td>${tds}</tr></tbody></table>${cls?`<div class="hint">◀ برای دیدن همه ستون‌ها جدول را به چپ بکشید ▶${cmpMoneyOn()?` — مبالغ به ${u}`:''}</div>`:''}</div>`;
  syncCmpUnit();
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
function syncUnitLines(){const u=unitLabel();const a=$('#unitLine');if(a)a.textContent=u;const b=$('#hunitLine');if(b)b.textContent=u;try{if(typeof syncCmpUnit==='function')syncCmpUnit();else{const c=$('#cunitLine');if(c)c.textContent=u;}}catch(e){}}
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
    try{buildCompareStores();wireCompareUI();}catch(e){}
    let af='',at2='',bf2='',bt='';
    try{af=localStorage.getItem('bf-cAFrom')||'';at2=localStorage.getItem('bf-cATo')||'';bf2=localStorage.getItem('bf-cBFrom')||'';bt=localStorage.getItem('bf-cBTo')||'';}catch(e){}
    C_AFROM=af?normD(fa2en(af)):mx;C_ATO=at2?normD(fa2en(at2)):mx;
    C_BFROM=bf2?normD(fa2en(bf2)):mx;C_BTO=bt?normD(fa2en(bt)):mx;
    if($('#cAFrom'))$('#cAFrom').value=C_AFROM?en2fa(C_AFROM):'';
    if($('#cATo'))$('#cATo').value=C_ATO?en2fa(C_ATO):'';
    if($('#cBFrom'))$('#cBFrom').value=C_BFROM?en2fa(C_BFROM):'';
    if($('#cBTo'))$('#cBTo').value=C_BTO?en2fa(C_BTO):'';
    try{updateSelCounts();}catch(e){}
    if(HROWS.length&&C_AFROM&&C_ATO&&C_BFROM&&C_BTO){try{applyCompare();}catch(e){}}
    else{const n=$('#crangeNote');if(n)n.innerHTML='';}    syncUnitLines();
  });
  const ha=$('#hApply');if(ha)ha.onclick=()=>applyHistory(false);
  const ca=$('#cApply');if(ca)ca.onclick=()=>applyCompare();
}
