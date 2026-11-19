/* SFX Studio — app shell: login, navigation, router, live timecode, deploy status. */
import { $, $$, esc, ic, store, toast, ago } from './lib.js';
import { CFG, GH, SB, secrets, deploys } from './api.js';

const ROUTES = {
  prehled:   {t:'Přehled',    icon:'home',  load:() => import('./dashboard.js')},
  blog:      {t:'Blog',       icon:'pen',   load:() => import('./blog.js')},
  statistiky:{t:'Statistiky', icon:'chart', load:() => import('./stats.js')},
  poptavky:  {t:'Poptávky',   icon:'inbox', load:() => import('./leads.js')},
  nastaveni: {t:'Nastavení',  icon:'gear',  load:() => import('./settings.js')},
};
const CMS = [
  ['film', 'Ukázky práce', 'portfolio'], ['image', 'Služby a fotky', 'services'], ['text', 'Texty webu', 'pages'], ['users', 'Reference', 'references']];
export const user = {name:'', login:'', avatar:''};

/* vocative for the greeting (Jiří → Jirko); can be overridden in Settings */
export function callName(){
  const own = store.get('studio-callname'); if(own) return own;
  const first = (user.name || user.login || '').split(/\s+/)[0];
  const V = {'Jiří':'Jirko','Jirka':'Jirko','Jaroslav':'Jaroslave','Jarda':'Jardo','Viktor':'Viktore','Petr':'Petře','Martin':'Martine','Tomáš':'Tomáši'};
  return V[first] || first;
}

/* ---------- timecode in the header (HH:MM:SS:FF, 25 fps) ---------- */
function tc(){ const d = new Date(), p = n => String(n).padStart(2,'0'); return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}:${p(Math.floor(d.getMilliseconds()/40))}`; }
setInterval(() => $$('[data-tc]').forEach(e => e.textContent = tc()), 40);

/* ---------- login ---------- */
/* short team usernames → the account e-mail (Supabase signs in with e-mail) */
const USERNAMES = {sfxproduction:'sfx-production@seznam.cz'};
const loginEmail = v => { v = String(v||'').trim().toLowerCase(); return USERNAMES[v] || v; };
function loginView(msg=''){
  const sb = SB.enabled();
  document.body.innerHTML = `<div class="atmo"></div>
  <main class="login">
    <div class="art"><video src="../assets/video/showreel-loop.mp4" poster="../assets/img/showreel-poster.jpg" autoplay muted loop playsinline></video>
      <div class="hud"><span>REC</span><time data-tc>00:00:00:00</time></div>
      <div class="cap"><h2>Obraz,<br>který <em>zůstane.</em></h2></div></div>
    <form id="lf" autocomplete="on">
      <a class="brand" href="../"><img src="../assets/img/logo.webp" alt="SFX production"><span>Studio</span></a>
      <h1>Vítejte<br>ve střižně.</h1>
      <p>Administrace webu SFX production: články, statistiky a poptávky na jednom místě.</p>
      ${sb ? `
      <label class="field"><span>Jméno nebo e-mail</span><input class="in" type="text" name="email" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
      <label class="field"><span>Heslo</span><input class="in" type="password" name="password" autocomplete="current-password" required></label>`
      : `
      <label class="field"><span>Přístupový klíč GitHub</span><input class="in" type="password" name="token" autocomplete="off" placeholder="github_pat_…" required></label>
      <details class="how"><summary>Kde klíč získám?</summary><ol>
        <li>Na GitHubu otevřete <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Settings → Developer settings → Fine-grained tokens</a>.</li>
        <li>Repository access: <b>Only select repositories</b> → <b>${esc(CFG.repo)}</b>.</li>
        <li>Permissions: <b>Contents: Read and write</b>, <b>Actions: Read-only</b>.</li>
        <li>Klíč vložte sem. Zůstane uložený jen v tomto prohlížeči.</li></ol></details>`}
      <p class="err" role="alert">${esc(msg)}</p>
      <button class="btn gold" type="submit">${ic('key')}<span>Přihlásit se</span></button>
      ${sb ? `<button class="btn ghost" type="button" id="forgot">Zapomenuté heslo</button>` : ''}
      <p class="help">Starší administrace: <a href="../admin/">Sveltia CMS</a> · <a href="../">Zpět na web</a></p>
    </form>
  </main>`;
  $('#forgot') && $('#forgot').addEventListener('click', async () => {
    const em = loginEmail($('#lf').email.value); if(!em){ $('.err').textContent = 'Nejdřív vyplňte e-mail.'; $('#lf').email.focus(); return; }
    try{ await SB.resetPassword(em); $('.err').style.color = 'var(--ok)'; $('.err').textContent = 'Poslali jsme vám e-mail s odkazem pro nové heslo.'; }
    catch(err){ $('.err').textContent = 'Odeslání se nepovedlo: ' + err.message; } });
  $('#lf').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target, btn = $('button[type=submit]', f); btn.disabled = true; btn.innerHTML = '<span class="spin"></span><span>Ověřuji…</span>';
    try{
      if(sb){ await SB.signIn(loginEmail(f.email.value), f.password.value); await SB.loadSecrets(); }
      else secrets.gh = f.token.value.trim();
      await boot();
    }catch(err){ if(!sb) secrets.gh = ''; loginView(sb ? 'E-mail nebo heslo nesedí.' : (err.status===401 ? 'Klíč je neplatný nebo vypršel.' : err.message)); }
  });
}

/* ---------- shell ---------- */
function shell(){
  document.body.innerHTML = `<div class="atmo"></div>
  <div class="app" id="app">
    <aside class="side" aria-label="Navigace">
      <a class="brand" href="#/prehled"><img src="../assets/img/logo.webp" alt="SFX production"><span>Studio</span></a>
      <nav class="nav" id="nav">
        ${Object.entries(ROUTES).filter(([k])=>k!=='nastaveni').map(([k,r],i)=>`<a href="#/${k}" data-r="${k}">${ic(r.icon)}<span>${r.t}</span>${k==='poptavky'?'<span class="badge" id="leadBadge" hidden></span>':`<i>0${i+1}</i>`}</a>`).join('')}
        <div class="nav-sep"></div>
        <div class="nav-label">Správa webu</div>
        ${CMS.map(([i,t,c])=>`<a href="../admin/#/collections/${c}" target="_blank" rel="noopener">${ic(i)}<span>${t}</span>${ic('ext')}</a>`).join('')}
        <div class="nav-sep"></div>
        <a href="#/nastaveni" data-r="nastaveni">${ic('gear')}<span>Nastavení</span></a>
        <a href="${esc(CFG.site)}/" target="_blank" rel="noopener">${ic('globe')}<span>Otevřít web</span>${ic('ext')}</a>
      </nav>
      <div class="side-foot">
        <a class="deploy-pill" id="dpill" href="https://github.com/${esc(CFG.repo)}/actions" target="_blank" rel="noopener"><span class="dot"></span><div><b>Web je aktuální</b><span>…</span></div></a>
        <div class="me">${user.avatar?`<img src="${esc(user.avatar)}" alt="">`:`<span class="av">${esc((user.name||'?')[0])}</span>`}<div><b>${esc(user.name||user.login)}</b><small>@${esc(user.login)}</small></div><button id="logout" title="Odhlásit" aria-label="Odhlásit">${ic('out')}</button></div>
      </div>
    </aside>
    <div>
      <header class="mbar"><a href="#/prehled" class="mlogo"><img src="../assets/img/logo.webp" alt="SFX production"><span>Studio</span></a>
        <span class="mdeploy" id="mdeploy" title="Stav nasazení"><span class="dot"></span><span data-tc></span></span>
        <button class="mme" id="moreBtn" aria-label="Další volby" aria-haspopup="dialog">${user.avatar?`<img src="${esc(user.avatar)}" alt="">`:`<span class="av">${esc((user.name||'?')[0])}</span>`}</button></header>
      <main class="main" id="main" tabindex="-1"></main>
    </div>
  </div>
  <nav class="tabbar" id="tabbar" aria-label="Hlavní navigace">
    <a href="#/prehled" data-r="prehled">${ic('home')}<span>Přehled</span></a>
    <a href="#/blog" data-r="blog">${ic('pen')}<span>Blog</span></a>
    <a href="#/blog/novy" class="fab" aria-label="Nový článek">${ic('plus')}</a>
    <a href="#/poptavky" data-r="poptavky">${ic('inbox')}<span>Poptávky</span><i class="tb-badge" id="tbBadge" hidden></i></a>
    <a href="#/statistiky" data-r="statistiky">${ic('chart')}<span>Statistiky</span></a>
  </nav>`;
  $('#logout').addEventListener('click', async () => { secrets.gh = ''; secrets.umami = SB.enabled() ? '' : secrets.umami; await SB.signOut(); location.hash = ''; loginView(); });
  $('#moreBtn').addEventListener('click', moreSheet);
  deploys.on(runs => {
    const p = $('#dpill'); if(!p) return; const r = runs[0];
    p.classList.remove('busy','fail');
    if(!r){ $('b',p).textContent = 'Stav nasazení'; $(':scope>div>span',p).textContent = 'nedostupný'; return; }
    if(r.status !== 'completed'){ p.classList.add('busy'); $('b',p).textContent = 'Nasazuje se…'; $(':scope>div>span',p).textContent = 'změna bude na webu do 2 min'; }
    else if(r.conclusion !== 'success'){ p.classList.add('fail'); $('b',p).textContent = 'Nasazení selhalo'; $(':scope>div>span',p).textContent = ago(r.updated_at); }
    else { $('b',p).textContent = 'Web je aktuální'; $(':scope>div>span',p).textContent = 'nasazeno ' + ago(r.updated_at); }
    const m = $('#mdeploy'); if(m) m.className = 'mdeploy ' + (p.classList.contains('busy') ? 'busy' : p.classList.contains('fail') ? 'fail' : '');
  });
  deploys.refresh();
  if(SB.enabled()) SB.newCount().then(n => { for(const id of ['#leadBadge','#tbBadge']){ const b = $(id); if(b && n){ b.hidden = false; b.textContent = n; } } });
}

/* phone: "more" bottom sheet (account, deploy state, links to the content console) */
function moreSheet(){
  const p = $('#dpill'), d = document.createElement('div'); d.className = 'sheet';
  d.innerHTML = `<div role="dialog" aria-modal="true" aria-label="Další volby"><span class="grab"></span>
    <div class="me" style="padding:0 0 14px">${user.avatar?`<img src="${esc(user.avatar)}" alt="">`:`<span class="av">${esc((user.name||'?')[0])}</span>`}<div><b>${esc(user.name||user.login)}</b><small>@${esc(user.login)}</small></div></div>
    ${p ? p.outerHTML.replace('id="dpill"','') : ''}
    <div class="sheet-label">Správa webu</div>
    <div class="sheet-grid">${CMS.map(([i,t,c])=>`<a href="../admin/#/collections/${c}" target="_blank" rel="noopener">${ic(i)}<span>${t}</span></a>`).join('')}</div>
    <div class="sheet-list">
      <a href="#/nastaveni">${ic('gear')}<span>Nastavení</span></a>
      <a href="${esc(CFG.site)}/" target="_blank" rel="noopener">${ic('globe')}<span>Otevřít web</span>${ic('ext')}</a>
      <button type="button" id="sOut">${ic('out')}<span>Odhlásit se</span></button></div></div>`;
  const close = () => { d.classList.add('out'); setTimeout(() => d.remove(), 250); };
  d.addEventListener('click', e => { if(e.target === d || e.target.closest('a')) close(); });
  $('#sOut', d).addEventListener('click', () => { close(); $('#logout').click(); });
  document.body.appendChild(d);
}

/* header used by every view */
export function header(title, sub, actions=''){
  return `<header class="top"><div class="title"><small><span class="rec">REC</span><span data-tc>${tc()}</span><span>· ${esc(sub)}</span></small><h1>${title}</h1></div><div class="top-act">${actions}</div></header>`;
}

/* ---------- router ---------- */
let cleanup = null, guard = null;
export const setGuard = fn => { guard = fn; };
async function route(){
  if(guard && !(await guard())){ history.replaceState(null, '', guard.hash); return; }
  guard = null;
  const [, name='prehled', ...rest] = (location.hash || '#/prehled').split('/');
  const r = ROUTES[name] || ROUTES.prehled;
  $$('#nav a[data-r], #tabbar a[data-r]').forEach(a => a.classList.toggle('on', a.dataset.r === (ROUTES[name] ? name : 'prehled')));
  document.body.classList.toggle('editing', name === 'blog' && rest.length > 0);
  document.title = `${r.t} · SFX Studio`;
  if(cleanup){ try{ cleanup(); }catch(e){} cleanup = null; }
  const main = $('#main'); main.innerHTML = '';
  try{
    const m = await r.load();
    cleanup = await m.render(main, rest.map(decodeURIComponent)) || null;
  }catch(e){ console.error(e); main.innerHTML = header('Chyba', 'něco se nepovedlo') + `<div class="card empty">${ic('alert')}<b>Stránku se nepodařilo načíst</b><p>${esc(e.message)}</p></div>`; }
  main.focus({preventScroll:true}); scrollTo(0,0);
}
window.addEventListener('hashchange', route);
window.addEventListener('beforeunload', e => { if(guard && guard.dirty && guard.dirty()){ e.preventDefault(); e.returnValue = ''; } });

/* ---------- boot ---------- */
/* full-screen card used for setting a password and connecting GitHub */
function card(title, text, fields, btn, onSubmit, foot=''){
  document.body.innerHTML = `<div class="atmo"></div><main class="login" style="grid-template-columns:1fr"><form id="cf">
    <a class="brand" href="./"><img src="../assets/img/logo.webp" alt="SFX production"><span>Studio</span></a>
    <h1>${title}</h1><p>${text}</p>${fields}<p class="err" role="alert"></p>
    <button class="btn gold" type="submit">${ic('key')}<span>${btn}</span></button>${foot}</form></main>`;
  $('#cf').addEventListener('submit', async e => { e.preventDefault(); const b = $('#cf button[type=submit]'); b.disabled = true;
    try{ await onSubmit(e.target); }catch(err){ $('#cf .err').textContent = err.message; b.disabled = false; } });
}
function passwordView(kind){
  card(kind === 'invite' ? 'Vítejte<br>v týmu.' : 'Nové<br>heslo.', 'Zvolte si heslo, kterým se budete do Studia přihlašovat.',
    `<label class="field"><span>Heslo (aspoň 10 znaků)</span><input class="in" type="password" name="p1" autocomplete="new-password" minlength="10" required></label>
     <label class="field"><span>Heslo znovu</span><input class="in" type="password" name="p2" autocomplete="new-password" minlength="10" required></label>`,
    'Uložit heslo', async f => { if(f.p1.value !== f.p2.value) throw new Error('Hesla se neshodují.'); await SB.setPassword(f.p1.value); history.replaceState(null, '', location.pathname + '#/prehled'); boot(); });
}
function githubView(){
  card('Připojte<br>GitHub.', 'Studio potřebuje jednou přístupový klíč k repozitáři webu. Uloží se do zabezpečené databáze a bude fungovat pro celý tým.',
    `<label class="field"><span>Přístupový klíč GitHub</span><input class="in" type="password" name="t" autocomplete="off" placeholder="github_pat_…" required></label>
     <details class="how"><summary>Kde klíč získám?</summary><ol>
      <li>Na GitHubu otevřete <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener" style="color:var(--gold)">Fine-grained tokens</a>.</li>
      <li>Repository access: <b>Only select repositories</b> → <b>${esc(CFG.repo)}</b>.</li>
      <li>Permissions: <b>Contents: Read and write</b>, <b>Actions: Read-only</b>.</li></ol></details>`,
    'Připojit', async f => { secrets.gh = f.t.value.trim();
      try{ const r = await GH.repo(); if(r.permissions && !r.permissions.push) throw new Error('Klíč nemá právo zapisovat (Contents: Read and write).'); }
      catch(e){ secrets.gh = ''; throw new Error(e.status === 401 ? 'Klíč je neplatný.' : e.message); }
      await SB.saveSecret('github_token', secrets.gh); boot(); },
    `<button class="btn ghost" type="button" onclick="document.getElementById('so').click()">Odhlásit se</button><button id="so" hidden></button>`);
  $('#so').addEventListener('click', async () => { await SB.signOut(); loginView(); });
}

async function boot(){
  if(SB.enabled()){
    const link = /type=(invite|recovery|signup)/.exec(location.hash) || /type=(invite|recovery|signup)/.exec(location.search);
    const err = /error_description=([^&]+)/.exec(location.hash);
    await SB.client();
    if(err){ history.replaceState(null, '', location.pathname); return loginView(decodeURIComponent(err[1].replace(/\+/g,' ')) + ' Požádejte o nový odkaz.'); }
    if(link){ await new Promise(r => setTimeout(r, 400)); if(await SB.session()) return passwordView(link[1] === 'recovery' ? 'recovery' : 'invite'); }
    const s = await SB.session(); if(!s) return loginView();
    if(!(await SB.isTeam())){ await SB.signOut(); return loginView('Tento účet nemá do Studia přístup. Požádejte správce, ať vás přidá do týmu.'); }
    if(!secrets.gh) await SB.loadSecrets().catch(()=>{});
    if(!secrets.gh) return githubView();
  }
  if(!secrets.gh) return loginView();
  try{
    const [me, repo] = await Promise.all([GH.me(), GH.repo()]);
    if(repo.permissions && !repo.permissions.push) throw Object.assign(new Error('Klíč nemá právo zapisovat do repozitáře. Zapněte Contents: Read and write.'), {status:403});
    Object.assign(user, {name: me.name || me.login, login: me.login, avatar: me.avatar_url});
  }catch(e){ secrets.gh = ''; if(SB.enabled()) return githubView(); return loginView(e.status===401 ? 'Klíč je neplatný nebo vypršel. Vložte nový.' : e.message); }
  shell(); route();
}
boot();
export { toast };
