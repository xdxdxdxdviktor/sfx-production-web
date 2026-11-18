/* Price calculator engine. Pure functions: used by the browser (live calculator)
   and by the build (prices in schema.org and on cards). */
import { CURRENCY } from './config.js';

export const L = (o, lang) => (o && typeof o === 'object' && !Array.isArray(o)) ? (o[lang] ?? o.cs) : o;

/* range field config, resolving byType against the current type */
/* unit label with Czech/English plural forms: string or [one, few(2–4), many] */
export function unitFor(unit, n, lang){
  const u = L(unit, lang); if(!Array.isArray(u)) return u || '';
  if(lang==='cs') return n===1 ? u[0] : (n>=2 && n<=4) ? u[1] : u[2];
  return n===1 ? u[0] : u[u.length-1];
}

export function rangeCfg(f, state){
  if(!f.byType) return f;
  return f.byType[state.type] || null;
}

export function defaults(svc){
  const s = {};
  for(const f of svc.calc.fields){
    if(f.kind==='choice') s[f.id] = f.opts[0].id;
    else if(f.kind==='extras') s[f.id] = [];
  }
  for(const f of svc.calc.fields){
    if(f.kind==='range'){ const c = rangeCfg(f, s); if(c) s[f.id] = c.def; }
  }
  return s;
}

/* make sure every value is valid (used after loading a shared link) */
export function sanitize(svc, raw){
  const s = defaults(svc);
  for(const f of svc.calc.fields){
    const v = raw[f.id];
    if(v===undefined) continue;
    if(f.kind==='choice' && f.opts.some(o=>o.id===String(v))) s[f.id] = String(v);
    if(f.kind==='extras'){ const arr = Array.isArray(v) ? v : String(v).split('+'); s[f.id] = arr.filter(id=>f.opts.some(o=>o.id===id)); }
  }
  for(const f of svc.calc.fields){
    if(f.kind!=='range') continue;
    const c = rangeCfg(f, s); if(!c){ delete s[f.id]; continue; }
    const n = Number(raw[f.id]); s[f.id] = Number.isFinite(n) ? Math.min(c.max, Math.max(c.min, Math.round(n/c.step)*c.step)) : c.def;
  }
  return s;
}

export function compute(svc, state, lang='cs'){
  const lines = []; let lo = 0, hi = 0, mult = 1;
  const add = (label, a, b) => { lo += a; hi += b; if(a||b) lines.push({label, min:a, max:b}); };
  for(const f of svc.calc.fields){
    if(f.kind==='choice'){
      const o = f.opts.find(x=>x.id===state[f.id]) || f.opts[0];
      if(o.add) add(`${L(f.label,lang)}: ${L(o.label,lang)}`, o.add[0], o.add[1]);
      if(o.mult && o.mult!==1){ mult *= o.mult; lines.push({label:`${L(f.label,lang)}: ${L(o.label,lang)}`, mult:o.mult}); }
    } else if(f.kind==='range'){
      const c = rangeCfg(f, state); if(!c) continue;
      const n = Math.max(0, (state[f.id] ?? c.def) - (c.free||0));
      if(n>0) add(`${L(c.label,lang)}: ${state[f.id]} ${unitFor(c.unit, state[f.id], lang)}`, n*c.price[0], n*c.price[1]);
    } else if(f.kind==='extras'){
      for(const o of f.opts){
        if(!(state[f.id]||[]).includes(o.id)) continue;
        const k = o.per ? (state[o.per] || 1) : 1;
        if(o.add) add(L(o.label,lang) + (k>1?` (${k}×)`:''), o.add[0]*k, o.add[1]*k);
        if(o.mult){ mult *= o.mult; lines.push({label:L(o.label,lang), mult:o.mult}); }
      }
    }
  }
  lo *= mult; hi *= mult;
  const step = hi > 60000 ? 1000 : 500;
  return { min: Math.floor(lo/step)*step, max: Math.ceil(hi/step)*step, lines, days: svc.calc.days };
}

/* money formatting: CZK for Czech, EUR (converted) for English */
export function money(czk, lang){
  if(lang==='en'){
    const e = czk / CURRENCY.eurRate;
    if(e > 0 && e < 10) return '€' + e.toFixed(2);
    const r = e >= 2000 ? 50 : e >= 100 ? 10 : 1;
    return '€' + (Math.round(e/r)*r).toLocaleString('en-GB');
  }
  return Math.round(czk).toLocaleString('cs-CZ').replace(/\s/g,' ') + ' Kč';
}
export function moneyRange(a, b, lang){
  if(!b) return '—';
  if(lang==='en') return `${money(a,lang)} – ${money(b,lang)}`;
  const k = v => (v/1000).toLocaleString('cs-CZ', {maximumFractionDigits:1});
  return a>=10000 ? `${k(a)}–${k(b)} tis. Kč` : `${money(a,lang)} – ${money(b,lang)}`;
}

/* budget bucket of the enquiry form for a given estimate (index into I18N budgets) */
export function budgetBucket(min, max){
  const mid = (min+max)/2;
  return mid < 20000 ? 0 : mid < 50000 ? 1 : mid < 100000 ? 2 : 3;
}

/* share state in the URL: #kalkulacka=type:corp,days:2,ex:drone+vo */
export function encodeState(state){
  return Object.entries(state).map(([k,v])=>`${k}:${Array.isArray(v)?v.join('+'):v}`).join(',');
}
export function decodeState(str){
  const o = {}; String(str||'').split(',').forEach(p=>{ const [k,v] = p.split(':'); if(k && v!==undefined) o[k] = decodeURIComponent(v); });
  return o;
}
