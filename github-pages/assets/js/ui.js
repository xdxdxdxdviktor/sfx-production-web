/* HTML components shared by the static build and the browser. DOM-free: every function returns a string. */
import { I18N, FQ } from './i18n.js';
import { SERVICES, SVC_BY } from './services.js';
import { POSTS } from './posts.js';
import { ICON } from './icons.js';
import { PATHS, svcPath, postPath, rel } from './routes.js';
import { L, compute, defaults, rangeCfg, unitFor, money, moneyRange } from './calc.js';

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* render context: language + current page path (for relative links) */
export function ctx(lang, path){
  const t = k => (I18N[lang][k] ?? I18N.cs[k] ?? k);
  const href = p => rel(path, p);
  const asset = p => rel(path, '/assets/' + p);
  return { lang, path, t, href, asset };
}

export const svcT = (id, lang) => SVC_BY[id][lang];
export const imgTag = (c, key, alt='', cls='', eager=false) =>
  `<img${cls?` class="${cls}"`:''} src="${c.asset('img/'+key+'.webp')}" alt="${esc(alt)}" width="1200" height="750"${eager?' fetchpriority="high"':' loading="lazy"'} decoding="async">`;

export const fmtDate = (iso, lang) => { try{ return new Date(iso+'T12:00:00').toLocaleDateString(lang==='cs'?'cs-CZ':'en-GB', {day:'numeric', month: lang==='cs'?'long':'short', year:'numeric'}); }catch(e){ return iso; } };
export const readMin = p => Math.max(2, Math.round(p.cs.body.join(' ').split(/\s+/).length / 180));

/* ---------- home: services ---------- */
export function svcPreview(c, id){
  const sv = SVC_BY[id], d = sv[c.lang], k = sv.img;
  return `<div class="pv-img">${imgTag(c, k, d.t)}<video muted loop playsinline preload="none" data-src="${c.asset('video/'+k+'.mp4')}" poster="${c.asset('img/'+k+'.webp')}"></video><span class="ico">${ICON[sv.icon]}</span></div>
    <div class="pv-b"><h3>${d.t}</h3><p>${d.lead}</p>
    <p class="pv-price">${c.t('pg.priceFrom')} <b>${money(sv.from, c.lang)}</b></p>
    <div class="btns"><a class="btn primary" href="${c.href(svcPath(sv,c.lang))}">${c.t('svc.more')}</a><a class="btn glass" href="${c.href(svcPath(sv,c.lang))}#kalkulacka">${c.t('svc.calc')}</a></div></div>`;
}

/* ---------- blog cards ---------- */
export function postCard(c, p, kind=''){
  const d = p[c.lang] || p;
  const url = p.url || c.href(postPath(p, c.lang));
  const img = p.cover ? `<img src="${esc(p.cover)}" alt="${esc(d.t)}" loading="lazy" decoding="async">` : imgTag(c, p.img, d.t);
  return `<a class="bcard glass ${kind}" href="${url}">
    <div class="cover">${img}</div>
    <div class="body"><div class="meta"><span class="cat">${svcT(p.cat, c.lang).t}</span><span>${p.dateLabel || fmtDate(p.date, c.lang)}</span></div>
      <h3>${d.t}</h3><p>${d.lead}</p>${kind==='feat'?`<span class="more">${c.t('blog.read')} ${ICON.arrow}</span>`:''}</div></a>`;
}
export function blogGrid(c, posts, filter='all'){
  const list = filter==='all' ? posts : posts.filter(p=>p.svcs.includes(filter) || p.cat===filter);
  if(!list.length) return `<p class="empty">—</p>`;
  return list.map((p,i)=>postCard(c, p, filter==='all' ? (i===0?'feat':'row') : '')).join('');
}
export function blogChips(c, posts, filter='all'){
  const cats = ['all', ...new Set(posts.map(p=>p.cat))];
  return cats.map(k=>`<button type="button" class="chip" data-f="${k}" aria-pressed="${k===filter}">${k==='all'?c.t('blog.all'):svcT(k,c.lang).t}</button>`).join('');
}

/* ---------- process ---------- */
export const flow = c => `<ol class="flow">${[1,2,3,4].map(i=>`<li><span class="node">${i}</span><div class="card glass"><h3>${c.t('p'+i+'.t')}</h3><p>${c.t('p'+i+'.d')}</p><div class="out"><b>${c.t('proc.out')}</b>${c.t('p'+i+'.o')}</div></div></li>`).join('')}</ol>`;

/* ---------- enquiry form pieces ---------- */
export const ORDER = ['video','foto','dron','strih','vr','3d','viz','film','unsure'];
export function tiles(c, sel){
  const TL = c.t('tiles'), SUB = c.t('tileSub');
  return ORDER.map(k=>{ const sv = SERVICES.find(s=>s.tile===k);
    return `<button type="button" class="tile" data-s="${k}" aria-pressed="${sel.has(k)}">${sv?`<span class="tile-bg" style="background-image:url('${c.asset('img/'+sv.img+'.webp')}')"></span>`:''}${ICON[k]||''}<span><b>${TL[k]}</b>${SUB[k]?`<small>${SUB[k]}</small>`:''}</span></button>`; }).join('');
}
export function qblocks(c, sel, q){
  const Q = FQ[c.lang], TL = c.t('tiles');
  return ORDER.filter(k=>sel.has(k) && Q[k]).map(k=>`<fieldset class="qb"><legend><span class="qi">${ICON[k]||''}</span>${TL[k]}: ${Q[k][0]}</legend>
    <div class="qopts">${Q[k][1].map((o,i)=>`<button type="button" data-qk="${k}" data-qi="${i}" aria-pressed="${q[k]===i}">${o}</button>`).join('')}</div></fieldset>`).join('');
}
export const budgetBtns = (c, b) => c.t('budgets').map((x,i)=>`<button type="button" data-b="${i}" aria-pressed="${b===i}">${x}</button>`).join('');

/* ---------- calculator ---------- */
export function calcFields(c, svc, state){
  const lang = c.lang;
  return svc.calc.fields.map(f=>{
    if(f.kind==='choice') return `<fieldset class="cf cf-choice" data-f="${f.id}"><legend>${L(f.label,lang)}</legend>
      <div class="opts${f.opts.length>3?' four':''}">${f.opts.map(o=>`<label class="opt"><input type="radio" name="c-${f.id}" value="${o.id}"${state[f.id]===o.id?' checked':''}><span><b>${L(o.label,lang)}</b>${o.hint?`<small>${L(o.hint,lang)}</small>`:''}${o.add&&o.add[1]?`<em>${c.t('svc.from')} ${money(o.add[0],lang)}</em>`:o.mult&&o.mult!==1?`<em>×${String(o.mult).replace('.', lang==='cs'?',':'.')}</em>`:''}</span></label>`).join('')}</div></fieldset>`;
    if(f.kind==='range'){ const r = rangeCfg(f, state); if(!r) return `<div class="cf cf-range" data-f="${f.id}" hidden></div>`;
      const v = state[f.id] ?? r.def; const pct = (v-r.min)/(r.max-r.min)*100;
      return `<div class="cf cf-range" data-f="${f.id}"><div class="cf-top"><label for="c-${f.id}">${L(r.label,lang)}</label><output for="c-${f.id}"><b>${v}</b> <span>${unitFor(r.unit,v,lang)}</span></output></div>
        <div class="rng"><button type="button" class="step" data-d="-1" aria-label="−">−</button><input type="range" id="c-${f.id}" name="c-${f.id}" min="${r.min}" max="${r.max}" step="${r.step}" value="${v}" style="--p:${pct}%"><button type="button" class="step" data-d="1" aria-label="+">+</button></div>
        <small class="cf-hint">${money(r.price[0],lang).replace(/\u00a0Kč$/,'')}–${money(r.price[1],lang)} / ${unitFor(r.unit,1,lang)}${r.free?` · ${r.free} ${unitFor(r.unit,r.free,lang)} ${lang==='cs'?'v základu':'included'}`:''}</small></div>`; }
    if(f.kind==='extras') return `<fieldset class="cf cf-extras" data-f="${f.id}"><legend>${L(f.label,lang)}</legend>
      <div class="xopts">${f.opts.map(o=>`<label class="xopt"><input type="checkbox" name="c-${f.id}" value="${o.id}"${(state[f.id]||[]).includes(o.id)?' checked':''}><span><i></i>${L(o.label,lang)}<em>${o.add?`+${money(o.add[0],lang)}${o.per?` / ${unitFor(rangeCfg(svc.calc.fields.find(x=>x.id===o.per),state)?.unit||'',1,lang)}`:''}`:`+${Math.round((o.mult-1)*100)} %`}</em></span></label>`).join('')}</div></fieldset>`;
    return '';
  }).join('');
}
export function calcResult(c, svc, state){
  const r = compute(svc, state, c.lang);
  const lines = r.lines.map(l=>`<li><span>${esc(l.label)}</span><b>${l.mult?`×${String(l.mult).replace('.', c.lang==='cs'?',':'.')}`:`${money(l.min,c.lang)} – ${money(l.max,c.lang)}`}</b></li>`).join('');
  return `<div class="cr-k">${c.t('calc.result')}</div>
    <div class="cr-v" data-min="${r.min}" data-max="${r.max}">${moneyRange(r.min, r.max, c.lang)}</div>
    <div class="cr-meter" aria-hidden="true"><i style="left:${Math.min(96,Math.log10(Math.max(r.min,1000))/Math.log10(400000)*100)}%;right:${Math.max(0,100-Math.log10(Math.max(r.max,1000))/Math.log10(400000)*100)}%"></i></div>
    <div class="cr-days">${ICON.clock}<span>${c.t('calc.days')} <b>${r.days[0]}–${r.days[1]}</b> ${c.t('calc.wd')}</span></div>
    <details class="cr-break"><summary>${c.t('calc.breakdown')}</summary><ul>${lines}</ul></details>`;
}
export function calculator(c, svc){
  const state = defaults(svc);
  return `<section class="calc" id="kalkulacka" data-svc="${svc.id}" aria-labelledby="calc-h">
    <div class="calc-head"><span class="calc-ico">${ICON.calc}</span><div><h2 id="calc-h">${c.t('calc.h')}</h2><p>${c.t('calc.p')}</p></div></div>
    <div class="calc-body">
      <form class="calc-form glass" novalidate>${calcFields(c, svc, state)}</form>
      <aside class="calc-res glass"><div class="cr-live" aria-live="polite">${calcResult(c, svc, state)}</div>
        <button type="button" class="btn primary cr-send" data-act="send">${c.t('calc.send')}</button>
        <div class="cr-tools"><button type="button" class="ad-link" data-act="copy">${ICON.link}<span>${c.t('calc.copy')}</span></button><button type="button" class="ad-link" data-act="reset">${c.t('calc.reset')}</button></div>
        <p class="cr-note">${c.t('calc.note')}</p></aside>
    </div></section>`;
}

/* ---------- enquiry summary: clapperboard ---------- */
export function summary(c, s){
  const TL = c.t('tiles');
  const row = (k,v,g)=>`<div class="srow${v?'':' empty'}"><dt>${k}</dt><dd>${v||'—'}</dd>${v&&g?`<button type="button" data-go="${g}">${c.t('f.edit')}</button>`:''}</div>`;
  return `<div class="clap" aria-hidden="true"><i></i></div>
    <div class="sum-head" role="button" tabindex="0" aria-expanded="${!!s.open}"><h3>${c.t('sum.h')}${s.sel.length?` <em>(${s.sel.length})</em>`:''}</h3><span>${c.t('sum.take')} ${Math.min(s.step,4)}/4</span><i class="sum-caret"></i></div>
    <div class="slate"><div><span>${c.t('sum.prod')}</span><b>SFX production</b></div><div><span>${c.t('sum.scene')}</span><b>${s.sel.length?String(s.sel.length).padStart(2,'0'):'—'}</b></div><div><span>${c.t('sum.take')}</span><b>${String(Math.min(s.step,4)).padStart(2,'0')}</b></div><div class="wide"><span>${c.t('sum.dir')}</span><b>${esc(s.who)||'—'}</b></div></div>
    <div class="sum-bar"><i style="width:${(Math.min(s.step,4)-1)/3*100}%"></i></div>
    ${s.sel.length ? `<div class="sum-chips">${s.sel.map(k=>`<span>${ICON[k]||''}${TL[k]}</span>`).join('')}</div>` : `<p class="sum-empty">${c.t('sum.empty')}</p>`}
    <dl>${s.calc?row(c.t('sum.calc'), esc(s.calc)):''}${s.det?row(c.t('sum.det'), esc(s.det), 2):''}
      ${row(c.t('sum.when'), esc(s.when), 3)}${row(c.t('sum.where'), esc(s.where), 3)}${row(c.t('sum.budget'), esc(s.budget), 3)}
      ${row(c.t('sum.contact'), esc(s.contact), 4)}</dl>
    <ul class="sum-trust"><li>${c.t('sum.t1')}</li><li>${c.t('sum.t2')}</li><li>${c.t('sum.t3')}</li></ul>`;
}

export { SERVICES, SVC_BY, POSTS, ICON, PATHS, svcPath, postPath, money, moneyRange };
