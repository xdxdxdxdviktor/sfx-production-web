/* Turns the editable content in /content (written by the admin console) into the JS modules
   the site uses. Generated files: src/js/services.js, src/js/posts.js, src/js/site-content.js.
   Do not edit those three by hand. */
import fs from 'node:fs';
import path from 'node:path';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const list = dir => fs.existsSync(dir) ? fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort().map(f=>read(path.join(dir,f))) : [];
const arr = v => Array.isArray(v) ? v : (v ? [v] : []);
const strs = v => arr(v).map(x => typeof x === 'string' ? x : (x && (x.text ?? x.value ?? x.item) || '')).filter(Boolean);
const slugify = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);

/* small, safe Markdown: ## / ### headings, paragraphs, - and 1. lists, > quotes, images, **bold**, *italic*, [links](url) */
function inline(s){
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => /^(https?:|mailto:|tel:|\/|#)/.test(u) ? `<a href="${u}"${/^https?:/.test(u)?' rel="noopener" target="_blank"':''}>${t}</a>` : t);
}
export function markdown(md){
  const blocks = String(md||'').replace(/\r/g,'').split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean);
  return blocks.map(b => {
    let m;
    if((m = b.match(/^(#{2,3})\s+(.+)$/))) return `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`;
    if((m = b.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))) return `<figure class="art-img"><img src="${esc(m[2])}" alt="${esc(m[1])}" loading="lazy" decoding="async">${m[1]?`<figcaption>${esc(m[1])}</figcaption>`:''}</figure>`;
    const lines = b.split('\n');
    if(lines.every(l=>/^[-*]\s+/.test(l))) return `<ul class="pg-list">${lines.map(l=>`<li>${inline(l.replace(/^[-*]\s+/,''))}</li>`).join('')}</ul>`;
    if(lines.every(l=>/^\d+[.)]\s+/.test(l))) return `<ol>${lines.map(l=>`<li>${inline(l.replace(/^\d+[.)]\s+/,''))}</li>`).join('')}</ol>`;
    if(lines.every(l=>/^>\s?/.test(l))) return `<blockquote class="me-quote">${inline(lines.map(l=>l.replace(/^>\s?/,'')).join(' '))}</blockquote>`;
    return `<p>${lines.map(inline).join('<br>')}</p>`;
  }).join('\n');
}
const words = md => String(md||'').replace(/[#>*\-\[\]()!]/g,' ').split(/\s+/).filter(Boolean).length;

export function generate(ROOT){
  const C = path.join(ROOT, 'content'), OUTJS = path.join(ROOT, 'src/js');

  /* ---------- services ---------- */
  const services = list(path.join(C,'services')).sort((a,b)=>(a.order||99)-(b.order||99)).map(s => {
    const L = l => { const d = s[l] || {}; return {
      t:d.t, h1:d.h1||d.t, s:d.s||'', lead:d.lead||'', seo:{title:d.seo?.title||d.t, desc:d.seo?.desc||d.lead||''},
      intro:strs(d.intro), who:strs(d.who), inc:strs(d.inc), get:strs(d.get), time:d.time||'',
      equip:arr(d.equip).map(e=>[e.n||'', e.x||'']).filter(e=>e[0]), faq:arr(d.faq).map(f=>[f.q||'', f.a||'']).filter(f=>f[0]&&f[1]) }; };
    return { id:s.id, tile:s.tile, icon:s.icon, img:s.img, theme:s.theme,
      slug:{cs:s.slug?.cs||slugify(s.cs?.t), en:s.slug?.en||slugify(s.en?.t)},
      tags:{cs:strs(s.cs?.tags), en:strs(s.en?.tags)},
      hero:s.hero_image||'', video:s.hero_video||'', youtube:s.youtube||'',
      gallery:arr(s.gallery).map(g=>typeof g==='string'?{src:g, alt:''}:{src:g.image||g.src||'', alt:g.alt||''}).filter(g=>g.src),
      cs:L('cs'), en:L('en') };
  });

  /* ---------- blog ---------- */
  const today = new Date().toISOString().slice(0,10);
  const ids = new Set(services.map(s=>s.id));
  const posts = list(path.join(C,'blog')).filter(p => p.published !== false && String(p.date||'').slice(0,10) <= today)
    .map(p => {
      const L = l => ({ t:p[l]?.t||p.cs?.t||'', lead:p[l]?.lead||'', html:markdown(p[l]?.body||''), words:words(p[l]?.body) });
      const id = p.id || slugify(p.cs?.t);
      const cat = ids.has(p.cat) ? p.cat : (arr(p.svcs).find(k=>ids.has(k)) || services[0].id);
      return { id, date:String(p.date||today).slice(0,10), cat, svcs:[...new Set([cat, ...arr(p.svcs).filter(k=>ids.has(k))])],
        img:p.img||services.find(s=>s.id===cat)?.img||'edit', cover:p.cover||'', video:p.video||'', youtube:p.youtube||'',
        gallery:arr(p.gallery).map(g=>typeof g==='string'?{src:g, alt:''}:{src:g.image||g.src||'', alt:g.alt||''}).filter(g=>g.src),
        slug:{cs:p.slug?.cs||slugify(p.cs?.t)||id, en:p.slug?.en||slugify(p.en?.t)||id}, langs: p.en?.t && p.en?.body ? ['cs','en'] : ['cs'], cs:L('cs'), en:L(p.en?.t && p.en?.body ? 'en' : 'cs') };
    }).sort((a,b)=>b.date.localeCompare(a.date));

  /* ---------- site texts ---------- */
  const about = read(path.join(C,'about.json')), home = read(path.join(C,'home.json')), settings = read(path.join(C,'settings.json'));
  const team = { cs:about.cs||{h:'O nás'}, en:about.en||{h:'About us'}, people: arr(about.people).map(p=>({
    name:p.name||'', photo:p.photo||'', email:p.email||'', phone:p.phone||'',
    cs:{role:p.cs?.role||'', hi:p.cs?.hi||'', b1:p.cs?.b1||'', b2:p.cs?.b2||'', quote:p.cs?.quote||''},
    en:{role:p.en?.role||p.cs?.role||'', hi:p.en?.hi||'', b1:p.en?.b1||'', b2:p.en?.b2||'', quote:p.en?.quote||''} })).filter(p=>p.name) };
  const regions = list(path.join(C,'regions')).sort((a,b)=>(a.order||99)-(b.order||99)).map(r => {
    const L = l => { const d = r[l] || {}; return { t:d.t, h1:d.h1||d.t, lead:d.lead||'', seo:{title:d.seo?.title||d.t, desc:d.seo?.desc||d.lead||''},
      intro:strs(d.intro), faq:arr(d.faq).map(f=>[f.q||'', f.a||'']).filter(f=>f[0]&&f[1]) }; };
    return { id:r.id, code:r.code||'', place:r.place||'', img:r.img||'aerial', hero:r.hero_image||'', cities:strs(r.cities),
      slug:{cs:r.slug?.cs||r.id, en:r.slug?.en||r.id}, cs:L('cs'), en:L('en') };
  });

  /* ---------- portfolio + references ---------- */
  const work = list(path.join(C,'portfolio')).filter(w => w.published !== false && (w.preview || w.poster || w.youtube))
    .sort((a,b)=>(a.order||99)-(b.order||99)).map(w => ({ id:w.id, cat:w.cat||'firmy', svcs:arr(w.svcs).filter(k=>ids.has(k)), region:w.region||'',
      featured:!!w.featured, vertical:!!w.vertical, place:w.place||'', client:w.client||'', poster:w.poster||'', preview:w.preview||'', youtube:w.youtube||'',
      cs:{t:w.cs?.t||'', d:w.cs?.d||''}, en:{t:w.en?.t||w.cs?.t||'', d:w.en?.d||w.cs?.d||''} }));
  const refs = list(path.join(C,'references')).filter(r => r.published && r.cs?.quote && (r.name || r.company))
    .sort((a,b)=>(a.order||99)-(b.order||99)).map(r => ({ id:r.id, name:r.name||'', company:r.company||'', photo:r.photo||'', link:r.link||'', project:r.project||'',
      cs:{role:r.cs?.role||'', quote:r.cs?.quote||''}, en:{role:r.en?.role||r.cs?.role||'', quote:r.en?.quote||r.cs?.quote||''} }));

  const banner = '/* GENERATED from /content by tools/content.mjs — edit the content (or use /admin/), not this file. */\n';
  fs.writeFileSync(path.join(OUTJS,'services.js'), banner +
    `export const SERVICES = ${JSON.stringify(services)};\nexport const SVC_BY = Object.fromEntries(SERVICES.map(s=>[s.id,s]));\nexport const SVC_BY_TILE = Object.fromEntries(SERVICES.map(s=>[s.tile,s]));\n`);
  fs.writeFileSync(path.join(OUTJS,'posts.js'), banner + `export const POSTS = ${JSON.stringify(posts)};\nexport const postsIn = lang => POSTS.filter(p => p.langs.includes(lang));\n`);
  fs.writeFileSync(path.join(OUTJS,'site-content.js'), banner +
    `export const TEAM = ${JSON.stringify(team)};\nexport const ABOUT = TEAM;\nexport const REGIONS = ${JSON.stringify(regions)};\nexport const WORK = ${JSON.stringify(work)};\nexport const REFERENCES = ${JSON.stringify(refs)};\nexport const HOME = ${JSON.stringify(home)};\nexport const SETTINGS = ${JSON.stringify(settings)};\n`);
  return { services:services.length, posts:posts.length, regions:regions.length, work:work.length, refs:refs.length };
}
