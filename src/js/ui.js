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
/* responsive images: the build makes a 800 px wide "-800" copy of every photo in img/, uploads/ and portfolio/ */
export const hasSmall = src => /assets\/(img|uploads|portfolio)\//.test(src) && /\.(webp|jpe?g)$/i.test(src) && !/(logo|icon|favicon|camera-poster|intro-poster|jiri-hromadka)/.test(src);
export const rs = (src, sizes='(max-width: 820px) 100vw, 50vw') => hasSmall(src) ? ` srcset="${src.replace(/(\.\w+)$/,'-800$1')} 800w, ${src} 1600w" sizes="${sizes}"` : '';
export const imgTag = (c, key, alt='', cls='', eager=false) => { const src = c.asset('img/'+key+'.webp');
  return `<img${cls?` class="${cls}"`:''} src="${src}"${rs(src)} alt="${esc(alt)}" width="1200" height="750"${eager?' fetchpriority="high"':' loading="lazy"'} decoding="async">`; };

export const fmtDate = (iso, lang) => { try{ return new Date(iso+'T12:00:00').toLocaleDateString(lang==='cs'?'cs-CZ':'en-GB', {day:'numeric', month: lang==='cs'?'long':'short', year:'numeric'}); }catch(e){ return iso; } };
export const readMin = p => Math.max(2, Math.round((p.cs.words || 300) / 180));

/* media uploaded through the admin console live under /assets/uploads; built-in illustrations under /assets/img */
export const media = (c, p) => /^(https?:|data:)/.test(p) ? p : c.href(p);
export const svcImgSrc = (c, s) => s.hero ? media(c, s.hero) : c.asset('img/' + s.img + '.webp');
export const svcVidSrc = (c, s) => s.video ? media(c, s.video) : (s.hero ? '' : c.asset('video/' + s.img + '.mp4'));
export const srcTag = (src, alt='', cls='', eager=false, sizes) =>
  `<img${cls?` class="${cls}"`:''} src="${src}"${rs(src, sizes)} alt="${esc(alt)}" width="1200" height="750"${eager?' fetchpriority="high"':' loading="lazy"'} decoding="async">`;
export const ytId = u => { const m = String(u||'').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : (/^[\w-]{11}$/.test(u||'') ? u : ''); };
/* video block: uploaded mp4 or click-to-load YouTube */
export function videoBlock(c, {video, youtube, poster}){
  const id = ytId(youtube);
  if(id) return `<div class="vbox"><button type="button" class="yt" data-yt="${id}" style="background-image:url('https://i.ytimg.com/vi/${id}/hqdefault.jpg')" aria-label="YouTube"><span class="reel-play">${ICON.play}</span></button></div>`;
  if(video) return `<div class="vbox"><video controls playsinline preload="metadata" src="${media(c, video)}"${poster?` poster="${poster}"`:''}></video></div>`;
  return '';
}
export function gallery(c, items, alt=''){
  if(!items || !items.length) return '';
  const grp = 'g' + Math.abs([...alt].reduce((h,ch)=>h*31+ch.charCodeAt(0)|0, 7));
  return `<div class="pgal">${items.map((g,i)=>{ const src = media(c, g.src), a = esc(g.alt || alt + ' ' + (i+1)); return `<a class="pgal-i" href="${src}" data-lb="${grp}" data-type="image" data-src="${src}" data-title="${a}"><img src="${src}"${rs(src,'(max-width: 820px) 50vw, 25vw')} alt="${a}" loading="lazy" decoding="async"></a>`; }).join('')}</div>`;
}

/* ---------- home: services ---------- */
export function svcPreview(c, id){
  const sv = SVC_BY[id], d = sv[c.lang], vid = svcVidSrc(c, sv);
  return `<div class="pv-img">${srcTag(svcImgSrc(c, sv), d.t)}${vid?`<video muted loop playsinline preload="none" data-src="${vid}" poster="${svcImgSrc(c, sv)}"></video>`:''}<span class="ico">${ICON[sv.icon]}</span></div>
    <div class="pv-b"><h3>${d.t}</h3><p>${d.lead}</p>
    <ul class="tags">${sv.tags[c.lang].map(x=>`<li>${x}</li>`).join('')}</ul>
    <div class="btns"><a class="btn primary" href="${c.href(svcPath(sv,c.lang))}">${c.t('svc.more')}</a></div></div>`;
}

/* ---------- blog cards ---------- */
export function postCard(c, p, kind=''){
  const d = p[c.lang] || p;
  const url = p.url || c.href(postPath(p, c.lang));
  const img = p.cover ? srcTag(media(c, p.cover), d.t) : imgTag(c, p.img, d.t);
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

/* ---------- portfolio (Ukázky práce) ---------- */
export const WORK_CATS = ['reality','firmy','event','social','film','3d'];
export function workCard(c, w, cls=''){
  const d = w[c.lang] || w.cs, poster = media(c, w.poster), prev = w.preview ? media(c, w.preview) : '';
  const cat = c.t('wk.cat')[w.cat] || w.cat, svc = SVC_BY[w.svcs[0]];
  return `<li class="wk${w.vertical?' v':''}${cls?' '+cls:''}" data-cat="${w.cat}" id="ukazka-${w.id}">
    <button type="button" class="wk-btn" data-lb="work" data-type="${prev?'video':'image'}" data-src="${prev||poster}" data-poster="${poster}" data-title="${esc(d.t)}" data-desc="${esc(d.d)}" data-meta="${esc([cat, w.place, w.client].filter(Boolean).join(' · '))}"${ytId(w.youtube)?` data-yt="${ytId(w.youtube)}"`:''}${svc?` data-svc="${c.href(svcPath(svc,c.lang))}" data-pick="${svc.tile}"`:''} aria-label="${esc(d.t)} – ${c.t('wk.open')}">
      <span class="wk-media"><img src="${poster}"${rs(poster, w.vertical ? '(max-width: 820px) 50vw, 20vw' : '(max-width: 820px) 100vw, 40vw')} alt="${esc(d.t)}" width="${w.vertical?900:1600}" height="${w.vertical?1600:900}" loading="lazy" decoding="async">${prev?`<video muted loop playsinline preload="none" data-src="${prev}" aria-hidden="true" tabindex="-1"></video>`:''}</span>
      <span class="wk-hud" aria-hidden="true"><i class="rec">REC</i><i>${w.vertical?'9:16':'4K'}</i></span>
      <span class="wk-play" aria-hidden="true">${ICON.play}</span>
      <span class="wk-cap"><small>${esc([cat, w.place].filter(Boolean).join(' · '))}</small><b>${esc(d.t)}</b></span>
    </button></li>`;
}
export function workGrid(c, list, layout='bento'){
  return `<ul class="wk-grid ${layout}">${list.map((w,i)=>workCard(c, w, layout==='bento' && i===0 ? 'wk-hero' : '')).join('')}</ul>`;
}
export function workChips(c, list){
  const cats = WORK_CATS.filter(k=>list.some(w=>w.cat===k));
  return `<div class="chips wk-chips" role="group" aria-label="${c.t('wk.filter')}"><button type="button" class="chip" data-wf="all" aria-pressed="true">${c.t('blog.all')} <em>${list.length}</em></button>${cats.map(k=>`<button type="button" class="chip" data-wf="${k}" aria-pressed="false">${c.t('wk.cat')[k]} <em>${list.filter(w=>w.cat===k).length}</em></button>`).join('')}</div>`;
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
  return (group==='main' ? MAIN : MORE).map(k=>{ const sv = SERVICES.find(s=>s.tile===k); const img = TILE_IMG[k] ? c.asset('img/'+TILE_IMG[k]+'.webp') : (sv ? svcImgSrc(c, sv) : '');
    return `<button type="button" class="tile${group==='main'?' big':''}" data-s="${k}" aria-pressed="${sel.has(k)}">${img?`<span class="tile-bg" style="background-image:url('${img}')"></span>`:''}${ICON[k]||''}<span><b>${TL[k]}</b>${SUB[k]?`<small>${SUB[k]}</small>`:''}</span></button>`; }).join('');
}
export const budgetBtns = (c, b) => c.t('budgets').map((x,i)=>`<button type="button" data-b="${i}" aria-pressed="${b===i}">${x}</button>`).join('');

/* ---------- enquiry summary: clapperboard ---------- */
export function summary(c, s){
  const TL = c.t('tiles');
  const row = (k,v,g)=>`<div class="srow${v?'':' empty'}"><dt>${k}</dt><dd><span>${v||'—'}</span>${v&&g?`<button type="button" data-go="${g}">${c.t('f.edit')}</button>`:''}</dd></div>`;
  return `<div class="clap" aria-hidden="true"><i></i></div>
    <div class="sum-head" role="button" tabindex="0" aria-expanded="${!!s.open}"><h3>${c.t('sum.h')}${s.sel.length?` <em>(${s.sel.length})</em>`:''}</h3><i class="sum-caret"></i></div>
    <div class="slate"><div><span>${c.t('sum.prod')}</span><b>SFX production</b></div><div><span>${c.t('sum.scene')}</span><b>${s.sel.length?String(s.sel.length).padStart(2,'0'):'—'}</b></div><div class="wide"><span>${c.t('sum.dir')}</span><b>${esc(s.who)||'—'}</b></div></div>
    <div class="sum-bar"><i style="width:${(Math.min(s.step,3)-1)/2*100}%"></i></div>
    ${s.sel.length ? `<div class="sum-chips">${s.sel.map(k=>`<span>${ICON[k]||''}${TL[k]}</span>`).join('')}</div>` : `<p class="sum-empty">${c.t('sum.empty')}</p>`}
    <dl>${row(c.t('sum.when'), esc(s.when), 2)}${row(c.t('sum.where'), esc(s.where), 2)}${row(c.t('sum.budget'), esc(s.budget), 2)}
      ${row(c.t('sum.contact'), esc(s.contact), 3)}</dl>
    <ul class="sum-trust"><li>${c.t('sum.t1')}</li><li>${c.t('sum.t2')}</li><li>${c.t('sum.t3')}</li></ul>`;
}

export { SERVICES, SVC_BY, POSTS, ICON, PATHS, svcPath, postPath };
