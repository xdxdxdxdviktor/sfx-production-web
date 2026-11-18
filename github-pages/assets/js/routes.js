/* URL map for both languages + relative link helper (works on any host or sub-folder). */
export const LANGS = ['cs','en'];

export const PATHS = {
  home:     {cs:'/',                         en:'/en/'},
  services: {cs:'/sluzby/',                  en:'/en/services/'},
  blog:     {cs:'/blog/',                    en:'/en/blog/'},
  article:  {cs:'/blog/clanek/',             en:'/en/blog/article/'},   // CMS posts (client-side)
  legal:    {cs:'/pravni-informace/',        en:'/en/legal/'},
  privacy:  {cs:'/ochrana-osobnich-udaju/',  en:'/en/privacy/'},
  cookies:  {cs:'/cookies/',                 en:'/en/cookies/'},
  admin:    {cs:'/admin/',                   en:'/admin/'}
};
export const FORM_HASH = {cs:'#poptavka', en:'#poptavka'};

export const svcPath  = (svc, lang) => PATHS.services[lang] + svc.slug[lang] + '/';
export const postPath = (p, lang)   => PATHS.blog[lang] + p.slug[lang] + '/';

/* relative URL from page `from` (site path, ends with "/" or ".html") to site path `to` */
export function rel(from, to){
  if(/^(https?:|mailto:|tel:|#|data:)/.test(to)) return to;
  const dir = from.endsWith('/') ? from : from.replace(/[^/]*$/, '');
  const depth = dir.split('/').filter(Boolean).length;
  const out = '../'.repeat(depth) + to.replace(/^\//, '');
  return out === '' ? './' : (out.startsWith('#') ? './' + out : out);
}
