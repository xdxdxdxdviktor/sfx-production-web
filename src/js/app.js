/* SFX production — browser entry. Pages are pre-rendered by the build; this file only adds behaviour. */
import { RUNTIME, COMPANY, MATTERPORT_ID } from './config.js';
import { SERVICES, SVC_BY, SVC_BY_TILE } from './services.js';
import { postsIn } from './posts.js';
import { ICON } from './icons.js';
import { PATHS } from './routes.js';
import { ctx, esc, svcPreview, blogGrid, blogChips, postCard, tiles, budgetBtns, summary, ORDER, MAIN } from './ui.js';
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
    cam = m.initCamera3D($('#cam3d'), C.asset('img/logo-mark.webp'), {frame, status});
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
  const NSTEP = 3; let step = 1;
  const form = {sel:new Set(), budget:-1, pref:'mail'};
  const F = id => $('#'+id);
  const FIELDS = ['fLoc','fDesc','fDate','fName','fCompany','fMail','fTel','fTime'];
  const TL = t('tiles');

  /* photo / video / photo+video are alternatives; everything else combines freely */
  function addSel(k){
    if(k==='foto' && form.sel.has('video') || k==='video' && form.sel.has('foto')) k = 'fotovideo';
    if(MAIN.includes(k)) MAIN.forEach(m=>form.sel.delete(m));
    form.sel.add(k);
  }
  const paintTiles = () => $$('.tile').forEach(x=>x.setAttribute('aria-pressed', form.sel.has(x.dataset.s)));
  function saveDraft(){
    const d = {sel:[...form.sel], budget:form.budget, pref:form.pref, flex:F('fFlex').checked, step};
    FIELDS.forEach(id=>d[id]=F(id).value);
    store.set('sfx-draft2', JSON.stringify(d)); renderLive();
  }
  function loadDraft(){
    let d; try{ d = JSON.parse(store.get('sfx-draft2')||'null'); }catch(e){ d=null; }
    if(!d) return;
    const any = (d.sel&&d.sel.length) || FIELDS.some(id=>d[id]); if(!any) return;
    form.sel = new Set(d.sel||[]); form.budget = d.budget??-1; form.pref = d.pref||'mail'; F('fFlex').checked = !!d.flex;
    FIELDS.forEach(id=>{ if(d[id] && F(id)) F(id).value = d[id]; });
    F('draftNote').hidden = false; paintTiles(); paintBudget(); setPref(form.pref); updateCount();
  }
  function pick(keys){ String(keys).split(',').filter(Boolean).forEach(k=>addSel(k)); paintTiles(); go(1); saveDraft(); }
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
    if(s===3){
      const a = fieldErr('fName', F('fName').value.trim() ? '' : t('f.eName'));
      const b = form.pref!=='mail' || fieldErr('fMail', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(F('fMail').value.trim()) ? '' : t('f.eMail'));
      const c = form.pref!=='tel' || fieldErr('fTel', F('fTel').value.replace(/\D/g,'').length<9 ? t('f.eTel') : '');
      const bad = $('#wiz .f.err input'); bad && bad.focus();
      return a && b && c;
    }
    return true;
  }
  const fmtD = v => { if(!v) return ''; try{ return new Date(v).toLocaleDateString(lang==='cs'?'cs-CZ':'en-GB'); }catch(e){ return v; } };
  function renderLive(){
    const sum = F('liveSum'), open = sum.classList.contains('open');
    sum.innerHTML = summary(C, {sel:ORDER.filter(k=>form.sel.has(k)), step, open,
      who:[F('fName').value.trim(), F('fCompany').value.trim()].filter(Boolean).join(', '),
      when:(fmtD(F('fDate').value)||'') + (F('fFlex').checked ? ` (${t('f.flex').toLowerCase()})` : ''),
      where:F('fLoc').value.trim(), budget: form.budget>=0 ? t('budgets')[form.budget] : '',
      contact: form.pref==='tel' ? F('fTel').value.trim() : F('fMail').value.trim(),
      });
  }
  const setNext = () => { F('wNext').textContent = step===1?t('f.next1'):step===2?t('f.next2'):t('f.send'); };
  function go(s){
    step = s; $$('.wstep').forEach(x=>x.classList.toggle('on', +x.dataset.step===s));
    $$('.steps-ind li').forEach((x,i)=>{ x.classList.toggle('on', i<s); x.classList.toggle('done', i<s-1); x.classList.toggle('cur', i===s-1); });
    F('wBack').hidden = s===1; setNext();
    if(s===3) ensureTurnstile();
    F('wizErr').textContent = ''; renderLive();
    const sum = F('liveSum'); sum.classList.remove('clap-hit'); void sum.offsetWidth; sum.classList.add('clap-hit');
  }

  document.addEventListener('click', e=>{
    const tl = e.target.closest('.tile');
    if(tl){ const k = tl.dataset.s;
      form.sel.has(k) ? form.sel.delete(k) : addSel(k);
      paintTiles(); F('wizErr').textContent=''; saveDraft(); }
    const hb = e.target.closest('[data-help]');
    if(hb){ const ta=F('fDesc'); ta.value = (ta.value.trim() ? ta.value.replace(/\s*$/,'')+'\n' : '') + t(hb.dataset.help)+': '; ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); updateCount(); saveDraft(); }
    const bb = e.target.closest('#budget button');
    if(bb){ form.budget = form.budget===+bb.dataset.b ? -1 : +bb.dataset.b; paintBudget(); saveDraft(); }
    const pb = e.target.closest('#pref button'); if(pb){ setPref(pb.dataset.p); saveDraft(); }
    const sd = e.target.closest('.steps-ind li.done'); if(sd) go(+sd.dataset.go);
    const ed = e.target.closest('.sum [data-go]'); if(ed && !F('doneView').classList.contains('on')){ go(+ed.dataset.go); F('wiz').scrollIntoView({behavior:RM?'auto':'smooth', block:'start'}); }
    const h = e.target.closest('.sum-head'); if(h && matchMedia('(max-width:1100px)').matches){ F('liveSum').classList.toggle('open'); h.setAttribute('aria-expanded', F('liveSum').classList.contains('open')); }
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
    const ref = refCode();
    const services_label = ORDER.filter(k=>form.sel.has(k)).map(k=>TL[k]).join(', ');
    const lines = [`${t('f.refL')}: ${ref}`, `${t('sum.svc')}: ${services_label}`, 
      `${t('f.loc')}: ${F('fLoc').value}`, `${t('f.date')}: ${F('fDate').value}${F('fFlex').checked?' ('+t('f.flex')+')':''}`,
      `${t('f.budget')}: ${form.budget>=0?t('budgets')[form.budget]:'-'}`, '', F('fDesc').value, '',
      [F('fName').value, F('fCompany').value].filter(Boolean).join(', '), form.pref==='tel' ? `${t('f.telReq')}: ${F('fTel').value}${F('fTime').value?' ('+F('fTime').value+')':''}` : `${t('f.mail')}: ${F('fMail').value}`].filter(x=>x!=='').join('\n');
    const mailto = 'mailto:'+COMPANY.email+'?subject='+encodeURIComponent((lang==='cs'?'Poptávka ':'Enquiry ')+ref)+'&body='+encodeURIComponent(lines);
    F('mailtoLink').href = mailto;
    const rec = {ref_code:ref, services:[...form.sel], services_label, location:F('fLoc').value, description:F('fDesc').value, date:F('fDate').value||null, flexible:F('fFlex').checked,
      budget:form.budget>=0?t('budgets')[form.budget]:null, name:F('fName').value.trim(), company:F('fCompany').value.trim()||null, contact_pref:form.pref,
      email:form.pref==='mail'?F('fMail').value.trim():null, phone:form.pref==='tel'?F('fTel').value.trim():null, call_time:form.pref==='tel'?F('fTime').value:null, lang};
    const btn = F('wNext'); btn.disabled = true; btn.textContent = t('f.sending');
    DB.addInquiry(rec, tsToken).then(res=>{
      btn.disabled = false; setNext();
      store.del('sfx-draft2');
      F('refCode').textContent = (res && res.ref) || ref;
      $$('.wstep,#wizTop,#wizNav,#wizErr,#draftNote').forEach(x=>x.style.display='none');
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
    form.sel.clear(); form.budget=-1; F('wiz').reset(); setPref('mail'); updateCount();
    $$('.wstep,#wizTop,#wizNav,#wizErr').forEach(x=>x.style.display='');
    F('doneView').classList.remove('on'); F('wiz').classList.remove('wrapped'); paintTiles(); paintBudget(); go(1);
  });

  loadDraft();
  const pk = sess.get('sfx-pick'); if(pk){ pk.split(',').forEach(k=>addSel(k)); sess.del('sfx-pick'); paintTiles(); saveDraft(); }
  renderLive(); updateCount();
}

/* =============================================================== SERVICE PAGES */
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
if(PAGE==='blog'){
  document.addEventListener('click', e=>{ const c = e.target.closest('#chips .chip'); if(!c) return;
    $$('#chips .chip').forEach(x=>x.setAttribute('aria-pressed', x===c)); const g = $('#blogGrid'); g.classList.toggle('flat', c.dataset.f!=='all'); g.innerHTML = blogGrid(C, postsIn(lang), c.dataset.f); });
}
/* click-to-load YouTube (no cookies until the visitor asks) */
document.addEventListener('click', e=>{ const b = e.target.closest('[data-yt]'); if(!b) return;
  b.outerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(b.dataset.yt)}?autoplay=1&rel=0" title="YouTube" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`; });

onScroll();
if(!isHome) document.body.classList.add('ready');
