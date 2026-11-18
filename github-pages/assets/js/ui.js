/* HTML components shared by the static build and the browser. DOM-free: every function returns a string. */
import { I18N } from './i18n.js';
import { SERVICES, SVC_BY } from './services.js';
import { POSTS } from './posts.js';
import { ICON } from './icons.js';
import { PATHS, svcPath, postPath, rel } from './routes.js';

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
    <ul class="tags">${sv.tags[c.lang].map(x=>`<li>${x}</li>`).join('')}</ul>
    <div class="btns"><a class="btn primary" href="${c.href(svcPath(sv,c.lang))}">${c.t('svc.more')}</a></div></div>`;
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
export const MAIN = ['foto','video','fotovideo'];
export const MORE = ['dron','strih','vr','3d','viz','film','other'];
export const ORDER = [...MAIN, ...MORE];
const TILE_IMG = {foto:'product', video:'festival', fotovideo:'edit'};
export function tiles(c, sel, group='more'){
  const TL = c.t('tiles'), SUB = c.t('tileSub');
  return (group==='main' ? MAIN : MORE).map(k=>{ const sv = SERVICES.find(s=>s.tile===k); const img = TILE_IMG[k] || (sv && sv.img);
    return `<button type="button" class="tile${group==='main'?' big':''}" data-s="${k}" aria-pressed="${sel.has(k)}">${img?`<span class="tile-bg" style="background-image:url('${c.asset('img/'+img+'.webp')}')"></span>`:''}${ICON[k]||''}<span><b>${TL[k]}</b>${SUB[k]?`<small>${SUB[k]}</small>`:''}</span></button>`; }).join('');
}
export const budgetBtns = (c, b) => c.t('budgets').map((x,i)=>`<button type="button" data-b="${i}" aria-pressed="${b===i}">${x}</button>`).join('');

/* ---------- enquiry summary: clapperboard ---------- */
export function summary(c, s){
  const TL = c.t('tiles');
  const row = (k,v,g)=>`<div class="srow${v?'':' empty'}"><dt>${k}</dt><dd>${v||'—'}</dd>${v&&g?`<button type="button" data-go="${g}">${c.t('f.edit')}</button>`:''}</div>`;
  return `<div class="clap" aria-hidden="true"><i></i></div>
    <div class="sum-head" role="button" tabindex="0" aria-expanded="${!!s.open}"><h3>${c.t('sum.h')}${s.sel.length?` <em>(${s.sel.length})</em>`:''}</h3><span>${c.t('sum.take')} ${Math.min(s.step,3)}/3</span><i class="sum-caret"></i></div>
    <div class="slate"><div><span>${c.t('sum.prod')}</span><b>SFX production</b></div><div><span>${c.t('sum.scene')}</span><b>${s.sel.length?String(s.sel.length).padStart(2,'0'):'—'}</b></div><div><span>${c.t('sum.take')}</span><b>${String(Math.min(s.step,3)).padStart(2,'0')}</b></div><div class="wide"><span>${c.t('sum.dir')}</span><b>${esc(s.who)||'—'}</b></div></div>
    <div class="sum-bar"><i style="width:${(Math.min(s.step,3)-1)/2*100}%"></i></div>
    ${s.sel.length ? `<div class="sum-chips">${s.sel.map(k=>`<span>${ICON[k]||''}${TL[k]}</span>`).join('')}</div>` : `<p class="sum-empty">${c.t('sum.empty')}</p>`}
    <dl>${row(c.t('sum.when'), esc(s.when), 2)}${row(c.t('sum.where'), esc(s.where), 2)}${row(c.t('sum.budget'), esc(s.budget), 2)}
      ${row(c.t('sum.contact'), esc(s.contact), 3)}</dl>
    <ul class="sum-trust"><li>${c.t('sum.t1')}</li><li>${c.t('sum.t2')}</li><li>${c.t('sum.t3')}</li></ul>`;
}

export { SERVICES, SVC_BY, POSTS, ICON, PATHS, svcPath, postPath };
