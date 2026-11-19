/* SFX Studio — Nastavení: připojení služeb a oslovení. */
import { $, esc, ic, toast, store, confirmBox } from './lib.js';
import { CFG, GH, UM, SB, secrets } from './api.js';
import { header, user, ghUser, callName } from './main.js';

export async function render(main){
  const sb = SB.enabled();
  main.innerHTML = header('Nastavení', 'připojení a účet') + `<div class="grid g-12 fadein">
    <section class="card span-6"><div class="card-h"><h2>Umami · statistiky</h2><span class="tag ${UM.ready()?'live':'draft'}" id="uTag">${UM.ready()?'Připojeno':'Nepřipojeno'}</span></div>
      <p class="muted" style="margin:0 0 16px">Návštěvnost se měří bez cookies. Pro zobrazení tady vytvořte v Umami klíč: <b>cloud.umami.is → Settings → API keys → Create key</b>.</p>
      <label class="field"><span>API klíč Umami</span><input class="in" id="uKey" type="password" autocomplete="off" value="${esc(secrets.umami)}" placeholder="api_…"></label>
      <div style="display:flex;gap:10px;margin-top:14px"><button class="btn gold" id="uSave">${ic('check')}<span>Uložit a ověřit</span></button>${secrets.umami?`<button class="btn ghost" id="uDel">Odebrat</button>`:''}</div>
      <p class="muted" style="font-size:12.5px;margin:14px 0 0">${sb ? 'Klíč se uloží do zabezpečené databáze, uvidí ho jen přihlášení členové týmu.' : 'Klíč zůstane uložený jen v tomto prohlížeči.'}</p></section>
    <section class="card span-6"><div class="card-h"><h2>GitHub · obsah webu</h2><span class="tag live">Připojeno</span></div>
      <dl class="dl" style="margin:0"><dt>Přihlášený</dt><dd>${esc(user.name)} · ${esc(user.login)}</dd><dt>Ukládá přes</dt><dd>${esc(ghUser.name)} (@${esc(ghUser.login)})</dd><dt>Repozitář</dt><dd><a href="https://github.com/${esc(CFG.repo)}" target="_blank" rel="noopener" style="color:var(--gold)">${esc(CFG.repo)}</a></dd><dt>Web</dt><dd><a href="${esc(CFG.site)}" target="_blank" rel="noopener" style="color:var(--gold)">${esc(CFG.site.replace(/^https?:\/\//,''))}</a></dd></dl>
      ${sb ? `<label class="field" style="margin-top:16px"><span>Nový přístupový klíč GitHub (pro celý tým)</span><input class="in" id="gKey" type="password" autocomplete="off" placeholder="github_pat_…"></label><button class="btn" id="gSave" style="margin-top:12px">${ic('key')}<span>Uložit klíč</span></button>` : ''}</section>
    <section class="card span-6"><div class="card-h"><h2>Oslovení</h2></div>
      <label class="field"><span>Jak vás má Studio oslovovat</span><input class="in" id="cName" value="${esc(callName())}"></label>
      <button class="btn" id="cSave" style="margin-top:12px">${ic('check')}<span>Uložit</span></button></section>
    <section class="card span-6"><div class="card-h"><h2>Poptávky · databáze</h2><span class="tag ${sb?'live':'draft'}">${sb?'Zapnuto':'Vypnuto'}</span></div>
      <p class="muted" style="margin:0">${sb ? 'Poptávky z formuláře se ukládají do databáze Supabase a zároveň chodí e-mailem.' : 'Poptávky zatím chodí jen e-mailem. Databázi zapne správce webu, pak se tu objeví přihlášení e-mailem a heslem pro celý tým.'}</p></section>
    ${sb ? `<section class="card span-12"><div class="card-h"><h2>Tým · kdo má přístup</h2><span class="muted" id="tCount"></span></div>
      <p class="muted" style="margin:0 0 14px">Do Studia se dostanou jen e-maily z tohoto seznamu. Nového člověka přidejte sem a pak mu v Supabase pošlete pozvánku (Authentication → Users → Invite user) na stejný e-mail.</p>
      <ul class="timeline" id="tList"><li><div class="skel" style="height:30px;grid-column:1/-1"></div></li></ul>
      <form id="tAdd" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><input class="in" type="email" name="em" placeholder="email@kolegy.cz" required style="flex:1;min-width:200px"><input class="in" name="nm" placeholder="Jméno" style="flex:0 1 180px"><button class="btn gold" type="submit">${ic('plus')}<span>Přidat do týmu</span></button></form></section>` : ''}
  </div>`;
  if(sb){
    const me = (await SB.user())?.email?.toLowerCase();
    const drawTeam = async () => {
      const c = await SB.client(); const {data, error} = await c.from('team').select('email,name,created_at').order('created_at');
      if(error){ $('#tList').innerHTML = `<li><span class="muted" style="grid-column:1/-1">${esc(error.message)}</span></li>`; return; }
      $('#tCount').textContent = `${data.length} ${data.length === 1 ? 'člověk' : data.length < 5 ? 'lidé' : 'lidí'}`;
      $('#tList').innerHTML = data.map(m => `<li><span class="av" style="display:grid;place-items:center;font-weight:700;color:var(--gold)">${esc((m.name||m.email)[0].toUpperCase())}</span>
        <div><b>${esc(m.name || m.email.split('@')[0])}${m.email === me ? ' <span class="muted">(vy)</span>' : ''}</b><small>${esc(m.email)}</small></div>
        ${m.email === me ? '<span></span>' : `<button class="btn sm ghost" data-rm="${esc(m.email)}" aria-label="Odebrat ${esc(m.email)}">${ic('trash')}</button>`}</li>`).join('');
    };
    drawTeam();
    $('#tAdd').addEventListener('submit', async e => { e.preventDefault(); const f = e.target, em = f.em.value.trim().toLowerCase();
      const c = await SB.client(); const {error} = await c.from('team').insert({email:em, name:f.nm.value.trim() || null});
      if(error) return toast(error.code === '23505' ? 'Tento e-mail už v týmu je.' : 'Nepřidáno: ' + esc(error.message), 'err');
      f.reset(); drawTeam(); toast(`${esc(em)} je v týmu. Teď mu v Supabase pošlete pozvánku.`); });
    $('#tList').addEventListener('click', async e => { const b = e.target.closest('[data-rm]'); if(!b) return;
      if(!await confirmBox({title:'Odebrat z týmu?', text:`${b.dataset.rm} se už do Studia nepřihlásí.`, ok:'Odebrat', danger:true})) return;
      const c = await SB.client(); const {error} = await c.from('team').delete().eq('email', b.dataset.rm);
      if(error) return toast('Neodebráno: ' + esc(error.message), 'err'); drawTeam(); toast('Odebráno.'); });
  }
  $('#uSave').addEventListener('click', async () => {
    const v = $('#uKey').value.trim(); const old = secrets.umami; secrets.umami = v;
    try{ await UM.active(); if(sb) await SB.saveSecret('umami_key', v); $('#uTag').className = 'tag live'; $('#uTag').textContent = 'Připojeno'; toast('Umami je připojené. Statistiky najdete v menu.'); }
    catch(e){ secrets.umami = old; toast(e.status===401 ? 'Klíč nesedí. Zkopírujte ho z Umami znovu.' : 'Ověření se nepovedlo: ' + esc(e.message), 'err'); }
  });
  $('#uDel') && $('#uDel').addEventListener('click', async () => { secrets.umami = ''; if(sb) await SB.saveSecret('umami_key', ''); render(main); toast('Klíč k Umami je odebraný.'); });
  $('#gSave') && $('#gSave').addEventListener('click', async () => { const v = $('#gKey').value.trim(); if(!v) return; const old = secrets.gh; secrets.gh = v;
    try{ await GH.repo(); await SB.saveSecret('github_token', v); toast('Klíč je uložený pro celý tým.'); }catch(e){ secrets.gh = old; toast('Klíč nefunguje: ' + esc(e.message), 'err'); } });
  $('#cSave').addEventListener('click', () => { store.set('studio-callname', $('#cName').value.trim()); toast('Uloženo.'); });
}
