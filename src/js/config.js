/* =====================================================================
   SFX production — site configuration.
   Everything that is "fill in before launch" lives here.
   ===================================================================== */

export const SITE = 'https://www.sfxproduction.com';   // final domain, used for canonical URLs, sitemap and Open Graph

/* Search engines: true = the site may be indexed (production). */
export const INDEXABLE = true;

/* Company details. Required on a Czech business website (§ 435 OZ).
   City + region also power local SEO (titles, schema.org address). Empty = hidden. */
export const COMPANY = {
  name: 'SFX production',
  person: 'Jiří Hromádka',
  owner: '',            // obchodní firma nebo jméno podnikatele
  ico: '',              // IČO
  street: '',           // ulice a č. p.
  city: '',             // město, např. "Ústí nad Labem"
  zip: '',              // PSČ
  region: '',           // kraj, např. "Ústecký kraj"
  register: '',         // např. "zapsán v živnostenském rejstříku"
  phone: '',            // veřejný telefon, např. "+420 777 123 456"
  email: 'sfx-production@seznam.cz',
  areaServed: ['Česká republika'],
  /* profily, které Google spojí s firmou (Google Business Profile, Firmy.cz, Instagram, YouTube, LinkedIn…) */
  sameAs: [],
  founded: ''           // rok založení, např. "2021"
};

/* Search Console / Bing / Seznam ověření: vložte kód z meta tagu (jen hodnotu content). */
export const VERIFY = { google: '', bing: '', seznam: '' };

/* Enquiry form delivery.
   - formEndpoint: FormSubmit AJAX endpoint. The first enquiry sends an activation email
     to the address below; after one click every enquiry arrives in that inbox.
   - supabaseUrl + supabaseAnonKey: optional, switches on the database + admin (see db.js). */
export const RUNTIME = {
  formEndpoint: 'https://formsubmit.co/ajax/' + COMPANY.email,
  supabaseUrl: '',
  supabaseAnonKey: '',
  turnstileSiteKey: '',
  showSamples: false     // true = show sample references and partners (preview only)
};

export const MATTERPORT_ID = 'SxQL3iGyoDo'; // veřejná ukázka Matterportu, nahradit vlastním modelem
export const PARTNER_URLS = ['', '', '', '', '', '']; // doplnit odkazy na weby partnerů

/* Price display. EUR prices on the English site are converted at this rate and rounded. */
export const CURRENCY = { eurRate: 25 };
