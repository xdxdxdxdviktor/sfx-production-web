#!/usr/bin/env node
/* SFX production — static site build (runs locally and on GitHub Actions).
   node build.mjs          build into ./github-pages
   node build.mjs --og     force regeneration of all Open Graph share images */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { generate } from './tools/content.mjs';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'github-pages');
const OGCACHE = path.join(ROOT, '.og-cache');

/* 1) content → generated JS modules (must run before the site modules are imported) */
const gen = generate(ROOT);
const { SITE, COMPANY, INDEXABLE, GITHUB, CUSTOM_DOMAIN, ANALYTICS, SUPABASE } = await import('./src/js/config.js');
const { I18N } = await import('./src/js/i18n.js');
const { SERVICES } = await import('./src/js/services.js');
const { POSTS } = await import('./src/js/posts.js');
const { HOME, REGIONS, WORK } = await import('./src/js/site-content.js');
const { PATHS, LANGS, svcPath, postPath, regionPath } = await import('./src/js/routes.js');
const P = await import('./src/js/pages.js');
const { cmsConfig } = await import('./src/admin/cms-config.mjs');

const BROWSER_JS = ['app.js','ui.js','config.js','site-content.js','i18n.js','services.js','posts.js','icons.js','routes.js','camera3d.js','db.js'];
const today = new Date().toISOString().slice(0,10);
const hash = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0,10);
const write = (rel, data) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), {recursive:true}); fs.writeFileSync(f, data); };
const copyDir = (from, to) => { if(!fs.existsSync(from)) return; fs.mkdirSync(to, {recursive:true}); for(const e of fs.readdirSync(from, {withFileTypes:true})){ if(e.name.startsWith('.')) continue; const a = path.join(from,e.name), b = path.join(to,e.name); e.isDirectory() ? copyDir(a,b) : fs.copyFileSync(a,b); } };
const page = (p, html) => write(p.endsWith('/') ? p + 'index.html' : p, html);
const local = p => p && p.startsWith('/assets/') ? path.join(OUT, p) : null;   // site path → file in OUT

/* 2) clean output */
fs.rmSync(OUT, {recursive:true, force:true});
fs.mkdirSync(OUT, {recursive:true});

/* 3) assets (built-in + uploaded through the admin console) */
for(const d of ['fonts','img','video','uploads','portfolio']) copyDir(path.join(SRC,'assets',d), path.join(OUT,'assets',d));

/* portrait from brand/jiri-hromadka.* (if the admin console has no photo of its own):
   square photos are used whole, others are cropped to 1:1 around the face */
const PORTRAIT = { x:.51, y:.305, size:.62 };
const portraitSrc = ['jpg','jpeg','png','webp'].map(e=>path.join(ROOT,'brand','jiri-hromadka.'+e)).find(f=>fs.existsSync(f));
if(portraitSrc){
  const img = sharp(portraitSrc), { width:W, height:H } = await img.metadata();
  const sz = Math.abs(W-H) <= 4 ? Math.min(W,H) : Math.min(W, H, Math.round((W < H ? W : H) * PORTRAIT.size));
  const left = Math.max(0, Math.min(W-sz, Math.round(W*PORTRAIT.x - sz/2))), top = Math.max(0, Math.min(H-sz, Math.round(H*PORTRAIT.y - sz/2)));
  await img.extract({left, top, width:sz, height:sz}).resize(900, 900).jpeg({quality:84, mozjpeg:true}).toFile(path.join(OUT,'assets/img/jiri-hromadka.jpg'));
}

/* responsive copies (800 px wide) of photos – used in srcset so phones download less */
const RS_SKIP = /(logo|icon|favicon|camera-poster|intro-poster|jiri-hromadka|-800\.)/;
const rsCache = path.join(ROOT, '.og-cache', 'rs'); fs.mkdirSync(rsCache, {recursive:true});
let rsMade = 0;
for(const d of ['img','uploads','portfolio']){
  const dir = path.join(OUT,'assets',d); if(!fs.existsSync(dir)) continue;
  for(const f of fs.readdirSync(dir)){
    if(!/\.(webp|jpe?g)$/i.test(f) || RS_SKIP.test(f)) continue;
    const src = path.join(dir,f), dst = path.join(dir, f.replace(/(\.\w+)$/,'-800$1'));
    const key = path.join(rsCache, d + '-' + hash(fs.readFileSync(src)) + '-' + f);
    if(!fs.existsSync(key)){ const img = sharp(src).resize({width:800, withoutEnlargement:true}); await (/webp$/i.test(f) ? img.webp({quality:78}) : img.jpeg({quality:80, mozjpeg:true})).toFile(key); rsMade++; }
    fs.copyFileSync(key, dst);
  }
}

const css = ['base.css','site.css'].map(f=>fs.readFileSync(path.join(SRC,'css',f),'utf8')).join('\n');
write('assets/css/site.css', css);
P.VERSION.css = hash(css);
let jsAll = '';
for(const f of BROWSER_JS){ const s = fs.readFileSync(path.join(SRC,'js',f),'utf8'); jsAll += s; write('assets/js/'+f, s); }
P.VERSION.js = hash(jsAll);

/* 4) pages */
for(const lang of LANGS){
  page(PATHS.home[lang], P.homePage(lang));
  page(PATHS.services[lang], P.hubPage(lang));
  page(PATHS.blog[lang], P.blogIndex(lang));
  for(const s of SERVICES) page(svcPath(s,lang), P.servicePage(s, lang));
  page(PATHS.areas[lang], P.areasPage(lang));
  page(PATHS.work[lang], P.workPage(lang));
  for(const r of REGIONS) page(regionPath(r,lang), P.regionPage(r, lang));
  for(const x of POSTS.filter(p=>p.langs.includes(lang))) page(postPath(x,lang), P.postPage(x, lang));
  for(const k of ['legal','privacy','cookies']) page(PATHS[k][lang], P.legalPage(k, lang));
}
page('/404.html', P.notFoundPage());

/* 5) admin console (Sveltia CMS) */
write('admin/index.html', `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Administrace | ${COMPANY.name}</title>
<link rel="icon" href="../assets/img/favicon.png" type="image/png">
</head>
<body>
<script src="https://unpkg.com/@sveltia/cms/dist/sveltia-cms.js"></script>
</body>
</html>
`);
write('admin/config.yml', '# Generated from src/admin/cms-config.mjs (YAML is a superset of JSON).\n' +
  JSON.stringify(cmsConfig({repo:GITHUB.repo, branch:GITHUB.branch, site:SITE}), null, 2) + '\n');

/* 5b) SFX Studio – the team's own admin panel (blog, statistics, enquiries) */
copyDir(path.join(SRC,'studio'), path.join(OUT,'studio'));
const studioV = hash(fs.readdirSync(path.join(SRC,'studio','js')).map(f=>fs.readFileSync(path.join(SRC,'studio','js',f))).concat(fs.readFileSync(path.join(SRC,'studio','studio.css'))).join(''));
const studioCfg = {repo:GITHUB.repo, branch:GITHUB.branch, site:SITE, umamiWebsite: ANALYTICS.provider==='umami' ? ANALYTICS.id : '', supabase: SUPABASE};
write('studio/index.html', `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#080706">
<title>SFX Studio</title>
<link rel="icon" href="../assets/img/favicon.png" type="image/png">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="../assets/img/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="SFX Studio">
<link rel="preload" href="../assets/fonts/big-shoulders-900-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="studio.css?v=${studioV}">
<script>window.STUDIO = ${JSON.stringify(studioCfg)};</script>
</head>
<body>
<div class="atmo"></div>
<script type="importmap">${JSON.stringify({imports:Object.fromEntries(fs.readdirSync(path.join(SRC,'studio','js')).map(f=>['./js/'+f, './js/'+f+'?v='+studioV]))})}</script>
<script type="module">import './js/main.js';</script>
</body>
</html>
`);

/* 6) sitemap, robots, manifest, llms.txt */
const urls = [{loc:PATHS.home, prio:'1.0', freq:'weekly'}, {loc:PATHS.services, prio:'0.9', freq:'monthly'}];
for(const s of SERVICES) urls.push({loc:{cs:svcPath(s,'cs'), en:svcPath(s,'en')}, prio:'0.9', freq:'monthly'});
urls.push({loc:PATHS.areas, prio:'0.8', freq:'monthly'}, {loc:PATHS.work, prio:'0.9', freq:'weekly'});
for(const r of REGIONS) urls.push({loc:{cs:regionPath(r,'cs'), en:regionPath(r,'en')}, prio:'0.8', freq:'monthly'});
urls.push({loc:PATHS.blog, prio:'0.7', freq:'weekly', lastmod:POSTS[0]?.date});
for(const x of POSTS) urls.push({loc:Object.fromEntries(x.langs.map(l=>[l, postPath(x,l)])), prio:'0.6', freq:'yearly', lastmod:x.date});
for(const k of ['legal','privacy','cookies']) urls.push({loc:PATHS[k], prio:'0.2', freq:'yearly'});
const alt = loc => Object.keys(loc).length < 2 ? '' : LANGS.map(l=>`<xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${loc[l]}"/>`).join('') + `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${loc.cs}"/>`;
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.flatMap(u=>LANGS.filter(l=>u.loc[l]).map(l=>`<url><loc>${SITE}${u.loc[l]}</loc><lastmod>${u.lastmod||today}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.prio}</priority>${alt(u.loc)}</url>`)).join('\n')}
</urlset>
`);
write('robots.txt', INDEXABLE ? `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /studio/\n\nSitemap: ${SITE}/sitemap.xml\n` : `User-agent: *\nDisallow: /\n`);
write('site.webmanifest', JSON.stringify({name:COMPANY.name, short_name:'SFX', lang:'cs', start_url:'/', display:'standalone', background_color:'#000000', theme_color:'#000000',
  icons:[{src:'/assets/img/icon-192.png', sizes:'192x192', type:'image/png'},{src:'/assets/img/icon-512.png', sizes:'512x512', type:'image/png', purpose:'any maskable'}]}, null, 2));
write('llms.txt', `# ${COMPANY.name}

> ${HOME.cs.sub} ${HOME.en.sub}

Kontakt / contact: ${COMPANY.email}${COMPANY.phone?', '+COMPANY.phone:''}${COMPANY.ico?'\nIČO: '+COMPANY.ico:''}${COMPANY.branch.city?'\nProvozovna / branch: '+COMPANY.branch.city:''}
Oblasti / areas: ${COMPANY.areas.join(', ')}
Poptávka / enquiry: ${SITE}/#poptavka

## Služby (CZ)
${SERVICES.map(s=>`- [${s.cs.t}](${SITE}${svcPath(s,'cs')}): ${s.cs.lead}`).join('\n')}

## Kde působíme / Where we work
${REGIONS.map(r=>`- [${r.cs.t}](${SITE}${regionPath(r,'cs')}): ${r.cities.join(', ')}`).join('\n')}

## Services (EN)
${SERVICES.map(s=>`- [${s.en.t}](${SITE}${svcPath(s,'en')}): ${s.en.lead}`).join('\n')}

## Blog
${POSTS.map(x=>`- [${x.cs.t}](${SITE}${postPath(x,'cs')})`).join('\n')}
`);
write('.nojekyll', '');

/* 7) Open Graph share images (1200×630), cached in .og-cache by content hash */
const CHROME = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p=>p && fs.existsSync(p));
const ogJobs = [];
const imgFile = (upload, key) => local(upload) && fs.existsSync(local(upload)) ? local(upload) : path.join(OUT,'assets/img',key+'.webp');
for(const lang of LANGS){
  const T = I18N[lang], H = HOME[lang] || HOME.cs, pre = lang==='en' ? 'en-' : '';
  ogJobs.push({file:pre+'home', img:path.join(OUT,'assets/img/camera-poster.webp'), kicker:H.kicker, title:H.h1.replace(/\n/g,' '), sub:H.sub});
  ogJobs.push({file:pre+'blog', img:path.join(OUT,'assets/img/edit.webp'), kicker:COMPANY.name, title:T['blog.h'], sub:T['bi.lead']});
  if(WORK.length) ogJobs.push({file:pre+'work', img:local(WORK[0].poster) || path.join(OUT,'assets/img/festival.webp'), kicker:COMPANY.name, title:T['wk.h'], sub:WORK.slice(0,4).map(w=>w[lang].t).join(' · ')});
  for(const s of SERVICES) ogJobs.push({file:pre+s.id, img:imgFile(s.hero, s.img), kicker:s[lang].t, title:s[lang].h1, sub:s[lang].s});
  for(const r of REGIONS) ogJobs.push({file:pre+'region-'+r.id, img:imgFile(r.hero, r.img), kicker:T['m.areas'], title:r[lang].h1, sub:r.cities.slice(0,5).join(' · ')});
  for(const x of POSTS.filter(p=>p.langs.includes(lang))) ogJobs.push({file:pre+'post-'+x.id, img:imgFile(x.cover, x.img), kicker:T['m.blog'], title:x[lang].t, sub:x[lang].lead});
}
fs.mkdirSync(OGCACHE, {recursive:true});
fs.mkdirSync(path.join(OUT,'assets/og'), {recursive:true});
const escH = s => String(s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let ogMade = 0, ogMissing = 0;
const logoHash = hash(fs.readFileSync(path.join(OUT,'assets/img/logo.webp')));
for(const j of ogJobs){
  const key = hash(JSON.stringify(j) + logoHash + SITE + (fs.existsSync(j.img) ? fs.statSync(j.img).size : 0));
  const cached = path.join(OGCACHE, `${j.file}-${key}.jpg`);
  if(!fs.existsSync(cached) || process.argv.includes('--og')){
    if(!CHROME){ ogMissing++; continue; }
    const tmp = fs.mkdtempSync(path.join(ROOT,'.og-tmp-'));
    const font = f => 'file://' + path.join(OUT,'assets/fonts',f);
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:H;src:url(${font('hanken-grotesk-latin.woff2')}) format('woff2');font-weight:100 900;unicode-range:U+0000-00FF,U+2000-206F,U+20AC}
@font-face{font-family:H;src:url(${font('hanken-grotesk-latin-ext.woff2')}) format('woff2');font-weight:100 900;unicode-range:U+0100-02BA,U+1E00-1EFF}
*{margin:0;box-sizing:border-box}html,body{width:1200px;height:630px;background:#000;overflow:hidden}
body{font-family:H,Helvetica,Arial,sans-serif;color:#f1ece4;position:relative}
.im{position:absolute;right:0;top:0;width:760px;height:630px;object-fit:cover;filter:saturate(.85) brightness(.9);-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 38%)}
.g{position:absolute;inset:0;background:radial-gradient(60% 80% at 10% 30%,rgba(140,115,88,.35),transparent 70%)}
.c{position:absolute;left:72px;top:64px;bottom:64px;width:640px;display:flex;flex-direction:column}
.logo{height:92px;width:auto;align-self:flex-start}
.k{margin-top:auto;font-size:22px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#d8be92}
h1{font-size:${j.title.length>48?50:60}px;line-height:1.04;font-weight:700;letter-spacing:-.025em;margin:16px 0 18px}
p{font-size:25px;line-height:1.4;color:rgba(241,236,228,.78);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.bar{width:150px;height:6px;margin-top:28px;background:linear-gradient(90deg,#efd9b0,#b8955f);transform:skewX(-28deg)}
.d{position:absolute;right:56px;bottom:46px;font-size:20px;letter-spacing:.08em;color:rgba(241,236,228,.7)}
</style></head><body><img class="im" src="file://${j.img}"><div class="g"></div>
<div class="c"><img class="logo" src="file://${path.join(OUT,'assets/img/logo.webp')}"><div class="k">${escH(j.kicker)}</div><h1>${escH(j.title)}</h1><p>${escH(j.sub)}</p><div class="bar"></div></div>
${CUSTOM_DOMAIN ? `<div class="d">${SITE.replace(/^https?:\/\/(www\.)?/,'')}</div>` : ''}</body></html>`;
    const hf = path.join(tmp,'og.html'), png = path.join(tmp,'og.png');
    fs.writeFileSync(hf, html);
    try{
      execFileSync(CHROME, ['--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--allow-file-access-from-files','--force-device-scale-factor=1','--window-size=1200,630','--virtual-time-budget=1500','--screenshot='+png, 'file://'+hf], {stdio:'ignore', timeout:60000});
      for(const old of fs.readdirSync(OGCACHE).filter(f=>f.startsWith(j.file+'-'))) fs.rmSync(path.join(OGCACHE,old));
      await sharp(png).jpeg({quality:82, mozjpeg:true}).toFile(cached);
      ogMade++;
    }catch(e){ ogMissing++; }
    fs.rmSync(tmp, {recursive:true, force:true});
  }
  if(fs.existsSync(cached)) fs.copyFileSync(cached, path.join(OUT,'assets/og',j.file+'.jpg'));
}

const count = d => fs.readdirSync(d,{withFileTypes:true}).reduce((n,e)=>n+(e.isDirectory()?count(path.join(d,e.name)):(e.name==='index.html'||e.name==='404.html'?1:0)),0);
console.log(`responsive images: ${rsMade} new`);
console.log(`built ${count(OUT)} pages → ${path.relative(ROOT,OUT)}/  (${gen.services} services, ${gen.posts} posts; og ${ogJobs.length-ogMissing}/${ogJobs.length}${ogMade?`, ${ogMade} new`:''}${ogMissing?`, ${ogMissing} missing: no Chrome`:''})`);
