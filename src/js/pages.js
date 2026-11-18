/* Full-page templates. Build-time only (Node). */
import { SITE, COMPANY, INDEXABLE, VERIFY, RUNTIME, PARTNER_URLS, REGION_CODES, ANALYTICS } from './config.js';
import { I18N, WHY, REFS, PARTNERS } from './i18n.js';
import { SERVICES, SVC_BY } from './services.js';
import { postsIn } from './posts.js';
import { LEGAL } from './legal.js';
import { TEAM, HOME, REGIONS, WORK, REFERENCES } from './site-content.js';
import { ICON } from './icons.js';
import { PATHS, svcPath, postPath, regionPath } from './routes.js';
import { ctx, esc, imgTag, srcTag, media, svcImgSrc, svcVidSrc, videoBlock, ytId, gallery, svcPreview, workGrid, workChips, workCard, postCard, blogGrid, blogChips, flow, tiles, budgetBtns, summary, fmtDate, readMin } from './ui.js';

export const VERSION = { css:'', js:'' };
const abs = p => SITE + p;
const ogImg = (k, lang='cs') => abs('/assets/og/' + (lang==='en'?'en-':'') + k + '.jpg');
const cityLabel = lang => '';
const geoMeta = p => { const g = p.geo || (COMPANY.branch.city ? {code: REGION_CODES[COMPANY.branch.region] || 'CZ', place: COMPANY.branch.city} : {code: REGION_CODES[COMPANY.branch.region] || REGION_CODES[COMPANY.areas[0]] || ''});
  return g.code ? `<meta name="geo.region" content="${g.code}">${g.place?`<meta name="geo.placename" content="${esc(g.place)}">`:''}` : ''; };
const SHOW_REFS = () => REFERENCES.length > 0;
const SHOW_PARTNERS = () => RUNTIME.showSamples || PARTNER_URLS.some(Boolean);
const strip = s => String(s).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();

/* ================================================================ schema.org */
const addrOf = a => ({'@type':'PostalAddress', streetAddress: a.street||undefined, addressLocality: a.city, postalCode: a.zip||undefined, addressRegion: a.region||undefined, addressCountry:'CZ'});
const areaLD = n => /^praha$|prague/i.test(n) ? {'@type':'City', name:'Praha', sameAs:'https://www.wikidata.org/wiki/Q1085'} : {'@type':'AdministrativeArea', name:n};
const personLD = (p, lang, i) => ({'@type':'Person', '@id': SITE+'/#person-'+i, name:p.name, jobTitle:p[lang].role, worksFor:{'@id':SITE+'/#org'},
  ...(p.photo ? {image: /^https?:/.test(p.photo) ? p.photo : abs(p.photo)} : {}), ...(p.email ? {email:p.email} : {}), ...(p.phone ? {telephone:p.phone} : {})});
function orgLD(lang){
  const o = {'@type':'ProfessionalService', '@id': SITE+'/#org', name: COMPANY.name, url: SITE+'/',
    logo: abs('/assets/img/icon-512.png'), image: ogImg('home', lang), email: COMPANY.email,
    description: (HOME[lang]||HOME.cs).sub,
    knowsAbout: SERVICES.map(s=>s[lang].t),
    areaServed: COMPANY.areaServed.map(areaLD)};
  if(COMPANY.owner) o.legalName = COMPANY.owner;
  if(COMPANY.phone) o.telephone = COMPANY.phone;
  if(COMPANY.ico) o.taxID = COMPANY.ico;
  if(COMPANY.dic) o.vatID = COMPANY.dic;
  if(COMPANY.sameAs.length) o.sameAs = COMPANY.sameAs;
  if(COMPANY.founded) o.foundingDate = COMPANY.founded;
  const br = COMPANY.branch;
  if(br.city) o.address = addrOf(br); else if(COMPANY.city) o.address = addrOf({street:COMPANY.street, city:COMPANY.city, zip:COMPANY.zip});
  if(br.city && COMPANY.city && br.city !== COMPANY.city) o.location = {'@type':'Place', name: I18N[lang]['ft.branch'], address: addrOf(br)};
  if(TEAM.people[0]) o.founder = {'@id': SITE+'/#person-0'};
  if(TEAM.people.length) o.employee = TEAM.people.map((p,i)=>({'@id': SITE+'/#person-'+i}));
  o.priceRange = '$$';
  o.hasOfferCatalog = {'@type':'OfferCatalog', name: I18N[lang]['m.sluzby'], itemListElement: SERVICES.map(s=>({'@type':'Offer', itemOffered:{'@id': abs(svcPath(s,lang))+'#service'}, areaServed: COMPANY.areaServed.map(areaLD)}))};
  return o;
}
const teamLD = lang => TEAM.people.map((p,i)=>personLD(p, lang, i));
const websiteLD = lang => ({'@type':'WebSite', '@id': SITE+'/#website', url: SITE+'/', name: COMPANY.name, inLanguage: ['cs-CZ','en'], publisher:{'@id': SITE+'/#org'}});
const crumbLD = (items) => ({'@type':'BreadcrumbList', itemListElement: items.map(([n,u],i)=>({'@type':'ListItem', position:i+1, name:n, item:abs(u)}))});
const pageLD = (p, type='WebPage') => ({'@type':type, '@id': abs(p.path)+'#webpage', url: abs(p.path), name: p.title, description: p.desc, inLanguage: p.lang==='cs'?'cs-CZ':'en', isPartOf:{'@id': SITE+'/#website'}, about:{'@id': SITE+'/#org'}, primaryImageOfPage: p.og ? {'@type':'ImageObject', url: ogImg(p.og, p.lang)} : undefined});
const ld = graph => `<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c')}</script>`;

/* cookie-less analytics (nothing loads until it is set in the admin) */
function analyticsTag(){
  const id = esc(String(ANALYTICS.id||'').trim()); if(!id) return '';
  switch(ANALYTICS.provider){
    case 'plausible': return `<script defer data-domain="${id}" src="https://plausible.io/js/script.tagged-events.js"></script><script>window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}</script>`;
    case 'umami': return `<script defer src="https://cloud.umami.is/script.js" data-website-id="${id}"></script>`;
    case 'goatcounter': return `<script data-goatcounter="https://${id}.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>`;
    case 'cloudflare': return `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${id}"}'></script>`;
    default: return '';
  }
}

/* ================================================================ shell */
function head(c, p){
  const t = p.fullTitle || (p.title.length > 50 ? p.title : `${p.title} | ${COMPANY.name}`);
  const robots = (!INDEXABLE || p.noindex) ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
  const alts = p.alt ? Object.entries(p.alt).map(([l,u])=>`<link rel="alternate" hreflang="${l}" href="${abs(u)}">`).join('') + `<link rel="alternate" hreflang="x-default" href="${abs(p.alt.cs)}">` : '';
  return `<!doctype html>
<html lang="${c.lang}" data-path="${p.path}" data-page="${p.kind}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(t)}</title>
<meta name="description" content="${esc(p.desc)}">
<meta name="robots" content="${robots}">
${p.noindex?'':`<link rel="canonical" href="${abs(p.path)}">`}
${alts}
<meta name="theme-color" content="#000000">
<meta name="color-scheme" content="dark">
<meta name="author" content="${COMPANY.name}">
${geoMeta(p)}
<meta property="og:type" content="${p.ogType||'website'}">
<meta property="og:site_name" content="${COMPANY.name}">
<meta property="og:locale" content="${c.lang==='cs'?'cs_CZ':'en_GB'}">
<meta property="og:locale:alternate" content="${c.lang==='cs'?'en_GB':'cs_CZ'}">
<meta property="og:title" content="${esc(p.ogTitle||t)}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:url" content="${abs(p.path)}">
<meta property="og:image" content="${ogImg(p.og||'home', c.lang)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(p.ogTitle||t)}">
<meta name="twitter:card" content="summary_large_image">
${p.article?`<meta property="article:published_time" content="${p.article}">`:''}
${VERIFY.google?`<meta name="google-site-verification" content="${VERIFY.google}">`:''}${VERIFY.bing?`<meta name="msvalidate.01" content="${VERIFY.bing}">`:''}${VERIFY.seznam?`<meta name="seznam-wmt" content="${VERIFY.seznam}">`:''}
<link rel="icon" href="${c.asset('img/favicon.png')}" type="image/png" sizes="32x32">
<link rel="icon" href="${c.asset('img/icon-192.png')}" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="${c.asset('img/apple-touch-icon.png')}">
<link rel="manifest" href="${c.href('/site.webmanifest')}">
<link rel="preload" href="${c.asset('fonts/hanken-grotesk-latin.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${c.asset('css/site.css')}?v=${VERSION.css}">
${p.preload||''}
${ld(p.ld)}
${analyticsTag()}
</head>`;
}

function navBar(c, p){
  const home = p.kind==='home';
  const H = PATHS.home[c.lang];
  const link = (id, label, target, spy) => `<a href="${target}"${spy?` data-t="${spy}"`:''}>${label}</a>`;
  const items = [
    ['m.sluzby', home ? '#sluzby' : c.href(PATHS.services[c.lang]), 'sluzby'],
    ['m.work', home ? '#ukazky' : c.href(PATHS.work[c.lang]), 'ukazky'],
    ['m.proces', home ? '#proces' : c.href(H)+'#proces', 'proces'],
    ['m.blog', home ? '#blog' : c.href(PATHS.blog[c.lang]), 'blog'],
    ['m.onas', home ? '#o-nas' : c.href(H)+'#o-nas', 'o-nas'],
    ...(SHOW_REFS() ? [['m.ref', home ? '#reference' : c.href(H)+'#reference', 'reference']] : [])
  ];
  const cta = home ? '#poptavka' : c.href(H)+'#poptavka';
  const other = c.lang==='cs' ? 'en' : 'cs';
  const langLinks = ['cs','en'].map(l=> l===c.lang
    ? `<a aria-current="true" lang="${l}" hreflang="${l}" href="${c.href(p.path)}">${l==='cs'?'CZ':'EN'}</a>`
    : `<a lang="${l}" hreflang="${l}" href="${c.href(p.alt ? p.alt[l] : PATHS.home[l])}" data-lang="${l}">${l==='cs'?'CZ':'EN'}</a>`).join('');
  return `<a class="skip" href="#main">${c.t('skip')}</a>
<div class="bg" aria-hidden="true"></div>
<header class="nav${home?'':' solid'}" id="nav">
  <a class="nav-logo" href="${home?'#top':c.href(H)}" aria-label="${COMPANY.name} – ${c.t('pg.home')}"><img src="${c.asset('img/logo.webp')}" alt="${COMPANY.name}" width="77" height="40"></a>
  <nav class="nav-links" id="navLinks" aria-label="Menu"><span class="nav-pill" id="navPill" aria-hidden="true"></span>${items.map(([k,h,s])=>link(k,c.t(k),h,s)).join('')}</nav>
  <div class="nav-right">
    <div class="lang" role="group" aria-label="${c.t('nav.lang')}">${langLinks}</div>
    <a class="nav-cta" href="${cta}"><span>${c.t('nav.cta')}</span></a>
    <button class="burger" id="burger" type="button" aria-expanded="false" aria-controls="mnav" aria-label="${c.t('nav.menu')}"><i></i><i></i></button>
  </div>
</header>
<nav class="mnav" id="mnav" aria-label="Menu">${items.map(([k,h])=>`<a href="${h}"><span>${c.t(k)}</span></a>`).join('')}<a href="${cta}" class="nav-cta"><span>${c.t('nav.cta')}</span></a></nav>`;
}

function footer(c, p){
  const H = PATHS.home[c.lang], home = p.kind==='home';
  const sec = id => home ? '#'+id : c.href(H)+'#'+id;
  const adr = a => [a.street, [a.zip, a.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const contact = [`<li><a href="mailto:${COMPANY.email}">${COMPANY.email}</a></li>`,
    COMPANY.phone?`<li><a href="tel:${COMPANY.phone.replace(/\s/g,'')}">${COMPANY.phone}</a></li>`:'',
    ...TEAM.people.filter(x=>x.email||x.phone).filter(x=>x.email!==COMPANY.email||x.phone).map(x=>`<li><span class="ft-p">${esc(x.name)}, ${esc(x[c.lang].role)}</span>${x.phone?`<a href="tel:${x.phone.replace(/\s/g,'')}">${esc(x.phone)}</a>`:''}${x.email&&x.email!==COMPANY.email?`<a href="mailto:${x.email}">${esc(x.email)}</a>`:''}</li>`),
    ...COMPANY.sameAs.map(u=>`<li><a href="${u}" rel="me noopener" target="_blank">${esc(u.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,''))}</a></li>`)].join('');
  const bill = [COMPANY.owner?`<li>${esc(COMPANY.owner)}</li>`:'',
    COMPANY.ico?`<li>${c.t('ft.ico')}: ${COMPANY.ico}</li>`:'',
    COMPANY.dic?`<li>${c.t('ft.dic')}: ${esc(COMPANY.dic)}</li>`:(COMPANY.ico && !COMPANY.vatPayer?`<li>${c.t('ft.noVat')}</li>`:''),
    COMPANY.city?`<li>${c.t('ft.seat')}: ${esc(adr(COMPANY))}</li>`:'',
    COMPANY.branch.city?`<li>${c.t('ft.branch')}: ${esc(adr(COMPANY.branch))}</li>`:''].join('');
  return `<footer class="foot">
  <div class="foot-grid">
    <div class="foot-brand"><a href="${home?'#top':c.href(H)}" aria-label="${COMPANY.name}"><img src="${c.asset('img/logo.webp')}" alt="${COMPANY.name}" width="116" height="60" loading="lazy"></a><p>${c.t('ft.claim')}</p></div>
    <div><h2 class="fh">${c.t('ft.svc')}</h2><ul>${SERVICES.map(s=>`<li><a href="${c.href(svcPath(s,c.lang))}">${s[c.lang].t}</a></li>`).join('')}</ul></div>
    <div><h2 class="fh">${c.t('ft.web')}</h2><ul>
      <li><a href="${c.href(PATHS.services[c.lang])}">${c.t('m.sluzby')}</a></li><li><a href="${c.href(PATHS.work[c.lang])}">${c.t('wk.h')}</a></li>
      <li><a href="${sec('proces')}">${c.t('m.proces')}</a></li><li><a href="${c.href(PATHS.blog[c.lang])}">${c.t('m.blog')}</a></li>
      <li><a href="${sec('o-nas')}">${c.t('m.onas')}</a></li><li><a href="${sec('poptavka')}">${c.t('m.poptavka')}</a></li></ul>
      <h2 class="fh fh2">${c.t('m.areas')}</h2><ul>${REGIONS.map(r=>`<li><a href="${c.href(regionPath(r,c.lang))}">${r[c.lang].t}</a></li>`).join('')}</ul></div>
    <div><h2 class="fh">${c.t('ft.contact')}</h2><ul>${contact}</ul>${bill?`<h2 class="fh fh2">${c.t('ft.bill')}</h2><ul class="ft-bill">${bill}</ul>`:''}</div>
  </div>
  <div class="copy">
    <span id="ftCopy">© ${new Date().getFullYear()} ${COMPANY.owner||COMPANY.name}. ${c.t('ft.rights')}</span>
    <nav aria-label="Legal"><a href="${c.href(PATHS.legal[c.lang])}">${c.t('m.pravni')}</a><a href="${c.href(PATHS.privacy[c.lang])}">${c.t('m.gdpr')}</a><a href="${c.href(PATHS.cookies[c.lang])}">${c.t('m.cookies')}</a></nav>
  </div>
</footer>`;
}

function doc(c, p, main, tail=''){
  return `${head(c,p)}
<body class="${p.bodyClass||''}"${p.theme?` data-theme="${p.theme}"`:''}>
${navBar(c,p)}
${main}
${footer(c,p)}
${tail}
<script type="module" src="${c.asset('js/app.js')}?v=${VERSION.js}"></script>
</body>
</html>
`;
}
const crumbs = (c, items) => `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items.map(([h,l],i)=>`<li>${i?'<span aria-hidden="true">/</span>':''}${h?`<a href="${c.href(h)}">${l}</a>`:`<span aria-current="page">${l}</span>`}</li>`).join('')}</ol></nav>`;
const faqHTML = faq => `<div class="faq">${faq.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>`;
const faqLD = faq => ({'@type':'FAQPage', mainEntity: faq.map(([q,a])=>({'@type':'Question', name:q, acceptedAnswer:{'@type':'Answer', text:a}}))});

/* ================================================================ HOME */
export function homePage(lang){
  const path = PATHS.home[lang], c = ctx(lang, path), t = c.t;
  const p = {kind:'home', lang, path, alt:PATHS.home, og:'home', bodyClass:'',
    fullTitle: lang==='cs' ? 'Video, foto a dron – Ústí, Liberec, Praha | SFX production' : 'Video, photo and drone – Ústí, Liberec, Prague | SFX production',
    title:'SFX production',
    desc: lang==='cs' ? 'Video produkce, fotografie, dron, 360° prohlídky a 3D v Ústeckém a Libereckém kraji a v celé Praze. Od nápadu po hotový výstup, nezávazná poptávka zdarma.'
                      : 'Video production, photography, drone, 360° tours and 3D in the Ústí and Liberec regions and all over Prague. From idea to finished piece. Free enquiry.',
    preload:`<link rel="preload" as="image" href="${c.asset('img/camera-poster.webp')}" fetchpriority="high">`};
  p.ld = [orgLD(lang), ...teamLD(lang), websiteLD(lang), pageLD({...p, title:p.fullTitle}),
    {'@type':'ItemList', name:t('m.sluzby'), itemListElement: SERVICES.map((s,i)=>({'@type':'ListItem', position:i+1, url:abs(svcPath(s,lang)), name:s[lang].t}))}];
  const posts = postsIn(lang).slice(0,4);
  const H = HOME[lang] || HOME.cs;
  const reelYt = ytId(HOME.showreel_youtube);
  const reelVideo = c.asset('video/showreel.mp4');
  const reelPoster = HOME.showreel_poster ? media(c, HOME.showreel_poster) : reelYt ? `https://i.ytimg.com/vi/${reelYt}/maxresdefault.jpg` : c.asset('img/festival.webp');
  const refs = SHOW_REFS() ? `
  <section class="sec" id="reference" data-sec>
    <div class="sec-head"><h2>${t('ref.h')}</h2><p>${t('ref.p')}</p></div>
    <div class="refs">${REFERENCES.map(r=>{ const d=r[lang], w=WORK.find(x=>x.id===r.project); return `<figure class="ref glass"><blockquote>${esc(d.quote)}</blockquote>
      <figcaption><span class="av">${r.photo?`<img src="${media(c,r.photo)}" alt="" loading="lazy">`:esc((r.name||r.company).split(/\s+/).map(x=>x[0]).join('').slice(0,2))}</span><span><b>${esc(r.name||r.company)}</b><small>${esc([d.role, r.name?r.company:''].filter(Boolean).join(', '))}${w?` · <a href="${c.href(PATHS.work[lang])}#ukazka-${w.id}">${esc(w[lang].t)}</a>`:''}</small></span></figcaption></figure>`; }).join('')}</div>
  </section>` : '';
  const partners = SHOW_PARTNERS() ? (()=>{ const P = PARTNERS[lang].map((x,i)=>{ const u=PARTNER_URLS[i]; return `<a class="plink" href="${u||'#partneri'}" ${u?'target="_blank" rel="noopener"':''}><span class="mk">P${i+1}</span><span><b>${x.n}</b><small>${x.t}</small></span></a>`; }).join('');
    return `<section class="sec" id="partneri" data-sec><div class="sec-head"><h2>${t('pt.h')}</h2><p>${t('pt.p')}</p></div><div class="marquee"><div class="track">${P}${P.replace(/<a /g,'<a tabindex="-1" aria-hidden="true" ')}</div></div></section>`; })() : '';

  const main = `
<div class="intro" id="intro" hidden>
  <video id="introVid" muted playsinline preload="none" poster="${c.asset('img/intro-poster.jpg')}" data-src="${c.asset('video/intro.mp4')}"></video>
  <button class="intro-skip" id="introSkip" type="button">${t('intro.skip')}</button>
</div>
<main id="main">
  <span id="top"></span>
  <section class="hero" id="hero" data-sec>
    <div class="hero-stage">
      <img class="cam-poster" id="camPoster" src="${c.asset('img/camera-poster.webp')}" alt="" width="655" height="515" decoding="async" fetchpriority="high">
      <canvas id="cam3d" aria-hidden="true"></canvas>
      <div class="hero-copy" id="heroCopy">
        <p class="kicker">${esc(H.kicker)}</p>
        <h1>${esc(H.h1).replace(/\n/g,'<br>')}</h1>
        <p class="hero-sub">${esc(H.sub)}</p>
        <div class="btns"><a class="btn primary" href="#poptavka">${t('hero.cta1')}</a><a class="btn glass" href="#sluzby">${t('hero.cta2')}</a></div>
      </div>
      <nav class="hero-strip" id="heroStrip" aria-label="${t('hero.strip')}">${SERVICES.map(s=>`<a href="${c.href(svcPath(s,lang))}">${ICON[s.icon]}<span>${s[lang].t}</span></a>`).join('')}</nav>
      <div class="stage-line" id="sl1" aria-hidden="true"><p>${t('hero.s1')}</p><span>${t('hero.s1b')}</span></div>
      <div class="stage-line" id="sl2" aria-hidden="true"><p>${t('hero.s2')}</p><span>${t('hero.s2b')}</span></div>
      <div class="hud glass" id="hud" aria-hidden="true"><div class="rec">REC</div><div>${t('hud.focal')}<b id="hudMm">24 mm</b></div><div>${t('hud.ap')}<b id="hudF">f/22</b></div></div>
      <svg class="shutter" id="shutter" aria-hidden="true"></svg>
    </div>
  </section>

  <section class="sec reel-sec" id="showreel" data-sec>
    <div class="sec-head"><h2>${esc(H.reel_h)}</h2><p>${esc(H.reel_p)}</p></div>
    <button class="reel-card" id="reelOpen" type="button" aria-label="${t('reel.play')}">
      ${reelYt ? `<img class="reel-bg" src="${reelPoster}" alt="" loading="lazy" decoding="async">` : `<video class="reel-bg" id="reelBg" muted loop playsinline preload="none" poster="${reelPoster}" data-src="${reelVideo}"></video>`}
      <span class="reel-play">${ICON.play}</span><span class="reel-label">${t('reel.play')}</span>
    </button>
    ${!reelYt && HOME.showreel_note && H.reel_note ? `<p class="note reel-note">${esc(H.reel_note)}</p>` : ''}
  </section>
${WORK.length ? `
  <section class="sec" id="ukazky" data-sec>
    <div class="sec-head"><h2>${t('wk.h')}</h2><p>${t('wk.p')}</p></div>
    ${workGrid(c, (WORK.filter(w=>w.featured).length ? WORK.filter(w=>w.featured) : WORK).slice(0,8))}
    <p class="sec-more"><a class="btn glass" href="${c.href(PATHS.work[lang])}">${t('wk.all')} (${WORK.length}) ${ICON.arrow}</a></p>
  </section>` : ''}

  <section class="sec" id="sluzby" data-sec>
    <div class="sec-head"><h2>${t('svc.h')}</h2><p>${t('svc.p')}</p></div>
    <div class="svc-index">
      <ol class="svc-list" id="svcList">${SERVICES.map((s,i)=>{ const d=s[lang]; return `<li><a href="${c.href(svcPath(s,lang))}" data-s="${s.id}">
        <span class="n">0${i+1}</span>${srcTag(svcImgSrc(c, s), d.t, 'th')}
        <span><span class="nm">${d.t}</span><span class="ds">${d.s}</span></span>
        <span class="tg">${s.tags[lang].join(', ')}</span></a></li>`; }).join('')}</ol>
      <aside class="svc-preview glass" id="svcPreview" aria-live="polite">${svcPreview(c, 'video')}</aside>
    </div>
    <p class="sec-more"><a class="btn glass" href="${c.href(PATHS.services[lang])}">${t('svc.all')} ${ICON.arrow}</a></p>
  </section>

  <section class="sec" id="vyhody">
    <div class="why glass">
      <div class="why-head"><h2>${t('why.h')}</h2><p>${t('why.p')}</p></div>
      <ul class="why-grid">${WHY[lang].map(([h,d,ic])=>`<li><span class="wi">${ICON[ic]}</span><h3>${h}</h3><p>${d}</p></li>`).join('')}</ul>
    </div>
  </section>

  <section class="sec" id="proces" data-sec>
    <div class="sec-head"><h2>${t('proc.h')}</h2><p>${t('proc.p')}</p></div>
    ${flow(c)}
  </section>

  <section class="sec" id="blog" data-sec>
    <div class="sec-head"><h2>${t('blog.h')}</h2><p>${t('blog.p')}</p></div>
    <div class="blog-grid" id="blogGrid">${blogGrid(c, posts)}</div>
    <p class="sec-more"><a class="btn glass" href="${c.href(PATHS.blog[lang])}">${t('blog.more')} ${ICON.arrow}</a></p>
  </section>
${refs}
  ${areasSection(c)}
  <section class="sec" id="o-nas" data-sec>
    <div class="sec-head"><h2>${esc((TEAM[lang]||TEAM.cs).h)}</h2></div>
    ${TEAM.people.map((m,i)=>person(c, m, i)).join('')}
    <div class="me-cta team-cta"><a class="btn primary" href="#poptavka">${t('cc.write')}</a><a class="me-mail" href="mailto:${COMPANY.email}">${ICON.mail}<span>${COMPANY.email}</span></a>${COMPANY.phone?`<a class="me-mail" href="tel:${COMPANY.phone.replace(/\s/g,'')}">${ICON.tel}<span>${COMPANY.phone}</span></a>`:''}</div>
  </section>
${partners}
  ${enquiry(c)}
</main>
<dialog class="reel-modal" id="reelModal" aria-label="Showreel"${reelYt?` data-reel-yt="${reelYt}"`:''}>
  <button class="reel-x" id="reelClose" type="button" aria-label="${t('reel.close')}">${ICON.x}</button>
  ${reelYt ? `<div class="reel-yt" id="reelYt"></div>` : `<video id="reelVid" controls playsinline preload="none" data-src="${reelVideo}" poster="${reelPoster}"></video>`}
</dialog>
`;
  const tail = `<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" defer></script>`;
  return doc(c, p, main, tail);
}

/* the enquiry wizard (home) */
function enquiry(c){
  const t = c.t, lang = c.lang;
  const ok = t('f.ok').replace('{privacy}', `<a href="${c.href(PATHS.privacy[lang])}">${t('f.okLink')}</a>`);
  return `<section class="sec" id="poptavka" data-sec>
    <div class="sec-head"><h2>${t('f.h')}</h2><p>${t('f.p')}</p></div>
    <div class="inq">
      <form class="wiz glass vf" id="wiz" novalidate>
        <span class="vf-c tl"></span><span class="vf-c tr"></span><span class="vf-c bl"></span><span class="vf-c br"></span>
        <div class="vf-bar" aria-hidden="true"><span class="rec">REC</span><span class="tc" id="wizTc">00:00:00:00</span><span class="vf-meta">4K · 25p</span></div>
        <div class="wiz-top" id="wizTop">
          <ol class="steps-ind filmstrip">${[1,2,3].map(i=>`<li class="${i===1?'on cur':''}" data-go="${i}"><i></i><span><b>${i}</b> <em>${t('f.l'+i)}</em></span></li>`).join('')}</ol>
        </div>
        <p class="draft-note" id="draftNote" hidden>${t('f.draft')}</p>

        <div class="wstep on" data-step="1">
          <h3>${t('f.s1')}</h3><p class="hint">${t('f.s1h')}</p>
          <div class="tiles-main" id="tilesMain">${tiles(c, new Set(), 'main')}</div>
          <p class="tiles-or">${t('f.more')}</p>
          <div class="tiles" id="tiles">${tiles(c, new Set(), 'more')}</div>
        </div>
        <div class="wstep" data-step="2">
          <h3>${t('f.s2')}</h3><p class="hint">${t('f.s2h')}</p>
          <div class="f full"><label for="fDesc">${t('f.desc')}</label>
            <div class="helpers"><span>${t('f.help')}</span><div id="descHelp">${['f.h1','f.h2','f.h3','f.h4'].map(h=>`<button type="button" data-help="${h}">+ ${t(h)}</button>`).join('')}</div></div>
            <textarea id="fDesc" name="popis" placeholder="${esc(t('f.descPh'))}" maxlength="1500" required></textarea>
            <div class="frow"><span class="emsg"></span><span class="count" id="descCount">0 / 1500</span></div></div>
          <div class="fgrid">
            <div class="f"><label for="fDate">${t('f.date')}</label><input id="fDate" name="termin" type="date"><label class="check"><input type="checkbox" id="fFlex"><span>${t('f.flex')}</span></label></div>
            <div class="f"><label for="fLoc">${t('f.loc')}</label><input id="fLoc" name="lokalita" placeholder="${esc(t('f.locPh'))}" autocomplete="address-level2"></div>
            <div class="f full"><span class="lbl" id="budgetL">${t('f.budget')}</span><div class="budget" id="budget" role="group" aria-labelledby="budgetL">${budgetBtns(c,-1)}</div></div>
          </div>
        </div>
        <div class="wstep" data-step="3">
          <h3>${t('f.s3')}</h3><p class="hint">${t('f.s3h')}</p>
          <div class="fgrid">
            <div class="f"><label for="fName">${t('f.name')}</label><input id="fName" name="jmeno" autocomplete="name" required><span class="emsg"></span></div>
            <div class="f"><label for="fCompany">${t('f.company')}</label><input id="fCompany" name="firma" autocomplete="organization"></div>
            <div class="f full"><span class="lbl" id="prefL">${t('f.pref')}</span>
              <div class="seg" id="pref" role="radiogroup" aria-labelledby="prefL"><button type="button" role="radio" data-p="mail" aria-checked="true">${ICON.mail}<span>${t('f.prefMail')}</span></button><button type="button" role="radio" data-p="tel" aria-checked="false">${ICON.tel}<span>${t('f.prefTel')}</span></button></div></div>
            <div class="f full cfield" id="wrapMail"><label for="fMail">${t('f.mail')}</label><input id="fMail" name="email" type="email" autocomplete="email" placeholder="jan@firma.cz"><span class="emsg"></span></div>
            <div class="f cfield" id="wrapTel" hidden><label for="fTel">${t('f.telReq')}</label><input id="fTel" name="telefon" type="tel" autocomplete="tel" placeholder="+420 777 123 456"><span class="emsg"></span></div>
            <div class="f cfield" id="wrapTime" hidden><label for="fTime">${t('f.time')}</label><input id="fTime" name="kdy_volat" placeholder="${esc(t('f.timePh'))}"></div>
            <input class="hp" id="fWeb" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          </div>
          <div class="ts" id="turnstile" hidden></div>
          <p class="consent">${ok}</p>
        </div>

        <p class="wiz-err" id="wizErr" role="alert"></p>
        <div class="wiz-nav" id="wizNav"><button type="button" class="back" id="wBack" hidden>${t('f.back')}</button><button type="button" class="btn primary" id="wNext">${t('f.next1')}</button></div>

        <div class="done-view" id="doneView">
          <div class="iris" aria-hidden="true"><svg viewBox="0 0 100 100"></svg></div>
          <div class="done-ico">${ICON.check}</div>
          <h3 tabindex="-1">${t('f.doneT')}</h3>
          <p class="ref-code"><span>${t('f.refL')}</span> <b id="refCode"></b></p>
          <p>${t('f.doneD')}</p>
          <ol class="next-steps"><li>${t('f.done1')}</li><li>${t('f.done2')}</li><li>${t('f.done3')}</li></ol>
          <div class="btns" style="justify-content:center"><a class="btn glass" id="mailtoLink" href="mailto:${COMPANY.email}">${t('f.mailto')}</a><button type="button" class="btn primary" id="wAgain">${t('f.again')}</button></div>
        </div>
      </form>
      <aside class="inq-aside">
        <div class="sum glass" id="liveSum" aria-live="polite">${summary(c, {sel:[], step:1, who:'', when:'', where:'', budget:'', contact:''})}</div>
        <div class="inq-person glass">${TEAM.people.map(m=>`<div class="ip"><span class="av">${initials(m.name)}</span><span><b>${esc(m.name)}</b><small>${esc(m[lang].role)}</small></span>${m.phone?`<a href="tel:${m.phone.replace(/\s/g,'')}">${esc(m.phone)}</a>`:''}</div>`).join('')}<a class="ip-mail" href="mailto:${COMPANY.email}">${COMPANY.email}</a>${COMPANY.phone?`<a class="ip-mail" href="tel:${COMPANY.phone.replace(/\s/g,'')}">${COMPANY.phone}</a>`:''}</div>
      </aside>
    </div>
  </section>`;
}

/* ================================================================ SERVICE */
const THEME_HUD = {
  video: lang => `<div class="hud-vf"><span class="rec">REC</span><span class="tc" data-tc>00:00:00:00</span><span>4K · 25p</span><span class="bat"><i></i></span></div><span class="vf-c tl"></span><span class="vf-c tr"></span><span class="vf-c bl"></span><span class="vf-c br"></span><span class="vf-x"></span>`,
  foto: lang => `<div class="thirds"><i></i><i></i><i></i><i></i></div><span class="af"></span><div class="exif"><span>1/125</span><span>f/8</span><span>ISO 100</span><span>35 mm</span><span class="shots">[ 248 ]</span></div><span class="flashfx"></span>`,
  dron: lang => `<div class="compass"><div class="ticks" data-compass></div><b>N</b></div><div class="hud-dr"><span>ALT <b data-alt>120</b> m</span><span>D <b>245</b> m</span><span>H.S <b>8.2</b> m/s</span><span class="gps">GPS ●●●●</span></div><span class="horizon"></span>`,
  strih: lang => `<div class="nle"><div class="nle-tc" data-tc>00:00:12:05</div><div class="nle-tr v2"><i style="left:8%;width:18%"></i><i style="left:52%;width:14%"></i></div><div class="nle-tr v1"><i style="left:0;width:34%"></i><i style="left:34%;width:28%"></i><i style="left:62%;width:38%"></i></div><div class="nle-tr a1"><i style="left:0;width:100%"></i></div><div class="nle-tr a2"><i style="left:12%;width:60%"></i></div><span class="playhead"></span></div>`,
  vr: lang => `<div class="pano-hint">${lang==='cs'?'Táhněte a rozhlédněte se':'Drag to look around'}</div><span class="hotspot" style="left:30%;top:58%"></span><span class="hotspot" style="left:68%;top:52%"></span>`,
  '3d': lang => `<div class="wipe-l"><span>Wireframe</span></div><div class="wipe-r"><span>Render</span></div><span class="wipe-h" role="slider" tabindex="0" aria-label="Wireframe / Render" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"></span>`,
  viz: lang => `<div class="wipe-l"><span>${lang==='cs'?'Výkres':'Drawing'}</span></div><div class="wipe-r"><span>${lang==='cs'?'Vizualizace':'Visualisation'}</span></div><span class="wipe-h" role="slider" tabindex="0" aria-label="${lang==='cs'?'Výkres / vizualizace':'Drawing / visualisation'}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"></span>`,
  film: lang => `<span class="lb top"></span><span class="lb bot"></span><div class="slate-mini"><span>SCENE <b>01</b></span><span>TAKE <b>03</b></span><span>2.39:1</span></div><span class="grain"></span>`
};
function svcVisual(c, s){
  const d = s[c.lang], th = s.theme, src = svcImgSrc(c, s), vid = svcVidSrc(c, s);
  const media = (th==='3d'||th==='viz')
    ? `<div class="wipe" style="--x:50%">${srcTag(src,d.t,'w-base',true)}${srcTag(src,'','w-top')}</div>`
    : th==='vr' ? `<div class="pano" style="background-image:url('${src}')" role="img" aria-label="${esc(d.t)}"></div>`
    : `${srcTag(src,d.t,'',true)}${vid?`<video muted loop playsinline preload="none" data-src="${vid}" poster="${src}"></video>`:''}`;
  return `<div class="sv sv-${th}">${media}${THEME_HUD[th](c.lang)}</div>`;
}

export function servicePage(s, lang){
  const path = svcPath(s, lang), c = ctx(lang, path), t = c.t, d = s[lang];
  const alt = {cs:svcPath(s,'cs'), en:svcPath(s,'en')};
  const related = postsIn(lang).filter(p=>p.svcs.includes(s.id)).slice(0,3);
  const p = {kind:'service', lang, path, alt, og:s.id, theme:s.theme, bodyClass:'svc-page',
    title: d.seo.title + cityLabel(lang), desc: d.seo.desc, ogTitle: `${d.h1} | ${COMPANY.name}`,
    preload:`<link rel="preload" as="image" href="${svcImgSrc(c, s)}" fetchpriority="high">`};
  const crumbsArr = [[PATHS.home[lang], t('pg.home')], [PATHS.services[lang], t('m.sluzby')], [null, d.t]];
  p.ld = [orgLD(lang), websiteLD(lang), {...pageLD(p), breadcrumb:{'@id':abs(path)+'#breadcrumb'}},
    {'@type':'Service', '@id':abs(path)+'#service', name:d.h1, serviceType:d.t, description:d.lead+' '+d.intro[0], url:abs(path), image:ogImg(s.id, lang),
      provider:{'@id':SITE+'/#org'}, areaServed:COMPANY.areaServed.map(n=>({'@type':'Country',name:n})), audience:{'@type':'Audience', audienceType:d.who.join(', ')},
      hasOfferCatalog:{'@type':'OfferCatalog', name:d.t, itemListElement:d.inc.map(x=>({'@type':'Offer', itemOffered:{'@type':'Service', name:x}}))}},
    faqLD(d.faq), {...crumbLD(crumbsArr.map(([u,n],i)=>[n, u||path])), '@id':abs(path)+'#breadcrumb'}];

  const main = `<main id="main" class="page">
  ${crumbs(c, crumbsArr)}
  <header class="pg-hero sv-hero">
    <div class="pg-hero-t">
      <div class="ico">${ICON[s.icon]}</div>
      <p class="kicker">${d.t}</p>
      <h1>${d.h1}</h1>
      <p class="lead">${d.lead}</p>
      <ul class="pg-chips">${s.tags[lang].map(x=>`<li>${x}</li>`).join('')}<li>${ICON.clock}<span>${d.time}</span></li></ul>
      <div class="btns"><a class="btn primary" href="${c.href(PATHS.home[lang])}#poptavka" data-pick="${s.tile}">${t('pg.cta')}</a><a class="btn glass" href="#faq">${t('pg.faq')}</a></div>
    </div>
    ${svcVisual(c, s)}
  </header>

  <section class="pg-intro">
    <div class="pg-intro-t">${d.intro.map(x=>`<p>${x}</p>`).join('')}</div>
    <aside class="pg-card glass"><h2>${t('pg.who')}</h2><ul class="pg-list">${d.who.map(x=>`<li>${x}</li>`).join('')}</ul></aside>
  </section>

  ${areaStrip(c)}
  <div class="pg-cols">
    <section class="pg-card glass"><h2>${t('pg.inc')}</h2><ul class="pg-list">${d.inc.map(x=>`<li>${x}</li>`).join('')}</ul></section>
    <section class="pg-card glass"><h2>${t('pg.get')}</h2><ul class="pg-list">${d.get.map(x=>`<li>${x}</li>`).join('')}</ul>
      <div class="pg-time">${ICON.clock}<span>${t('pg.time')}: <b>${d.time}</b></span></div></section>
  </div>

  <section class="pg-sec equip"><h2>${t('pg.equip')}</h2>
    <ul class="equip-grid">${d.equip.map(([n,x],i)=>`<li class="glass"><span class="eq-n">${String(i+1).padStart(2,'0')}</span><h3>${n}</h3><p>${x}</p></li>`).join('')}</ul></section>

  ${s.id==='360'?`<section class="pg-sec mp"><h2>${t('mp.h')}</h2><p class="mp-p">${t('mp.p')}</p>
    <div class="mp-frame" id="mpFrame">${imgTag(c,'interior','')}<button class="btn primary" type="button" id="mpLoad">${t('mp.load')}</button><small>${t('mp.note')}</small></div></section>`:''}

  ${(()=>{ const w = WORK.filter(x=>x.svcs.includes(s.id)).slice(0,6); return w.length || s.gallery.length || s.youtube ? `<section class="pg-sec" id="ukazky"><h2>${t('pg.work')}</h2>${w.length?workGrid(c, w, 'flat'):''}${videoBlock(c, {youtube:s.youtube})}${gallery(c, s.gallery, d.t)}${w.length?`<p class="sec-more"><a class="btn glass" href="${c.href(PATHS.work[lang])}">${t('wk.all')} ${ICON.arrow}</a></p>`:''}</section>` : ''; })()}
  <section class="pg-sec"><h2>${t('pg.how')}</h2>${flow(c)}</section>
  <section class="pg-sec" id="faq"><h2>${t('pg.faq')}</h2>${faqHTML(d.faq)}</section>
  ${related.length?`<section class="pg-sec"><h2>${t('pg.related')}</h2><div class="blog-grid flat more">${related.map(x=>postCard2(c,x)).join('')}</div></section>`:''}
  <section class="cta-box glass"><div><h2>${t('pg.ctaH')}</h2><p>${t('pg.ctaP')}</p></div><a class="btn primary" href="${c.href(PATHS.home[lang])}#poptavka" data-pick="${s.tile}">${t('pg.cta')}</a></section>
  <section class="pg-sec"><h2>${t('pg.other')}</h2><div class="other">${SERVICES.filter(x=>x.id!==s.id).map(x=>`<a href="${c.href(svcPath(x,lang))}">${ICON[x.icon]}${x[lang].t}</a>`).join('')}</div></section>
  <p class="note">${t('pg.illu')}</p>
</main>`;
  return doc(c, p, main);
}
function postCard2(c, x){ return postCard(c, x, 'row'); }

/* ================================================================ SERVICES HUB */
export function hubPage(lang){
  const path = PATHS.services[lang], c = ctx(lang, path), t = c.t;
  const p = {kind:'hub', lang, path, alt:PATHS.services, og:'home', title: t('hub.title') + cityLabel(lang),
    desc: lang==='cs' ? 'Přehled služeb SFX production: video produkce, fotografie, dron, střih, virtuální prohlídky Matterport, 3D rendery, vizualizace a filmová produkce.'
                      : 'SFX production services: video production, photography, drone, editing, Matterport virtual tours, 3D renders, visualisation and film production.'};
  const crumbsArr = [[PATHS.home[lang], t('pg.home')], [null, t('m.sluzby')]];
  p.ld = [orgLD(lang), websiteLD(lang), {...pageLD(p,'CollectionPage'), mainEntity:{'@type':'ItemList', itemListElement:SERVICES.map((s,i)=>({'@type':'ListItem', position:i+1, url:abs(svcPath(s,lang)), name:s[lang].t}))}},
    crumbLD(crumbsArr.map(([u,n])=>[n, u||path]))];
  const main = `<main id="main" class="page">
  ${crumbs(c, crumbsArr)}
  <header class="pg-hero hub-hero"><div><p class="kicker">${COMPANY.name}</p><h1>${t('hub.h')}</h1></div><div><p class="lead">${t('hub.lead')}</p></div></header>
  <ul class="hub-grid">${SERVICES.map((s,i)=>{ const d=s[lang]; return `<li><a class="hub-card glass" href="${c.href(svcPath(s,lang))}">
      <div class="hc-img">${srcTag(svcImgSrc(c, s), d.t)}<span class="ico">${ICON[s.icon]}</span><span class="hc-n">0${i+1}</span></div>
      <div class="hc-b"><h2>${d.t}</h2><p>${d.s}</p><span class="more">${t('svc.more')} ${ICON.arrow}</span></div></a></li>`; }).join('')}</ul>
  <section class="pg-sec"><h2>${t('pg.how')}</h2>${flow(c)}</section>
  <section class="cta-box glass"><div><h2>${t('pg.ctaH')}</h2><p>${t('pg.ctaP')}</p></div><a class="btn primary" href="${c.href(PATHS.home[lang])}#poptavka">${t('nav.cta')}</a></section>
</main>`;
  return doc(c, p, main);
}

/* ================================================================ BLOG */
export function blogIndex(lang){
  const path = PATHS.blog[lang], c = ctx(lang, path), t = c.t;
  const p = {kind:'blog', lang, path, alt:PATHS.blog, og:'blog', title: t('blog.h'), desc: t('bi.lead')};
  const crumbsArr = [[PATHS.home[lang], t('pg.home')], [null, t('m.blog')]];
  p.ld = [orgLD(lang), websiteLD(lang), {...pageLD(p,'CollectionPage'), mainEntity:{'@type':'Blog', name:t('blog.h'), blogPost:postsIn(lang).map(x=>({'@type':'BlogPosting', headline:x[lang].t, url:abs(postPath(x,lang)), datePublished:x.date}))}},
    crumbLD(crumbsArr.map(([u,n])=>[n, u||path]))];
  const main = `<main id="main" class="page">
  ${crumbs(c, crumbsArr)}
  <header class="pg-hero hub-hero"><div><p class="kicker">${COMPANY.name}</p><h1>${t('blog.h')}</h1></div><div><p class="lead">${t('bi.lead')}</p></div></header>
  <div class="chips" id="chips" role="group">${blogChips(c, postsIn(lang))}</div>
  <div class="blog-grid" id="blogGrid">${blogGrid(c, postsIn(lang))}</div>
</main>`;
  return doc(c, p, main);
}

export function postPage(x, lang){
  const path = postPath(x, lang), c = ctx(lang, path), t = c.t, d = x[lang];
  const alt = x.langs.length > 1 ? {cs:postPath(x,'cs'), en:postPath(x,'en')} : null;
  const more = postsIn(lang).filter(y=>y.id!==x.id).slice(0,3);
  const crumbsArr = [[PATHS.home[lang], t('pg.home')], [PATHS.blog[lang], t('m.blog')], [null, d.t]];
  const p = {kind:'post', lang, path, alt, og:'post-'+x.id, ogType:'article', article:x.date, title:d.t, desc:d.lead};
  p.ld = [orgLD(lang), websiteLD(lang), pageLD(p),
    {'@type':'BlogPosting', '@id':abs(path)+'#article', headline:d.t, description:d.lead, datePublished:x.date, dateModified:x.date, inLanguage:lang==='cs'?'cs-CZ':'en',
      image:ogImg('post-'+x.id, lang), author:{'@type':'Person', name:COMPANY.person, worksFor:{'@id':SITE+'/#org'}}, publisher:{'@id':SITE+'/#org'}, mainEntityOfPage:{'@id':abs(path)+'#webpage'},
      about:x.svcs.map(k=>({'@id':abs(svcPath(SVC_BY[k],lang))+'#service'})), wordCount:d.words},
    crumbLD(crumbsArr.map(([u,n])=>[n, u||path]))];
  const svcLinks = x.svcs.map(k=>{ const s=SVC_BY[k]; return `<a href="${c.href(svcPath(s,lang))}">${s[lang].t}</a>`; }).join(', ');
  const main = `<main id="main" class="page">
  ${crumbs(c, crumbsArr)}
  <article>
  <header class="art"><div class="meta"><span class="cat">${SVC_BY[x.cat][lang].t}</span><time datetime="${x.date}">${fmtDate(x.date, lang)}</time><span>${readMin(x)} ${t('blog.min')}</span></div>
    <h1>${d.t}</h1><p class="lead">${d.lead}</p></header>
  <div class="art-cover">${x.cover ? srcTag(media(c, x.cover), d.t, '', true) : imgTag(c, x.img, d.t, '', true)}</div>
  <div class="art-body">
    <div class="text">${d.html.replace(/src="\/assets\//g, `src="${c.href('/assets/')}`)}${videoBlock(c, {video:x.video, youtube:x.youtube})}${gallery(c, x.gallery, d.t)}</div>
    <aside class="art-aside glass"><dl>
      <dt>${t('pg.svcs')}</dt><dd>${svcLinks}</dd>
      <dt>${t('pg.date')}</dt><dd>${fmtDate(x.date, lang)}</dd>
      <dt>${lang==='cs'?'Autor':'Author'}</dt><dd>${COMPANY.person}</dd></dl>
      <a class="btn primary" href="${c.href(svcPath(SVC_BY[x.cat],lang))}">${SVC_BY[x.cat][lang].t} ${ICON.arrow}</a></aside>
  </div>
  </article>
  <section class="cta-box glass"><div><h2>${t('pg.ctaH')}</h2><p>${t('pg.ctaP')}</p></div><a class="btn primary" href="${c.href(PATHS.home[lang])}#poptavka" data-pick="${x.svcs.map(k=>SVC_BY[k].tile).join(',')}">${t('nav.cta')}</a></section>
  <section class="pg-sec"><h2>${lang==='cs'?'Další články':'More articles'}</h2><div class="blog-grid flat more">${more.map(y=>postCard2(c,y)).join('')}</div></section>
</main>`;
  return doc(c, p, main);
}




/* ================================================================ PORTFOLIO */
export function workPage(lang){
  const path = PATHS.work[lang], c = ctx(lang, path), t = c.t;
  const p = {kind:'work', lang, path, alt:PATHS.work, og:'work', title:t('wk.title'), desc:t('wk.desc')};
  const crumbsArr = [[PATHS.home[lang], t('pg.home')], [null, t('wk.h')]];
  p.ld = [orgLD(lang), websiteLD(lang), {...pageLD(p,'CollectionPage'), mainEntity:{'@type':'ItemList', itemListElement:WORK.map((w,i)=>({'@type':'ListItem', position:i+1,
      item:{'@type':'CreativeWork', name:w[lang].t, description:w[lang].d, image:abs(w.poster), url:abs(path)+'#ukazka-'+w.id, creator:{'@id':SITE+'/#org'}, ...(w.place?{locationCreated:{'@type':'Place', name:w.place}}:{})}}))}},
    crumbLD(crumbsArr.map(([u,n])=>[n, u||path]))];
  const main = `<main id="main" class="page">
  ${crumbs(c, crumbsArr)}
  <header class="pg-hero hub-hero"><div><p class="kicker">${COMPANY.name}</p><h1>${t('wk.h')}</h1></div><div><p class="lead">${t('wk.p')}</p></div></header>
  ${workChips(c, WORK)}
  <ul class="wk-grid wall" id="wkWall">${WORK.map(w=>workCard(c, w)).join('')}</ul>
  <section class="cta-box glass"><div><h2>${t('pg.ctaH')}</h2><p>${t('pg.ctaP')}</p></div><a class="btn primary" href="${c.href(PATHS.home[lang])}#poptavka">${t('nav.cta')}</a></section>
</main>`;
  return doc(c, p, main);
}

/* ================================================================ TEAM + AREAS */
const initials = n => String(n||'').split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase();
function person(c, m, i){
  const d = m[c.lang] || m.cs;
  const contacts = [m.email?`<a class="me-mail" href="mailto:${m.email}">${ICON.mail}<span>${esc(m.email)}</span></a>`:'', m.phone?`<a class="me-mail" href="tel:${m.phone.replace(/\s/g,'')}">${ICON.tel}<span>${esc(m.phone)}</span></a>`:''].join('');
  return `<div class="me${i%2?' rev':''}" id="${'tym-'+(i+1)}">
      <figure class="me-photo"><div class="me-frame">${m.photo
          ? `<img src="${media(c, m.photo)}" alt="${esc(m.name)}, ${esc(d.role)}" width="900" height="900" loading="lazy" decoding="async">`
          : `<span class="me-ph" aria-hidden="true">${initials(m.name)}</span>`}
          <span class="vf-c tl"></span><span class="vf-c tr"></span><span class="vf-c bl"></span><span class="vf-c br"></span><span class="me-rec" aria-hidden="true">REC</span></div></figure>
      <div class="me-text">
        <h3>${esc(m.name)}</h3>
        ${d.role?`<p class="me-role">${esc(d.role)}</p>`:''}
        ${d.hi?`<p class="me-hi">${esc(d.hi)}</p>`:''}
        ${[d.b1, d.b2].filter(Boolean).map(x=>`<p>${esc(x)}</p>`).join('')}
        ${d.quote?`<blockquote class="me-quote">${esc(d.quote)}</blockquote>`:''}
        ${contacts?`<div class="me-cta">${contacts}</div>`:''}
      </div>
    </div>`;
}
const regionImg = (c, r) => r.hero ? media(c, r.hero) : c.asset('img/'+r.img+'.webp');
function regionCards(c, list=REGIONS){
  return `<ul class="area-grid">${list.map(r=>{ const d=r[c.lang]; return `<li><a class="area-card glass" href="${c.href(regionPath(r,c.lang))}">
    <div class="ac-img">${srcTag(regionImg(c,r), d.h1)}<span class="ac-pin">${r.code}</span></div>
    <div class="ac-b"><h3>${d.t}</h3><p>${d.lead}</p><p class="ac-cities">${r.cities.slice(0,6).join(' · ')}${r.cities.length>6?' …':''}</p><span class="more">${c.t('area.more')} ${ICON.arrow}</span></div></a></li>`; }).join('')}</ul>`;
}
function areasSection(c){
  return `<section class="sec" id="oblasti" data-sec>
    <div class="sec-head"><h2>${c.t('area.h')}</h2><p>${c.t('area.p')}</p></div>
    ${regionCards(c)}
  </section>`;
}
const areaStrip = c => `<nav class="area-strip" aria-label="${c.t('m.areas')}"><span>${c.t('area.svcNote')}</span>${REGIONS.map(r=>`<a href="${c.href(regionPath(r,c.lang))}">${r[c.lang].t}</a>`).join('')}</nav>`;

export function areasPage(lang){
  const path = PATHS.areas[lang], c = ctx(lang, path), t = c.t;
  const p = {kind:'areas', lang, path, alt:PATHS.areas, og:'home', title:t('area.title'), desc:t('area.desc')};
  const crumbsArr = [[PATHS.home[lang], t('pg.home')], [null, t('m.areas')]];
  p.ld = [orgLD(lang), websiteLD(lang), {...pageLD(p,'CollectionPage'), mainEntity:{'@type':'ItemList', itemListElement:REGIONS.map((r,i)=>({'@type':'ListItem', position:i+1, url:abs(regionPath(r,lang)), name:r[lang].t}))}},
    crumbLD(crumbsArr.map(([u,n])=>[n, u||path]))];
  const main = `<main id="main" class="page">
  ${crumbs(c, crumbsArr)}
  <header class="pg-hero hub-hero"><div><p class="kicker">${COMPANY.name}</p><h1>${t('area.h')}</h1></div><div><p class="lead">${t('area.p')}</p></div></header>
  ${regionCards(c)}
  <section class="pg-sec"><h2>${t('area.cities')}</h2>${REGIONS.map(r=>`<h3 class="area-sub"><a href="${c.href(regionPath(r,lang))}">${r[lang].t}</a></h3><ul class="city-chips">${r.cities.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`).join('')}<p class="mp-p">${t('area.travel')}</p></section>
  <section class="cta-box glass"><div><h2>${t('pg.ctaH')}</h2><p>${t('pg.ctaP')}</p></div><a class="btn primary" href="${c.href(PATHS.home[lang])}#poptavka">${t('nav.cta')}</a></section>
</main>`;
  return doc(c, p, main);
}

export function regionPage(r, lang){
  const path = regionPath(r, lang), c = ctx(lang, path), t = c.t, d = r[lang];
  const alt = {cs:regionPath(r,'cs'), en:regionPath(r,'en')};
  const crumbsArr = [[PATHS.home[lang], t('pg.home')], [PATHS.areas[lang], t('m.areas')], [null, d.t]];
  const p = {kind:'region', lang, path, alt, og:'region-'+r.id, title:d.seo.title, desc:d.seo.desc, ogTitle:`${d.h1} | ${COMPANY.name}`, geo:{code:r.code, place:r.place},
    preload:`<link rel="preload" as="image" href="${regionImg(c,r)}" fetchpriority="high">`};
  const area = areaLD(d.t === 'Prague' ? 'Praha' : (lang==='en' ? ({'ustecky-kraj':'Ústecký kraj','liberecky-kraj':'Liberecký kraj'}[r.id] || d.t) : d.t));
  p.ld = [orgLD(lang), websiteLD(lang), {...pageLD(p), breadcrumb:{'@id':abs(path)+'#breadcrumb'}},
    {'@type':'Service', '@id':abs(path)+'#service', name:d.h1, description:d.lead, url:abs(path), provider:{'@id':SITE+'/#org'}, areaServed:{...area, containsPlace: r.cities.map(x=>({'@type':'Place', name:x}))},
      hasOfferCatalog:{'@type':'OfferCatalog', name:d.h1, itemListElement:SERVICES.map(s=>({'@type':'Offer', itemOffered:{'@id':abs(svcPath(s,lang))+'#service'}}))}},
    ...(d.faq.length ? [faqLD(d.faq)] : []), {...crumbLD(crumbsArr.map(([u,n])=>[n, u||path])), '@id':abs(path)+'#breadcrumb'}];
  const main = `<main id="main" class="page">
  ${crumbs(c, crumbsArr)}
  <header class="pg-hero sv-hero">
    <div class="pg-hero-t">
      <p class="kicker">${t('m.areas')} · ${d.t}</p>
      <h1>${d.h1}</h1>
      <p class="lead">${d.lead}</p>
      <ul class="pg-chips">${r.cities.slice(0,4).map(x=>`<li>${esc(x)}</li>`).join('')}${r.cities.length>4?`<li>+${r.cities.length-4}</li>`:''}</ul>
      <div class="btns"><a class="btn primary" href="${c.href(PATHS.home[lang])}#poptavka">${t('nav.cta')}</a><a class="btn glass" href="#sluzby-v-regionu">${t('area.svc')}</a></div>
    </div>
    <div class="sv sv-region">${srcTag(regionImg(c,r), d.h1, '', true)}<span class="ac-pin big">${r.code}</span></div>
  </header>
  <section class="pg-intro"><div class="pg-intro-t">${d.intro.map(x=>`<p>${x}</p>`).join('')}</div>
    <aside class="pg-card glass"><h2>${t('area.cities')}</h2><ul class="city-chips">${r.cities.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p class="mp-p">${t('area.travel')}</p></aside></section>
  ${(()=>{ const w = WORK.filter(x=>x.region===r.id).slice(0,6); return w.length ? `<section class="pg-sec"><h2>${t('wk.here')}</h2>${workGrid(c, w, 'flat')}</section>` : ''; })()}
  <section class="pg-sec" id="sluzby-v-regionu"><h2>${t('area.svc')}</h2>
    <ul class="hub-grid">${SERVICES.map(s=>{ const sd=s[lang]; return `<li><a class="hub-card glass" href="${c.href(svcPath(s,lang))}">
      <div class="hc-img">${srcTag(svcImgSrc(c, s), sd.t)}<span class="ico">${ICON[s.icon]}</span></div>
      <div class="hc-b"><h3 class="hc-h">${sd.t}</h3><p>${sd.s}</p><span class="more">${t('svc.more')} ${ICON.arrow}</span></div></a></li>`; }).join('')}</ul></section>
  <section class="pg-sec"><h2>${t('pg.how')}</h2>${flow(c)}</section>
  ${d.faq.length?`<section class="pg-sec"><h2>${t('pg.faq')}</h2>${faqHTML(d.faq)}</section>`:''}
  <section class="cta-box glass"><div><h2>${t('pg.ctaH')}</h2><p>${t('pg.ctaP')}</p></div><a class="btn primary" href="${c.href(PATHS.home[lang])}#poptavka">${t('nav.cta')}</a></section>
  <section class="pg-sec"><h2>${t('area.other')}</h2><div class="other">${REGIONS.filter(x=>x.id!==r.id).map(x=>`<a href="${c.href(regionPath(x,lang))}">${ICON.viz}${x[lang].t}</a>`).join('')}</div></section>
</main>`;
  return doc(c, p, main);
}

/* ================================================================ LEGAL, 404, ADMIN */
export function legalPage(key, lang){
  const L = LEGAL[key][lang], path = PATHS[key][lang], c = ctx(lang, path);
  const p = {kind:'legal', lang, path, alt:PATHS[key], og:'home', title:L.t, desc:L.d};
  p.ld = [websiteLD(lang), pageLD(p)];
  return doc(c, p, `<main id="main" class="page">${crumbs(c, [[PATHS.home[lang], c.t('pg.home')], [null, L.t]])}<article class="legal"><h1>${L.t}</h1>${L.body()}</article></main>`);
}
export function notFoundPage(){
  const lang = 'cs', path = '/404.html', c = ctx(lang, '/');   // 404 is served at any depth: use absolute links via <base>
  const p = {kind:'404', lang, path:'/404.html', og:'home', title:'404 – '+c.t('nf.t'), desc:c.t('nf.p'), noindex:true};
  p.ld = [websiteLD(lang)];
  let html = doc(c, p, `<main id="main" class="page"><section class="nf"><div class="nf-code" aria-hidden="true">404</div><h1>${c.t('nf.t')}</h1><p>${c.t('nf.p')}</p>
    <p lang="en" class="nf-en">${I18N.en['nf.t']} ${I18N.en['nf.p']}</p>
    <div class="btns"><a class="btn primary" href="./">${c.t('nf.home')}</a><a class="btn glass" href="sluzby/">${c.t('nf.svc')}</a><a class="btn glass" href="en/" lang="en">English</a></div></section></main>`);
  return html.replace('<head>', `<head>\n<base href="${new URL(SITE).pathname.replace(/\/?$/, '/')}">`);
}

export { strip };
