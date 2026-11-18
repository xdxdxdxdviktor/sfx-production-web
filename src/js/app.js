/* SFX production — browser entry. Pages are pre-rendered by the build; this file only adds behaviour. */
import { RUNTIME, COMPANY, MATTERPORT_ID } from './config.js';
import { FQ } from './i18n.js';
import { SERVICES, SVC_BY, SVC_BY_TILE } from './services.js';
import { POSTS } from './posts.js';
import { ICON } from './icons.js';
import { PATHS } from './routes.js';
import { ctx, esc, svcPreview, blogGrid, blogChips, postCard, tiles, qblocks, budgetBtns, calcFields, calcResult, summary, ORDER } from './ui.js';
import { compute, defaults, sanitize, encodeState, decodeState, moneyRange, budgetBucket, rangeCfg, unitFor } from './calc.js';
import { DB } from './db.js';

const $ = (s,r=document)=>r.querySelector(s), $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const html = document.documentElement;
const lang = html.lang === 'en' ? 'en' : 'cs';
const PAGE = html.dataset.page;
const C = ctx(lang, html.dataset.path || '/');
const t = C.t;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = { get(k){ try{return localStorage.getItem(k)}catch(e){return null} }, set(k,v){ try{localStorage.setItem(k,v)}catch(e){} }, del(k){ try{localStorage.removeItem(k)}catch(e){} } };
const sess = { get(k){ try{return sessionStorage.getItem(k)}catch(e){return null} }, set(k,v){ try{sessionStorage.setItem(k,v)}catch(e){} }, del(k){ try{sessionStorage.removeItem(k)}catch(e){} } };
const play = v => { if(!v) return; if(!v.src && v.dataset.src) v.src = v.dataset.src; const p = v.play(); p && p.catch(()=>{}); };
const tc = ms => { const f = Math.floor(ms/40)%25, s = Math.floor(ms/1000); const p = n=>String(n).padStart(2,'0'); return `${p(Math.floor(s/3600))}:${p(Math.floor(s/60)%60)}:${p(s%60)}:${p(f)}`; };

/* =============================================================== NAV */
const nav = $('#nav'), burger = $('#burger'), mnav = $('#mnav'), pill = $('#navPill');
const isHome = PAGE === 'home';
function setMenu(open){ mnav.classList.toggle('open', open); burger.setAttribute('aria-expanded', open); document.body.classList.toggle('menu-open', open); onScroll(); }
burger.addEventListener('click', ()=>setMenu(!mnav.classList.contains('open')));
$$('#mnav a').forEach(a=>a.addEventListener('click', ()=>setMenu(false)));
addEventListener('keydown', e=>{ if(e.key==='Escape' && mnav.classList.contains('open')){ setMenu(false); burger.focus(); } });
function placePill(a){ if(!a){ pill.style.opacity=0; return; } const r=a.getBoundingClientRect(), pr=$('#navLinks').getBoundingClientRect(); pill.style.left=(r.left-pr.left)+'px'; pill.style.width=r.width+'px'; pill.style.opacity=1; }
$('#navLinks').addEventListener('mouseover', e=>{ const a=e.target.closest('a'); if(a) placePill(a); });
$('#navLinks').addEventListener('mouseleave', ()=>placePill($('.nav-links a.on')));
addEventListener('resize', ()=>placePill($('.nav-links a.on')));
const SECS = $$('[data-sec]');
function onScroll(){
  nav.classList.toggle('solid', !isHome || scrollY>30 || mnav.classList.contains('open'));
  if(!isHome) return;
  const y = innerHeight*.4; let id = 'hero';
  SECS.forEach(s=>{ if(!s.hidden && s.getBoundingClientRect().top<y) id=s.id; });
  let act = null; $$('.nav-links a').forEach(a=>{ const on = a.dataset.t===id; a.classList.toggle('on', on); if(on) act=a; });
  if(!$('#navLinks').matches(':hover')) placePill(act);
}
addEventListener('scroll', onScroll, {passive:true});

/* links that pre-select a service in the enquiry form */
document.addEventListener('click', e=>{
  const a = e.target.closest('a[data-pick]'); if(!a) return;
  sess.set('sfx-pick', a.dataset.pick);
  if(isHome && window.SFXForm) window.SFXForm.pick(a.dataset.pick);
});
/* language switch remembers the choice (used only to suggest, never to redirect crawlers) */
$$('.lang a[data-lang]').forEach(a=>a.addEventListener('click', ()=>store.set('sfx-lang', a.dataset.lang)));

/* admin: Alt/⌥ + Shift + A or triple-click © */
let adminP = null;
function admin(){
  if(!$('#admin')) return;
  adminP = adminP || import('./admin.js').then(m=>m.initAdmin(API, DB));
  return adminP;
}
const API = { t, lang:()=>lang, esc, SERVICES, svcT:id=>SVC_BY[id]?.[lang], postLink:p=>C.href(PATHS.article[lang])+'?p='+encodeURIComponent(p.slug), setPosts:rows=>setDynPosts(rows) };
addEventListener('keydown', e=>{ if(e.altKey && e.shiftKey && e.code==='KeyA'){ e.preventDefault(); const p=admin(); p && p.then(a=>a && a.toggle()); } });
document.addEventListener('click', e=>{ if(e.detail===3 && e.target.closest('#ftCopy')){ const p=admin(); p && p.then(a=>a && a.open()); } });
if(PAGE==='admin') admin();

/* =============================================================== MEDIA */
/* play muted loops only while visible */
const vio = 'IntersectionObserver' in window ? new IntersectionObserver(es=>es.forEach(e=>{ const v=e.target; if(e.isIntersecting){ play(v); v.addEventListener('playing',()=>v.classList.add('on'),{once:true}); } else v.pause(); }), {rootMargin:'100px'}) : null;
if(!RM && vio) $$('.sv video[data-src], #reelBg').forEach(v=>vio.observe(v));

/* =============================================================== HOME */
if(isHome){
  /* services: preview on hover */
  let curSvc = 'video';
  const prev = $('#svcPreview');
  const show = id => { if(id===curSvc) return; curSvc=id; prev.innerHTML = svcPreview(C, id); $$('#svcList a').forEach(a=>a.classList.toggle('on', a.dataset.s===id)); if(!RM){ const v=$('video',prev); play(v); v && v.addEventListener('playing',()=>v.classList.add('on'),{once:true}); } };
  $('#svcList').addEventListener('mouseover', e=>{ const a=e.target.closest('a'); a && show(a.dataset.s); });
  $('#svcList').addEventListener('focusin', e=>{ const a=e.target.closest('a'); a && show(a.dataset.s); });
  $$('#svcList a')[0]?.classList.add('on');

  /* showreel */
  const modal = $('#reelModal'), rv = $('#reelVid');
  $('#reelOpen').addEventListener('click', ()=>{ modal.showModal ? modal.showModal() : modal.setAttribute('open',''); play(rv); });
  const close = ()=>{ rv.pause(); modal.close ? modal.close() : modal.removeAttribute('open'); };
  $('#reelClose').addEventListener('click', close);
  modal.addEventListener('click', e=>{ if(e.target===modal) close(); });
  modal.addEventListener('close', ()=>rv.pause());

  /* mobile floating CTA */
  const mcta = document.createElement('a'); mcta.className='mcta'; mcta.href='#poptavka'; mcta.textContent=t('hero.cta1'); document.body.appendChild(mcta);
  const seen = new Set();
  const io = new IntersectionObserver(es=>{ es.forEach(e=>e.isIntersecting?seen.add(e.target):seen.delete(e.target)); upd(); }, {rootMargin:'0px 0px -12% 0px'});
  ['#poptavka','.contact-card','#heroCopy'].forEach(s=>{ const el=$(s); el && io.observe(el); });
  function upd(){ mcta.classList.toggle('show', !seen.size && scrollY>innerHeight*.9 && !mnav.classList.contains('open') && !$('#doneView').classList.contains('on')); }
  addEventListener('scroll', upd, {passive:true});

  initHero();
  initIntro();
  initForm();
  if(DB.mode==='supabase') DB.listPosts().then(setDynPosts).catch(()=>{});
}

/* ---------- hero: 3D camera driven by scroll ---------- */
function initHero(){
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if(hasGsap) gsap.registerPlugin(ScrollTrigger);
  const FSTOPS = [22,16,11,8,5.6,4,2.8];
  let cam = null, heroP = 0, lastK = -1;
  const shutter = $('#shutter');
  const frame = c => { $('#hudMm').textContent = Math.round(24+176*Math.min(1,c.e1*.5+c.e2*.5))+' mm'; $('#hudF').textContent = 'f/'+FSTOPS[Math.round(c.ap*(FSTOPS.length-1))]; };
  function drawShutter(k){
    if(Math.abs(k-lastK)<.004) return; lastK=k;
    if(k<=0){ shutter.innerHTML=''; return; }
    if(k>=.995){ shutter.setAttribute('viewBox','0 0 10 10'); shutter.setAttribute('preserveAspectRatio','none'); shutter.innerHTML='<rect width="10" height="10" fill="#000"/>'; return; }
    const w=innerWidth, h=innerHeight, cx=w/2, cy=h/2, R=Math.hypot(w,h)*.62, N=8, hr=R*(1-k), tw=(1-k)*1.1, Lg=R*3, V=[];
    for(let i=0;i<N;i++){ const a=i*2*Math.PI/N+tw; V.push([cx+Math.cos(a)*hr, cy+Math.sin(a)*hr]); }
    let d=''; for(let i=0;i<N;i++){ const a=V[i], b=V[(i+1)%N], c=V[(i+2)%N];
      const u=[b[0]-a[0], b[1]-a[1]], ul=Math.hypot(u[0],u[1])||1, v=[c[0]-b[0], c[1]-b[1]], vl=Math.hypot(v[0],v[1])||1;
      d+=`<path d="M${a[0]} ${a[1]}L${a[0]+u[0]/ul*Lg} ${a[1]+u[1]/ul*Lg}L${b[0]+v[0]/vl*Lg} ${b[1]+v[1]/vl*Lg}L${b[0]} ${b[1]}Z"/>`; }
    shutter.setAttribute('viewBox',`0 0 ${w} ${h}`); shutter.removeAttribute('preserveAspectRatio'); shutter.innerHTML=d;
  }
  function overlay(p){
    const cl=v=>Math.min(1,Math.max(0,v)), band=(a,b,c,d)=>cl((p-a)/(b-a))*(1-cl((p-c)/(d-c)));
    const copy=1-cl((p-.04)/.08);
    for(const el of [$('#heroCopy'), $('#heroStrip')]){ el.style.opacity=copy; el.style.visibility=copy<.02?'hidden':'visible'; }
    const cp=$('#camPoster'); if(cp) cp.style.opacity = document.body.classList.contains('gl-ok') ? '' : copy;
    $('#sl1').style.opacity=band(.18,.24,.4,.46); $('#sl2').style.opacity=band(.56,.62,.72,.78); $('#hud').style.opacity=band(.08,.14,.82,.88);
    drawShutter(cl((p-.84)/.1));
  }
  const status = ok => { document.body.classList.toggle('gl-ok', ok); $('#cam3d').style.visibility = ok ? '' : 'hidden'; };
  if(RM || !hasGsap) overlay(0);
  else { ScrollTrigger.create({trigger:'#hero', start:'top top', end:'bottom bottom', onUpdate:s=>{ heroP=s.progress; cam && cam.setProgress(heroP); overlay(heroP); }}); overlay(0); }
  const loadThree = () => window.THREE ? Promise.resolve() : new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'; s.async=true; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
  const start = () => Promise.all([loadThree(), import('./camera3d.js')]).then(([,m])=>{
    cam = m.initCamera3D($('#cam3d'), C.asset('img/logo.webp'), {frame, status});
    if(!cam){ $('#cam3d').style.display='none'; status(false); return; }
    if(RM || !hasGsap){ cam.snap(0); return; }
    cam.setProgress(heroP);
    new IntersectionObserver(es=>es.forEach(e=>cam.setRunning(e.isIntersecting))).observe($('#hero'));
  }).catch(()=>status(false));
  /* phones on data saver or low memory keep the still image */
  const lite = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType||''));
  if(!lite) (window.requestIdleCallback ? requestIdleCallback(start, {timeout:1500}) : setTimeout(start, 400));
  else status(false);
}

/* ---------- intro logo video: once per session, only on a direct visit ---------- */
function initIntro(){
  const intro = $('#intro'), v = $('#introVid');
  const ready = () => { document.body.classList.remove('locked'); document.body.classList.add('ready'); window.ScrollTrigger && ScrollTrigger.refresh(); onScroll(); };
  const seen = sess.get('sfx-intro'); sess.set('sfx-intro','1');
  if(!intro || seen || RM || location.hash || document.referrer.startsWith(location.origin)){ intro && intro.remove(); ready(); return; }
  let done = false;
  const finish = () => { if(done) return; done = true; intro.classList.add('done'); ready(); setTimeout(()=>{ v.pause(); intro.remove(); }, 1000); };
  intro.hidden = false; document.body.classList.add('locked');
  $('#introSkip').addEventListener('click', finish);
  v.addEventListener('ended', finish);
  v.src = v.dataset.src; const p = v.play(); p && p.catch && p.catch(()=>setTimeout(finish, 600));
  setTimeout(()=>{ if(v.currentTime<0.05) finish(); }, 2500);
  setTimeout(finish, 11000);
}

/* =============================================================== ENQUIRY FORM */
function initForm(){
  const NSTEP = 4; let step = 1;
  const form = {sel:new Set(), budget:-1, pref:'mail', q:{}, calc:null};
  const F = id => $('#'+id);
  const FIELDS = ['fProj','fLoc','fDesc','fDate','fLink','fName','fCompany','fMail','fTel','fTime'];
  const TL = t('tiles');

  const paintTiles = () => $$('.tile').forEach(x=>x.setAttribute('aria-pressed', form.sel.has(x.dataset.s)));
  function saveDraft(){
    const d = {sel:[...form.sel], budget:form.budget, pref:form.pref, q:form.q, flex:F('fFlex').checked, step};
    FIELDS.forEach(id=>d[id]=F(id).value);
    store.set('sfx-draft', JSON.stringify(d)); renderLive();
  }
  function loadDraft(){
    let d; try{ d = JSON.parse(store.get('sfx-draft')||'null'); }catch(e){ d=null; }
    if(!d) return;
    const any = (d.sel&&d.sel.length) || FIELDS.some(id=>d[id]); if(!any) return;
    form.sel = new Set(d.sel||[]); form.budget = d.budget??-1; form.pref = d.pref||'mail'; form.q = d.q||{}; F('fFlex').checked = !!d.flex;
    FIELDS.forEach(id=>{ if(d[id] && F(id)) F(id).value = d[id]; });
    F('draftNote').hidden = false; paintTiles(); paintBudget(); setPref(form.pref); updateCount();
  }
  /* estimate handed over from a service-page calculator */
  function loadCalc(){
    let c; try{ c = JSON.parse(store.get('sfx-calc')||'null'); }catch(e){ c=null; }
    if(!c || !SVC_BY[c.svc]) return;
    const sv = SVC_BY[c.svc], st = sanitize(sv, c.state||{}), r = compute(sv, st, lang);
    form.calc = {svc:c.svc, state:st, min:r.min, max:r.max, text:`${sv[lang].t}: ${moneyRange(r.min, r.max, lang)}`, lines:r.lines.map(l=>l.label).join('; ')};
    form.sel.add(sv.tile); form.sel.delete('unsure');
    if(form.budget<0) form.budget = budgetBucket(r.min, r.max);
    const chip = F('calcChip'); chip.hidden = false;
    chip.innerHTML = `<span class="cc-i">${ICON.calc}</span><span><small>${t('f.calcNote')}</small><b>${esc(form.calc.text)}</b><em>${esc(form.calc.lines)}</em></span><button type="button" data-act="rmcalc" aria-label="${t('f.calcRm')}">${ICON.x}</button>`;
    paintTiles(); paintBudget();
  }
  function pick(keys){ String(keys).split(',').filter(Boolean).forEach(k=>form.sel.add(k)); form.sel.delete('unsure'); paintTiles(); go(1); saveDraft(); }
  window.SFXForm = { pick };

  const paintBudget = () => $$('#budget button').forEach(x=>x.setAttribute('aria-pressed', +x.dataset.b===form.budget));
  function setPref(p){
    form.pref = p; $$('#pref button').forEach(x=>x.setAttribute('aria-checked', x.dataset.p===p));
    F('wrapMail').hidden = p!=='mail'; F('wrapTel').hidden = p!=='tel'; F('wrapTime').hidden = p!=='tel';
    ['fMail','fTel'].forEach(id=>fieldErr(id,''));
  }
  const updateCount = () => { F('descCount').textContent = `${F('fDesc').value.length} / 1500`; };
  function fieldErr(id, msg){ const f=F(id).closest('.f'); f.classList.toggle('err',!!msg); const m=f.querySelector('.emsg'); if(m) m.textContent=msg||''; msg ? F(id).setAttribute('aria-invalid','true') : F(id).removeAttribute('aria-invalid'); return !msg; }
  function validate(s){
    F('wizErr').textContent = '';
    if(s===1 && !form.sel.size){ F('wizErr').textContent = t('f.e1'); return false; }
    if(s===2){ const ok = fieldErr('fDesc', F('fDesc').value.trim().length<10 ? t('f.eDesc') : ''); if(!ok) F('fDesc').focus(); return ok; }
    if(s===4){
      const a = fieldErr('fName', F('fName').value.trim() ? '' : t('f.eName'));
      const b = form.pref!=='mail' || fieldErr('fMail', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(F('fMail').value.trim()) ? '' : t('f.eMail'));
      const c = form.pref!=='tel' || fieldErr('fTel', F('fTel').value.replace(/\D/g,'').length<9 ? t('f.eTel') : '');
      const bad = $('#wiz .f.err input'); bad && bad.focus();
      return a && b && c;
    }
    return true;
  }
  function detailsObj(){ const Q=FQ[lang], o={}; Object.keys(form.q).forEach(k=>{ if(form.q[k]!==undefined && form.q[k]!==null && Q[k] && form.sel.has(k)) o[TL[k]] = Q[k][1][form.q[k]]; }); return o; }
  const fmtD = v => { if(!v) return ''; try{ return new Date(v).toLocaleDateString(lang==='cs'?'cs-CZ':'en-GB'); }catch(e){ return v; } };
  function renderLive(){
    const sum = F('liveSum'), open = sum.classList.contains('open');
    const det = Object.values(detailsObj()).join(', ');
    sum.innerHTML = summary(C, {sel:ORDER.filter(k=>form.sel.has(k)), step, open,
      who:[F('fName').value.trim(), F('fCompany').value.trim()].filter(Boolean).join(', '),
      when:(fmtD(F('fDate').value)||'') + (F('fFlex').checked ? ` (${t('f.flex').toLowerCase()})` : ''),
      where:F('fLoc').value.trim(), budget: form.budget>=0 ? t('budgets')[form.budget] : '',
      contact: form.pref==='tel' ? F('fTel').value.trim() : F('fMail').value.trim(),
      det, calc: form.calc ? form.calc.text : ''});
  }
  const setNext = () => { F('wNext').textContent = step===1?t('f.next1'):step===2?t('f.next2'):step===3?t('f.next3'):t('f.send'); };
  function go(s){
    step = s; $$('.wstep').forEach(x=>x.classList.toggle('on', +x.dataset.step===s));
    $$('.steps-ind li').forEach((x,i)=>{ x.classList.toggle('on', i<s); x.classList.toggle('done', i<s-1); x.classList.toggle('cur', i===s-1); });
    F('wBack').hidden = s===1; setNext();
    if(s===2) F('qBlocks').innerHTML = qblocks(C, form.sel, form.q);
    if(s===4) ensureTurnstile();
    F('wizErr').textContent = ''; renderLive();
    const sum = F('liveSum'); sum.classList.remove('clap-hit'); void sum.offsetWidth; sum.classList.add('clap-hit');
  }

  document.addEventListener('click', e=>{
    const tl = e.target.closest('.tile');
    if(tl){ const k = tl.dataset.s;
      if(k==='unsure'){ const on = !form.sel.has('unsure'); form.sel.clear(); if(on) form.sel.add('unsure'); }
      else { form.sel.delete('unsure'); form.sel.has(k) ? form.sel.delete(k) : form.sel.add(k); }
      paintTiles(); F('wizErr').textContent=''; saveDraft(); }
    const qb = e.target.closest('[data-qk]');
    if(qb){ const k=qb.dataset.qk, i=+qb.dataset.qi; form.q[k] = form.q[k]===i ? null : i;
      $$(`[data-qk="${k}"]`).forEach(x=>x.setAttribute('aria-pressed', form.q[k]===+x.dataset.qi)); saveDraft(); }
    const hb = e.target.closest('[data-help]');
    if(hb){ const ta=F('fDesc'); ta.value = (ta.value.trim() ? ta.value.replace(/\s*$/,'')+'\n' : '') + t(hb.dataset.help)+': '; ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); updateCount(); saveDraft(); }
    const bb = e.target.closest('#budget button');
    if(bb){ form.budget = form.budget===+bb.dataset.b ? -1 : +bb.dataset.b; paintBudget(); saveDraft(); }
    const pb = e.target.closest('#pref button'); if(pb){ setPref(pb.dataset.p); saveDraft(); }
    const sd = e.target.closest('.steps-ind li.done'); if(sd) go(+sd.dataset.go);
    const ed = e.target.closest('.sum [data-go]'); if(ed && !F('doneView').classList.contains('on')){ go(+ed.dataset.go); F('wiz').scrollIntoView({behavior:RM?'auto':'smooth', block:'start'}); }
    const h = e.target.closest('.sum-head'); if(h && matchMedia('(max-width:1100px)').matches){ F('liveSum').classList.toggle('open'); h.setAttribute('aria-expanded', F('liveSum').classList.contains('open')); }
    if(e.target.closest('[data-act="rmcalc"]')){ form.calc=null; store.del('sfx-calc'); F('calcChip').hidden=true; renderLive(); }
  });
  F('fDesc').addEventListener('input', updateCount);
  F('wiz').addEventListener('input', saveDraft);
  F('wiz').addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target.tagName==='INPUT' && e.target.type!=='checkbox'){ e.preventDefault(); F('wNext').click(); } });
  F('wNext').addEventListener('click', ()=>{
    if(!validate(step)) return;
    if(step<NSTEP){ go(step+1); const f = $(`.wstep[data-step="${step}"] input:not([type=checkbox]), .wstep[data-step="${step}"] textarea`); f && f.focus({preventScroll:true}); saveDraft(); }
    else submit();
  });
  F('wBack').addEventListener('click', ()=>go(step-1));
  F('wiz').addEventListener('submit', e=>e.preventDefault());

  /* viewfinder timecode runs while the form is on screen */
  let t0 = 0, raf = 0, acc = 0;
  const tick = now => { F('wizTc').textContent = tc(acc + now - t0); raf = requestAnimationFrame(tick); };
  new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting && !RM){ t0 = performance.now(); raf = requestAnimationFrame(tick); } else if(raf){ cancelAnimationFrame(raf); raf=0; acc += performance.now()-t0; } })).observe(F('wiz'));

  /* optional spam protection (Cloudflare Turnstile) */
  let tsId = null, tsToken = '';
  function ensureTurnstile(){
    if(!RUNTIME.turnstileSiteKey || tsId!==null) return;
    const box = F('turnstile'); box.hidden = false; tsId = 'loading';
    const render = () => { tsId = window.turnstile.render(box, {sitekey:RUNTIME.turnstileSiteKey, theme:'dark', language:lang, size:'flexible', callback:x=>{ tsToken=x; }, 'expired-callback':()=>{ tsToken=''; }}); };
    if(window.turnstile) return render();
    const sc = document.createElement('script'); sc.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; sc.async=true; sc.onload=render; sc.onerror=()=>{ tsId=null; }; document.head.appendChild(sc);
  }
  const refCode = () => { const d=new Date(), p=n=>String(n).padStart(2,'0'); return `SFX-${String(d.getFullYear()).slice(2)}${p(d.getMonth()+1)}${p(d.getDate())}-${Math.random().toString(16).slice(2,6).toUpperCase()}`; };

  function submit(){
    if(F('fWeb').value) return; // honeypot
    const det = detailsObj(), ref = refCode();
    const services_label = ORDER.filter(k=>form.sel.has(k)).map(k=>TL[k]).join(', ');
    const lines = [`${t('f.refL')}: ${ref}`, `${t('sum.svc')}: ${services_label}`, ...Object.entries(det).map(([k,v])=>`${k}: ${v}`),
      form.calc ? `${t('sum.calc')}: ${form.calc.text} (${form.calc.lines})` : '',
      `${t('f.proj')}: ${F('fProj').value}`, `${t('f.loc')}: ${F('fLoc').value}`, `${t('f.date')}: ${F('fDate').value}${F('fFlex').checked?' ('+t('f.flex')+')':''}`,
      `${t('f.budget')}: ${form.budget>=0?t('budgets')[form.budget]:'-'}`, `${t('f.link')}: ${F('fLink').value}`, '', F('fDesc').value, '',
      [F('fName').value, F('fCompany').value].filter(Boolean).join(', '), form.pref==='tel' ? `${t('f.telReq')}: ${F('fTel').value}${F('fTime').value?' ('+F('fTime').value+')':''}` : `${t('f.mail')}: ${F('fMail').value}`].filter(x=>x!=='').join('\n');
    const mailto = 'mailto:'+COMPANY.email+'?subject='+encodeURIComponent((lang==='cs'?'Poptávka ':'Enquiry ')+ref+(F('fProj').value?': '+F('fProj').value:''))+'&body='+encodeURIComponent(lines);
    F('mailtoLink').href = mailto;
    const rec = {ref_code:ref, services:[...form.sel], services_label, details:det, project:F('fProj').value, location:F('fLoc').value, description:F('fDesc').value, date:F('fDate').value||null, flexible:F('fFlex').checked,
      budget:form.budget>=0?t('budgets')[form.budget]:null, link:F('fLink').value, name:F('fName').value.trim(), company:F('fCompany').value.trim()||null, contact_pref:form.pref,
      email:form.pref==='mail'?F('fMail').value.trim():null, phone:form.pref==='tel'?F('fTel').value.trim():null, call_time:form.pref==='tel'?F('fTime').value:null, lang,
      estimate: form.calc ? `${form.calc.text} (${form.calc.lines})` : null};
    const btn = F('wNext'); btn.disabled = true; btn.textContent = t('f.sending');
    DB.addInquiry(rec, tsToken).then(res=>{
      btn.disabled = false; setNext();
      store.del('sfx-draft'); store.del('sfx-calc');
      F('refCode').textContent = (res && res.ref) || ref;
      $$('.wstep,#wizTop,#wizNav,#wizErr,#draftNote,#calcChip').forEach(x=>x.style.display='none');
      F('doneView').classList.add('on'); F('wiz').classList.add('wrapped');
      step = NSTEP+1; renderLive(); const h3 = $('#doneView h3'); h3.focus();
    }).catch(err=>{
      btn.disabled = false; setNext();
      if(err && err.code==='captcha'){ tsId && window.turnstile && window.turnstile.reset(tsId); F('wizErr').textContent = t('f.eCaptcha'); return; }
      if(err && err.code==='rate'){ F('wizErr').textContent = t('f.eRate'); return; }
      F('wizErr').innerHTML = `${t('f.sendErr')} <a href="${esc(mailto)}">${COMPANY.email}</a>`;
    });
  }
  F('wAgain').addEventListener('click', ()=>{
    form.sel.clear(); form.budget=-1; form.q={}; form.calc=null; F('wiz').reset(); setPref('mail'); updateCount();
    $$('.wstep,#wizTop,#wizNav,#wizErr').forEach(x=>x.style.display='');
    F('doneView').classList.remove('on'); F('wiz').classList.remove('wrapped'); F('calcChip').hidden = true; paintTiles(); paintBudget(); go(1);
  });

  loadDraft(); loadCalc();
  const pk = sess.get('sfx-pick'); if(pk){ pk.split(',').forEach(k=>form.sel.add(k)); form.sel.delete('unsure'); sess.del('sfx-pick'); paintTiles(); saveDraft(); }
  renderLive(); updateCount();
}

/* =============================================================== SERVICE PAGES */
const calcEl = $('#kalkulacka');
if(calcEl) initCalc(calcEl);
function initCalc(root){
  const sv = SVC_BY[root.dataset.svc]; if(!sv) return;
  const formEl = $('.calc-form', root), live = $('.cr-live', root);
  let state = defaults(sv);
  const m = location.hash.match(/kalkulacka=([^&]+)/);
  if(m) state = sanitize(sv, decodeState(decodeURIComponent(m[1])));
  else { try{ const s = JSON.parse(store.get('sfx-calc-'+sv.id)||'null'); if(s) state = sanitize(sv, s); }catch(e){} }
  let shown = null;
  function animate(el, from, to){
    if(RM || !from){ el.innerHTML = moneyRange(to.min, to.max, lang); return; }
    const t0 = performance.now(), D = 450;
    const step = now => { const k = Math.min(1,(now-t0)/D), e = 1-Math.pow(1-k,3);
      const a = from.min+(to.min-from.min)*e, b = from.max+(to.max-from.max)*e, r = to.max>60000?1000:500;
      el.innerHTML = moneyRange(Math.round(a/r)*r, Math.round(b/r)*r, lang); if(k<1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function render(full){
    if(full) formEl.innerHTML = calcFields(C, sv, state);
    const r = compute(sv, state, lang);
    const prevOpen = $('.cr-break', live)?.open;
    live.innerHTML = calcResult(C, sv, state);
    if(prevOpen) $('.cr-break', live).open = true;
    animate($('.cr-v', live), shown, r); shown = {min:r.min, max:r.max};
    root.classList.remove('bump'); void root.offsetWidth; root.classList.add('bump');
    store.set('sfx-calc-'+sv.id, JSON.stringify(state));
    fl.querySelector('b').textContent = moneyRange(r.min, r.max, lang);
  }
  /* phones/tablets: floating price while the options are on screen and the result is not */
  const fl = document.createElement('a'); fl.className = 'calc-float'; fl.href = '#'; fl.setAttribute('aria-hidden','true'); fl.tabIndex = -1;
  fl.innerHTML = `<span>${t('calc.result')}</span><b></b>${ICON.arrow}`;
  fl.addEventListener('click', e=>{ e.preventDefault(); $('.calc-res', root).scrollIntoView({behavior:RM?'auto':'smooth', block:'center'}); });
  document.body.appendChild(fl);
  let inForm = false, inRes = false;
  const flUpd = () => fl.classList.toggle('show', inForm && !inRes);
  new IntersectionObserver(es=>es.forEach(e=>{ if(e.target===formEl) inForm = e.isIntersecting; else inRes = e.isIntersecting; flUpd(); }), {threshold:[0, .25]}).observe(formEl);
  new IntersectionObserver(es=>es.forEach(e=>{ inRes = e.intersectionRatio > .25; flUpd(); }), {threshold:[0, .25]}).observe($('.calc-res', root));
  formEl.addEventListener('input', e=>{
    const el = e.target, fid = el.name?.replace(/^c-/,''); if(!fid) return;
    const f = sv.calc.fields.find(x=>x.id===fid);
    if(f.kind==='choice'){ state[fid] = el.value; const needs = sv.calc.fields.some(x=>x.byType); if(fid==='type' && needs){ state = sanitize(sv, state); return render(true); } }
    else if(f.kind==='range'){ state[fid] = +el.value; const r = el.closest('.cf'), rc = rangeCfg(f, state); $('output b', r).textContent = el.value; $('output span', r).textContent = unitFor(rc.unit, +el.value, lang); el.style.setProperty('--p', ((el.value-el.min)/(el.max-el.min)*100)+'%'); }
    else if(f.kind==='extras'){ state[fid] = $$(`input[name="c-${fid}"]:checked`, formEl).map(x=>x.value); }
    render(false);
  });
  formEl.addEventListener('click', e=>{
    const b = e.target.closest('.step'); if(!b) return;
    const inp = $('input[type=range]', b.parentElement); const v = Math.min(+inp.max, Math.max(+inp.min, +inp.value + (+b.dataset.d)*(+inp.step)));
    inp.value = v; inp.dispatchEvent(new Event('input', {bubbles:true}));
  });
  root.addEventListener('click', e=>{
    const a = e.target.closest('[data-act]'); if(!a) return;
    if(a.dataset.act==='reset'){ state = defaults(sv); render(true); }
    if(a.dataset.act==='copy'){
      const url = location.href.split('#')[0] + '#kalkulacka=' + encodeURIComponent(encodeState(state));
      history.replaceState(null, '', url);
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(()=>{ $('span', a).textContent = t('calc.copied'); setTimeout(()=>{ $('span', a).textContent = t('calc.copy'); }, 1800); }).catch(()=>{});
    }
    if(a.dataset.act==='send'){
      store.set('sfx-calc', JSON.stringify({svc:sv.id, state, lang}));
      sess.set('sfx-pick', sv.tile);
      location.href = C.href(PATHS.home[lang]) + '#poptavka';
    }
  });
  render(true);
}

/* theme visuals */
const sv = $('.sv');
if(sv && !RM){
  const tcs = $$('[data-tc]', sv); const t0 = performance.now() - 12*1000;
  if(tcs.length){ const loop = now => { tcs.forEach(el=>el.textContent = tc(now - t0)); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  const comp = $('[data-compass]', sv);
  if(comp){ comp.innerHTML = Array.from({length:72},(_, i)=>`<i${i%9===0?' class="b"':''}>${i%18===0?['N','E','S','W'][i/18]:''}</i>`).join(''); }
  const alt = $('[data-alt]', sv);
  if(alt){ addEventListener('scroll', ()=>{ alt.textContent = Math.round(120 + scrollY/12); comp && (comp.style.transform = `translateX(${-(scrollY/4)%360}px)`); }, {passive:true}); }
}
/* drag wipe: 3D wireframe / render, drawing / visualisation */
$$('.wipe').forEach(w=>{
  const h = $('.wipe-h', w.parentElement); let drag = false;
  const set = x => { const r = w.getBoundingClientRect(); const p = Math.min(100, Math.max(0, (x - r.left)/r.width*100)); w.parentElement.style.setProperty('--x', p+'%'); h && h.setAttribute('aria-valuenow', Math.round(p)); };
  const host = w.parentElement;
  host.addEventListener('pointerdown', e=>{ drag = true; host.setPointerCapture(e.pointerId); set(e.clientX); });
  host.addEventListener('pointermove', e=>{ if(drag) set(e.clientX); else if(e.pointerType==='mouse') set(e.clientX); });
  host.addEventListener('pointerup', ()=>drag=false);
  h && h.addEventListener('keydown', e=>{ const cur = parseFloat(getComputedStyle(host).getPropertyValue('--x'))||50; if(e.key==='ArrowLeft'||e.key==='ArrowRight'){ e.preventDefault(); const p = Math.min(100,Math.max(0,cur+(e.key==='ArrowLeft'?-5:5))); host.style.setProperty('--x', p+'%'); h.setAttribute('aria-valuenow', p); } });
});
/* 360 panorama: drag to look around, slow auto-pan */
$$('.pano').forEach(p=>{
  let x = 30, drag = false, lx = 0, idle = true;
  const set = () => p.style.backgroundPosition = `${x}% 50%`;
  p.addEventListener('pointerdown', e=>{ drag = true; idle = false; lx = e.clientX; p.setPointerCapture(e.pointerId); p.classList.add('grab'); });
  p.addEventListener('pointermove', e=>{ if(!drag) return; x = Math.min(100, Math.max(0, x - (e.clientX-lx)/p.clientWidth*60)); lx = e.clientX; set(); });
  p.addEventListener('pointerup', ()=>{ drag = false; p.classList.remove('grab'); });
  if(!RM){ let dir = 1; setInterval(()=>{ if(!idle) return; x += .06*dir; if(x>70||x<30) dir *= -1; set(); }, 30); }
  set();
});
/* photo: shutter flash on click */
$$('.sv-foto').forEach(el=>el.addEventListener('click', ()=>{ el.classList.remove('snap'); void el.offsetWidth; el.classList.add('snap'); const s=$('.shots',el); if(s){ const n = parseInt(s.textContent.replace(/\D/g,''))-1; s.textContent = `[ ${n} ]`; } }));
/* film: open the letterbox when visible */
$$('.sv-film').forEach(el=>{ new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting && el.classList.add('open')), {threshold:.4}).observe(el); setTimeout(()=>{ if(el.getBoundingClientRect().top < innerHeight) el.classList.add('open'); }, 700); });
/* matterport demo */
const mp = $('#mpLoad');
if(mp) mp.addEventListener('click', ()=>{ $('#mpFrame').innerHTML = `<iframe src="https://my.matterport.com/show/?m=${MATTERPORT_ID}&play=1&qs=1&lang=${lang}" allow="fullscreen; xr-spatial-tracking" allowfullscreen title="Matterport"></iframe>`; });

/* =============================================================== BLOG */
let DYN = [];
function allPosts(){ return [...DYN, ...POSTS]; }
function setDynPosts(rows){
  DYN = (rows||[]).filter(r=>r.published && (r.lang||'cs')===lang).map(r=>({dyn:true, id:r.id, cat:SVC_BY[r.category]?r.category:'video', svcs:(r.services&&r.services.length?r.services:[r.category||'video']).filter(k=>SVC_BY[k]),
    date:(r.published_at||r.created_at||'').slice(0,10), cover:r.cover_url, img:'edit', url:C.href(PATHS.article[lang])+'?p='+encodeURIComponent(r.slug), slug:r.slug,
    [lang]:{t:r.title, lead:r.lead||'', body:String(r.body||'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean)}, gal:r.gallery||[], client:r.client||''}));
  const g = $('#blogGrid'); if(g && DYN.length) g.innerHTML = blogGrid(C, isHome ? allPosts().slice(0,4) : allPosts(), 'all');
  if($('#chips')) $('#chips').innerHTML = blogChips(C, allPosts(), 'all');
  if(PAGE==='article') renderDynPost();
}
if(PAGE==='blog'){
  document.addEventListener('click', e=>{ const c = e.target.closest('#chips .chip'); if(!c) return;
    $$('#chips .chip').forEach(x=>x.setAttribute('aria-pressed', x===c)); const g = $('#blogGrid'); g.classList.toggle('flat', c.dataset.f!=='all'); g.innerHTML = blogGrid(C, allPosts(), c.dataset.f); });
  if(DB.mode==='supabase') DB.listPosts().then(setDynPosts).catch(()=>{});
}
function renderDynPost(){
  const slug = new URLSearchParams(location.search).get('p'), p = DYN.find(x=>x.slug===slug), box = $('#dynPost');
  if(!p){ box.innerHTML = `<section class="nf"><h1>${t('nf.t')}</h1><p>${t('nf.p')}</p></section>`; return; }
  const d = p[lang]; document.title = d.t + ' | SFX production';
  box.innerHTML = `<header class="art"><div class="meta"><span class="cat">${SVC_BY[p.cat][lang].t}</span><span>${p.date}</span></div><h1>${esc(d.t)}</h1><p class="lead">${esc(d.lead)}</p></header>
    ${p.cover?`<div class="art-cover"><img src="${esc(p.cover)}" alt=""></div>`:''}
    <div class="art-body"><div class="text">${d.body.map(x=>x.startsWith('## ')?`<h2>${esc(x.slice(3))}</h2>`:`<p>${esc(x)}</p>`).join('')}
    ${p.gal.length?`<div class="gallery">${p.gal.map(g=>`<div><img src="${esc(g)}" alt="" loading="lazy"></div>`).join('')}</div>`:''}</div></div>`;
}
if(PAGE==='article') DB.listPosts().then(setDynPosts).catch(()=>renderDynPost());

onScroll();
if(!isHome) document.body.classList.add('ready');
