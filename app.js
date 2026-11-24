let DATA = [];
let prevRank = {};
let sortKey = 'net';
let query = '';
const $ = s => document.querySelector(s);
const fa = (n, d=0) => Number(n).toLocaleString('fa-IR',{maximumFractionDigits:d, minimumFractionDigits:d});
const faMoneyShort = v => {
  if (v >= 1e9) return fa(v/1e9, 2) + ' میلیارد';
  if (v >= 1e6) return fa(v/1e6, 1) + ' میلیون';
  return fa(v) + ' تومان';
};
const off = r => r.gross ? (1 - r.net / r.gross) * 100 : 0;
const basket = r => r.invoices ? r.net / r.invoices : 0;

async function fetchData(){
  try{
    const res = await fetch('data.json?t=' + Date.now(), {cache:'no-store'});
    DATA = await res.json();
  }catch(e){ /* اگر فایل پیدا نشد همان قبلی می‌ماند */ }
}

async function load(){
  await fetchData();
  DATA.forEach(r=>{ if(!(r.store in prevRank)) prevRank[r.store]=null; });
  render(true);
  // هر ۶۰ ثانیه فایل data.json را دوباره از هاست بخوان (بدون شبیه‌سازی تقلبی)
  setInterval(async ()=>{ await fetchData(); render(false); }, 60000);
  setInterval(clock, 1000); clock();
}
function clock(){
  const d = new Date();
  const el = document.querySelector('#clock');
  if(el) el.textContent = d.toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
function sorted(){
  let a = [...DATA];
  if(query) a = a.filter(r => (r.store+r.city).includes(query));
  if(sortKey==='net') a.sort((x,y)=>y.net-x.net);
  if(sortKey==='invoices') a.sort((x,y)=>y.invoices-x.invoices);
  if(sortKey==='off') a.sort((x,y)=>off(y)-off(x));
  if(sortKey==='basket') a.sort((x,y)=>basket(y)-basket(x));
  return a;
}
function render(first, flash=false){
  const rows = sorted();
  const totI = DATA.reduce((s,r)=>s+r.invoices,0);
  const totG = DATA.reduce((s,r)=>s+r.gross,0);
  const totN = DATA.reduce((s,r)=>s+r.net,0);
  const avgOff = totG ? (1-totN/totG)*100 : 0;
  document.querySelector('#kCount').textContent = fa(totI);
  document.querySelector('#kCountSub').textContent = 'فاکتور • میانگین سبد ' + faMoneyShort(totN/Math.max(1,totI));
  document.querySelector('#kGross').textContent = faMoneyShort(totG);
  document.querySelector('#kNet').textContent = faMoneyShort(totN);
  document.querySelector('#kOff').textContent = '٪' + fa(avgOff,1);
  document.querySelector('#kAvg').textContent = 'از کل فروش';
  document.querySelector('#updated').textContent = 'آخرین به‌روزرسانی: ' + new Date().toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});
  document.querySelector('#countLine').textContent = fa(rows.length) + ' فروشگاه';
  const top = [...DATA].sort((x,y)=>y.net-x.net).slice(0,3);
  const order = [top[1], top[0], top[2]];
  const medals = ['🥈','🥇','🥉'];
  document.querySelector('#pods').innerHTML = order.map((r,i)=>{
    const idx = i===1?0:(i===0?1:2);
    if(!r) return '';
    return `<div class="pod ${idx===0?'first':(idx===1?'second':'third')}">
      <div class="crown">${medals[i]}</div>
      <div class="nm">${r.store}</div><div class="vl">${faMoneyShort(r.net)}</div>
      <div class="sm">${fa(r.invoices)} فاکتور • ٪${fa(off(r),1)} تخفیف</div>
      <span class="medal m${i+1}">رتبه ${fa(idx+1)}</span></div>`;
  }).join('');
  const el = document.querySelector('#league');
  el.innerHTML = rows.map((r,i)=>{
    const rank = i+1;
    const o = off(r), b = basket(r), p = r.target ? Math.min(100, r.net/r.target*100) : 0;
    const prev = prevRank[r.store];
    let mv = '• بدون تغییر', mcls='';
    if(prev!==null && prev!==rank){ mv = prev>rank ? '▲ صعود' : '▼ سقوط'; mcls = prev>rank?'up':'down'; }
    const rc = rank===1?'r1':(rank===2?'r2':(rank===3?'r3':''));
    return `<article class="row ${flash?'flash':''}" tabindex="0" title="${r.store}">
      <div><div class="rank ${rc}">${fa(rank)}</div><div class="rise ${mcls}">${mv}</div></div>
      <div><div class="store">${r.store}</div><div class="city">${r.city} • تا هدف ${fa(p,0)}٪</div>
      <div class="badges">
        <span class="badge cnt">🧾 ${fa(r.invoices)} فاکتور</span>
        <span class="badge off">🎁 ٪${fa(o,1)} تخفیف</span>
        <span class="badge avg">🛒 سبد ${faMoneyShort(b)}</span>
      </div></div>
      <div class="net">${faMoneyShort(r.net)}<small>ناخالص ${faMoneyShort(r.gross)}</small></div>
      <div class="bar"><i style="width:${p}%"></i></div>
      <div class="goal"><span>خالص: ${fa(r.net)} تومان</span><span>هدف: ${faMoneyShort(r.target)}</span></div>
    </article>`;
  }).join('') || '<p class="hint">فروشگاهی پیدا نشد.</p>';
  rows.forEach((r,i)=> prevRank[r.store]=i+1);
}
function summaryText(){
  const top = [...DATA].sort((x,y)=>y.net-x.net).slice(0,5);
  const totN = DATA.reduce((s,r)=>s+r.net,0);
  const totI = DATA.reduce((s,r)=>s+r.invoices,0);
  let t = `🏆 لیگ بلک‌فرایدی — ساعت ${new Date().toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})}\n`;
  t += `جمع خالص: ${fa(totN)} تومان | فاکتور: ${fa(totI)}\n———————\n`;
  top.forEach((r,i)=>{ t += `${i+1}. ${r.store}: ${fa(r.net)} (٪${fa(off(r),1)} | ${fa(r.invoices)} فاکتور)\n`; });
  t += 'جدول زنده: [لینک پنل]';
  return t;
}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));
  b.classList.add('on'); sortKey=b.dataset.sort; render(false);
}));
document.querySelector('#q').addEventListener('input',e=>{ query=e.target.value.trim(); render(false); });
document.querySelector('#waBtn').addEventListener('click',()=>{ window.open('https://wa.me/?text='+encodeURIComponent(summaryText()),'_blank'); });
document.querySelector('#copyBtn').addEventListener('click',async()=>{
  try{ await navigator.clipboard.writeText(summaryText()); const b=document.querySelector('#copyBtn'); b.textContent='کپی شد ✓'; setTimeout(()=>b.textContent='کپی خلاصه',1500);}catch(e){}
});
load();
