/* Enquiry delivery: FormSubmit e-mail (the enquiry lands in the inbox as a table)
   + a copy in the Supabase database for the SFX Studio enquiry board (when configured). */
import { RUNTIME, SUPABASE } from './config.js';

async function sendByEmail(rec){
  if(!RUNTIME.formEndpoint) throw new Error('no endpoint');
  const L = rec.lang==='cs';
  const body = {
    _subject: `${L?'Poptávka':'Enquiry'} ${rec.ref_code} – ${rec.services_label} – ${rec.name}`,
    _template: 'table', _captcha: 'false', _honey: '',
    _blacklist: 'viagra, casino, crypto, bitcoin, forex, backlinks, seo services, loan offer, porn',
    [L?'Číslo poptávky':'Enquiry no.']: rec.ref_code,
    [L?'Jméno':'Name']: rec.name,
    [L?'Firma':'Company']: rec.company || '—',
    email: rec.email || '',
    [L?'Telefon':'Phone']: rec.phone ? rec.phone + (rec.call_time ? ` (${rec.call_time})` : '') : '—',
    [L?'Služby':'Services']: rec.services_label,
    [L?'Termín':'Date']: (rec.date || '—') + (rec.flexible ? (L?' (flexibilní)':' (flexible)') : ''),
    [L?'Lokalita':'Location']: rec.location || '—',
    [L?'Rozpočet':'Budget']: rec.budget || '—',
    [L?'Popis':'Description']: rec.description,
    [L?'Jazyk webu':'Site language']: rec.lang
  };
  if(rec.email) body._replyto = rec.email;
  const r = await fetch(RUNTIME.formEndpoint, {method:'POST', headers:{'Content-Type':'application/json', Accept:'application/json'}, body:JSON.stringify(body)});
  const j = await r.json().catch(()=>({}));
  if(!r.ok || String(j.success)!=='true'){ const e = new Error(j.message || ('HTTP '+r.status)); e.code = 'send'; throw e; }
  return {ref: rec.ref_code};
}

/* insert-only for visitors; reading is limited to the team by row-level security */
async function saveToDb(rec){
  if(!SUPABASE.url || !SUPABASE.anon) return false;
  const row = {ref_code:rec.ref_code, name:rec.name, company:rec.company, email:rec.email, phone:rec.phone, call_time:rec.call_time,
    services:rec.services || [], services_label:rec.services_label, date:rec.date, flexible:!!rec.flexible, location:rec.location || null,
    budget:rec.budget, description:rec.description, lang:rec.lang};
  const r = await fetch(SUPABASE.url + '/rest/v1/leads', {method:'POST', headers:{'Content-Type':'application/json', apikey:SUPABASE.anon, Authorization:'Bearer ' + SUPABASE.anon, Prefer:'return=minimal'}, body:JSON.stringify(row)});
  return r.ok;
}

/* the enquiry counts as sent when either channel works; e-mail stays the primary one */
async function addInquiry(rec){
  const [mail, db] = await Promise.allSettled([sendByEmail(rec), saveToDb(rec)]);
  if(mail.status === 'fulfilled') return mail.value;
  if(db.status === 'fulfilled' && db.value === true) return {ref: rec.ref_code};
  throw mail.reason;
}

export const DB = { addInquiry };
