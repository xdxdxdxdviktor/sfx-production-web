#!/usr/bin/env node
/* SFX production — static site build.
   node build.mjs          build into ./github-pages
   node build.mjs --og     also (re)generate Open Graph share images with headless Chrome */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { SITE, COMPANY, INDEXABLE } from './src/js/config.js';
import { I18N } from './src/js/i18n.js';
import { SERVICES } from './src/js/services.js';
import { POSTS } from './src/js/posts.js';
import { PATHS, LANGS, svcPath, postPath } from './src/js/routes.js';
import { money } from './src/js/calc.js';
import * as P from './src/js/pages.js';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'github-pages');
const BROWSER_JS = ['app.js','ui.js','calc.js','config.js','i18n.js','services.js','posts.js','icons.js','routes.js','camera3d.js','db.js','admin.js'];
const today = new Date().toISOString().slice(0,10);

const hash = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0,8);
const write = (rel, data) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), {recursive:true}); fs.writeFileSync(f, data); };
const copyDir = (from, to) => { fs.mkdirSync(to, {recursive:true}); for(const e of fs.readdirSync(from, {withFileTypes:true})){ if(e.name.startsWith('.')) continue; const a = path.join(from,e.name), b = path.join(to,e.name); e.isDirectory() ? copyDir(a,b) : fs.copyFileSync(a,b); } };
const page = (p, html) => write(p.endsWith('/') ? p + 'index.html' : p, html);

/* ---------- clean (keep generated OG images between builds) ---------- */
const ogKeep = path.join(ROOT, '.og-cache');
if(fs.existsSync(path.join(OUT,'assets/og'))) { fs.rmSync(ogKeep, {recursive:true, force:true}); fs.cpSync(path.join(OUT,'assets/og'), ogKeep, {recursive:true}); }
fs.rmSync(OUT, {recursive:true, force:true});
fs.mkdirSync(OUT, {recursive:true});

/* ---------- assets ---------- */
for(const d of ['fonts','img','video']) copyDir(path.join(SRC,'assets',d), path.join(OUT,'assets',d));
const css = ['base.css','site.css'].map(f=>fs.readFileSync(path.join(SRC,'css',f),'utf8')).join('\n');
write('assets/css/site.css', css);
P.VERSION.css = hash(css);
let jsAll = '';
for(const f of BROWSER_JS){ const s = fs.readFileSync(path.join(SRC,'js',f),'utf8'); jsAll += s; write('assets/js/'+f, s); }
P.VERSION.js = hash(jsAll);

/* icons from the brand logo */
const sipsOK = (()=>{ try{ execFileSync('sips', ['--help'], {stdio:'ignore'}); return true; }catch(e){ return false; } })();
if(sipsOK){
  const logo = path.join(ROOT,'brand','sfx normal.jpg');
  const sq = path.join(OUT,'assets/img/_sq.png');
  execFileSync('sips', ['-s','format','png','-c','1600','1600', logo, '--out', sq], {stdio:'ignore'});
  for(const [n,s] of [['icon-512.png',512],['icon-192.png',192],['apple-touch-icon.png',180]])
    execFileSync('sips', ['-z',String(s),String(s), sq, '--out', path.join(OUT,'assets/img',n)], {stdio:'ignore'});
  fs.rmSync(sq);
}

/* ---------- pages ---------- */
const urls = [];   // for the sitemap: {loc:{cs,en}, lastmod, prio}
for(const lang of LANGS){
  page(PATHS.home[lang], P.homePage(lang));
  page(PATHS.services[lang], P.hubPage(lang));
  page(PATHS.blog[lang], P.blogIndex(lang));
  page(PATHS.article[lang], P.articlePage(lang));
  for(const s of SERVICES) page(svcPath(s,lang), P.servicePage(s, lang));
  for(const x of POSTS) page(postPath(x,lang), P.postPage(x, lang));
  for(const k of ['legal','privacy','cookies']) page(PATHS[k][lang], P.legalPage(k, lang));
}
page('/404.html', P.notFoundPage());
page(PATHS.admin.cs, P.adminPage());

urls.push({loc:PATHS.home, prio:'1.0', freq:'weekly'}, {loc:PATHS.services, prio:'0.9', freq:'monthly'});
for(const s of SERVICES) urls.push({loc:{cs:svcPath(s,'cs'), en:svcPath(s,'en')}, prio:'0.9', freq:'monthly'});
urls.push({loc:PATHS.blog, prio:'0.7', freq:'weekly'});
for(const x of POSTS) urls.push({loc:{cs:postPath(x,'cs'), en:postPath(x,'en')}, prio:'0.6', freq:'yearly', lastmod:x.date});
for(const k of ['legal','privacy','cookies']) urls.push({loc:PATHS[k], prio:'0.2', freq:'yearly'});

/* ---------- sitemap, robots, manifest, llms.txt ---------- */
const alt = loc => LANGS.map(l=>`<xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${loc[l]}"/>`).join('') + `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${loc.cs}"/>`;
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.flatMap(u=>LANGS.map(l=>`<url><loc>${SITE}${u.loc[l]}</loc><lastmod>${u.lastmod||today}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.prio}</priority>${alt(u.loc)}</url>`)).join('\n')}
</urlset>
`);
write('robots.txt', INDEXABLE
  ? `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /blog/clanek/\nDisallow: /en/blog/article/\n\nSitemap: ${SITE}/sitemap.xml\n`
  : `User-agent: *\nDisallow: /\n`);
write('site.webmanifest', JSON.stringify({name:COMPANY.name, short_name:'SFX', lang:'cs', start_url:'/', display:'standalone', background_color:'#000000', theme_color:'#000000',
  icons:[{src:'/assets/img/icon-192.png', sizes:'192x192', type:'image/png'},{src:'/assets/img/icon-512.png', sizes:'512x512', type:'image/png', purpose:'any maskable'}]}, null, 2));
write('llms.txt', `# ${COMPANY.name}

> ${I18N.cs['hero.sub']} ${I18N.en['hero.sub']}

Kontakt / contact: ${COMPANY.email}${COMPANY.phone?', '+COMPANY.phone:''}${COMPANY.city?'\nSídlo / based in: '+COMPANY.city:''}
Poptávka / enquiry: ${SITE}/#poptavka

## Služby (CZ)
${SERVICES.map(s=>`- [${s.cs.t}](${SITE}${svcPath(s,'cs')}): ${s.cs.lead} Cena od ${money(s.from,'cs').replace(/ /g,' ')}.`).join('\n')}

## Services (EN)
${SERVICES.map(s=>`- [${s.en.t}](${SITE}${svcPath(s,'en')}): ${s.en.lead}`).join('\n')}

## Blog
${POSTS.map(x=>`- [${x.cs.t}](${SITE}${postPath(x,'cs')})`).join('\n')}
`);
write('.nojekyll', '');

/* ---------- Open Graph share images (1200×630) ---------- */
if(fs.existsSync(ogKeep)){ fs.cpSync(ogKeep, path.join(OUT,'assets/og'), {recursive:true}); fs.rmSync(ogKeep, {recursive:true, force:true}); }
const ogJobs = [];
for(const lang of LANGS){
  const T = I18N[lang], pre = lang==='en' ? 'en-' : '';
  ogJobs.push({file:pre+'home', img:'camera-poster', kicker:T['hero.kicker'], title:T['hero.h1'].replace('<br>',' '), sub:T['hero.sub'], logo:true});
  ogJobs.push({file:pre+'blog', img:'edit', kicker:COMPANY.name, title:T['blog.h'], sub:T['bi.lead']});
  for(const s of SERVICES) ogJobs.push({file:pre+s.id, img:s.img, kicker:s[lang].t, title:s[lang].h1, sub:`${T['pg.priceFrom']} ${money(s.from,lang)}`});
  for(const x of POSTS) ogJobs.push({file:pre+'post-'+x.id, img:x.img, kicker:T['m.blog'], title:x[lang].t, sub:x[lang].lead});
}
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const wantOG = process.argv.includes('--og');
const missing = ogJobs.filter(j=>!fs.existsSync(path.join(OUT,'assets/og',j.file+'.jpg')));
if((wantOG || missing.length) && fs.existsSync(CHROME) && sipsOK){
  const tmp = fs.mkdtempSync(path.join(ROOT,'.og-tmp-'));
  const fontUrl = f => 'file://' + path.join(OUT,'assets/fonts',f);
  for(const j of (wantOG ? ogJobs : missing)){
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:H;src:url(${fontUrl('hanken-grotesk-latin.woff2')}) format('woff2');font-weight:100 900;unicode-range:U+0000-00FF,U+2000-206F,U+20AC}
@font-face{font-family:H;src:url(${fontUrl('hanken-grotesk-latin-ext.woff2')}) format('woff2');font-weight:100 900;unicode-range:U+0100-02BA,U+1E00-1EFF}
*{margin:0;box-sizing:border-box}html,body{width:1200px;height:630px;background:#000;overflow:hidden}
body{font-family:H,Helvetica,Arial,sans-serif;color:#f1ece4;position:relative}
.im{position:absolute;right:0;top:0;width:760px;height:630px;object-fit:cover;filter:saturate(.85) brightness(.9);-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 38%)}
.g{position:absolute;inset:0;background:radial-gradient(60% 80% at 10% 30%,rgba(140,115,88,.35),transparent 70%)}
.c{position:absolute;left:72px;top:64px;bottom:64px;width:640px;display:flex;flex-direction:column}
.logo{height:46px;width:auto;align-self:flex-start}
.k{margin-top:auto;font-size:22px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#d8be92}
h1{font-size:${j.title.length>48?50:60}px;line-height:1.04;font-weight:700;letter-spacing:-.025em;margin:16px 0 18px}
p{font-size:25px;line-height:1.4;color:rgba(241,236,228,.78);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.bar{width:150px;height:6px;margin-top:28px;background:linear-gradient(90deg,#efd9b0,#b8955f);transform:skewX(-28deg)}
.d{position:absolute;right:56px;bottom:46px;font-size:20px;letter-spacing:.08em;color:rgba(241,236,228,.7)}
</style></head><body><img class="im" src="file://${path.join(OUT,'assets/img',j.img+'.webp')}"><div class="g"></div>
<div class="c"><img class="logo" src="file://${path.join(OUT,'assets/img/logo.webp')}"><div class="k">${j.kicker}</div><h1>${j.title}</h1><p>${j.sub}</p><div class="bar"></div></div>
<div class="d">${SITE.replace(/^https?:\/\/(www\.)?/,'')}</div></body></html>`;
    const hf = path.join(tmp, j.file+'.html'), png = path.join(tmp, j.file+'.png');
    fs.writeFileSync(hf, html);
    execFileSync(CHROME, ['--headless=new','--disable-gpu','--hide-scrollbars','--allow-file-access-from-files','--force-device-scale-factor=1','--window-size=1200,630','--virtual-time-budget=1500','--screenshot='+png, 'file://'+hf], {stdio:'ignore', timeout:30000});
    fs.mkdirSync(path.join(OUT,'assets/og'), {recursive:true});
    execFileSync('sips', ['-s','format','jpeg','-s','formatOptions','82', png, '--out', path.join(OUT,'assets/og',j.file+'.jpg')], {stdio:'ignore'});
  }
  fs.rmSync(tmp, {recursive:true, force:true});
}

const count = (d) => fs.readdirSync(d,{withFileTypes:true}).reduce((n,e)=>n+(e.isDirectory()?count(path.join(d,e.name)):(e.name==='index.html'||e.name==='404.html'?1:0)),0);
console.log(`built ${count(OUT)} pages → ${path.relative(ROOT,OUT)}/  (css ${P.VERSION.css}, js ${P.VERSION.js}, og ${fs.existsSync(path.join(OUT,'assets/og'))?fs.readdirSync(path.join(OUT,'assets/og')).length:0})`);
