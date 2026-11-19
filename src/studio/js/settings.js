/* SFX Studio — Nastavení: připojení služeb a oslovení. */
import { $, esc, ic, toast, store } from './lib.js';
import { CFG, GH, UM, SB, secrets } from './api.js';
import { header, user, callName } from './main.js';

export async function render(main){
  const sb = SB.enabled();
  main.innerHTML = header('Nastavení', 'připojení a účet') + `<div class="grid g-12 fadein">
    <section class="card span-6"><div class="card-h"><h2>Umami · statistiky</h2><span class="tag ${UM.ready()?'live':'draft'}" id="uTag">${UM.ready()?'Připojeno':'Nepřipojeno'}</span></div>
      <p class="muted" style="margin:0 0 16px">Návštěvnost se měří bez cookies. Pro zobrazení tady vytvořte v Umami klíč: <b>cloud.umami.is → Settings → API keys → Create key</b>.</p>
      <label class="field"><span>API klíč Umami</span><input class="in" id="uKey" type="password" autocomplete="off" value="${esc(secrets.umami)}" placeholder="api_…"></label>
      <div style="display:flex;gap:10px;margin-top:14px"><button class="btn gold" id="uSave">${ic('check')}<span>Uložit a ověřit</span></button>${secrets.umami?`<button class="btn ghost" id="uDel">Odebrat</button>`:''}</div>
      <p class="muted" style="font-size:12.5px;margin:14px 0 0">${sb ? 'Klíč se uloží do zabezpečené databáze, uvidí ho jen přihlášení členové týmu.' : 'Klíč zůstane uložený jen v tomto prohlížeči.'}</p></section>
    <section class="card span-6"><div class="card-h"><h2>GitHub · obsah webu</h2><span class="tag live">Připojeno</span></div>
      <dl class="dl" style="margin:0"><dt>Účet</dt><dd>${esc(user.name)} (@${esc(user.login)})</dd><dt>Repozitář</dt><dd><a href="https://github.com/${esc(CFG.repo)}" target="_blank" rel="noopener" style="color:var(--gold)">${esc(CFG.repo)}</a></dd><dt>Web</dt><dd><a href="${esc(CFG.site)}" target="_blank" rel="noopener" style="color:var(--gold)">${esc(CFG.site.replace(/^https?:\/\//,''))}</a></dd></dl>
      ${sb ? `<label class="field" style="margin-top:16px"><span>Nový přístupový klíč GitHub (pro celý tým)</span><input class="in" id="gKey" type="password" autocomplete="off" placeholder="github_pat_…"></label><button class="btn" id="gSave" style="margin-top:12px">${ic('key')}<span>Uložit klíč</span></button>` : ''}</section>
    <section class="card span-6"><div class="card-h"><h2>Oslovení</h2></div>
      <label class="field"><span>Jak vás má Studio oslovovat</span><input class="in" id="cName" value="${esc(callName())}"></label>
      <button class="btn" id="cSave" style="margin-top:12px">${ic('check')}<span>Uložit</span></button></section>
    <section class="card span-6"><div class="card-h"><h2>Poptávky · databáze</h2><span class="tag ${sb?'live':'draft'}">${sb?'Zapnuto':'Vypnuto'}</span></div>
      <p class="muted" style="margin:0">${sb ? 'Poptávky z formuláře se ukládají do databáze Supabase a zároveň chodí e-mailem.' : 'Poptávky zatím chodí jen e-mailem. Databázi zapne správce webu, pak se tu objeví přihlášení e-mailem a heslem pro celý tým.'}</p></section>
  </div>`;
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
