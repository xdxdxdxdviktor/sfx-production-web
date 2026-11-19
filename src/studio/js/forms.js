/* SFX Studio — form engine. Builds editors from the same field definitions the Sveltia console uses
   (src/admin/cms-config.mjs → /admin/config.yml), so both consoles always write the same JSON. */
import { $, $$, esc, ic, toast, markdown, slugify, toWebp, blobToB64 } from './lib.js';
import { assetUrl } from './api.js';

const isLang = f => (f.name === 'cs' || f.name === 'en') && f.widget === 'object';
const getAt = (o, p) => p.reduce((a, k) => a == null ? a : a[k], o);
function setAt(o, p, v){ let a = o; for(let i=0;i<p.length-1;i++){ const k = p[i]; if(a[k] == null || typeof a[k] !== 'object') a[k] = typeof p[i+1] === 'number' ? [] : {}; a = a[k]; } a[p[p.length-1]] = v; }
const enc = p => esc(JSON.stringify(p));
const dec = s => JSON.parse(s);
const optList = f => (f.options || []).map(o => typeof o === 'object' ? [o.value, o.label] : [o, o]);
const label = f => esc(f.label || f.name);
const hint = f => f.hint ? `<small class="hint">${esc(f.hint)}</small>` : '';

/* default value for a new item / list entry */
export function blank(fields){
  const o = {};
  for(const f of fields || []){
    if(f.default !== undefined) o[f.name] = structuredClone(f.default);
    else if(f.widget === 'object') o[f.name] = blank(f.fields);
    else if(f.widget === 'list') o[f.name] = [];
    else if(f.widget === 'boolean') o[f.name] = false;
    else if(f.widget === 'number') o[f.name] = '';
    else if(f.widget === 'select' && f.multiple) o[f.name] = [];
    else if(f.widget !== 'hidden') o[f.name] = '';
  }
  return o;
}

/* summary of a list entry: first non-empty string field */
const summary = (fields, v) => { for(const f of fields){ const x = v && v[f.name]; if(typeof x === 'string' && x.trim() && f.widget !== 'image') return x; if(isLang(f) && v[f.name]){ const s = summary(f.fields, v[f.name]); if(s) return s; } } return ''; };

export function createForm(root, fields, data, {relations = {}, onChange = () => {}} = {}){
  const pending = new Map();       // repo path → {b64, url}
  let lang = 'cs';
  const open = new Set();          // open list entries (by path)
  const media = src => pending.get('src' + src)?.url || assetUrl(src);

  function field(f, path){
    const v = getAt(data, path), k = enc(path), req = f.required === false ? '' : '';
    switch(f.widget || 'string'){
      case 'hidden': return '';
      case 'boolean': return `<label class="switch fld-b"><input type="checkbox" data-k="${k}" data-t="bool"${v ? ' checked' : ''}><i></i><span>${label(f)}</span></label>${hint(f)}`;
      case 'text': return `<label class="field"><span>${label(f)}</span><textarea class="ta auto" rows="3" data-k="${k}">${esc(v ?? '')}</textarea>${hint(f)}</label>`;
      case 'markdown': return `<div class="field"><span>${label(f)}<button type="button" class="btn sm ghost" data-act="mdprev" data-k="${k}">${ic('eye')}Náhled</button></span>
        <textarea class="ta auto" rows="8" data-k="${k}">${esc(v ?? '')}</textarea><div class="prev md-prev" hidden></div>${hint(f)}</div>`;
      case 'number': return `<label class="field"><span>${label(f)}</span><input class="in" type="number" inputmode="numeric" data-k="${k}" data-t="num" value="${esc(v ?? '')}"${f.min!=null?` min="${f.min}"`:''}${f.max!=null?` max="${f.max}"`:''}></label>${hint(f)}`;
      case 'datetime': return `<label class="field"><span>${label(f)}</span><input class="in" type="date" data-k="${k}" value="${esc(String(v || '').slice(0,10))}"></label>${hint(f)}`;
      case 'select': {
        const opts = optList(f);
        if(f.multiple){ const cur = Array.isArray(v) ? v : [];
          return `<div class="field"><span>${label(f)}</span><div class="chips">${opts.map(([val,l]) => `<button type="button" class="chip" data-act="multi" data-k="${k}" data-v="${esc(val)}" aria-pressed="${cur.includes(val)}">${esc(l)}</button>`).join('')}</div>${hint(f)}</div>`; }
        return `<label class="field"><span>${label(f)}</span><select class="sel" data-k="${k}">${f.required === false ? '<option value="">—</option>' : ''}${opts.map(([val,l]) => `<option value="${esc(val)}"${val===v?' selected':''}>${esc(l)}</option>`).join('')}</select>${hint(f)}</label>`;
      }
      case 'relation': {
        const items = relations[f.collection] || [];
        return `<label class="field"><span>${label(f)}</span><select class="sel" data-k="${k}"><option value="">— nic —</option>${items.map(([val,l]) => `<option value="${esc(val)}"${val===v?' selected':''}>${esc(l)}</option>`).join('')}</select>${hint(f)}</label>`;
      }
      case 'image': case 'file': {
        const isImg = f.widget === 'image', has = !!v;
        return `<div class="field"><span>${label(f)}</span><div class="media-f${has?' has':''}">
          ${has ? (isImg ? `<img src="${esc(media(v))}" alt="" loading="lazy">` : (/\.mp4$/i.test(v) ? `<video src="${esc(media(v))}" muted loop playsinline autoplay></video>` : `<span class="muted">${esc(v)}</span>`)) : `<div class="ph">${ic(isImg?'image':'film')}<span>${isImg?'Žádná fotka':'Žádný soubor'}</span></div>`}
          <div class="media-act"><button type="button" class="btn sm" data-act="up-${f.widget}" data-k="${k}">${ic('upload')}<span>${has?'Vyměnit':'Nahrát'}</span></button>${has?`<button type="button" class="btn sm ghost" data-act="clear" data-k="${k}">${ic('x')}<span>Odebrat</span></button>`:''}</div></div>${hint(f)}</div>`;
      }
      case 'object': {
        const inner = (f.fields || []).map(x => field(x, [...path, x.name])).join('');
        if(isLang(f) && path.length === 1) return `<div class="lang-pane" data-lang="${f.name}"${f.name===lang?'':' hidden'}>${inner}</div>`;
        return f.collapsed ? `<details class="grp"><summary>${label(f)}</summary><div class="grp-b">${hint(f)}${inner}</div></details>` : `<fieldset class="grp"><legend>${label(f)}</legend>${hint(f)}<div class="grp-b">${inner}</div></fieldset>`;
      }
      case 'list': {
        const arr = Array.isArray(v) ? v : [];
        if(f.field){ // list of simple values
          const w = f.field.widget || 'string';
          return `<div class="field"><span>${label(f)} <em>${arr.length}</em></span><div class="slist">${arr.map((x,i) => `<div class="srow2">
            ${w==='text' ? `<textarea class="ta auto" rows="2" data-k="${enc([...path,i])}">${esc(x)}</textarea>` : `<input class="in" data-k="${enc([...path,i])}" value="${esc(x)}">`}
            <div class="row-act"><button type="button" class="btn sm icon ghost" data-act="up" data-k="${enc([...path,i])}" aria-label="Posunout výš">↑</button><button type="button" class="btn sm icon ghost" data-act="rm" data-k="${enc([...path,i])}" aria-label="Odebrat">${ic('x')}</button></div></div>`).join('')}</div>
            <button type="button" class="btn sm add" data-act="add-v" data-k="${k}">${ic('plus')}<span>Přidat ${esc((f.field.label || 'položku').toLowerCase())}</span></button>${hint(f)}</div>`;
        }
        return `<div class="field"><span>${label(f)} <em>${arr.length}</em></span>${hint(f)}<div class="olist">${arr.map((x,i) => { const p = [...path, i], key = JSON.stringify(p), s = summary(f.fields, x) || `${f.label_singular || 'Položka'} ${i+1}`;
            const img = (f.fields.find(y => y.widget==='image') && x[f.fields.find(y => y.widget==='image').name]) || '';
            return `<details class="item"${open.has(key)?' open':''} data-open="${esc(key)}"><summary>${img ? `<img src="${esc(media(img))}" alt="">` : `<i class="num">${i+1}</i>`}<b>${esc(s)}</b>
              <span class="row-act"><button type="button" class="btn sm icon ghost" data-act="up" data-k="${enc(p)}" aria-label="Posunout výš">↑</button><button type="button" class="btn sm icon ghost" data-act="rm" data-k="${enc(p)}" aria-label="Odebrat">${ic('trash')}</button></span></summary>
              <div class="grp-b">${f.fields.map(y => field(y, [...p, y.name])).join('')}</div></details>`; }).join('')}</div>
          <button type="button" class="btn sm add" data-act="add-o" data-k="${k}">${ic('plus')}<span>Přidat ${esc((f.label_singular || 'položku').toLowerCase())}</span></button></div>`;
      }
      default: { const bad = f.pattern && v && !new RegExp(f.pattern[0]).test(v);
        return `<label class="field"><span>${label(f)}${bad?` <em class="bad">${esc(f.pattern[1])}</em>`:''}</span><input class="in" data-k="${k}" value="${esc(v ?? '')}"${/youtube|link|url|web/i.test(f.name)?' inputmode="url"':''}${/email/i.test(f.name)?' inputmode="email"':''}></label>${hint(f)}`; }
    }
  }

  const fieldDef = path => { let fs = fields, f = null; for(const k of path){ if(typeof k === 'number'){ continue; } f = (fs || []).find(x => x.name === k); fs = f && (f.fields || (f.field ? [f.field] : null)); } return f; };

  function draw(){
    const langs = fields.filter(f => isLang(f) && f.name === 'cs').length && fields.some(f => isLang(f) && f.name === 'en');
    const sx = scrollY;
    root.innerHTML = (langs ? `<div class="langtabs fl-tabs" role="tablist"><button type="button" data-lang-t="cs" aria-selected="${lang==='cs'}">ČEŠTINA</button><button type="button" data-lang-t="en" aria-selected="${lang==='en'}">ANGLIČTINA</button></div>` : '') +
      `<div class="form-b">${fields.map(f => field(f, [f.name])).join('')}</div>`;
    $$('textarea.auto', root).forEach(grow);
    scrollTo(0, sx);
  }
  const grow = t => { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 2, 900) + 'px'; };

  /* edits */
  root.addEventListener('input', e => {
    const el = e.target.closest('[data-k]'); if(!el || el.tagName === 'BUTTON') return;
    const p = dec(el.dataset.k);
    let v = el.dataset.t === 'bool' ? el.checked : el.dataset.t === 'num' ? (el.value === '' ? '' : Number(el.value)) : el.value;
    const f = fieldDef(p); if(f && f.widget === 'number' && f.value_type === 'int' && v !== '') v = Math.round(v);
    setAt(data, p, v); if(el.tagName === 'TEXTAREA') grow(el); onChange();
  });
  root.addEventListener('change', e => { if(e.target.matches('select,[data-t="bool"],input[type=date]')) e.target.dispatchEvent(new Event('input', {bubbles:true})); });
  root.addEventListener('toggle', e => { const d = e.target; if(d.dataset && d.dataset.open) d.open ? open.add(d.dataset.open) : open.delete(d.dataset.open); }, true);
  root.addEventListener('click', async e => {
    const t = e.target.closest('[data-lang-t]'); if(t){ lang = t.dataset.langT; $$('[data-lang-t]', root).forEach(b => b.setAttribute('aria-selected', b===t)); $$('.lang-pane', root).forEach(p => p.hidden = p.dataset.lang !== lang); return; }
    const b = e.target.closest('[data-act]'); if(!b) return;
    e.preventDefault(); e.stopPropagation();
    const p = dec(b.dataset.k), act = b.dataset.act;
    if(act === 'multi'){ const cur = getAt(data, p) || []; const v = b.dataset.v; setAt(data, p, cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]); b.setAttribute('aria-pressed', !cur.includes(v)); onChange(); return; }
    if(act === 'mdprev'){ const box = b.closest('.field'), pv = $('.md-prev', box); pv.hidden = !pv.hidden; if(!pv.hidden) pv.innerHTML = markdown(getAt(data, p), media); return; }
    if(act === 'clear'){ setAt(data, p, ''); onChange(); draw(); return; }
    if(act === 'add-v'){ const arr = getAt(data, p) || []; arr.push(''); setAt(data, p, arr); onChange(); draw(); const ins = $$(`[data-k^="${enc([...p]).slice(0,-6)}"]`, root); return; }
    if(act === 'add-o'){ const f = fieldDef(p); const arr = getAt(data, p) || []; arr.push(blank(f.fields)); setAt(data, p, arr); open.add(JSON.stringify([...p, arr.length-1])); onChange(); draw(); return; }
    if(act === 'rm' || act === 'up'){
      const i = p[p.length-1], lp = p.slice(0, -1), arr = getAt(data, lp);
      if(act === 'rm'){ if(typeof arr[i] === 'object' && arr[i] && !confirm('Odebrat tuto položku?')) return; arr.splice(i, 1); }
      else if(i > 0){ [arr[i-1], arr[i]] = [arr[i], arr[i-1]]; }
      open.clear(); onChange(); draw(); return;
    }
    if(act === 'up-image' || act === 'up-file'){
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = act === 'up-image' ? 'image/*' : 'video/mp4,video/*';
      inp.onchange = async () => { const file = inp.files[0]; if(!file) return;
        const tt = toast('Připravuji soubor…', 'busy', 0);
        try{
          let blob = file, ext = (file.name.split('.').pop() || 'bin').toLowerCase();
          if(act === 'up-image'){ blob = (await toWebp(file)).blob; ext = 'webp'; }
          else if(file.size > 5 * 1024 * 1024){ tt.close(); return toast('Video má víc než 5 MB. Zkraťte ho nebo vložte odkaz na YouTube.', 'err', 7000); }
          const name = (slugify(file.name.replace(/\.[^.]+$/, '')) || 'soubor') + '-' + Date.now().toString(36) + '.' + ext;
          const pub = '/assets/uploads/' + name;
          pending.set('src' + pub, {b64: await blobToB64(blob), url: URL.createObjectURL(blob)});
          setAt(data, p, pub); onChange(); draw();
          tt.set(`Připraveno (${Math.round(blob.size/1024)} kB). Nahraje se při uložení.`); setTimeout(tt.close, 2600);
        }catch(err){ tt.close(); toast('Soubor se nepodařilo zpracovat: ' + esc(err.message), 'err'); }
      };
      inp.click();
    }
  });

  draw();
  return {
    redraw: draw,
    /* files to commit together with the JSON (only uploads still referenced) */
    files(){ const used = JSON.stringify(data); return [...pending].filter(([k]) => used.includes(k.slice(3))).map(([path, v]) => ({path, b64:v.b64})); },
    clear(){ pending.clear(); },
    get lang(){ return lang; }
  };
}
