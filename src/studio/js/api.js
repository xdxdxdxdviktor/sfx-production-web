/* SFX Studio — data layer: GitHub (content + deploys), Umami (statistics), Supabase (enquiries + login). */
import { store, textToB64 } from './lib.js';

export const CFG = window.STUDIO || {};
const REPO = CFG.repo, BRANCH = CFG.branch || 'main';

/* ---------- secrets (kept in this browser, or loaded from Supabase after login) ---------- */
export const secrets = {
  get gh(){ return store.get('studio-gh') || ''; }, set gh(v){ v ? store.set('studio-gh', v) : store.del('studio-gh'); },
  get umami(){ return store.get('studio-umami') || ''; }, set umami(v){ v ? store.set('studio-umami', v) : store.del('studio-umami'); },
};

/* ---------- GitHub ---------- */
async function gh(path, {method='GET', body, raw=false, auth=true}={}){
  const h = {Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28'};
  if(auth && secrets.gh) h.Authorization = 'Bearer ' + secrets.gh;
  if(body) h['Content-Type'] = 'application/json';
  const r = await fetch('https://api.github.com' + path, {method, headers:h, body: body ? JSON.stringify(body) : undefined, cache:'no-store'});
  if(!r.ok){
    // public repo: reads still work without the token (e.g. a token without the Actions permission)
    if(auth && method==='GET' && (r.status===403 || r.status===401) && !path.startsWith('/user')) return gh(path, {raw, auth:false});
    const j = await r.json().catch(()=>({}));
    const e = new Error(j.message || ('GitHub ' + r.status)); e.status = r.status; throw e;
  }
  return raw ? r.text() : (r.status === 204 ? null : r.json());
}
export const GH = {
  me: () => gh('/user'),
  repo: () => gh(`/repos/${REPO}`),
  list: dir => gh(`/repos/${REPO}/contents/${dir}?ref=${BRANCH}`),
  readText: p => gh(`/repos/${REPO}/contents/${p}?ref=${BRANCH}`, {raw:true}),
  async readJSON(p){ return JSON.parse(await this.readText(p)); },
  commits: (n=12) => gh(`/repos/${REPO}/commits?sha=${BRANCH}&per_page=${n}`),
  runs: (n=10) => gh(`/repos/${REPO}/actions/runs?branch=${BRANCH}&per_page=${n}`).then(j => j.workflow_runs || []),
  /* one commit with any number of files: [{path, text}|{path, b64}|{path, delete:true}] */
  async commit(files, message){
    const ref = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
    const base = await gh(`/repos/${REPO}/git/commits/${ref.object.sha}`);
    const tree = [];
    for(const f of files){
      if(f.delete){ tree.push({path:f.path, mode:'100644', type:'blob', sha:null}); continue; }
      const blob = await gh(`/repos/${REPO}/git/blobs`, {method:'POST', body:{content: f.b64 ?? textToB64(f.text), encoding:'base64'}});
      tree.push({path:f.path, mode:'100644', type:'blob', sha:blob.sha});
    }
    const t = await gh(`/repos/${REPO}/git/trees`, {method:'POST', body:{base_tree: base.tree.sha, tree}});
    const c = await gh(`/repos/${REPO}/git/commits`, {method:'POST', body:{message: message + '\n\n(SFX Studio)', tree:t.sha, parents:[ref.object.sha]}});
    await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, {method:'PATCH', body:{sha:c.sha}});
    return c.sha;
  }
};
/* live URL of a site asset; fresh uploads come straight from the repository until the next deploy */
export const assetUrl = p => !p ? '' : /^https?:/.test(p) ? p
  : p.startsWith('/assets/uploads/') ? `https://raw.githubusercontent.com/${REPO}/${BRANCH}/src${p}` : CFG.site + p;

/* deploy watcher: one shared poller, views subscribe to it */
const subs = new Set(); let runsCache = [], pollT = null, fast = false;
export const deploys = {
  get list(){ return runsCache; },
  on(fn){ subs.add(fn); fn(runsCache); return () => subs.delete(fn); },
  async refresh(){
    try{ runsCache = await GH.runs(10); }catch(e){ runsCache = runsCache || []; }
    subs.forEach(f => f(runsCache));
    fast = runsCache.some(r => r.status !== 'completed');
    clearTimeout(pollT); pollT = setTimeout(()=>this.refresh(), fast ? 6000 : 45000);
    return runsCache;
  },
  expect(){ fast = true; clearTimeout(pollT); pollT = setTimeout(()=>this.refresh(), 4000); }
};

/* ---------- Umami Cloud API (key stays in this browser) ---------- */
async function um(path, params={}){
  const q = new URLSearchParams(params).toString();
  const r = await fetch(`https://api.umami.is/v1/websites/${CFG.umamiWebsite}${path}${q?'?'+q:''}`, {headers:{'x-umami-api-key': secrets.umami, Accept:'application/json'}});
  if(!r.ok){ const e = new Error('Umami ' + r.status); e.status = r.status; throw e; }
  return r.json();
}
const val = x => typeof x === 'number' ? x : (x && typeof x === 'object' ? (x.value ?? 0) : 0);
const prev = x => x && typeof x === 'object' ? (x.prev ?? null) : null;
export const UM = {
  ready: () => !!(secrets.umami && CFG.umamiWebsite),
  async stats(startAt, endAt){
    const s = await um('/stats', {startAt, endAt});
    const cmp = s.comparison || {};
    const pick = k => ({v: val(s[k]), p: prev(s[k]) ?? (cmp[k] != null ? val(cmp[k]) : null)});
    return {pageviews:pick('pageviews'), visitors:pick('visitors'), visits:pick('visits'), bounces:pick('bounces'), totaltime:pick('totaltime')};
  },
  async series(startAt, endAt, unit='day'){
    const j = await um('/pageviews', {startAt, endAt, unit, timezone:'Europe/Prague'});
    return {pageviews: j.pageviews || [], sessions: j.sessions || []};
  },
  async metrics(type, startAt, endAt, limit=8){
    const types = type === 'path' ? ['path','url'] : [type];
    for(const t of types){ try{ return (await um('/metrics', {type:t, startAt, endAt, limit})).slice(0, limit); }catch(e){ if(t === types[types.length-1]) throw e; } }
    return [];
  },
  async active(){ const j = await um('/active'); return val(j.visitors ?? j.x ?? j); }
};

/* ---------- Supabase (enquiries + team login) ---------- */
let sb = null;
export const SB = {
  enabled: () => !!(CFG.supabase && CFG.supabase.url && CFG.supabase.anon),
  async client(){
    if(sb) return sb;
    if(!window.supabase) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    sb = window.supabase.createClient(CFG.supabase.url, CFG.supabase.anon, {auth:{persistSession:true, storageKey:'studio-sb'}});
    return sb;
  },
  async session(){ if(!this.enabled()) return null; const c = await this.client(); return (await c.auth.getSession()).data.session; },
  async signIn(email, password){ const c = await this.client(); const {data, error} = await c.auth.signInWithPassword({email, password}); if(error) throw error; return data.session; },
  async signOut(){ if(sb) await sb.auth.signOut(); },
  async loadSecrets(){
    const c = await this.client(); const {data} = await c.from('studio_secrets').select('key,value');
    for(const r of data || []){ if(r.key === 'github_token' && r.value) secrets.gh = r.value; if(r.key === 'umami_key' && r.value) secrets.umami = r.value; }
  },
  async saveSecret(key, value){ const c = await this.client(); const {error} = await c.from('studio_secrets').upsert({key, value}); if(error) throw error; },
  async leads(){ const c = await this.client(); const {data, error} = await c.from('leads').select('*').order('created_at', {ascending:false}).limit(500); if(error) throw error; return data; },
  async updateLead(id, patch){ const c = await this.client(); const {error} = await c.from('leads').update({...patch, updated_at:new Date().toISOString()}).eq('id', id); if(error) throw error; },
  async deleteLead(id){ const c = await this.client(); const {error} = await c.from('leads').delete().eq('id', id); if(error) throw error; },
  async newCount(){ try{ const c = await this.client(); const {count} = await c.from('leads').select('id', {count:'exact', head:true}).eq('status','new'); return count || 0; }catch(e){ return 0; } }
};
