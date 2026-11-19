/* SFX Studio — Statistiky (Umami, bez cookies) */
import { $, $$, esc, ic, fmtN, fmtDur, areaChart, bars, fmtShort } from './lib.js';
import { UM } from './api.js';
import { header } from './main.js';

const RANGES = [['24h','24 hodin',1,'hour'],['7d','7 dní',7,'day'],['30d','30 dní',30,'day'],['90d','90 dní',90,'day']];
const COUNTRY = {CZ:'Česko',SK:'Slovensko',DE:'Německo',AT:'Rakousko',PL:'Polsko',US:'USA',GB:'Velká Británie',NL:'Nizozemsko',FR:'Francie',UA:'Ukrajina',IT:'Itálie',ES:'Španělsko',HU:'Maďarsko',CH:'Švýcarsko'};
const DEVICE = {desktop:'Počítač',laptop:'Notebook',mobile:'Mobil',tablet:'Tablet'};
const EVENT = n => n === 'poptavka-odeslana' ? 'Odeslaná poptávka' : n === 'kontakt-email' ? 'Klik na e-mail' : n === 'kontakt-telefon' ? 'Klik na telefon' : n.startsWith('ukazka-') ? 'Přehraná ukázka: ' + n.slice(7).replace(/-/g,' ') : n;
const PAGE = p => p === '/' ? 'Úvodní stránka' : p === '/en/' ? 'Úvod (EN)' : decodeURIComponent(p);
const REF = r => r ? r.replace(/^www\./,'') : 'Přímý vstup';

export async function render(main){
  main.innerHTML = header('Statistiky', 'návštěvnost bez cookies', UM.ready() ? `<span class="muted" id="live" style="font-size:14px"></span><div class="seg" id="rng">${RANGES.map(([k,t],i)=>`<button data-k="${k}" aria-pressed="${i===2}">${t}</button>`).join('')}</div>` : '');
  if(!UM.ready()){
    main.insertAdjacentHTML('beforeend', `<div class="card empty fadein">${ic('chart')}<b>Připojte Umami</b><span style="max-width:52ch">Návštěvnost se už měří. Aby se zobrazovala i tady, vložte v Nastavení klíč k API z Umami (Settings → API keys).</span><a class="btn gold" href="#/nastaveni">${ic('key')}<span>Otevřít Nastavení</span></a></div>`);
    return;
  }
  main.insertAdjacentHTML('beforeend', `<div class="fadein">
    <div class="stat4" style="margin-bottom:18px">
      ${['Návštěvníci','Zobrazení stránek','Odchod po 1 stránce','Průměrná návštěva'].map((t,i)=>`<div class="card kpi" style="min-height:0" id="s${i}"><small>${t}</small><div class="v">—</div><div class="d">&nbsp;</div></div>`).join('')}
    </div>
    <section class="card" style="margin-bottom:18px"><div class="card-h"><h2>Návštěvnost</h2><div class="legend"><span style="--c:#d8be92">Zobrazení</span><span style="--c:#8fb3e8">Návštěvníci</span></div></div><div class="chart" id="ch"><div class="skel" style="height:100%"></div></div></section>
    <div class="grid g-12">
      <section class="card span-6"><div class="card-h"><h2>Stránky</h2></div><div id="mPath"></div></section>
      <section class="card span-6"><div class="card-h"><h2>Odkud přišli</h2></div><div id="mRef"></div></section>
      <section class="card span-4"><div class="card-h"><h2>Zařízení</h2></div><div id="mDev"></div></section>
      <section class="card span-4"><div class="card-h"><h2>Země</h2></div><div id="mCountry"></div></section>
      <section class="card span-4"><div class="card-h"><h2>Akce na webu</h2></div><div id="mEvent"></div></section>
    </div></div>`);
  let cur = '30d';
  const load = async k => {
    cur = k; const [,, days, unit] = RANGES.find(r => r[0]===k); const end = Date.now(), start = end - days*864e5;
    $$('#rng button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k===k));
    ['#mPath','#mRef','#mDev','#mCountry','#mEvent'].forEach(s => $(s).innerHTML = '<div class="skel" style="height:140px"></div>');
    try{
      const [s, ser] = await Promise.all([UM.stats(start, end), UM.series(start, end, unit)]);
      if(cur !== k) return;
      const visits = s.visits.v || 1;
      put('#s0', fmtN(s.visitors.v), s.visitors);
      put('#s1', fmtN(s.pageviews.v), s.pageviews);
      put('#s2', Math.round(s.bounces.v / visits * 100) + ' %', null, 'méně je lépe');
      put('#s3', fmtDur(s.totaltime.v / visits), null, `${(s.pageviews.v / visits).toFixed(1).replace('.',',')} stránky na návštěvu`);
      const lab = ser.pageviews.map(p => unit==='hour' ? new Date(p.x).getHours() + ':00' : fmtShort(p.x));
      areaChart($('#ch'), lab, [{name:'zobrazení', color:'#d8be92', values:ser.pageviews.map(p=>p.y)}, {name:'návštěvníci', color:'#8fb3e8', values:ser.sessions.map(p=>p.y)}]);
    }catch(e){ $('#ch').innerHTML = `<div class="empty">${ic('alert')}<b>Statistiky se nenačetly</b><span>${e.status===401 ? 'Klíč k Umami je neplatný. Zkontrolujte ho v Nastavení.' : esc(e.message)}</span></div>`; }
    const m = (sel, type, label, n=8) => UM.metrics(type, start, end, n).then(l => { if(cur===k) $(sel).innerHTML = bars(l, {label}); }).catch(() => { $(sel).innerHTML = '<p class="muted">Nedostupné</p>'; });
    m('#mPath', 'path', x => PAGE(x.x), 10); m('#mRef', 'referrer', x => REF(x.x), 10);
    m('#mDev', 'device', x => DEVICE[x.x] || x.x); m('#mCountry', 'country', x => COUNTRY[x.x] || x.x); m('#mEvent', 'event', x => EVENT(x.x));
  };
  const put = (sel, v, m, note) => { $(sel+' .v').textContent = v;
    let d = note || '';
    if(m && m.p != null && m.p > 0){ const ch = Math.round((m.v - m.p)/m.p*100); d = `<b class="${ch>=0?'up':'down'}">${ch>=0?'▲':'▼'} ${Math.abs(ch)} %</b> proti předchozímu období`; }
    $(sel+' .d').innerHTML = d || '&nbsp;'; };
  $('#rng').addEventListener('click', e => { const b = e.target.closest('[data-k]'); b && load(b.dataset.k); });
  load(cur);
  const live = () => UM.active().then(n => { const el = $('#live'); if(el) el.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 10px var(--ok)"></span>${fmtN(n)} právě na webu</span>`; }).catch(()=>{});
  live(); const t = setInterval(live, 30000);
  return () => clearInterval(t);
}
