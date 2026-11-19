/* SFX Studio — Přehled */
import { $, esc, ic, fmtN, ago, sparkline, areaChart, bars, fmtShort } from './lib.js';
import { CFG, GH, UM, SB, deploys } from './api.js';
import { header, callName } from './main.js';
import { loadPosts, postState } from './blog.js';

const greet = () => { const h = new Date().getHours(); return h < 5 ? 'Dobrou noc' : h < 10 ? 'Dobré ráno' : h < 12 ? 'Dobré dopoledne' : h < 18 ? 'Dobré odpoledne' : 'Dobrý večer'; };
const day = 864e5;

export async function render(main){
  main.innerHTML = header(`${greet()},<br><em>${esc(callName())}.</em>`, 'přehled') + `
  <div class="fadein">
    <div class="grid g-12" style="margin-bottom:18px">
      <div class="card kpi span-3" id="kVis"><small>${ic('users')}Návštěvníci · 7 dní</small><div class="v">—</div><div class="d">načítám…</div></div>
      <div class="card kpi span-3" id="kViews"><small>${ic('eye')}Zobrazení · 7 dní</small><div class="v">—</div><div class="d">načítám…</div></div>
      <a class="card kpi span-3 link" id="kLeads" href="#/poptavky" style="text-decoration:none"><small>${ic('inbox')}Nové poptávky</small><div class="v">—</div><div class="d">načítám…</div></a>
      <a class="card kpi span-3 link" id="kPosts" href="#/blog" style="text-decoration:none"><small>${ic('pen')}Články na blogu</small><div class="v">—</div><div class="d">načítám…</div></a>
    </div>
    <div class="grid g-12" style="margin-bottom:18px">
      <section class="card span-8"><div class="card-h"><h2>Návštěvnost · 30 dní</h2><a href="#/statistiky">Statistiky →</a></div><div class="chart" id="chart"><div class="skel" style="height:100%"></div></div></section>
      <section class="card span-4"><div class="card-h"><h2>Rychlé akce</h2></div>
        <div class="quick">
          <a href="#/blog/novy">${ic('plus')}<div><b>Nový článek</b><small>s náhledem a SEO</small></div></a>
          <a href="#/obsah/portfolio/novy">${ic('film')}<div><b>Nová ukázka</b><small>video do portfolia</small></div></a>
          <a href="#/obsah/services">${ic('image')}<div><b>Fotky ke službám</b><small>galerie a texty</small></div></a>
          <a href="${esc(CFG.site)}/" target="_blank" rel="noopener">${ic('globe')}<div><b>Otevřít web</b><small>živá verze</small></div></a>
        </div></section>
    </div>
    <div class="grid g-12">
      <section class="card span-6"><div class="card-h"><h2>Poslední změny</h2><a href="https://github.com/${esc(CFG.repo)}/commits" target="_blank" rel="noopener">Celá historie →</a></div><ul class="timeline" id="commits"><li><div class="skel" style="height:30px;grid-column:1/-1"></div></li></ul></section>
      <section class="card span-6"><div class="card-h"><h2>Nasazení</h2><span class="muted" id="dsum"></span></div><div class="filmstrip" id="strip"></div>
        <div class="card-h" style="margin-top:22px"><h2>Nejčtenější · 7 dní</h2></div><div id="top"><div class="skel" style="height:120px"></div></div></section>
    </div>
  </div>`;

  /* visitors */
  const now = Date.now();
  if(UM.ready()){
    Promise.all([UM.stats(now-7*day, now), UM.series(now-30*day, now), UM.series(now-7*day, now), UM.metrics('path', now-7*day, now, 6)]).then(([s, s30, s7, top]) => {
      kpi('#kVis', s.visitors, s7.sessions.map(p=>p.y));
      kpi('#kViews', s.pageviews, s7.pageviews.map(p=>p.y));
      areaChart($('#chart'), s30.pageviews.map(p=>fmtShort(p.x)), [
        {name:'zobrazení', color:'#d8be92', values:s30.pageviews.map(p=>p.y)},
        {name:'návštěvníci', color:'#8fb3e8', values:s30.sessions.map(p=>p.y)}]);
      $('#top').innerHTML = bars(top, {label:x=>x.x === '/' ? 'Úvodní stránka' : x.x});
    }).catch(e => umamiOff(e));
  } else umamiOff();

  /* enquiries */
  if(SB.enabled()) SB.newCount().then(n => { $('#kLeads .v').textContent = fmtN(n); $('#kLeads .d').textContent = n ? 'čekají na odpověď' : 'vše vyřízeno'; });
  else { $('#kLeads .v').textContent = '—'; $('#kLeads .d').innerHTML = 'Zatím chodí jen e-mailem. <b style="color:var(--gold)">Zapnout →</b>'; }

  /* posts */
  loadPosts().then(ps => {
    const live = ps.filter(p => postState(p).k === 'live').length;
    $('#kPosts .v').textContent = fmtN(live);
    const other = ps.length - live; $('#kPosts .d').textContent = other ? `+ ${other} v konceptech nebo naplánované` : 'všechny zveřejněné';
  }).catch(() => { $('#kPosts .d').textContent = 'nepodařilo se načíst'; });

  /* commits */
  GH.commits(8).then(cs => {
    $('#commits').innerHTML = cs.map(c => `<li>${c.author?.avatar_url ? `<img src="${esc(c.author.avatar_url)}&s=60" alt="">` : '<span class="av"></span>'}
      <div><b>${esc(c.commit.message.split('\n')[0])}</b><small>${esc(c.commit.author.name)}</small></div><time>${ago(c.commit.author.date)}</time></li>`).join('');
  }).catch(e => { $('#commits').innerHTML = `<li><span class="muted" style="grid-column:1/-1">${esc(e.message)}</span></li>`; });

  /* deploys */
  const off = deploys.on(runs => {
    if(!$('#strip')) return;
    $('#strip').innerHTML = runs.slice(0,6).map(r => { const k = r.status !== 'completed' ? 'busy' : r.conclusion === 'success' ? 'ok' : 'fail';
      return `<a class="frame ${k}" href="${esc(r.html_url)}" target="_blank" rel="noopener" title="${esc(r.display_title)}"><b>${k==='ok'?'● ONLINE':k==='busy'?'◐ BĚŽÍ':'✕ CHYBA'}</b><span>${esc(r.display_title)}</span><b>${ago(r.created_at)}</b></a>`; }).join('') || '<p class="muted">Žádná nasazení</p>';
    const ok = runs.filter(r => r.conclusion === 'success').length; $('#dsum').textContent = runs.length ? `${ok} z ${runs.length} v pořádku` : '';
  });
  return off;
}

function kpi(sel, m, spark){
  $(sel + ' .v').textContent = fmtN(m.v);
  let d = 'za posledních 7 dní';
  if(m.p != null && m.p > 0){ const ch = Math.round((m.v - m.p) / m.p * 100); d = `<b class="${ch>=0?'up':'down'}">${ch>=0?'▲':'▼'} ${Math.abs(ch)} %</b> proti minulému týdnu`; }
  $(sel + ' .d').innerHTML = d;
  $(sel).insertAdjacentHTML('beforeend', sparkline(spark));
}
function umamiOff(e){
  const msg = e ? (e.status===401 ? 'Klíč k Umami je neplatný.' : 'Umami teď neodpovídá.') : 'Připojte Umami v Nastavení.';
  for(const s of ['#kVis','#kViews']){ $(s+' .v').textContent = '—'; $(s+' .d').innerHTML = `<a href="#/nastaveni" style="color:var(--gold)">${msg}</a>`; }
  $('#chart').innerHTML = `<div class="empty">${ic('chart')}<b>Statistiky čekají</b><span>${msg}</span><a class="btn sm" href="#/nastaveni">${ic('key')}Připojit Umami</a></div>`;
  $('#top').innerHTML = '<p class="muted">Po připojení Umami tu uvidíte nejčtenější stránky.</p>';
}
