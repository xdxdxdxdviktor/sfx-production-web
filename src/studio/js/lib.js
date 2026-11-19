/* SFX Studio — shared helpers: DOM, icons, toasts, dialogs, Markdown preview, charts, image conversion. */
export const $ = (s, r=document) => r.querySelector(s);
export const $$ = (s, r=document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const store = {
  get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} }
};
export const slugify = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70);
export const fmtN = n => new Intl.NumberFormat('cs-CZ').format(Math.round(n||0));
export const fmtDate = d => d ? new Date(d).toLocaleDateString('cs-CZ', {day:'numeric', month:'long', year:'numeric'}) : '';
export const fmtShort = d => new Date(d).toLocaleDateString('cs-CZ', {day:'numeric', month:'numeric'});
export function ago(d){
  const s = (Date.now() - new Date(d)) / 1000;
  if(s < 60) return 'právě teď';
  if(s < 3600) return `před ${Math.floor(s/60)} min`;
  if(s < 86400) return `před ${Math.floor(s/3600)} h`;
  const days = Math.floor(s/86400);
  return days === 1 ? 'včera' : days < 7 ? `před ${days} dny` : fmtShort(d);
}
export const fmtDur = s => { s = Math.max(0, Math.round(s)); const m = Math.floor(s/60); return m ? `${m} min ${s%60} s` : `${s} s`; };

/* line icons (24×24, stroke) */
const P = {
  home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  pen:'<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/>',
  chart:'<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16l4-5 3 3 5-7"/>',
  inbox:'<path d="M3 13l3-8h12l3 8"/><path d="M3 13v6h18v-6"/><path d="M3 13h5l1 3h6l1-3h5"/>',
  film:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  text:'<path d="M4 6h16M4 12h10M4 18h13"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  ext:'<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  out:'<path d="M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H4"/>',
  back:'<path d="M15 5l-7 7 7 7"/>',
  check:'<path d="M5 12l5 5 9-10"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  alert:'<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
  upload:'<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><path d="M16 4.5a3.5 3.5 0 010 7"/><path d="M18 14a6 6 0 013.5 6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bolt:'<path d="M13 3L4 14h7l-1 7 9-11h-7z"/>',
  trash:'<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
  bold:'<path d="M7 5h6a3.5 3.5 0 010 7H7z"/><path d="M7 12h7a3.5 3.5 0 010 7H7z"/>',
  italic:'<path d="M10 5h8M6 19h8M14 5l-4 14"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  link:'<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  quote:'<path d="M7 7h4v4c0 3-2 5-4 6"/><path d="M14 7h4v4c0 3-2 5-4 6"/>',
  h2:'<path d="M4 6v12M12 6v12M4 12h8"/><path d="M16 10a2 2 0 114 0c0 2-4 3-4 6h4"/>',
  split:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>',
  rocket:'<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2"/><path d="M9 15l-3-3c1-4 4-8 10-9 1 6-3 9-7 12z"/><circle cx="14.5" cy="9.5" r="1.5"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/>',
  refresh:'<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>'
};
export const ic = (n, cls='') => `<svg viewBox="0 0 24 24" aria-hidden="true"${cls?` class="${cls}"`:''}>${P[n]||''}</svg>`;

/* toasts */
export function toast(msg, kind='ok', ms=4200){
  let box = $('.toasts'); if(!box){ box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role','status'); box.setAttribute('aria-live','polite'); document.body.appendChild(box); }
  const t = document.createElement('div'); t.className = 'toast ' + kind;
  t.innerHTML = ic(kind==='err' ? 'alert' : kind==='busy' ? 'rocket' : 'check') + `<div>${msg}</div>`;
  box.appendChild(t);
  const kill = () => { t.classList.add('out'); setTimeout(()=>t.remove(), 300); };
  if(ms) setTimeout(kill, ms);
  return {el:t, set(html){ t.querySelector('div').innerHTML = html; }, close:kill};
}

/* confirm dialog */
export function confirmBox({title, text, ok='Potvrdit', danger=false}){
  return new Promise(res => {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div role="dialog" aria-modal="true" aria-labelledby="mT"><h3 id="mT">${esc(title)}</h3><p>${esc(text)}</p><div class="row"><button class="btn ghost" data-v="0">Zrušit</button><button class="btn ${danger?'danger':'gold'}" data-v="1">${esc(ok)}</button></div></div>`;
    const done = v => { m.remove(); document.removeEventListener('keydown', key); res(v); };
    const key = e => { if(e.key==='Escape') done(false); };
    m.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if(b) done(b.dataset.v==='1'); else if(e.target===m) done(false); });
    document.addEventListener('keydown', key);
    document.body.appendChild(m); $('[data-v="1"]', m).focus();
  });
}

/* Markdown → HTML, same rules as the site build (tools/content.mjs) */
function inline(s){
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => /^(https?:|mailto:|tel:|\/|#)/.test(u) ? `<a href="${u}" target="_blank" rel="noopener">${t}</a>` : t);
}
export function markdown(md, img = s => s){
  const blocks = String(md||'').replace(/\r/g,'').split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean);
  return blocks.map(b => {
    let m;
    if((m = b.match(/^(#{2,3})\s+(.+)$/))) return `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`;
    if((m = b.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))) return `<figure><img src="${esc(img(m[2]))}" alt="${esc(m[1])}">${m[1]?`<figcaption>${esc(m[1])}</figcaption>`:''}</figure>`;
    const lines = b.split('\n');
    if(lines.every(l=>/^[-*]\s+/.test(l))) return `<ul>${lines.map(l=>`<li>${inline(l.replace(/^[-*]\s+/,''))}</li>`).join('')}</ul>`;
    if(lines.every(l=>/^\d+[.)]\s+/.test(l))) return `<ol>${lines.map(l=>`<li>${inline(l.replace(/^\d+[.)]\s+/,''))}</li>`).join('')}</ol>`;
    if(lines.every(l=>/^>\s?/.test(l))) return `<blockquote>${inline(lines.map(l=>l.replace(/^>\s?/,'')).join(' '))}</blockquote>`;
    return `<p>${lines.map(inline).join('<br>')}</p>`;
  }).join('\n');
}
export const wordCount = md => String(md||'').replace(/[#>*\-\[\]()!]/g,' ').split(/\s+/).filter(Boolean).length;

/* ---------- charts (SVG, gold) ---------- */
let gid = 0;
export function sparkline(values, {h=64, w=300}={}){
  if(!values.length) return '';
  const max = Math.max(...values, 1), n = values.length, id = 'sg'+(++gid);
  const pts = values.map((v,i)=>[n<2 ? w/2 : i*w/(n-1), h - 6 - (v/max)*(h-14)]);
  const line = smooth(pts);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8be92" stop-opacity=".35"/><stop offset="1" stop-color="#d8be92" stop-opacity="0"/></linearGradient></defs>
    <path d="${line} L${w} ${h} L0 ${h} Z" fill="url(#${id})"/><path d="${line}" fill="none" stroke="#d8be92" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
}
function smooth(p){
  if(p.length < 2) return p.length ? `M${p[0][0]} ${p[0][1]}` : '';
  let d = `M${p[0][0]} ${p[0][1]}`;
  for(let i=0;i<p.length-1;i++){
    const [x0,y0] = p[i-1]||p[i], [x1,y1] = p[i], [x2,y2] = p[i+1], [x3,y3] = p[i+2]||p[i+1];
    d += ` C${x1+(x2-x0)/6} ${y1+(y2-y0)/6} ${x2-(x3-x1)/6} ${y2-(y3-y1)/6} ${x2} ${y2}`;
  }
  return d;
}
/* area chart with two series and hover tooltip; series: [{name, color, values:[]}], labels: [] */
export function areaChart(el, labels, series){
  const W = 1000, H = 280, pl = 44, pr = 10, pt = 16, pb = 30;
  const max = Math.max(1, ...series.flatMap(s=>s.values)); const nice = niceMax(max);
  const n = labels.length, X = i => pl + (n<2 ? (W-pl-pr)/2 : i*(W-pl-pr)/(n-1)), Y = v => pt + (H-pt-pb)*(1 - v/nice);
  const ticks = [0, .25, .5, .75, 1].map(f => Math.round(nice*f));
  const step = Math.max(1, Math.ceil(n/8));
  let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Graf návštěvnosti"><defs>`;
  series.forEach((s,i)=> svg += `<linearGradient id="ag${gid}${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".32"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient>`);
  svg += `</defs>`;
  ticks.forEach(t => svg += `<line x1="${pl}" x2="${W-pr}" y1="${Y(t)}" y2="${Y(t)}" stroke="rgba(241,236,228,.07)" vector-effect="non-scaling-stroke"/><text x="${pl-10}" y="${Y(t)+4}" text-anchor="end" fill="rgba(241,236,228,.6)" font-size="12">${fmtN(t)}</text>`);
  labels.forEach((l,i) => { if(i % step === 0 || i === n-1) svg += `<text x="${X(i)}" y="${H-8}" text-anchor="middle" fill="rgba(241,236,228,.6)" font-size="12">${esc(l)}</text>`; });
  series.forEach((s,i) => { const pts = s.values.map((v,j)=>[X(j), Y(v)]); const d = smooth(pts);
    svg += `<path d="${d} L${X(n-1)} ${Y(0)} L${X(0)} ${Y(0)} Z" fill="url(#ag${gid}${i})"/><path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.4" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`; });
  svg += `<line class="cur" x1="0" x2="0" y1="${pt}" y2="${H-pb}" stroke="rgba(241,236,228,.3)" stroke-dasharray="3 4" vector-effect="non-scaling-stroke" opacity="0"/>`;
  series.forEach((s,i) => svg += `<circle class="dot${i}" r="5" fill="#0a0908" stroke="${s.color}" stroke-width="2.5" opacity="0" vector-effect="non-scaling-stroke"/>`);
  svg += `<rect x="${pl}" y="0" width="${W-pl-pr}" height="${H}" fill="transparent" class="hit"/></svg><div class="tip"></div>`;
  gid++;
  el.innerHTML = svg;
  const s = $('svg', el), tip = $('.tip', el), cur = $('.cur', el);
  const move = e => {
    const r = s.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * W;
    const i = Math.max(0, Math.min(n-1, Math.round((x - pl) / ((W-pl-pr)/Math.max(1,n-1)))));
    cur.setAttribute('x1', X(i)); cur.setAttribute('x2', X(i)); cur.setAttribute('opacity', 1);
    series.forEach((sr,k) => { const c = $('.dot'+k, el); c.setAttribute('cx', X(i)); c.setAttribute('cy', Y(sr.values[i]||0)); c.setAttribute('opacity', 1); });
    tip.innerHTML = `<i>${esc(labels[i])}</i>` + series.map(sr => `<b style="color:${sr.color}">${fmtN(sr.values[i])}</b><i>${esc(sr.name)}</i>`).join('');
    tip.style.left = (X(i)/W*100) + '%'; tip.style.top = (Y(Math.max(...series.map(sr=>sr.values[i]||0)))/H*100) + '%'; tip.style.opacity = 1;
  };
  s.addEventListener('pointermove', move);
  s.addEventListener('pointerleave', () => { tip.style.opacity = 0; cur.setAttribute('opacity', 0); series.forEach((_,k)=>$('.dot'+k, el).setAttribute('opacity', 0)); });
}
function niceMax(v){ const p = Math.pow(10, Math.floor(Math.log10(v))); for(const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if(m*p >= v) return m*p; return 10*p; }
export function bars(list, {label = x=>x.x, value = x=>x.y, empty='Zatím žádná data'}={}){
  if(!list || !list.length) return `<p class="muted">${empty}</p>`;
  const max = Math.max(...list.map(value), 1);
  return `<ul class="bars">${list.map(x => `<li style="--w:${Math.max(4, value(x)/max*100)}%"><span>${esc(label(x))}</span><b>${fmtN(value(x))}</b></li>`).join('')}</ul>`;
}
export function ring(score){
  const r = 42, c = 2*Math.PI*r, col = score >= 80 ? '#7fc79a' : score >= 55 ? '#e8b45c' : '#e2493a';
  return `<div class="ring"><svg viewBox="0 0 96 96"><circle cx="48" cy="48" r="${r}" fill="none" stroke="rgba(241,236,228,.08)" stroke-width="7"/><circle cx="48" cy="48" r="${r}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c*(1-score/100)}" style="transition:stroke-dashoffset .8s cubic-bezier(.2,.7,.2,1)"/></svg><b>${score}</b></div>`;
}

/* ---------- images: resize + WebP in the browser (max 2400 px, quality .85) ---------- */
export async function toWebp(file, max = 2400, q = .85){
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width*k); c.height = Math.round(bmp.height*k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  let blob = await new Promise(r => c.toBlob(r, 'image/webp', q));
  let ext = 'webp';
  /* Safari (iPhone) can't encode WebP and silently returns PNG: use JPEG there */
  if(!blob || blob.type !== 'image/webp'){ blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .86)); ext = 'jpg'; }
  return {blob, width:c.width, height:c.height, ext};
}
export const blobToB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
export const textToB64 = s => { const bytes = new TextEncoder().encode(s); let bin = ''; for(let i=0;i<bytes.length;i+=0x8000) bin += String.fromCharCode(...bytes.subarray(i, i+0x8000)); return btoa(bin); };
export const b64ToText = b => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g,'')), c => c.charCodeAt(0)));
