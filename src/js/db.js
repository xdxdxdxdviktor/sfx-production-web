/* SFX data layer.
   - Enquiries: Supabase Edge Function 'inquiry' when Supabase is configured, otherwise FormSubmit (email delivery).
   - Blog CMS + admin: Supabase only. Without it the admin runs as a local demo in this browser. */
import { RUNTIME, COMPANY } from './config.js';

const ls = { get(k,d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch(e){ return d; } }, set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } } };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-'+Date.now()+'-'+Math.random().toString(16).slice(2));

function shrink(file, max=1800, q=.84){
  return new Promise((res, rej)=>{
    const fr=new FileReader(); fr.onerror=rej;
    fr.onload=()=>{ const im=new Image(); im.onerror=rej; im.onload=()=>{
      const k=Math.min(1, max/Math.max(im.width, im.height)); const c=document.createElement('canvas');
      c.width=Math.round(im.width*k); c.height=Math.round(im.height*k); c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      c.toBlob(b=>res({blob:b, dataUrl:c.toDataURL('image/jpeg', q)}), 'image/jpeg', q); }; im.src=fr.result; };
    fr.readAsDataURL(file);
  });
}

/* FormSubmit: one POST, the enquiry lands in the inbox as a table. */
async function sendByEmail(rec, text){
  if(!RUNTIME.formEndpoint) throw new Error('no endpoint');
  const L = rec.lang==='cs';
  const body = {
    _subject: `${L?'Poptávka':'Enquiry'} ${rec.ref_code}${rec.project?': '+rec.project:''} – ${rec.name}`,
    _template: 'table', _captcha: 'false', _honey: '',
    [L?'Číslo poptávky':'Enquiry no.']: rec.ref_code,
    [L?'Jméno':'Name']: rec.name,
    [L?'Firma':'Company']: rec.company || '—',
    email: rec.email || '',
    [L?'Telefon':'Phone']: rec.phone ? rec.phone + (rec.call_time ? ` (${rec.call_time})` : '') : '—',
    [L?'Služby':'Services']: rec.services_label,
    [L?'Upřesnění':'Details']: Object.entries(rec.details||{}).map(([k,v])=>`${k}: ${v}`).join('; ') || '—',
    [L?'Kalkulace':'Estimate']: rec.estimate || '—',
    [L?'Termín':'Date']: (rec.date || '—') + (rec.flexible ? (L?' (flexibilní)':' (flexible)') : ''),
    [L?'Lokalita':'Location']: rec.location || '—',
    [L?'Rozpočet':'Budget']: rec.budget || '—',
    [L?'Projekt':'Project']: rec.project || '—',
    [L?'Odkaz':'Link']: rec.link || '—',
    [L?'Popis':'Description']: rec.description,
    [L?'Jazyk webu':'Site language']: rec.lang
  };
  if(rec.email) body._replyto = rec.email;
  const r = await fetch(RUNTIME.formEndpoint, {method:'POST', headers:{'Content-Type':'application/json', Accept:'application/json'}, body:JSON.stringify(body)});
  const j = await r.json().catch(()=>({}));
  if(!r.ok || String(j.success)!=='true'){ const e = new Error(j.message || ('HTTP '+r.status)); e.code = 'send'; throw e; }
  return {ref: rec.ref_code};
}

const DEFAULT_SETTINGS = {notify_channel:'email', notify_phone:'', notify_email:COMPANY.email, autoreply:true};
const demo = {
  mode:'demo',
  async session(){ return ls.get('sfx-db-session', null); },
  async signIn(){ const s={user:{email:'demo@sfxproduction.com'}}; ls.set('sfx-db-session', s); return s; },
  async signOut(){ localStorage.removeItem('sfx-db-session'); },
  async listPosts(){ return ls.get('sfx-db-posts', []); },
  async savePost(p){ const all=ls.get('sfx-db-posts', []); const now=new Date().toISOString();
    if(!p.id){ p.id=uid(); p.created_at=now; all.unshift(p); } else { const i=all.findIndex(x=>x.id===p.id); if(i>=0) all[i]=p; else all.unshift(p); }
    p.updated_at=now; if(!ls.set('sfx-db-posts', all)) throw new Error('storage full'); return p; },
  async deletePost(id){ ls.set('sfx-db-posts', ls.get('sfx-db-posts', []).filter(x=>x.id!==id)); },
  async uploadImage(file){ const r=await shrink(file, 1400, .8); return r.dataUrl; },
  async addInquiry(rec){
    const res = await sendByEmail(rec);
    const all=ls.get('sfx-db-inq', []); all.unshift(Object.assign({id:uid(), created_at:new Date().toISOString(), status:'new', note:''}, rec)); ls.set('sfx-db-inq', all.slice(0,50));
    return res; },
  async listInquiries(){ return ls.get('sfx-db-inq', []); },
  async updateInquiry(id, patch){ const all=ls.get('sfx-db-inq', []); const i=all.findIndex(x=>x.id===id); if(i>=0){ Object.assign(all[i], patch); ls.set('sfx-db-inq', all); } },
  async getSettings(){ return Object.assign({}, DEFAULT_SETTINGS, ls.get('sfx-db-settings', {})); },
  async saveSettings(s){ ls.set('sfx-db-settings', s); },
  async notifyStatus(){ return {sms:false, email:!!RUNTIME.formEndpoint, turnstile:false, demo:true}; },
  async notifyTest(){ return {ok:false, errors:['demo']}; }
};

function live(){
  const URL_ = RUNTIME.supabaseUrl.replace(/\/$/,''), KEY = RUNTIME.supabaseAnonKey;
  const H = {apikey:KEY, Authorization:'Bearer '+KEY};
  let sbP = null;
  const sb = () => sbP || (sbP = new Promise((res, rej)=>{
    if(window.supabase) return res(window.supabase.createClient(URL_, KEY));
    const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js'; s.onload=()=>res(window.supabase.createClient(URL_, KEY)); s.onerror=rej; document.head.appendChild(s);
  }));
  const ok = ({data, error}) => { if(error) throw error; return data; };
  const fn = async (body, auth) => {
    const r = await fetch(URL_+'/functions/v1/inquiry', {method:'POST', headers:{'Content-Type':'application/json', apikey:KEY, Authorization:'Bearer '+(auth||KEY)}, body:JSON.stringify(body)});
    const j = await r.json().catch(()=>({})); if(!r.ok){ const e=new Error(j.error||('HTTP '+r.status)); e.code=j.error; e.field=j.field; throw e; } return j;
  };
  const token = async () => { const c=await sb(); const {data}=await c.auth.getSession(); return data.session && data.session.access_token; };
  return {
    mode:'supabase',
    async session(){ const c=await sb(); const {data}=await c.auth.getSession(); return data.session; },
    async signIn(email, password){ const c=await sb(); return ok(await c.auth.signInWithPassword({email, password})); },
    async signOut(){ const c=await sb(); await c.auth.signOut(); },
    async listPosts(all=false){
      if(all){ const c=await sb(); return ok(await c.from('posts').select('*').order('published_at',{ascending:false})); }
      const r=await fetch(URL_+'/rest/v1/posts?select=*&published=eq.true&order=published_at.desc', {headers:H}); if(!r.ok) throw new Error('posts'); return r.json(); },
    async savePost(p){ const c=await sb(); const row=Object.assign({}, p); delete row.created_at; row.updated_at=new Date().toISOString(); if(!row.id) delete row.id;
      return ok(await c.from('posts').upsert(row).select().single()); },
    async deletePost(id){ const c=await sb(); ok(await c.from('posts').delete().eq('id', id)); },
    async uploadImage(file){ const c=await sb(); const r=await shrink(file); const path=`${new Date().getFullYear()}/${uid()}.jpg`;
      ok(await c.storage.from('blog').upload(path, r.blob, {contentType:'image/jpeg', upsert:false}));
      return c.storage.from('blog').getPublicUrl(path).data.publicUrl; },
    async addInquiry(rec, captcha){ return fn({action:'submit', record:rec, token:captcha||''}); },
    async listInquiries(){ const c=await sb(); return ok(await c.from('inquiries').select('*').order('created_at',{ascending:false})); },
    async updateInquiry(id, patch){ const c=await sb(); ok(await c.from('inquiries').update(patch).eq('id', id)); },
    async getSettings(){ const c=await sb(); return ok(await c.from('settings').select('*').eq('id',1).single()); },
    async saveSettings(s){ const c=await sb(); ok(await c.from('settings').update({notify_channel:s.notify_channel, notify_phone:s.notify_phone, notify_email:s.notify_email, autoreply:!!s.autoreply, updated_at:new Date().toISOString()}).eq('id',1)); },
    async notifyStatus(){ return (await fn({action:'status'}, await token())).status; },
    async notifyTest(){ return fn({action:'test'}, await token()); }
  };
}

export const DB = (RUNTIME.supabaseUrl && RUNTIME.supabaseAnonKey) ? live() : demo;
