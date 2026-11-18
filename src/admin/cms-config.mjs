/* Administrace webu (Sveltia CMS). Build z tohoto souboru vytvoří github-pages/admin/config.yml.
   Každé uložení v administraci vytvoří commit na GitHubu a GitHub Actions web znovu sestaví a nasadí. */

const svcOptions = [
  {label:'Video', value:'video'}, {label:'Fotografie', value:'foto'}, {label:'Dron', value:'dron'},
  {label:'Střih a postprodukce', value:'strih'}, {label:'360° / Matterport', value:'360'}, {label:'3D a rendery', value:'3d'},
  {label:'Vizualizace', value:'vizualizace'}, {label:'Filmová produkce', value:'film'}];
const gallery = label => ({name:'gallery', label, widget:'list', required:false, fields:[
  {name:'image', label:'Fotka', widget:'image'},
  {name:'alt', label:'Popis fotky (pro Google a nevidomé)', widget:'string', required:false}]});
const strList = (name, label, item='Položka', widget='string') => ({name, label, widget:'list', field:{name:'item', label:item, widget}});
const lang = (name, label, fields, collapsed=false, required=true) => ({name, label, widget:'object', collapsed, required, fields});
const opt = f => f.map(x => ({...x, required:false}));

const svcLangFields = [
  {name:'t', label:'Název služby', widget:'string'},
  {name:'h1', label:'Hlavní nadpis stránky', widget:'string'},
  {name:'s', label:'Krátký popis (seznam služeb)', widget:'string'},
  {name:'lead', label:'Úvodní věta pod nadpisem', widget:'text'},
  {name:'seo', label:'Google: titulek a popis ve výsledcích hledání', widget:'object', collapsed:true, fields:[
    {name:'title', label:'Titulek (do 55 znaků)', widget:'string'},
    {name:'desc', label:'Popis (120–160 znaků)', widget:'text'}]},
  strList('tags', 'Štítky', 'Štítek'),
  {name:'time', label:'Typická doba dodání', widget:'string'},
  strList('intro', 'Úvodní odstavce', 'Odstavec', 'text'),
  strList('who', 'Pro koho'),
  strList('inc', 'Co obsahuje'),
  strList('get', 'Co dostanete'),
  {name:'equip', label:'Technika a software', widget:'list', fields:[{name:'n', label:'Název', widget:'string'}, {name:'x', label:'Popis', widget:'text'}]},
  {name:'faq', label:'Časté dotazy', widget:'list', fields:[{name:'q', label:'Otázka', widget:'string'}, {name:'a', label:'Odpověď', widget:'text'}]}];

const aboutLangFields = [
  {name:'h', label:'Nadpis sekce', widget:'string'},
  {name:'role', label:'Role', widget:'string'},
  {name:'hi', label:'Podnadpis', widget:'string', required:false},
  {name:'b1', label:'Odstavec 1', widget:'text'},
  {name:'b2', label:'Odstavec 2', widget:'text', required:false},
  {name:'quote', label:'Citát', widget:'string', required:false}];

const homeLangFields = [
  {name:'kicker', label:'Řádek nad nadpisem', widget:'string'},
  {name:'h1', label:'Hlavní nadpis (nový řádek = zalomení)', widget:'text'},
  {name:'sub', label:'Text pod nadpisem', widget:'text'},
  {name:'reel_h', label:'Nadpis showreelu', widget:'string'},
  {name:'reel_p', label:'Text u showreelu', widget:'string'},
  {name:'reel_note', label:'Poznámka pod showreelem', widget:'string', required:false}];

export function cmsConfig({repo, branch, site}){
  return {
    backend:{name:'github', repo, branch, commit_messages:{
      create:'Nový obsah: {{collection}} „{{slug}}“', update:'Úprava: {{collection}} „{{slug}}“', delete:'Smazáno: {{collection}} „{{slug}}“',
      uploadMedia:'Nahráno: {{path}}', deleteMedia:'Smazán soubor: {{path}}'}},
    site_url: site,
    media_folder:'src/assets/uploads',
    public_folder:'/assets/uploads',
    media_libraries:{all:{
      max_file_size: 52428800,   // 50 MB; GitHub odmítá soubory nad 100 MB, delší videa patří na YouTube
      transformations:{raster_image:{format:'webp', quality:85, width:2400, height:2400}}}},
    collections:[
      { name:'blog', label:'Blog', label_singular:'Článek', description:'Články a návody. Uložený článek se na webu objeví zhruba za 2 minuty.',
        folder:'content/blog', format:'json', extension:'json', create:true, delete:true,
        identifier_field:'id', slug:'{{slug}}', summary:'{{cs.t}}', sortable_fields:['date','id'],
        fields:[
          {name:'id', label:'Identifikátor', widget:'string', hint:'Krátce, bez diakritiky a mezer, např. jak-natocit-video. Po vytvoření neměňte.', pattern:['^[a-z0-9-]+$', 'Jen malá písmena, číslice a pomlčky']},
          {name:'published', label:'Zveřejnit', widget:'boolean', default:true},
          {name:'date', label:'Datum', widget:'datetime', type:'date', hint:'Článek s budoucím datem se zveřejní až při prvním sestavení webu po tomto dni.'},
          {name:'cat', label:'Hlavní služba', widget:'select', options:svcOptions},
          {name:'svcs', label:'Související služby', widget:'select', multiple:true, required:false, options:svcOptions},
          {name:'cover', label:'Úvodní fotka', widget:'image', required:false, hint:'Na šířku, ideálně 1600 px a víc.'},
          {name:'youtube', label:'Video z YouTube (odkaz)', widget:'string', required:false},
          {name:'video', label:'Nebo nahrát video (MP4, max. 50 MB)', widget:'file', required:false},
          gallery('Galerie'),
          {name:'img', label:'Ilustrace', widget:'hidden', default:'edit'},
          {name:'slug', label:'Adresa článku', widget:'object', collapsed:true, required:false, hint:'Část adresy za /blog/. Když necháte prázdné, vytvoří se z nadpisu.', fields:[
            {name:'cs', label:'Česky', widget:'string', required:false}, {name:'en', label:'Anglicky', widget:'string', required:false}]},
          lang('cs', 'Česky', [
            {name:'t', label:'Nadpis', widget:'string'},
            {name:'lead', label:'Perex (1–2 věty, zobrazí se i ve výsledcích Googlu)', widget:'text'},
            {name:'body', label:'Text článku', widget:'markdown', hint:'Mezititulek: ## Nadpis. Odrážky: - položka. Tučně: **text**.'}]),
          lang('en', 'Anglicky (nepovinné, jinak se použije čeština)', opt([
            {name:'t', label:'Title', widget:'string'}, {name:'lead', label:'Lead', widget:'text'}, {name:'body', label:'Text', widget:'markdown'}]), true, false)]},

      { name:'services', label:'Služby', label_singular:'Služba', description:'Texty, fotky, videa a galerie jednotlivých služeb.',
        folder:'content/services', format:'json', extension:'json', create:false, delete:false,
        identifier_field:'id', slug:'{{slug}}', summary:'{{cs.t}}', sortable_fields:['order'],
        fields:[
          {name:'id', widget:'hidden'}, {name:'tile', widget:'hidden'}, {name:'icon', widget:'hidden'}, {name:'theme', widget:'hidden'}, {name:'img', widget:'hidden'},
          {name:'order', label:'Pořadí na webu', widget:'number', value_type:'int', min:1, max:20},
          {name:'hero_image', label:'Hlavní fotka služby', widget:'image', required:false, hint:'Nahradí ilustraci v záhlaví stránky a v seznamu služeb. Na šířku, poměr 16:10.'},
          {name:'hero_video', label:'Krátké video do záhlaví (MP4 bez zvuku, smyčka, max. 50 MB)', widget:'file', required:false},
          {name:'youtube', label:'Ukázkové video z YouTube (odkaz)', widget:'string', required:false},
          gallery('Ukázky práce (galerie)'),
          {name:'slug', label:'Adresa stránky', widget:'object', collapsed:true, hint:'Změna adresy rozbije odkazy, které už znají lidé i Google. Měňte jen výjimečně.', fields:[
            {name:'cs', label:'Česky (za /sluzby/)', widget:'string'}, {name:'en', label:'Anglicky (za /en/services/)', widget:'string'}]},
          lang('cs', 'Česky', svcLangFields),
          lang('en', 'Anglicky', svcLangFields, true)]},

      { name:'pages', label:'Stránky a nastavení', files:[
        { name:'about', label:'O mně', file:'content/about.json', format:'json', fields:[
          {name:'name', label:'Jméno', widget:'string'},
          {name:'photo', label:'Fotka (čtverec 1:1)', widget:'image', required:false},
          lang('cs', 'Česky', aboutLangFields), lang('en', 'Anglicky', aboutLangFields, true)]},
        { name:'home', label:'Úvodní stránka', file:'content/home.json', format:'json', fields:[
          {name:'showreel_video', label:'Showreel (MP4, max. 50 MB)', widget:'file', required:false},
          {name:'showreel_poster', label:'Náhledový obrázek showreelu', widget:'image', required:false},
          {name:'showreel_note', label:'Zobrazit poznámku pod showreelem', widget:'boolean', default:false},
          lang('cs', 'Česky', homeLangFields), lang('en', 'Anglicky', homeLangFields, true)]},
        { name:'settings', label:'Kontakty a údaje o firmě', file:'content/settings.json', format:'json', fields:[
          {name:'company', label:'Firma', widget:'object', fields:[
            {name:'name', label:'Značka', widget:'string'},
            {name:'person', label:'Kontaktní osoba', widget:'string'},
            {name:'owner', label:'Obchodní firma / jméno podnikatele', widget:'string', required:false},
            {name:'ico', label:'IČO', widget:'string', required:false},
            {name:'street', label:'Ulice a č. p.', widget:'string', required:false},
            {name:'city', label:'Město (důležité pro místní vyhledávání)', widget:'string', required:false},
            {name:'zip', label:'PSČ', widget:'string', required:false},
            {name:'region', label:'Kraj', widget:'string', required:false},
            {name:'register', label:'Zápis v rejstříku', widget:'string', required:false},
            {name:'phone', label:'Telefon (veřejný)', widget:'string', required:false},
            {name:'email', label:'E-mail (sem chodí i poptávky z formuláře)', widget:'string'},
            {name:'founded', label:'Rok založení', widget:'string', required:false},
            strList('areaServed', 'Působnost', 'Oblast'),
            {...strList('sameAs', 'Profily (Instagram, YouTube, Google, Firmy.cz…)', 'Odkaz'), required:false}]},
          {name:'verify', label:'Ověření vyhledávačů (kód z meta tagu)', widget:'object', collapsed:true, fields:opt([
            {name:'google', label:'Google Search Console', widget:'string'},
            {name:'bing', label:'Bing Webmaster', widget:'string'},
            {name:'seznam', label:'Seznam Webmaster', widget:'string'}])}]}]}
    ]
  };
}
