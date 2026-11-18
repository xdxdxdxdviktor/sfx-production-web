/* SFX admin — enquiries + blog. Open with Alt/⌥ + Shift + A, triple-click the © in the footer, or the /admin/ address. */
const AD = {"cs":{"ad.title":"Administrace","ad.login":"Přihlásit","ad.demo":"Ukázkový režim: data se ukládají jen v tomto prohlížeči. Po napojení Supabase se přihlašuje e-mailem a heslem.","ad.email":"Odesílání e-mailů","ad.pass":"Heslo","ad.logout":"Odhlásit","ad.inq":"Poptávky","ad.blog":"Blog","ad.new":"Nový článek","ad.save":"Uložit","ad.saved":"Uloženo","ad.del":"Smazat","ad.delQ":"Opravdu smazat tento článek?","ad.status":"Stav","ad.st.new":"Nová","ad.st.in_progress":"Rozpracovaná","ad.st.done":"Vyřízená","ad.st.archived":"Archiv","ad.all":"Vše","ad.note":"Interní poznámka","ad.reply":"Odpovědět e-mailem","ad.call":"Zavolat","ad.csv":"Export CSV","ad.empty":"Zatím tu nic není.","ad.pick":"Vyberte poptávku ze seznamu.","ad.f.title":"Nadpis","ad.f.slug":"Adresa (slug)","ad.f.lang":"Jazyk","ad.f.cat":"Hlavní služba","ad.f.svcs":"Další služby","ad.f.client":"Klient","ad.f.date":"Datum","ad.f.lead":"Perex","ad.f.body":"Text článku","ad.f.bodyHint":"Odstavce oddělte prázdným řádkem. Mezititulek začněte „## “.","ad.f.cover":"Úvodní obrázek","ad.f.gallery":"Galerie","ad.f.pub":"Publikováno","ad.f.draft":"Koncept","ad.f.upload":"Nahrát obrázek","ad.f.uploadMore":"Přidat fotky","ad.view":"Zobrazit na webu","ad.err":"Uložení se nepodařilo. Zkontrolujte připojení a zkuste to znovu.","ad.close":"Zavřít administraci","ad.hint":"Zkratka: Alt/⌥ + Shift + A, na mobilu 3× ťukněte na © v patičce","ad.set":"Nastavení","ad.notify":"Upozornění na novou poptávku","ad.notifyP":"Kam má přijít zpráva, když někdo odešle formulář.","ad.both":"SMS i e-mail","ad.none":"Vypnuto","ad.phone":"Telefon pro SMS","ad.mail":"E-mail pro upozornění","ad.auto":"Posílat klientovi automatické potvrzení e-mailem","ad.test":"Poslat testovací upozornění","ad.testOk":"Testovací upozornění odesláno.","ad.testFail":"Test se nepovedl:","ad.integr":"Stav napojení","ad.sms":"SMS brána","ad.spam":"Ochrana proti spamu","ad.on":"aktivní","ad.off":"nenastaveno","ad.demoSet":"V ukázkovém režimu se zprávy neodesílají.","ad.app":"Administrace v iPhonu","ad.appP":"Otevřete sfxproduction.com/admin/ v Safari, klepněte na Sdílet a zvolte Přidat na plochu. Administrace se pak otevírá jako aplikace."},"en":{"ad.title":"Admin","ad.login":"Sign in","ad.demo":"Demo mode: data is saved only in this browser. Once Supabase is connected, you sign in with email and password.","ad.email":"Email sending","ad.pass":"Password","ad.logout":"Sign out","ad.inq":"Enquiries","ad.blog":"Blog","ad.new":"New article","ad.save":"Save","ad.saved":"Saved","ad.del":"Delete","ad.delQ":"Delete this article?","ad.status":"Status","ad.st.new":"New","ad.st.in_progress":"In progress","ad.st.done":"Done","ad.st.archived":"Archived","ad.all":"All","ad.note":"Internal note","ad.reply":"Reply by email","ad.call":"Call","ad.csv":"Export CSV","ad.empty":"Nothing here yet.","ad.pick":"Pick an enquiry from the list.","ad.f.title":"Title","ad.f.slug":"URL (slug)","ad.f.lang":"Language","ad.f.cat":"Main service","ad.f.svcs":"Other services","ad.f.client":"Client","ad.f.date":"Date","ad.f.lead":"Lead","ad.f.body":"Article text","ad.f.bodyHint":"Separate paragraphs with an empty line. Start a subheading with “## ”.","ad.f.cover":"Cover image","ad.f.gallery":"Gallery","ad.f.pub":"Published","ad.f.draft":"Draft","ad.f.upload":"Upload image","ad.f.uploadMore":"Add photos","ad.view":"View on site","ad.err":"Saving failed. Check your connection and try again.","ad.close":"Close admin","ad.hint":"Shortcut: Alt/⌥ + Shift + A, on mobile triple-tap the © in the footer","ad.set":"Settings","ad.notify":"New enquiry alerts","ad.notifyP":"Where to send a message when someone submits the form.","ad.both":"SMS and email","ad.none":"Off","ad.phone":"Phone for SMS","ad.mail":"Email for alerts","ad.auto":"Send the client an automatic confirmation email","ad.test":"Send a test alert","ad.testOk":"Test alert sent.","ad.testFail":"Test failed:","ad.integr":"Connections","ad.sms":"SMS gateway","ad.spam":"Spam protection","ad.on":"active","ad.off":"not set up","ad.demoSet":"In demo mode no messages are sent.","ad.app":"Admin on iPhone","ad.appP":"Open sfxproduction.com/admin/ in Safari, tap Share and choose Add to Home Screen. The admin then opens like an app."}};
export function initAdmin(S, DB){
  const root = document.getElementById('admin'); if(!root) return null;
  const t = k => (AD[S.lang()]||AD.cs)[k] ?? S.t(k), esc = S.esc;
  const $ = (s,r=root)=>r.querySelector(s), $$ = (s,r=root)=>[...r.querySelectorAll(s)];
  const STAT = ['new','in_progress','done','archived'];
  let session=null, tab='inq', inq=[], posts=[], selId=null, filter='all', ed=null, slugTouched=false, busy=false, st=null, stStatus=null, stMsg='';
  const slugify = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);
  const dt = iso => { try{ return new Date(iso).toLocaleString(S.lang()==='cs'?'cs-CZ':'en-GB',{day:'numeric',month:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}); }catch(e){ return iso||''; } };
  const svcName = id => (S.svcT(id)||{}).t || id;
  const tileName = k => (t('tiles')||{})[k] || k;
  const X = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  async function open(){ root.hidden=false; document.body.classList.add('admin-open'); session = await DB.session(); if(session) await load(); render(); }
  function close(){ root.hidden=true; document.body.classList.remove('admin-open');  }
  function toggle(){ root.hidden ? open() : close(); }
  async function load(){ try{ [inq, posts] = await Promise.all([DB.listInquiries(), DB.listPosts(true)]); }catch(e){ inq=inq||[]; posts=posts||[]; } }

  function shell(inner){
    return `<div class="ad-panel" role="dialog" aria-modal="true" aria-label="${t('ad.title')}">
      <header class="ad-top"><div class="ad-brand"><b>SFX</b><span>${t('ad.title')}</span>${DB.mode==='demo'?'<em>demo</em>':''}</div>
      ${session?`<nav class="ad-tabs"><button data-tab="inq" aria-pressed="${tab==='inq'}">${t('ad.inq')}<i>${inq.filter(x=>x.status==='new').length||''}</i></button><button data-tab="blog" aria-pressed="${tab==='blog'}">${t('ad.blog')}</button><button data-tab="set" aria-pressed="${tab==='set'}">${t('ad.set')}</button></nav>`:'<span></span>'}
      <div class="ad-tools">${session?`<button class="ad-link" data-act="logout">${t('ad.logout')}</button>`:''}${document.documentElement.dataset.page==='admin'?'':`<button class="ad-x" data-act="close" aria-label="${t('ad.close')}">${X}</button>`}</div></header>
      ${inner}</div>`;
  }
  function render(){
    if(!session){
      root.innerHTML = shell(`<form class="ad-login" id="adLogin">
        <h2>${t('ad.title')}</h2>
        ${DB.mode==='demo' ? `<p>${t('ad.demo')}</p>` : `<label>${t('ad.email')}<input name="email" type="email" autocomplete="username" required></label><label>${t('ad.pass')}<input name="password" type="password" autocomplete="current-password" required></label>`}
        <p class="ad-err" id="adErr" role="alert"></p>
        <button class="btn primary" type="submit">${t('ad.login')}</button><small>${t('ad.hint')}</small></form>`);
      const f=$('#adLogin'); f.addEventListener('submit', async e=>{ e.preventDefault(); const fd=new FormData(f);
        try{ session = await DB.signIn(fd.get('email'), fd.get('password')); await load(); render(); }catch(err){ $('#adErr').textContent = err.message || 'Error'; } });
      const first=$('input,button[type=submit]'); first && first.focus(); return;
    }
    root.innerHTML = shell(tab==='inq' ? inqView() : tab==='blog' ? blogView() : setView());
    if(tab==='blog') wireEditor();
    if(tab==='set' && !st) loadSettings();
  }

  /* ---------- enquiries ---------- */
  function inqView(){
    const list = filter==='all' ? inq : inq.filter(x=>x.status===filter);
    const cur = inq.find(x=>x.id===selId);
    return `<div class="ad-body${cur?' has-sel':''}"><section class="ad-list">
      <div class="ad-filters">${['all',...STAT].map(s=>`<button data-f="${s}" aria-pressed="${filter===s}">${s==='all'?t('ad.all'):t('ad.st.'+s)} <i>${s==='all'?inq.length:inq.filter(x=>x.status===s).length}</i></button>`).join('')}</div>
      <div class="ad-rows">${list.length ? list.map(x=>`<button class="ad-row${x.id===selId?' on':''}" data-id="${x.id}">
        <span class="st st-${x.status}"></span><span class="r-main"><b>${esc(x.name||'—')}</b><small>${(x.services||[]).map(tileName).join(', ')}</small></span><span class="r-date">${dt(x.created_at)}</span></button>`).join('') : `<p class="ad-empty">${t('ad.empty')}</p>`}</div>
      <button class="ad-link ad-csv" data-act="csv">${t('ad.csv')}</button></section>
      <section class="ad-detail">${cur ? inqDetail(cur) : `<p class="ad-empty">${inq.length?t('ad.pick'):t('ad.empty')}</p>`}</section></div>`;
  }
  function inqDetail(x){
    const row=(k,v)=>v?`<div><dt>${k}</dt><dd>${v}</dd></div>`:'';
    const contact = x.contact_pref==='tel' ? `${esc(x.phone)}${x.call_time?' ('+esc(x.call_time)+')':''}` : esc(x.email);
    const det = x.details && typeof x.details==='object' ? Object.entries(x.details).map(([k,v])=>`${esc(k)}: <b>${esc(v)}</b>`).join('<br>') : '';
    return `<button class="ad-back" data-act="back">← ${t('ad.inq')}</button><div class="ad-dhead"><div><h3>${esc(x.name||'—')}${x.company?`<span class="ad-co">${esc(x.company)}</span>`:''}</h3><small>${x.ref_code?esc(x.ref_code)+' · ':''}${dt(x.created_at)}</small></div>
      <label class="ad-status">${t('ad.status')}<select data-act="status">${STAT.map(s=>`<option value="${s}" ${x.status===s?'selected':''}>${t('ad.st.'+s)}</option>`).join('')}</select></label></div>
      <dl class="ad-dl">${row(t('f.sumC'), contact)}${row(t('f.sumS'), (x.services||[]).map(tileName).join(', '))}${row(t('sum.det'), det)}${row(t('f.proj'), esc(x.project))}${row(t('f.sumL'), esc(x.location))}
      ${row(t('f.sumD'), esc(x.date||'')+(x.flexible?' ('+t('f.flex').toLowerCase()+')':''))}${row(t('f.sumB'), esc(x.budget))}${row(t('f.link'), x.link?`<a href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.link)}</a>`:'')}</dl>
      <div class="ad-desc">${esc(x.description||'').replace(/\n/g,'<br>')}</div>
      <label class="ad-note">${t('ad.note')}<textarea data-act="note" rows="3">${esc(x.note||'')}</textarea></label>
      <div class="ad-actions">${x.email?`<a class="btn primary" href="mailto:${esc(x.email)}?subject=${encodeURIComponent('SFX production: '+(x.project||t('nav.cta')))}">${t('ad.reply')}</a>`:''}
      ${x.phone?`<a class="btn glass" href="tel:${esc(String(x.phone).replace(/\s/g,''))}">${t('ad.call')} ${esc(x.phone)}</a>`:''}</div>`;
  }
  function csv(){
    const cols=['ref_code','created_at','status','name','company','email','phone','call_time','services','project','location','date','flexible','budget','link','details','description','note'];
    const q=v=>`"${String(Array.isArray(v)?v.join(', '):(v&&typeof v==='object'?Object.entries(v).map(e=>e.join(': ')).join('; '):(v??''))).replace(/"/g,'""')}"`;
    const text=[cols.join(';'), ...inq.map(x=>cols.map(c=>q(x[c])).join(';'))].join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8'})); a.download='poptavky.csv'; a.click();
  }

  /* ---------- blog ---------- */
  function blank(){ return {title:'', slug:'', lang:S.lang(), category:'video', services:[], client:'', published_at:new Date().toISOString().slice(0,10), lead:'', body:'', cover_url:'', gallery:[], published:false}; }
  function blogView(){
    return `<div class="ad-body${ed?' has-sel':''}"><section class="ad-list">
      <button class="btn primary ad-new" data-act="new">+ ${t('ad.new')}</button>
      <div class="ad-rows">${posts.length ? posts.map(p=>`<button class="ad-row${ed&&ed.id===p.id?' on':''}" data-pid="${p.id}">
        ${p.cover_url?`<img src="${esc(p.cover_url)}" alt="">`:'<span class="ph"></span>'}<span class="r-main"><b>${esc(p.title||'—')}</b><small>${p.published?t('ad.f.pub'):t('ad.f.draft')}, ${(p.lang||'cs').toUpperCase()}</small></span></button>`).join('') : `<p class="ad-empty">${t('ad.empty')}</p>`}</div></section>
      <section class="ad-detail">${ed ? editor(ed) : `<p class="ad-empty">${t('ad.empty')}</p>`}</section></div>`;
  }
  function editor(p){
    const opts = S.SERVICES.map(s=>`<option value="${s.id}" ${p.category===s.id?'selected':''}>${esc(svcName(s.id))}</option>`).join('');
    return `<button type="button" class="ad-back" data-act="back">← ${t('ad.blog')}</button><form class="ad-ed" id="adEd">
      <div class="ad-edhead"><label class="ad-pub"><input type="checkbox" name="published" ${p.published?'checked':''}> <span>${t('ad.f.pub')}</span></label>
        <div>${p.id&&p.published?`<a class="ad-link" href="${S.postLink({slug:p.slug,dyn:true})}" data-act="view">${t('ad.view')}</a>`:''}
        ${p.id?`<button type="button" class="ad-link danger" data-act="del">${t('ad.del')}</button>`:''}<button class="btn primary" type="submit">${t('ad.save')}</button></div></div>
      <p class="ad-err" id="adErr" role="alert"></p>
      <label class="w2">${t('ad.f.title')}<input name="title" value="${esc(p.title)}" required></label>
      <label>${t('ad.f.slug')}<input name="slug" value="${esc(p.slug)}" pattern="[a-z0-9\\-]+" required></label>
      <label>${t('ad.f.lang')}<select name="lang"><option value="cs" ${p.lang==='cs'?'selected':''}>Čeština</option><option value="en" ${p.lang==='en'?'selected':''}>English</option></select></label>
      <label>${t('ad.f.cat')}<select name="category">${opts}</select></label>
      <label>${t('ad.f.date')}<input name="published_at" type="date" value="${esc((p.published_at||'').slice(0,10))}"></label>
      <fieldset class="w2"><legend>${t('ad.f.svcs')}</legend><div class="ad-checks">${S.SERVICES.map(s=>`<label><input type="checkbox" name="services" value="${s.id}" ${(p.services||[]).includes(s.id)?'checked':''}> ${esc(svcName(s.id))}</label>`).join('')}</div></fieldset>
      <label class="w2">${t('ad.f.client')}<input name="client" value="${esc(p.client)}"></label>
      <label class="w2">${t('ad.f.lead')}<textarea name="lead" rows="2">${esc(p.lead)}</textarea></label>
      <label class="w2">${t('ad.f.body')}<textarea name="body" rows="12">${esc(p.body)}</textarea><small>${t('ad.f.bodyHint')}</small></label>
      <div class="w2 ad-media"><span>${t('ad.f.cover')}</span>
        <div class="ad-cover">${p.cover_url?`<img src="${esc(p.cover_url)}" alt="">`:''}<label class="btn glass">${t('ad.f.upload')}<input type="file" accept="image/*" data-up="cover" hidden></label></div></div>
      <div class="w2 ad-media"><span>${t('ad.f.gallery')}</span>
        <div class="ad-gal">${(p.gallery||[]).map((g,i)=>`<figure><img src="${esc(g)}" alt=""><button type="button" data-rm="${i}" aria-label="${t('ad.del')}">${X}</button></figure>`).join('')}
        <label class="ad-add">${t('ad.f.uploadMore')}<input type="file" accept="image/*" multiple data-up="gallery" hidden></label></div></div>
    </form>`;
  }
  function readForm(){
    const f=$('#adEd'); const fd=new FormData(f);
    Object.assign(ed, {title:fd.get('title').trim(), slug:slugify(fd.get('slug')), lang:fd.get('lang'), category:fd.get('category'), services:fd.getAll('services'),
      client:fd.get('client'), published_at:fd.get('published_at')||null, lead:fd.get('lead'), body:fd.get('body'), published:!!fd.get('published')});
    if(!ed.services.includes(ed.category)) ed.services.unshift(ed.category);
  }
  function wireEditor(){
    const f=$('#adEd'); if(!f) return;
    f.title.addEventListener('input', ()=>{ if(!slugTouched){ f.slug.value = slugify(f.title.value); } });
    f.slug.addEventListener('input', ()=>{ slugTouched=true; });
    f.addEventListener('submit', async e=>{ e.preventDefault(); if(busy) return; readForm();
      if(posts.some(p=>p.slug===ed.slug && p.id!==ed.id)){ $('#adErr').textContent = t('ad.f.slug')+': '+ed.slug+' ✕'; return; }
      busy=true; const btn=f.querySelector('button[type=submit]'); btn.disabled=true;
      try{ ed = await DB.savePost(ed); await load(); await publish(); render(); const b=$('#adEd button[type=submit]'); if(b){ b.textContent=t('ad.saved'); setTimeout(()=>{ b.textContent=t('ad.save'); }, 1600); } }
      catch(err){ $('#adErr').textContent = t('ad.err'); btn.disabled=false; }
      busy=false; });
    $$('input[type=file]').forEach(inp=>inp.addEventListener('change', async ()=>{ readForm(); const files=[...inp.files]; if(!files.length) return;
      try{ for(const file of files){ const url=await DB.uploadImage(file); if(inp.dataset.up==='cover') ed.cover_url=url; else (ed.gallery=ed.gallery||[]).push(url); } render(); }
      catch(err){ $('#adErr').textContent = t('ad.err'); } }));
  }
  async function publish(){ try{ S.setPosts(await DB.listPosts()); }catch(e){} }

  /* ---------- settings (notifications) ---------- */
  async function loadSettings(){
    try{ st = await DB.getSettings(); }catch(e){ st = {notify_channel:'sms', notify_phone:'', notify_email:'', autoreply:true}; }
    try{ stStatus = await DB.notifyStatus(); }catch(e){ stStatus = null; }
    if(tab==='set') render();
  }
  function setView(){
    if(!st) return `<div class="ad-set"><p class="ad-empty">…</p></div>`;
    const ch=st.notify_channel, yes=v=>v?`<b class="ok">✓ ${t('ad.on')}</b>`:`<b class="no">✗ ${t('ad.off')}</b>`;
    return `<div class="ad-set"><form id="adSet">
      <h3>${t('ad.notify')}</h3><p class="ad-hint">${t('ad.notifyP')}</p>
      <div class="ad-radio">${[['sms','SMS'],['email','E-mail'],['both',t('ad.both')],['none',t('ad.none')]].map(([v,l])=>`<label><input type="radio" name="ch" value="${v}" ${ch===v?'checked':''}> ${l}</label>`).join('')}</div>
      <label>${t('ad.phone')}<input name="phone" type="tel" value="${esc(st.notify_phone||'')}" placeholder="+420 732 765 163"></label>
      <label>${t('ad.mail')}<input name="email" type="email" value="${esc(st.notify_email||'')}" placeholder="sfx-production@seznam.cz"></label>
      <label class="ad-pub"><input type="checkbox" name="auto" ${st.autoreply?'checked':''}> <span>${t('ad.auto')}</span></label>
      <div class="ad-actions"><button class="btn primary" type="submit">${t('ad.save')}</button><button class="btn glass" type="button" data-act="test">${t('ad.test')}</button></div>
      <p class="ad-err" id="adErr" role="status">${esc(stMsg)}</p></form>
      <div class="ad-status"><h3>${t('ad.integr')}</h3>
        ${stStatus ? `<ul><li>${t('ad.sms')} ${yes(stStatus.sms)}</li><li>${t('ad.email')} ${yes(stStatus.email)}</li><li>${t('ad.spam')} ${yes(stStatus.turnstile)}</li></ul>` : `<p class="ad-hint">${DB.mode==='demo'?t('ad.demoSet'):'—'}</p>`}
        <h3>${t('ad.app')}</h3><p class="ad-hint">${t('ad.appP')}</p></div></div>`;
  }
  root.addEventListener('submit', async e=>{
    if(e.target.id!=='adSet') return; e.preventDefault(); const fd=new FormData(e.target);
    st={notify_channel:fd.get('ch'), notify_phone:String(fd.get('phone')||'').trim(), notify_email:String(fd.get('email')||'').trim(), autoreply:!!fd.get('auto')};
    try{ await DB.saveSettings(st); stMsg=t('ad.saved'); }catch(err){ stMsg=t('ad.err'); } render(); setTimeout(()=>{ stMsg=''; }, 2000);
  });

  /* ---------- events ---------- */
  root.addEventListener('click', async e=>{
    const b=e.target.closest('button,a'); if(!b) { if(e.target===root) close(); return; }
    const act=b.dataset.act;
    if(act==='close') return close();
    if(act==='back'){ selId=null; ed=null; return render(); }
    if(act==='test'){ stMsg='…'; render(); try{ const r=await DB.notifyTest(); stMsg = r.ok ? t('ad.testOk') : t('ad.testFail')+' '+(r.errors||[]).join(', '); }catch(err){ stMsg=t('ad.testFail'); } return render(); }
    if(act==='logout'){ await DB.signOut(); session=null; ed=null; selId=null; return render(); }
    if(act==='view'){ close(); return; }
    if(b.dataset.tab){ tab=b.dataset.tab; return render(); }
    if(b.dataset.f){ filter=b.dataset.f; return render(); }
    if(b.dataset.id){ selId=b.dataset.id; return render(); }
    if(act==='csv') return csv();
    if(act==='new'){ ed=blank(); slugTouched=false; return render(); }
    if(b.dataset.pid){ ed=JSON.parse(JSON.stringify(posts.find(p=>p.id===b.dataset.pid))); slugTouched=true; return render(); }
    if(b.dataset.rm!==undefined){ readForm(); ed.gallery.splice(+b.dataset.rm,1); return render(); }
    if(act==='del'){ if(!confirm(t('ad.delQ'))) return; try{ await DB.deletePost(ed.id); ed=null; await load(); await publish(); render(); }catch(err){ $('#adErr').textContent=t('ad.err'); } }
  });
  root.addEventListener('change', async e=>{
    const el=e.target; const x=inq.find(i=>i.id===selId);
    if(el.dataset.act==='status' && x){ x.status=el.value; try{ await DB.updateInquiry(x.id,{status:x.status}); }catch(err){} render(); }
    if(el.dataset.act==='note' && x){ x.note=el.value; try{ await DB.updateInquiry(x.id,{note:x.note}); }catch(err){} }
  });
  addEventListener('keydown', e=>{ if(e.key==='Escape' && !root.hidden) close(); });

  if(document.documentElement.dataset.page==='admin') open();
  return { open, close, toggle };
}
