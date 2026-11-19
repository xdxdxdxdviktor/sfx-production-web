/* SFX Studio — Poptávky (Supabase): tabule se stavy, detail, poznámky, kdo ji má na starosti. */
import { $, $$, esc, ic, toast, confirmBox, ago, fmtDate } from './lib.js';
import { SB } from './api.js';
import { header, user } from './main.js';

const COLS = [['new','Nové','#e2493a'],['progress','Řeší se','#e8b45c'],['offer','Nabídka odeslaná','#8fb3e8'],['won','Hotovo','#7fc79a']];
const TEAM = [['jirka','Jirka','JH'],['jaroslav','Jaroslav','JL']];
const initials = k => (TEAM.find(t=>t[0]===k)||[])[2] || '';

export async function render(main){
  main.innerHTML = header('Poptávky', 'od klientů z webu', SB.enabled() ? `<label class="switch"><input type="checkbox" id="arch"><i></i><span>Archiv</span></label><button class="btn" id="rl">${ic('refresh')}<span>Obnovit</span></button>` : '');
  if(!SB.enabled()){
    main.insertAdjacentHTML('beforeend', `<div class="card empty fadein" style="padding:60px 24px">${ic('inbox')}<b>Poptávky zatím chodí jen e-mailem</b>
      <span style="max-width:58ch">Po zapnutí databáze se každá poptávka z webu uloží i sem. Uvidíte je na tabuli podle stavu (nová → řeší se → nabídka → hotovo), přidáte poznámky a určíte, kdo ji má na starosti. E-mailem budou chodit dál.</span></div>`);
    return;
  }
  main.insertAdjacentHTML('beforeend', `<div class="mseg" id="mseg" role="tablist">${COLS.map(([k,t,c],i)=>`<button data-c="${k}" style="--c:${c}" aria-pressed="${i===0}"><span>${t}</span><b>0</b></button>`).join('')}</div>`);
  main.insertAdjacentHTML('beforeend', `<div class="board fadein" id="board">${COLS.map(([k,t,c])=>`<section class="col" data-col="${k}" style="--c:${c}"><div class="col-h"><span>${t}</span><i>0</i></div></section>`).join('')}</div>`);
  let leads = [], showArch = false, curCol = 'new';
  const draw = () => {
    for(const [k] of COLS){
      const col = $(`[data-col="${k}"]`), list = leads.filter(l => (l.status||'new') === k && !!l.archived === showArch);
      $('.col-h i', col).textContent = list.length; const mb = $(`#mseg [data-c="${k}"] b`); if(mb) mb.textContent = list.length;
      col.classList.toggle('cur', k === curCol);
      $$('.lc, .empty', col).forEach(x => x.remove());
      col.insertAdjacentHTML('beforeend', list.length ? list.map(card).join('') : `<p class="muted empty" style="padding:20px 8px;font-size:13px">${k==='new' ? 'Žádné nové poptávky' : 'Přetáhněte sem kartu'}</p>`);
    }
  };
  const card = l => `<article class="lc" draggable="true" data-id="${l.id}" tabindex="0"><b>${esc(l.name || 'Bez jména')}</b><small>${esc(l.company || l.email || '')}</small>
    <p>${esc(l.services_label || '')}${l.location ? ' · ' + esc(l.location) : ''}</p><div class="ft"><time>${ago(l.created_at)}</time>${l.assignee ? `<span class="who" title="${esc(l.assignee)}">${initials(l.assignee)}</span>` : ''}</div></article>`;
  const load = async () => { try{ leads = await SB.leads(); draw(); }catch(e){ $('#board').innerHTML = `<div class="card empty" style="grid-column:1/-1">${ic('alert')}<b>Poptávky se nenačetly</b><span>${esc(e.message)}</span></div>`; } };
  await load();
  $('#rl').addEventListener('click', load);
  $('#mseg').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if(!b) return; curCol = b.dataset.c; $$('#mseg button').forEach(x => x.setAttribute('aria-pressed', x===b)); draw(); });
  $('#arch').addEventListener('change', e => { showArch = e.target.checked; draw(); });

  /* drag & drop between columns */
  let dragId = null;
  const board = $('#board');
  board.addEventListener('dragstart', e => { const c = e.target.closest('.lc'); if(!c) return; dragId = c.dataset.id; c.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; });
  board.addEventListener('dragend', e => { e.target.closest?.('.lc')?.classList.remove('drag'); $$('.col').forEach(c => c.classList.remove('over')); });
  board.addEventListener('dragover', e => { const col = e.target.closest('.col'); if(!col) return; e.preventDefault(); $$('.col').forEach(c => c.classList.toggle('over', c===col)); });
  board.addEventListener('drop', async e => { const col = e.target.closest('.col'); if(!col || !dragId) return; e.preventDefault();
    const l = leads.find(x => x.id === dragId); const to = col.dataset.col; dragId = null; $$('.col').forEach(c => c.classList.remove('over'));
    if(!l || l.status === to) return; const from = l.status; l.status = to; draw();
    try{ await SB.updateLead(l.id, {status:to}); }catch(err){ l.status = from; draw(); toast('Změna se neuložila: ' + esc(err.message), 'err'); } });
  board.addEventListener('click', e => { const c = e.target.closest('.lc'); if(c) open(leads.find(x => x.id === c.dataset.id)); });
  board.addEventListener('keydown', e => { const c = e.target.closest('.lc'); if(c && e.key==='Enter') open(leads.find(x => x.id === c.dataset.id)); });

  /* detail drawer */
  const open = l => {
    if(!l) return;
    const d = document.createElement('div'); d.className = 'drawer';
    const notes = Array.isArray(l.notes) ? l.notes : [];
    d.innerHTML = `<div role="dialog" aria-modal="true" aria-label="Poptávka">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px"><div><span class="tag ${l.status==='new'?'rec':l.status==='won'?'live':l.status==='offer'?'plan':'warn'}">${esc((COLS.find(c=>c[0]===l.status)||COLS[0])[1])}</span>
        <h2 style="font:900 40px/.95 var(--display);text-transform:uppercase;margin:14px 0 4px">${esc(l.name||'Bez jména')}</h2><p class="muted" style="margin:0">${esc(l.company||'')} · ${esc(fmtDate(l.created_at))} · č. ${esc(l.ref_code||'')}</p></div>
        <button class="btn icon ghost" data-x aria-label="Zavřít">${ic('x')}</button></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">
        ${l.email ? `<a class="btn gold sm" href="mailto:${esc(l.email)}?subject=${encodeURIComponent('Re: poptávka ' + (l.ref_code||''))}">${ic('mail')}<span>Odpovědět</span></a>` : ''}
        ${l.phone ? `<a class="btn sm" href="tel:${esc(l.phone.replace(/\s/g,''))}">${ic('phone')}<span>${esc(l.phone)}</span></a>` : ''}</div>
      <dl class="dl">
        <dt>Služby</dt><dd>${esc(l.services_label||'—')}</dd><dt>Termín</dt><dd>${esc(l.date||'—')}${l.flexible?' (flexibilní)':''}</dd>
        <dt>Místo</dt><dd>${esc(l.location||'—')}</dd><dt>Rozpočet</dt><dd>${esc(l.budget||'—')}</dd>
        <dt>E-mail</dt><dd>${esc(l.email||'—')}</dd><dt>Telefon</dt><dd>${esc(l.phone||'—')}${l.call_time?` (${esc(l.call_time)})`:''}</dd>
        <dt>Jazyk</dt><dd>${l.lang==='en'?'angličtina':'čeština'}</dd></dl>
      <div class="card" style="padding:16px;white-space:pre-wrap;font-size:14.5px">${esc(l.description||'')}</div>
      <div class="grid" style="grid-template-columns:1fr 1fr;margin-top:18px">
        <label class="field"><span>Stav</span><select class="sel" id="dS">${COLS.map(([k,t])=>`<option value="${k}"${l.status===k?' selected':''}>${t}</option>`).join('')}</select></label>
        <label class="field"><span>Má na starosti</span><select class="sel" id="dA"><option value="">Nikdo</option>${TEAM.map(([k,t])=>`<option value="${k}"${l.assignee===k?' selected':''}>${t}</option>`).join('')}</select></label></div>
      <h3 style="font:800 20px var(--display);text-transform:uppercase;letter-spacing:.04em;margin:26px 0 0">Poznámky</h3>
      <div class="notes" id="dN">${notes.map(n=>`<div class="note"><small>${esc(n.by)} · ${esc(ago(n.at))}</small>${esc(n.text)}</div>`).join('') || '<p class="muted" style="margin:0">Zatím žádné poznámky.</p>'}</div>
      <textarea class="ta" id="dT" rows="3" placeholder="Např. volal jsem, pošlu nabídku do pátku…"></textarea>
      <div style="display:flex;justify-content:space-between;gap:10px;margin-top:12px">
        <button class="btn sm ghost" id="dArch">${l.archived ? 'Vrátit z archivu' : 'Archivovat'}</button>
        <div style="display:flex;gap:8px"><button class="btn sm danger" id="dDel">${ic('trash')}</button><button class="btn sm gold" id="dAdd">${ic('plus')}<span>Přidat poznámku</span></button></div></div>
    </div>`;
    const close = () => { d.remove(); document.removeEventListener('keydown', k); };
    const k = e => { if(e.key==='Escape') close(); };
    document.addEventListener('keydown', k);
    d.addEventListener('click', e => { if(e.target===d || e.target.closest('[data-x]')) close(); });
    const upd = async patch => { Object.assign(l, patch); draw(); try{ await SB.updateLead(l.id, patch); }catch(err){ toast('Neuloženo: ' + esc(err.message), 'err'); } };
    $('#dS', d).addEventListener('change', e => upd({status:e.target.value}));
    $('#dA', d).addEventListener('change', e => upd({assignee:e.target.value || null}));
    $('#dArch', d).addEventListener('click', () => { upd({archived:!l.archived}); close(); toast(l.archived ? 'Poptávka je v archivu.' : 'Poptávka je zpět na tabuli.'); });
    $('#dAdd', d).addEventListener('click', async () => { const t = $('#dT', d).value.trim(); if(!t) return;
      const n = [...notes, {by:user.name || user.login, at:new Date().toISOString(), text:t}]; await upd({notes:n}); close(); open(l); });
    $('#dDel', d).addEventListener('click', async () => { if(!await confirmBox({title:'Smazat poptávku?', text:'Smaže se natrvalo i s poznámkami. E-mail s poptávkou vám zůstane.', ok:'Smazat', danger:true})) return;
      try{ await SB.deleteLead(l.id); leads = leads.filter(x => x !== l); draw(); close(); toast('Poptávka je smazaná.'); }catch(err){ toast('Nesmazáno: ' + esc(err.message), 'err'); } });
    document.body.appendChild(d); $('[data-x]', d).focus();
  };
}
