/* SFX Studio — Blog: list + editor with live preview, SEO check and image upload. */
import { $, $$, esc, ic, toast, confirmBox, markdown, wordCount, ring, fmtDate, slugify, toWebp, blobToB64, ago } from './lib.js';
import { CFG, GH, assetUrl, deploys } from './api.js';
import { header, setGuard } from './main.js';

export const SVCS = [['video','Video'],['foto','Fotografie'],['dron','Dron'],['strih','Střih a postprodukce'],['360','360° / Matterport'],['3d','3D a rendery'],['vizualizace','Vizualizace'],['film','Filmová produkce']];
const svcName = k => (SVCS.find(s=>s[0]===k)||[,k])[1];
const today = () => new Date().toISOString().slice(0,10);

/* ---------- data ---------- */
let cache = null, cacheAt = 0;
export async function loadPosts(force=false){
  if(cache && !force && Date.now() - cacheAt < 60000) return cache;
  const files = (await GH.list('content/blog')).filter(f => f.name.endsWith('.json'));
  const posts = await Promise.all(files.map(async f => { const d = await GH.readJSON(f.path); d._file = f.path; return d; }));
  cache = posts.sort((a,b) => String(b.date).localeCompare(String(a.date))); cacheAt = Date.now();
  return cache;
}
export function postState(p){
  if(!p.published) return {k:'draft', t:'Koncept', c:'draft'};
  if(p.date && p.date > today()) return {k:'plan', t:'Naplánováno', c:'plan'};
  return {k:'live', t:'Na webu', c:'live'};
}
const coverOf = p => p.cover ? assetUrl(p.cover) : `${CFG.site}/assets/img/${p.img || 'edit'}.webp`;
const postUrl = (p, l='cs') => `${CFG.site}${l==='en'?'/en':''}/blog/${(p.slug && p.slug[l]) || slugify(p[l]?.t)}/`;

export async function render(main, [id]){
  if(id) return editor(main, id === 'novy' ? null : id);
  return list(main);
}

/* ---------- list ---------- */
async function list(main){
  main.innerHTML = header('Blog', 'články a návody', `<a class="btn gold" href="#/blog/novy">${ic('plus')}<span>Nový článek</span></a>`) + `
  <div class="toolbar"><label class="search"><span class="sr">Hledat</span>${ic('search')}<input class="in" id="q" placeholder="Hledat v článcích…"></label>
    <div class="chips" id="flt"><button class="chip" data-f="all" aria-pressed="true">Vše</button><button class="chip" data-f="live" aria-pressed="false">Na webu</button><button class="chip" data-f="plan" aria-pressed="false">Naplánované</button><button class="chip" data-f="draft" aria-pressed="false">Koncepty</button></div></div>
  <div class="posts" id="posts">${'<div class="post"><div class="cov skel"></div><div class="body"><div class="skel" style="height:60px"></div></div></div>'.repeat(4)}</div>`;
  let posts;
  try{ posts = await loadPosts(); }catch(e){ $('#posts').innerHTML = `<div class="card empty" style="grid-column:1/-1">${ic('alert')}<b>Články se nenačetly</b><span>${esc(e.message)}</span></div>`; return; }
  let f = 'all', q = '';
  const draw = () => {
    const ql = q.toLowerCase();
    const shown = posts.filter(p => (f==='all' || postState(p).k===f) && (!ql || (p.cs?.t+' '+p.cs?.lead+' '+(p.en?.t||'')).toLowerCase().includes(ql)));
    $('#posts').innerHTML = `<a class="post new" href="#/blog/novy"><div>${ic('plus')}<span>Napsat nový článek</span></div></a>` + shown.map(p => { const s = postState(p);
      return `<a class="post" href="#/blog/${encodeURIComponent(p.id)}"><div class="cov"><img src="${esc(coverOf(p))}" alt="" loading="lazy"><span class="tag ${s.c}">${s.t}</span></div>
        <div class="body"><div class="meta"><span>${esc(svcName(p.cat))}</span><span>${esc(fmtDate(p.date))}</span></div><h3>${esc(p.cs?.t || p.id)}</h3><p>${esc(p.cs?.lead || '')}</p>
        <div class="langs"><i class="on">CZ</i><i class="${p.en?.t && p.en?.body ? 'on' : ''}">EN</i><i>${wordCount(p.cs?.body)} slov</i></div></div></a>`; }).join('');
  };
  draw();
  $('#q').addEventListener('input', e => { q = e.target.value; draw(); });
  $('#flt').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if(!b) return; f = b.dataset.f; $$('#flt .chip').forEach(c => c.setAttribute('aria-pressed', c===b)); draw(); });
}

/* ---------- editor ---------- */
async function editor(main, id){
  main.innerHTML = header(id ? 'Úprava článku' : 'Nový <em>článek</em>', id ? 'blog · úprava' : 'blog · nový') + `<div class="card"><div class="skel" style="height:420px"></div></div>`;
  let orig = null;
  if(id){
    try{ orig = (await loadPosts()).find(p => p.id === id) || await GH.readJSON(`content/blog/${id}.json`); }
    catch(e){ main.innerHTML = header('Článek nenalezen', 'blog') + `<div class="card empty">${ic('alert')}<b>Článek „${esc(id)}“ neexistuje</b><a class="btn" href="#/blog">${ic('back')}Zpět na blog</a></div>`; return; }
  }
  const p = structuredClone(orig || {id:'', published:true, date:today(), cat:'video', svcs:[], cover:'', youtube:'', gallery:[], img:'edit', slug:{cs:'', en:''}, cs:{t:'', lead:'', body:''}, en:{t:'', lead:'', body:''}});
  delete p._file; p.slug = p.slug || {cs:'', en:''}; p.en = p.en || {t:'', lead:'', body:''}; p.svcs = p.svcs || [];
  const pending = new Map();   // repo path → {b64, url} uploaded with the next save
  let lang = 'cs', split = true, dirty = false, saving = false;
  const img = src => pending.get('src' + src)?.url || assetUrl(src);

  main.innerHTML = header(id ? esc(p.cs.t || id) : 'Nový <em>článek</em>', id ? `blog · ${postState(p).t.toLowerCase()}` : 'blog · nový',
    `<a class="btn ghost" href="#/blog">${ic('back')}<span>Všechny články</span></a>${id && postState(p).k==='live' ? `<a class="btn" href="${esc(postUrl(p))}" target="_blank" rel="noopener">${ic('ext')}<span>Na webu</span></a>` : ''}`) + `
  <div class="ed">
    <div class="ed-main">
      <div class="card">
        <div class="langtabs" role="tablist"><button role="tab" data-l="cs" aria-selected="true">ČEŠTINA</button><button role="tab" data-l="en" aria-selected="false">ANGLIČTINA <span class="muted">(nepovinné)</span></button></div>
        <div style="display:flex;flex-direction:column;gap:16px;margin-top:16px">
          <label class="field"><span>Nadpis <em id="cT"></em></span><input class="in big" id="fT" placeholder="Např. Jak natočit video, které prodá nemovitost"></label>
          <label class="field"><span>Perex · zobrazí se i v Googlu <em id="cL"></em></span><textarea class="ta" id="fL" rows="3" placeholder="Jedna až dvě věty o tom, co se čtenář dozví."></textarea></label>
          <div class="field"><span>Text článku <em id="cB"></em></span>
            <div class="mdbar" id="mdbar">
              <button type="button" data-md="h2" title="Mezititulek">${ic('h2')}</button><button type="button" data-md="b" title="Tučně">${ic('bold')}</button><button type="button" data-md="i" title="Kurzíva">${ic('italic')}</button>
              <span class="sep"></span><button type="button" data-md="ul" title="Odrážky">${ic('list')}</button><button type="button" data-md="q" title="Citát">${ic('quote')}</button><button type="button" data-md="a" title="Odkaz">${ic('link')}</button>
              <button type="button" data-md="img" title="Vložit fotku">${ic('image')}<span>Fotka</span></button>
              <button type="button" class="right" data-md="split" title="Náhled vedle textu">${ic('split')}<span>Náhled</span></button></div>
            <div class="mdwrap" id="mdw"><textarea class="ta" id="fB" placeholder="Pište normálně. Mezititulek začněte ## , odrážku pomlčkou."></textarea><article class="prev" id="prev"></article></div>
          </div>
        </div>
      </div>
    </div>
    <aside class="ed-side">
      <section class="card"><div class="card-h"><h2>Zveřejnění</h2></div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <label class="switch"><input type="checkbox" id="fPub"><i></i><span>Zveřejnit na webu</span></label>
          <label class="field"><span>Datum <em id="dHint"></em></span><input class="in" type="date" id="fD"></label>
          <label class="field"><span>Hlavní služba</span><select class="sel" id="fC">${SVCS.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label>
          <div class="field"><span>Související služby</span><div class="chips" id="fS">${SVCS.map(([v,t])=>`<button type="button" class="chip" data-s="${v}" aria-pressed="false">${t}</button>`).join('')}</div></div>
        </div></section>
      <section class="card"><div class="card-h"><h2>Úvodní fotka</h2></div>
        <div class="drop" id="cover" tabindex="0" role="button" aria-label="Nahrát úvodní fotku"><div>${ic('upload')}Přetáhněte fotku sem<br>nebo klikněte</div></div>
        <input type="file" id="fileCover" accept="image/*" hidden><input type="file" id="fileBody" accept="image/*" hidden>
        <label class="field" style="margin-top:16px"><span>Video z YouTube (odkaz)</span><input class="in" id="fY" placeholder="https://youtu.be/…"></label></section>
      <section class="card"><div class="card-h"><h2>Google</h2><span class="muted">SEO kontrola</span></div><div id="seo"></div></section>
      <section class="card"><div class="card-h"><h2>Adresa</h2></div>
        <div style="display:flex;flex-direction:column;gap:14px">
          ${id ? '' : `<label class="field"><span>Identifikátor souboru</span><input class="in" id="fId" placeholder="vytvoří se z nadpisu"></label>`}
          <label class="field"><span>Adresa (CZ)</span><input class="in" id="fSc" placeholder="vytvoří se z nadpisu"></label>
          <label class="field"><span>Adresa (EN)</span><input class="in" id="fSe" placeholder="vytvoří se z anglického nadpisu"></label>
          <p class="muted" style="margin:0;font-size:12.5px" id="urlPrev"></p>
        </div></section>
      ${id ? `<button class="btn danger" id="del">${ic('trash')}<span>Smazat článek</span></button>` : ''}
    </aside>
  </div>
  <div class="ed-actions"><span class="st" id="st">Uloženo</span><div style="display:flex;gap:10px"><a class="btn ghost" href="#/blog">Zavřít</a><button class="btn gold" id="save">${ic('rocket')}<span>${id ? 'Uložit a nasadit' : 'Vytvořit článek'}</span></button></div></div>`;

  const F = s => $(s, main);
  const h1 = $('.title h1', main); if(h1 && h1.textContent.length > 28) h1.classList.add('long');
  /* fill */
  const fillLang = () => { F('#fT').value = p[lang].t || ''; F('#fL').value = p[lang].lead || ''; F('#fB').value = p[lang].body || ''; };
  fillLang();
  F('#fPub').checked = !!p.published; F('#fD').value = p.date || today(); F('#fC').value = p.cat || 'video'; F('#fY').value = p.youtube || '';
  F('#fSc').value = p.slug.cs || ''; F('#fSe').value = p.slug.en || '';
  $$('#fS .chip', main).forEach(c => c.setAttribute('aria-pressed', p.svcs.includes(c.dataset.s)));
  const coverDraw = () => { const c = F('#cover');
    c.innerHTML = p.cover ? `<img src="${esc(img(p.cover))}" alt=""><button type="button" class="btn sm icon x" id="rmCover" aria-label="Odebrat fotku">${ic('x')}</button>` : `<div>${ic('upload')}Přetáhněte fotku sem<br>nebo klikněte</div>`;
    const rm = $('#rmCover', c); rm && rm.addEventListener('click', e => { e.stopPropagation(); p.cover = ''; touch(); coverDraw(); }); };
  coverDraw();

  /* live preview + counters + SEO */
  const count = (el, n, lo, hi, unit='znaků') => { el.textContent = `${n} ${unit}`; el.className = n === 0 ? '' : (n < lo || n > hi) ? 'bad' : 'good'; };
  const update = () => {
    const d = p[lang];
    F('#prev').innerHTML = `<div class="kick">${esc(svcName(p.cat))} · ${esc(fmtDate(p.date))}</div><h1>${esc(d.t || 'Nadpis článku')}</h1><p class="lead">${esc(d.lead || '')}</p>` +
      (p.cover ? `<div class="cover"><img src="${esc(img(p.cover))}" alt=""></div>` : '') + markdown(d.body, img);
    count(F('#cT'), (d.t||'').length, 30, 65); count(F('#cL'), (d.lead||'').length, 100, 170); count(F('#cB'), wordCount(d.body), 300, 5000, 'slov');
    seo();
    const s = p.date > today() ? `zveřejní se ${fmtDate(p.date)}` : ''; F('#dHint').textContent = s;
    const slug = F('#fSc').value || slugify(p.cs.t); F('#urlPrev').textContent = slug ? `${CFG.site.replace(/^https?:\/\//,'')}/blog/${slug}/` : '';
  };
  const seo = () => {
    const d = p.cs, t = (d.t||'').length, l = (d.lead||'').length, w = wordCount(d.body), h = (d.body.match(/^##\s/mg)||[]).length;
    const local = /(Ústí|Ústeck|Liberec|Libereck|Praha|Praze|Litoměř|Děčín|Teplic|Most|Chomutov|Jablonec)/i.test(d.t + d.lead + d.body);
    const C = [
      [t >= 30 && t <= 65, t ? `Nadpis má ${t} znaků (ideálně 30–65)` : 'Doplňte nadpis'],
      [l >= 100 && l <= 170, l ? `Perex má ${l} znaků (ideálně 100–170)` : 'Doplňte perex, Google ho ukáže pod nadpisem'],
      [w >= 300, `Text má ${w} slov${w < 300 ? ' (doporučeno aspoň 300)' : ''}`],
      [h >= 2, h ? `${h} mezititulky` : 'Rozdělte text mezititulky (##)'],
      [!!p.cover, p.cover ? 'Úvodní fotka je nastavená' : 'Přidejte úvodní fotku'],
      [local, local ? 'Zmiňuje lokalitu (lokální SEO)' : 'Zmiňte město nebo kraj (Ústí, Liberec, Praha…)'],
      [!!(p.en.t && p.en.body), p.en.t && p.en.body ? 'Má anglickou verzi' : 'Anglická verze chybí (nepovinné)']];
    const score = Math.round(C.reduce((a,[ok],i) => a + (ok ? [18,16,18,14,14,12,8][i] : 0), 0));
    F('#seo').innerHTML = `<div class="seo">${ring(score)}<div><b style="font:800 20px var(--display);text-transform:uppercase;letter-spacing:.03em">${score >= 80 ? 'Výborné' : score >= 55 ? 'Dobré, jde to líp' : 'Potřebuje doplnit'}</b><p class="muted" style="margin:4px 0 0;font-size:13px">Jak dobře se článek ukáže ve vyhledávání.</p></div></div>
      <ul class="checks">${C.map(([ok,txt]) => `<li class="${ok?'':'bad'}">${esc(txt)}</li>`).join('')}</ul>
      <div class="serp"><small>${esc(CFG.site.replace(/^https?:\/\//,''))} › blog</small><b>${esc((d.t || 'Nadpis článku') + ' | SFX production')}</b><p>${esc(d.lead || 'Perex článku se zobrazí tady.')}</p></div>`;
  };
  update();

  /* edits */
  const touch = () => { dirty = true; F('#st').textContent = 'Neuložené změny'; F('#st').classList.add('dirty'); update(); };
  F('#fT').addEventListener('input', e => { p[lang].t = e.target.value; if(!id && lang==='cs' && F('#fId') && !F('#fId').dataset.own) F('#fId').placeholder = slugify(e.target.value) || 'vytvoří se z nadpisu'; touch(); });
  F('#fL').addEventListener('input', e => { p[lang].lead = e.target.value; touch(); });
  F('#fB').addEventListener('input', e => { p[lang].body = e.target.value; touch(); });
  F('#fPub').addEventListener('change', e => { p.published = e.target.checked; touch(); });
  F('#fD').addEventListener('change', e => { p.date = e.target.value; touch(); });
  F('#fC').addEventListener('change', e => { p.cat = e.target.value; touch(); });
  F('#fY').addEventListener('input', e => { p.youtube = e.target.value.trim(); touch(); });
  F('#fSc').addEventListener('input', e => { p.slug.cs = slugify(e.target.value) ? e.target.value : ''; touch(); });
  F('#fSe').addEventListener('input', e => { p.slug.en = e.target.value; touch(); });
  F('#fId') && F('#fId').addEventListener('input', e => { e.target.dataset.own = '1'; touch(); });
  F('#fS').addEventListener('click', e => { const c = e.target.closest('[data-s]'); if(!c) return; const on = c.getAttribute('aria-pressed') !== 'true'; c.setAttribute('aria-pressed', on);
    p.svcs = on ? [...p.svcs, c.dataset.s] : p.svcs.filter(x => x !== c.dataset.s); touch(); });
  $$('.langtabs button', main).forEach(b => b.addEventListener('click', () => { lang = b.dataset.l; $$('.langtabs button', main).forEach(x => x.setAttribute('aria-selected', x===b)); fillLang(); update(); }));

  /* markdown toolbar */
  const ta = F('#fB');
  const wrap = (a, b='', ph='text') => { const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e) || ph;
    ta.setRangeText(a + sel + b, s, e, 'end'); if(sel === ph){ ta.selectionStart = s + a.length; ta.selectionEnd = s + a.length + ph.length; } ta.focus(); ta.dispatchEvent(new Event('input')); };
  const line = pre => { const s = ta.value.lastIndexOf('\n', ta.selectionStart - 1) + 1; ta.setRangeText(pre, s, s, 'end'); ta.focus(); ta.dispatchEvent(new Event('input')); };
  F('#mdbar').addEventListener('click', e => { const b = e.target.closest('[data-md]'); if(!b) return;
    const k = b.dataset.md;
    if(k==='h2') line('\n## '); if(k==='b') wrap('**','**'); if(k==='i') wrap('*','*'); if(k==='ul') line('- '); if(k==='q') line('> ');
    if(k==='a'){ const u = prompt('Adresa odkazu (https://…)'); if(u) wrap('[', `](${u})`, 'text odkazu'); }
    if(k==='img') F('#fileBody').click();
    if(k==='split'){ split = !split; F('#mdw').classList.toggle('solo', !split); }
  });
  ta.addEventListener('keydown', e => { if((e.metaKey||e.ctrlKey) && e.key==='b'){ e.preventDefault(); wrap('**','**'); } if((e.metaKey||e.ctrlKey) && e.key==='i'){ e.preventDefault(); wrap('*','*'); } });

  /* images: converted to WebP in the browser, committed together with the article */
  const upload = async file => {
    if(!file || !/^image\//.test(file.type)) { toast('Vyberte prosím obrázek (JPG, PNG, WebP).', 'err'); return null; }
    const t = toast('Připravuji fotku…', 'busy', 0);
    try{
      const {blob, width} = await toWebp(file);
      const name = (slugify(file.name.replace(/\.[^.]+$/,'')) || 'foto') + '-' + Date.now().toString(36) + '.webp';
      const pub = '/assets/uploads/' + name;
      pending.set('src' + pub, {b64: await blobToB64(blob), url: URL.createObjectURL(blob)});
      t.set(`Fotka připravená (${width} px, ${Math.round(blob.size/1024)} kB). Nahraje se při uložení.`); setTimeout(t.close, 2600);
      return pub;
    }catch(e){ t.close(); toast('Fotku se nepodařilo zpracovat: ' + e.message, 'err'); return null; }
  };
  const cover = F('#cover');
  cover.addEventListener('click', () => F('#fileCover').click());
  cover.addEventListener('keydown', e => { if(e.key==='Enter' || e.key===' '){ e.preventDefault(); F('#fileCover').click(); } });
  ['dragenter','dragover'].forEach(ev => cover.addEventListener(ev, e => { e.preventDefault(); cover.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev => cover.addEventListener(ev, () => cover.classList.remove('over')));
  cover.addEventListener('drop', async e => { e.preventDefault(); const pub = await upload(e.dataTransfer.files[0]); if(pub){ p.cover = pub; coverDraw(); touch(); } });
  F('#fileCover').addEventListener('change', async e => { const pub = await upload(e.target.files[0]); e.target.value = ''; if(pub){ p.cover = pub; coverDraw(); touch(); } });
  F('#fileBody').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; const pub = await upload(f); if(pub){ const alt = prompt('Popis fotky (pro Google a nevidomé)', '') || ''; wrap(`\n\n![${alt}](${pub})\n\n`, '', ''); } });
  ta.addEventListener('drop', async e => { const f = e.dataTransfer.files[0]; if(!f) return; e.preventDefault(); const pub = await upload(f); if(pub) wrap(`\n\n![](${pub})\n\n`, '', ''); });

  /* save */
  const save = async () => {
    if(saving) return;
    if(!p.cs.t.trim()){ toast('Doplňte prosím český nadpis.', 'err'); F('#fT').focus(); return; }
    if(!p.cs.body.trim()){ toast('Článek zatím nemá žádný text.', 'err'); return; }
    const fid = id || slugify((F('#fId') && F('#fId').value) || p.cs.t);
    if(!fid){ toast('Nepodařilo se vytvořit identifikátor článku.', 'err'); return; }
    if(!id && (await loadPosts()).some(x => x.id === fid)){ toast(`Článek s identifikátorem „${fid}“ už existuje. Změňte nadpis nebo identifikátor.`, 'err'); return; }
    saving = true; const btn = F('#save'); btn.disabled = true; btn.innerHTML = '<span class="spin"></span><span>Ukládám…</span>';
    const out = {...p, id: fid};
    out.slug = {cs: slugify(p.slug.cs) || '', en: slugify(p.slug.en) || ''};
    if(!out.en.t && !out.en.body) out.en = {t:'', lead:'', body:''};
    const files = [{path:`content/blog/${fid}.json`, text: JSON.stringify(out, null, 2) + '\n'}];
    const used = JSON.stringify(out);
    for(const [k, v] of pending) if(used.includes(k.slice(3))) files.push({path:k, b64:v.b64});
    try{
      await GH.commit(files, `${id ? 'Úprava' : 'Nový'} článek: ${p.cs.t}`);
      dirty = false; pending.clear(); cache = null;
      F('#st').textContent = 'Uloženo ' + ago(new Date()); F('#st').classList.remove('dirty');
      deploys.expect(); trackDeploy(out);
      if(!id){ setGuard(null); location.hash = '#/blog/' + fid; return; }
    }catch(e){ toast('Uložení se nepovedlo: ' + esc(e.message), 'err', 8000); }
    saving = false; btn.disabled = false; btn.innerHTML = `${ic('rocket')}<span>Uložit a nasadit</span>`;
  };
  F('#save').addEventListener('click', save);
  const key = e => { if((e.metaKey||e.ctrlKey) && e.key==='s'){ e.preventDefault(); save(); } };
  document.addEventListener('keydown', key);

  F('#del') && F('#del').addEventListener('click', async () => {
    if(!await confirmBox({title:'Smazat článek?', text:`„${p.cs.t}“ zmizí z webu i z administrace. V historii na GitHubu zůstane a dá se obnovit.`, ok:'Smazat', danger:true})) return;
    try{ await GH.commit([{path:`content/blog/${id}.json`, delete:true}], `Smazán článek: ${p.cs.t}`); cache = null; dirty = false; deploys.expect(); toast('Článek je smazaný. Z webu zmizí do dvou minut.'); location.hash = '#/blog'; }
    catch(e){ toast('Smazání se nepovedlo: ' + esc(e.message), 'err'); }
  });

  /* leave guard */
  const guard = async () => !dirty || await confirmBox({title:'Odejít bez uložení?', text:'Máte neuložené změny. Když odejdete, ztratí se.', ok:'Odejít', danger:true});
  guard.dirty = () => dirty; guard.hash = location.hash; setGuard(guard);
  return () => { document.removeEventListener('keydown', key); };
}

/* toast that follows the deploy until the article is live */
function trackDeploy(p){
  const t = toast('Uloženo. Web se teď sestavuje…', 'busy', 0); const start = Date.now();
  const off = deploys.on(runs => {
    const r = runs.find(x => new Date(x.created_at) >= new Date(start - 30000));
    if(!r) return;
    if(r.status !== 'completed') t.set(`Nasazuji na web… <span class="muted">${Math.round((Date.now()-start)/1000)} s</span>`);
    else if(r.conclusion === 'success'){ t.set(p.published && p.date <= today() ? `Hotovo, článek je na webu. <a href="${esc(postUrl(p))}" target="_blank" rel="noopener" style="color:var(--gold)">Otevřít →</a>` : 'Hotovo, změny jsou uložené na webu.'); setTimeout(t.close, 9000); off(); }
    else { t.set('Nasazení selhalo. Podívejte se do Nasazení na GitHubu.'); t.el.classList.add('err'); setTimeout(t.close, 9000); off(); }
  });
}
