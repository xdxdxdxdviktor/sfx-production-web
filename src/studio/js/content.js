/* SFX Studio — Obsah webu: ukázky, služby, stránky, reference, oblasti, kontakty. */
import { $, $$, esc, ic, toast, confirmBox, slugify } from './lib.js';
import { CFG, GH, assetUrl, deploys } from './api.js';
import { header, setGuard } from './main.js';
import { createForm, blank } from './forms.js';

/* schema = the Sveltia config (one source of truth for both consoles) */
let schemaP = null;
const schema = () => schemaP ||= fetch('../admin/config.yml', {cache:'no-store'}).then(r => r.text()).then(t => JSON.parse(t.replace(/^#.*\n/, '')));

const SECTIONS = [
  {k:'blog', t:'Blog', d:'Články a návody', icon:'pen', href:'#/blog'},
  {k:'portfolio', t:'Ukázky práce', d:'Videa v portfoliu a na úvodu', icon:'film'},
  {k:'services', t:'Služby', d:'Texty, fotky, technika, dotazy', icon:'image'},
  {k:'pages/home', t:'Úvodní stránka', d:'Nadpis, showreel, texty', icon:'home'},
  {k:'pages/about', t:'O nás', d:'Tým, fotky a kontakty', icon:'users'},
  {k:'references', t:'Reference', d:'Citáty klientů se souhlasem', icon:'quote'},
  {k:'regions', t:'Kde působíme', d:'Kraje a města (místní SEO)', icon:'globe'},
  {k:'pages/settings', t:'Kontakty a fakturace', d:'IČO, provozovna, měření', icon:'mail'},
];
const SINGULAR = {portfolio:'ukázku', references:'referenci'};
const cache = new Map();
async function loadCol(col, force=false){
  if(!force && cache.has(col.name) && Date.now() - cache.get(col.name).at < 60000) return cache.get(col.name).items;
  const files = (await GH.list(col.folder)).filter(f => f.name.endsWith('.json'));
  const items = await Promise.all(files.map(async f => ({...(await GH.readJSON(f.path)), _file: f.path})));
  const key = (col.sortable_fields || [])[0];
  items.sort((a,b) => key ? (Number(a[key]) || 999) - (Number(b[key]) || 999) : String(a.id).localeCompare(b.id));
  cache.set(col.name, {at:Date.now(), items}); return items;
}
const fileId = it => (it._file || '').split('/').pop().replace(/\.json$/, '') || it.id;
const tpl = (s, o) => String(s || '').replace(/\{\{([\w.]+)\}\}/g, (m, p) => p.split('.').reduce((a,k) => a == null ? '' : a[k], o) ?? '').trim();
const imgOf = (col, it) => { const f = (col.fields || []).find(x => x.widget === 'image'); return f && it[f.name] ? assetUrl(it[f.name]) : ''; };

export async function render(main, [colKey, id, sub]){
  if(!colKey) return hub(main);
  const sc = await schema();
  if(colKey === 'pages'){ const col = sc.collections.find(c => c.name === 'pages'); const file = col.files.find(f => f.name === id);
    if(!file) return notFound(main); return editor(main, sc, {...file, folder:null, isFile:true, parent:'pages'}, null); }
  const col = sc.collections.find(c => c.name === colKey && c.folder); if(!col) return notFound(main);
  if(id) return editor(main, sc, col, id === 'novy' ? null : id);
  return list(main, col);
}
function notFound(main){ main.innerHTML = header('Nenalezeno', 'obsah webu') + `<div class="card empty">${ic('alert')}<b>Tahle sekce neexistuje</b><a class="btn" href="#/obsah">${ic('back')}Obsah webu</a></div>`; }

/* ---------- hub ---------- */
function hub(main){
  main.innerHTML = header('Obsah <em>webu</em>', 'co se na webu ukazuje') + `<div class="hub fadein">${SECTIONS.map((s,i) => `<a class="hub-c" href="${s.href || '#/obsah/' + s.k}">
    <span class="hub-i">${ic(s.icon)}</span><div><b>${s.t}</b><small>${s.d}</small></div><i>${String(i+1).padStart(2,'0')}</i></a>`).join('')}</div>
    <p class="muted" style="font-size:13px;margin-top:22px">Každá uložená změna se na webu objeví zhruba do dvou minut. Starší administrace zůstává jako záloha na <a href="../admin/" style="color:var(--gold)">/admin/</a>.</p>`;
}

/* ---------- list ---------- */
async function list(main, col){
  const add = col.create ? `<a class="btn gold" href="#/obsah/${col.name}/novy">${ic('plus')}<span>Přidat ${SINGULAR[col.name] || 'položku'}</span></a>` : '';
  main.innerHTML = header(esc(col.label), (col.description || '').split('.')[0].toLowerCase() || 'obsah webu', `<a class="btn ghost" href="#/obsah">${ic('back')}<span>Obsah webu</span></a>${add}`) +
    `<div id="lst"><div class="skel" style="height:300px;border-radius:20px"></div></div>`;
  let items; try{ items = await loadCol(col); }catch(e){ $('#lst').innerHTML = `<div class="card empty">${ic('alert')}<b>Nenačetlo se</b><span>${esc(e.message)}</span></div>`; return; }
  if(col.description) $('#lst').insertAdjacentHTML('beforebegin', `<p class="muted" style="margin:-8px 0 18px;max-width:70ch">${esc(col.description)}</p>`);
  const tags = it => [it.published === false ? '<span class="tag draft">Skryto</span>' : (it.published === true ? '<span class="tag live">Na webu</span>' : ''), it.featured ? '<span class="tag plan">Na úvodu</span>' : ''].join('');
  if(col.name === 'portfolio'){
    $('#lst').innerHTML = `<div class="wgrid">${items.map(it => `<a class="wcard${it.vertical?' v':''}" href="#/obsah/${col.name}/${encodeURIComponent(fileId(it))}">
      <div class="wimg">${it.poster ? `<img src="${esc(assetUrl(it.poster))}" alt="" loading="lazy">` : ''}<div class="wtags">${tags(it)}</div><i class="wnum">${String(it.order||'').padStart(2,'0')}</i></div>
      <div class="wb"><b>${esc(it.cs?.t || it.id)}</b><small>${esc([it.place, it.client].filter(Boolean).join(' · '))}</small></div></a>`).join('')}</div>`;
  } else {
    $('#lst').innerHTML = `<div class="rows">${items.map(it => { const img = imgOf(col, it);
      return `<a class="rowc" href="#/obsah/${col.name}/${encodeURIComponent(fileId(it))}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `<span class="hub-i">${ic('text')}</span>`}
        <div><b>${esc(tpl(col.summary, it) || it.cs?.role || it.id)}</b><small>${esc(it.cs?.lead || it.cs?.quote || it.place || it.id).slice(0,140)}</small></div><span class="rtags">${tags(it)}</span>${ic('back','chev')}</a>`; }).join('') || `<div class="card empty">${ic('plus')}<b>Zatím prázdné</b></div>`}</div>`;
  }
}

/* ---------- editor ---------- */
async function editor(main, sc, col, id){
  const isNew = !col.isFile && !id;
  const back = col.isFile ? '#/obsah' : `#/obsah/${col.name}`;
  main.innerHTML = header(esc(col.label), 'načítám…') + `<div class="card"><div class="skel" style="height:420px"></div></div>`;
  let data, path;
  try{
    if(col.isFile){ path = col.file; data = await GH.readJSON(path); }
    else if(id){ path = `${col.folder}/${id}.json`; data = await GH.readJSON(path); }
    else { data = blank(col.fields); if('published' in data && data.published === '') data.published = false; if('order' in data){ const it = await loadCol(col).catch(() => []); data.order = (Math.max(0, ...it.map(x => Number(x.order) || 0)) + 1); } }
  }catch(e){ main.innerHTML = header('Nenalezeno', col.label) + `<div class="card empty">${ic('alert')}<b>${esc(e.message)}</b><a class="btn" href="${back}">${ic('back')}Zpět</a></div>`; return; }
  delete data._file;

  /* relation options (e.g. reference → portfolio project) */
  const relations = {};
  const rel = []; (function walk(fs){ for(const f of fs || []){ if(f.widget === 'relation') rel.push(f.collection); walk(f.fields); } })(col.fields);
  for(const r of rel){ const rc = sc.collections.find(c => c.name === r); if(rc) relations[r] = (await loadCol(rc).catch(() => [])).map(x => [x.id, x.cs?.t || x.id]); }

  const title = () => tpl(col.summary, data) || data.cs?.t || data.name || data.cs?.role || data.id || col.label;
  const live = !col.isFile && data.slug?.cs && col.name === 'services' ? `${CFG.site}/sluzby/${data.slug.cs}/` : col.name === 'regions' && data.slug?.cs ? `${CFG.site}/kde-pusobime/${data.slug.cs}/` : col.name === 'portfolio' ? `${CFG.site}/ukazky/` : col.isFile && col.name === 'home' ? `${CFG.site}/` : '';
  main.innerHTML = header(isNew ? `Nová <em>${esc(SINGULAR[col.name] || 'položka')}</em>` : esc(title()), isNew ? col.label : (col.isFile ? 'stránky a nastavení' : col.label),
    `<a class="btn ghost" href="${back}">${ic('back')}<span>${col.isFile ? 'Obsah webu' : esc(col.label)}</span></a>${live ? `<a class="btn" href="${esc(live)}" target="_blank" rel="noopener">${ic('ext')}<span>Na webu</span></a>` : ''}`) + `
    <div class="ced"><div class="card cform" id="cform"></div>
      ${!col.isFile && !isNew && col.delete ? `<button class="btn danger" id="cdel" style="margin-top:16px">${ic('trash')}<span>Smazat</span></button>` : ''}</div>
    <div class="ed-actions"><span class="st" id="st">Uloženo</span><div style="display:flex;gap:10px"><a class="btn ghost" href="${back}">Zavřít</a><button class="btn gold" id="csave">${ic('rocket')}<span>${isNew ? 'Vytvořit' : 'Uložit a nasadit'}</span></button></div></div>`;
  const h1 = $('.title h1', main); if(h1 && h1.textContent.length > 28) h1.classList.add('long');
  document.body.classList.add('editing');

  let dirty = false, saving = false;
  const form = createForm($('#cform'), col.fields, data, {relations, onChange(){ if(!dirty){ dirty = true; $('#st').textContent = 'Neuložené změny'; $('#st').classList.add('dirty'); } }});

  const save = async () => {
    if(saving) return;
    let fid = id;
    if(isNew){
      fid = slugify(data.id || data.cs?.t || data.name || data.company || '');
      if(!fid){ toast('Vyplňte prosím název, z něj se vytvoří identifikátor.', 'err'); return; }
      data.id = fid;
      if((await loadCol(col, true)).some(x => x.id === fid)){ toast(`Položka „${fid}“ už existuje. Změňte název nebo identifikátor.`, 'err'); return; }
      path = `${col.folder}/${fid}.json`;
    }
    const idf = col.fields.find(f => f.name === 'id' && f.pattern); if(idf && data.id && !new RegExp(idf.pattern[0]).test(data.id)){ toast('Identifikátor: ' + idf.pattern[1], 'err'); return; }
    saving = true; const btn = $('#csave'); btn.disabled = true; btn.innerHTML = '<span class="spin"></span><span>Ukládám…</span>';
    try{
      await GH.commit([{path, text: JSON.stringify(data, null, 2) + '\n'}, ...form.files()], `${isNew ? 'Nové' : 'Úprava'}: ${col.label} – ${title()}`);
      form.clear(); dirty = false; cache.delete(col.name); $('#st').textContent = 'Uloženo, nasazuji…'; $('#st').classList.remove('dirty');
      deploys.expect(); track();
      if(isNew){ setGuard(null); location.hash = `#/obsah/${col.name}/${fid}`; return; }
    }catch(e){ toast('Uložení se nepovedlo: ' + esc(e.message), 'err', 8000); }
    saving = false; btn.disabled = false; btn.innerHTML = `${ic('rocket')}<span>Uložit a nasadit</span>`;
  };
  $('#csave').addEventListener('click', save);
  const key = e => { if((e.metaKey || e.ctrlKey) && e.key === 's'){ e.preventDefault(); save(); } };
  document.addEventListener('keydown', key);
  $('#cdel') && $('#cdel').addEventListener('click', async () => {
    if(!await confirmBox({title:'Smazat?', text:`„${title()}“ zmizí z webu. V historii na GitHubu zůstane a dá se obnovit.`, ok:'Smazat', danger:true})) return;
    try{ await GH.commit([{path, delete:true}], `Smazáno: ${col.label} – ${title()}`); cache.delete(col.name); dirty = false; deploys.expect(); toast('Smazáno. Z webu zmizí do dvou minut.'); location.hash = back; }
    catch(e){ toast('Smazání se nepovedlo: ' + esc(e.message), 'err'); }
  });
  const guard = async () => !dirty || await confirmBox({title:'Odejít bez uložení?', text:'Máte neuložené změny. Když odejdete, ztratí se.', ok:'Odejít', danger:true});
  guard.dirty = () => dirty; guard.hash = location.hash; setGuard(guard);
  return () => { document.removeEventListener('keydown', key); };
}

function track(){
  const t = toast('Uloženo. Web se teď sestavuje…', 'busy', 0), start = Date.now();
  const off = deploys.on(runs => {
    const r = runs.find(x => new Date(x.created_at) >= new Date(start - 30000)); if(!r) return;
    if(r.status !== 'completed') t.set(`Nasazuji na web… <span class="muted">${Math.round((Date.now()-start)/1000)} s</span>`);
    else { t.set(r.conclusion === 'success' ? 'Hotovo, změna je na webu.' : 'Nasazení selhalo. Podívejte se na GitHub.'); if(r.conclusion !== 'success') t.el.classList.add('err');
      const st = $('#st'); if(st) st.textContent = r.conclusion === 'success' ? 'Na webu' : 'Chyba nasazení'; setTimeout(t.close, 8000); off(); }
  });
}
