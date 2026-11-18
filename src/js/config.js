/* =====================================================================
   SFX production — technical configuration.
   Company details, texts and media are edited in the admin console (/admin/)
   and live in /content. This file holds only technical settings.
   ===================================================================== */
import { SETTINGS } from './site-content.js';

/* Main address of the site (canonical URLs, sitemap, Open Graph). No trailing slash.
   After buying a domain: set it here (e.g. 'https://www.sfxproduction.cz') and add it in GitHub → Settings → Pages → Custom domain. */
export const SITE = 'https://xdxdxdxdviktor.github.io/sfx-production-web';
export const CUSTOM_DOMAIN = !/\.github\.io/.test(SITE);

/* Search engines: true = the site may be indexed (production). */
export const INDEXABLE = true;

/* GitHub repository the admin console commits to (owner/name) and its branch. */
export const GITHUB = { repo: 'xdxdxdxdviktor/sfx-production-web', branch: 'main' };

export const COMPANY = Object.assign({
  name: 'SFX production', person: 'Jiří Hromádka', owner: '', ico: '', street: '', city: '', zip: '', region: '', register: '',
  phone: '', email: 'sfx-production@seznam.cz', areaServed: ['Česká republika'], sameAs: [], founded: ''
}, SETTINGS.company || {});
COMPANY.areaServed = (COMPANY.areaServed || []).filter(Boolean);
COMPANY.sameAs = (COMPANY.sameAs || []).map(x => typeof x === 'string' ? x : x.url).filter(Boolean);

/* Search Console / Bing / Seznam verification codes (edited in the admin console). */
export const VERIFY = Object.assign({ google: '', bing: '', seznam: '' }, SETTINGS.verify || {});

/* Enquiry form delivery: FormSubmit AJAX endpoint. The very first enquiry sends an activation
   email to the address; after one click every enquiry arrives in that inbox. */
export const RUNTIME = {
  formEndpoint: 'https://formsubmit.co/ajax/' + COMPANY.email,
  turnstileSiteKey: '',
  showSamples: false     // true = show sample references and partners (preview only)
};

export const MATTERPORT_ID = 'SxQL3iGyoDo'; // veřejná ukázka Matterportu, nahradit vlastním modelem
export const PARTNER_URLS = ['', '', '', '', '', '']; // doplnit odkazy na weby partnerů
