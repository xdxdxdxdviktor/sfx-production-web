/* Legal pages (rendered at build time). */
import { COMPANY, RUNTIME, ANALYTICS } from './config.js';
const AN = {plausible:'Plausible Analytics', umami:'Umami', goatcounter:'GoatCounter', cloudflare:'Cloudflare Web Analytics'};

const todo = l => `<i>${l==='cs'?'doplníme':'to be added'}</i>`;
const mail = () => `<a href="mailto:${COMPANY.email}">${COMPANY.email}</a>`;
const addr = (a = COMPANY) => [a.street, [a.zip, a.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
const vat = l => COMPANY.dic ? `<br>${l==='cs'?'DIČ':'VAT ID'}: ${COMPANY.dic}` : (COMPANY.ico ? `<br>${l==='cs'?'Neplátce DPH':'Not a VAT payer'}` : '');
const branch = l => COMPANY.branch.city ? `<br>${l==='cs'?'Provozovna':'Branch office'}: ${addr(COMPANY.branch)}` : '';
const processor = l => /formsubmit/.test(RUNTIME.formEndpoint)
  ? (l==='cs' ? ' a služba FormSubmit (formsubmit.co), přes kterou se poptávka z formuláře doručí do naší e-mailové schránky'
              : ' and FormSubmit (formsubmit.co), which delivers the enquiry from the form to our inbox') : '';

export const LEGAL = {
 legal:{
  cs:{t:'Právní informace', d:'Provozovatel webu SFX production, autorská práva a odpovědnost.', body:()=>`
   <h2>Provozovatel webu</h2>
   <p>${COMPANY.owner||'<i>Obchodní firma / jméno: doplníme</i>'}<br>IČO: ${COMPANY.ico||todo('cs')}${vat('cs')}<br>Sídlo: ${addr()||todo('cs')}${branch('cs')}<br>${COMPANY.register||'<i>Zápis v rejstříku: doplníme</i>'}</p>
   <p>E-mail: ${mail()}${COMPANY.phone?'<br>Telefon: '+COMPANY.phone:''}</p>
   <h2>Autorská práva</h2>
   <p>Veškerý obsah tohoto webu, zejména fotografie, videa, vizualizace, texty a grafika, je chráněn autorským zákonem (zákon č. 121/2000 Sb.). Bez předchozího písemného souhlasu jej není dovoleno kopírovat, šířit ani jinak používat.</p>
   <h2>Odpovědnost</h2>
   <p>Informace na webu mají informativní charakter a nejsou nabídkou k uzavření smlouvy. Konkrétní podmínky spolupráce a cenu vždy uvádíme v nabídce.</p>`},
  en:{t:'Legal information', d:'Website operator, copyright and liability.', body:()=>`
   <h2>Website operator</h2>
   <p>${COMPANY.owner||'<i>Company / name: to be added</i>'}<br>Company ID (IČO): ${COMPANY.ico||todo('en')}${vat('en')}<br>Registered office: ${addr()||todo('en')}${branch('en')}<br>${COMPANY.register||'<i>Register entry: to be added</i>'}</p>
   <p>Email: ${mail()}${COMPANY.phone?'<br>Phone: '+COMPANY.phone:''}</p>
   <h2>Copyright</h2>
   <p>All content on this website, including photos, videos, visualisations, text and graphics, is protected by the Czech Copyright Act (No. 121/2000 Coll.). It may not be copied, distributed or otherwise used without prior written consent.</p>
   <h2>Liability</h2>
   <p>Information on this website is for general information and is not an offer to enter into a contract. Specific terms and the price are always stated in our quote.</p>`}},
 privacy:{
  cs:{t:'Ochrana osobních údajů', d:'Jak SFX production nakládá s osobními údaji z poptávkového formuláře.', body:()=>`
   <p>Tyto zásady popisují, jak nakládáme s osobními údaji, které nám pošlete přes poptávkový formulář nebo e-mailem.</p>
   <h2>Správce</h2>
   <p>${COMPANY.owner||todo('cs')}, IČO ${COMPANY.ico||todo('cs')}, se sídlem ${addr()||todo('cs')}. Kontakt: ${mail()}.</p>
   <h2>Jaké údaje zpracováváme</h2>
   <p>Jméno, e-mail, telefon (pokud ho uvedete), firmu a informace o projektu, které vyplníte do formuláře.</p>
   <h2>Proč a na jakém základě</h2>
   <p>Údaje používáme jen k vyřízení vaší poptávky a přípravě nabídky. Právním základem je jednání o smlouvě na vaši žádost (čl. 6 odst. 1 písm. b) GDPR).</p>
   <h2>Jak dlouho</h2>
   <p>Po dobu nutnou k vyřízení poptávky. Pokud spolupráce nevznikne, údaje smažeme nejpozději do <i>doplníme (např. 1 roku)</i>. Pokud spolupráce vznikne, uchováváme je po dobu stanovenou účetními a daňovými předpisy.</p>
   <h2>Kdo k údajům má přístup</h2>
   <p>Pouze my a poskytovatelé služeb, které k provozu potřebujeme: hosting webu, e-mailová schránka${processor('cs')}. Údaje neprodáváme ani nepředáváme k marketingu.</p>
   <h2>Vaše práva</h2>
   <p>Máte právo na přístup ke svým údajům, jejich opravu, výmaz, omezení zpracování, přenositelnost a právo vznést námitku. Stačí napsat na ${mail()}. Stížnost můžete podat u Úřadu pro ochranu osobních údajů (uoou.gov.cz).</p>`},
  en:{t:'Privacy policy', d:'How SFX production handles personal data from the enquiry form.', body:()=>`
   <p>This policy explains how we handle personal data you send us through the enquiry form or by email.</p>
   <h2>Controller</h2>
   <p>${COMPANY.owner||todo('en')}, IČO ${COMPANY.ico||todo('en')}, registered at ${addr()||todo('en')}. Contact: ${mail()}.</p>
   <h2>What we process</h2>
   <p>Your name, email, phone (if provided), company and the project details you enter in the form.</p>
   <h2>Why and on what basis</h2>
   <p>Only to handle your enquiry and prepare a quote. The legal basis is steps taken at your request before entering into a contract (Art. 6(1)(b) GDPR).</p>
   <h2>How long</h2>
   <p>As long as needed to handle the enquiry. If no cooperation follows, we delete the data within <i>to be added (e.g. 1 year)</i>. If it does, we keep it for the period required by accounting and tax law.</p>
   <h2>Who has access</h2>
   <p>Only us and the providers we need to operate: website hosting, email${processor('en')}. We don’t sell data or share it for marketing.</p>
   <h2>Your rights</h2>
   <p>You have the right to access, correct, erase, restrict, port and object to processing of your data. Just email ${mail()}. You can also complain to the Czech Office for Personal Data Protection (uoou.gov.cz).</p>`}},
 cookies:{
  cs:{t:'Cookies', d:'Web SFX production nepoužívá reklamní ani analytické cookies.', body:()=>`
   <p>Web nepoužívá reklamní ani analytické cookies.</p>
   <h2>Co ukládáme ve vašem prohlížeči</h2>
   <p>Jen technicky nezbytné informace: rozpracovanou poptávku, abyste o ni nepřišli při obnovení stránky. Tato data zůstávají ve vašem zařízení a odešlou se, jen když poptávku sami odešlete.</p>
   <h2>Jak je smazat</h2>
   <p>Kdykoli v nastavení prohlížeče vymazáním dat webu.</p>
   ${ANALYTICS.id && AN[ANALYTICS.provider] ? `<h2>Měření návštěvnosti</h2><p>Návštěvnost měříme nástrojem ${AN[ANALYTICS.provider]}, který nepoužívá cookies ani neukládá nic do vašeho zařízení. Sbíráme jen anonymní souhrnné údaje (počet návštěv, zobrazené stránky, odkud návštěva přišla), ze kterých nejde zjistit, kdo jste.</p>` : '<p>Pokud v budoucnu přidáme měření návštěvnosti, bude bez cookies, nebo vás předem požádáme o souhlas.</p>'}`},
  en:{t:'Cookie policy', d:'This website uses no advertising or analytics cookies.', body:()=>`
   <p>This website uses no advertising or analytics cookies.</p>
   <h2>What we store in your browser</h2>
   <p>Only what’s technically necessary: an unfinished enquiry, so it isn’t lost if you reload. This stays on your device and is sent only when you submit the enquiry yourself.</p>
   <h2>How to delete it</h2>
   <p>Any time, by clearing site data in your browser settings.</p>
   ${ANALYTICS.id && AN[ANALYTICS.provider] ? `<h2>Visitor analytics</h2><p>We measure visits with ${AN[ANALYTICS.provider]}, which uses no cookies and stores nothing on your device. We collect only anonymous aggregate data (number of visits, pages viewed, referrer) that cannot identify you.</p>` : '<p>If we add visitor analytics in the future, it will be cookie-less, or we will ask for your consent first.</p>'}`}}
};
