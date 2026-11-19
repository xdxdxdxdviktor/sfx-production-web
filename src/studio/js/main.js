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
      <label class="field"><span>E-mail</span><input class="in" type="email" name="email" autocomplete="username" required></label>
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
      <p class="help">Starší administrace: <a href="../admin/">Sveltia CMS</a> · <a href="../">Zpět na web</a></p>
    </form>
  </main>`;
  $('#lf').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target, btn = $('button[type=submit]', f); btn.disabled = true; btn.innerHTML = '<span class="spin"></span><span>Ověřuji…</span>';
    try{
      if(sb){ await SB.signIn(f.email.value.trim(), f.password.value); await SB.loadSecrets(); }
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
      <div class="mbar"><button class="btn sm icon ghost" id="menuBtn" aria-label="Menu">${ic('menu')}</button><img src="../assets/img/logo.webp" alt="SFX"><span class="muted" style="font:600 12px var(--mono)" data-tc></span></div>
      <main class="main" id="main" tabindex="-1"></main>
    </div>
  </div>`;
  $('#logout').addEventListener('click', async () => { secrets.gh = ''; secrets.umami = SB.enabled() ? '' : secrets.umami; await SB.signOut(); location.hash = ''; loginView(); });
  $('#menuBtn').addEventListener('click', () => $('#app').classList.toggle('menu'));
  $('#nav').addEventListener('click', e => { if(e.target.closest('a')) $('#app').classList.remove('menu'); });
  deploys.on(runs => {
    const p = $('#dpill'); if(!p) return; const r = runs[0];
    p.classList.remove('busy','fail');
    if(!r){ $('b',p).textContent = 'Stav nasazení'; $(':scope>div>span',p).textContent = 'nedostupný'; return; }
    if(r.status !== 'completed'){ p.classList.add('busy'); $('b',p).textContent = 'Nasazuje se…'; $(':scope>div>span',p).textContent = 'změna bude na webu do 2 min'; }
    else if(r.conclusion !== 'success'){ p.classList.add('fail'); $('b',p).textContent = 'Nasazení selhalo'; $(':scope>div>span',p).textContent = ago(r.updated_at); }
    else { $('b',p).textContent = 'Web je aktuální'; $(':scope>div>span',p).textContent = 'nasazeno ' + ago(r.updated_at); }
  });
  deploys.refresh();
  if(SB.enabled()) SB.newCount().then(n => { const b = $('#leadBadge'); if(b && n){ b.hidden = false; b.textContent = n; } });
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
  $$('#nav a[data-r]').forEach(a => a.classList.toggle('on', a.dataset.r === (ROUTES[name] ? name : 'prehled')));
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
async function boot(){
  if(SB.enabled()){ const s = await SB.session(); if(!s) return loginView(); if(!secrets.gh) await SB.loadSecrets().catch(()=>{}); }
  if(!secrets.gh) return loginView();
  try{
    const [me, repo] = await Promise.all([GH.me(), GH.repo()]);
    if(repo.permissions && !repo.permissions.push) throw Object.assign(new Error('Klíč nemá právo zapisovat do repozitáře. Zapněte Contents: Read and write.'), {status:403});
    Object.assign(user, {name: me.name || me.login, login: me.login, avatar: me.avatar_url});
  }catch(e){ if(!SB.enabled()) secrets.gh = ''; return loginView(e.status===401 ? 'Klíč je neplatný nebo vypršel. Vložte nový.' : e.message); }
  shell(); route();
}
boot();
export { toast };
