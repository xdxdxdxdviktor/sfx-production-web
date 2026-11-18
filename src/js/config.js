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

const S = SETTINGS, B = S.billing || {}, BR = S.branch || {};
export const COMPANY = {
  name: 'SFX production', person: 'Jiří Hromádka', email: 'sfx-production@seznam.cz', phone: '', founded: '',
  ...(S.company || {}),
  /* billing details (fakturační údaje) */
  owner: B.owner || '', ico: B.ico || '', dic: B.dic || '', vatPayer: !!B.vat_payer, register: B.register || '', bank: B.bank || '',
  street: B.street || '', city: B.city || '', zip: B.zip || '',
  /* branch office (provozovna) – used for local SEO */
  branch: { street: BR.street || '', city: BR.city || '', zip: BR.zip || '', region: BR.region || '', note: BR.note || '' },
  /* regions we work in */
  areas: (S.areas || []).map(x => typeof x === 'string' ? x : x.area).filter(Boolean)
};
COMPANY.sameAs = (COMPANY.sameAs || []).map(x => typeof x === 'string' ? x : x.url).filter(Boolean);
COMPANY.areaServed = COMPANY.areas.length ? COMPANY.areas : ['Česká republika'];
/* ISO 3166-2 codes for geo meta tags */
export const REGION_CODES = { 'Ústecký kraj':'CZ-42', 'Liberecký kraj':'CZ-51', 'Praha':'CZ-10', 'Hlavní město Praha':'CZ-10', 'Středočeský kraj':'CZ-20' };

/* Search Console / Bing / Seznam verification codes (edited in the admin console). */
/* Cookie-less visitor analytics, set in the admin: provider = plausible | umami | goatcounter | cloudflare */
export const ANALYTICS = Object.assign({ provider: '', id: '' }, SETTINGS.analytics || {});

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
