/* Enquiry delivery: FormSubmit (one POST, the enquiry lands in the inbox as a table). */
import { RUNTIME } from './config.js';

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

export const DB = { addInquiry: rec => sendByEmail(rec) };
