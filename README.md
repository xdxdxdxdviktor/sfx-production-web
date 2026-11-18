# SFX production – web

Statický web v češtině a angličtině. Zdrojové soubory jsou ve složce `src/` a hotový web se generuje do složky `github-pages/`, která se nahrává na hosting.

**Složku `github-pages/` neupravujte ručně.** Každé sestavení ji přepíše.

## Sestavení a náhled

```bash
node build.mjs
```

```bash
node serve.mjs
```

Náhled pak běží na http://localhost:4173/. Příkaz `node build.mjs --og` znovu vygeneruje obrázky pro sdílení na sociálních sítích (potřebuje Google Chrome).

## Kde co upravit

| Co | Soubor |
| --- | --- |
| Údaje o firmě (IČO, adresa, telefon, profily) a doména | `src/js/config.js` |
| Služby: texty, technika, FAQ | `src/js/services.js` |
| Blogové články | `src/js/posts.js` |
| Texty rozhraní, formulář, reference | `src/js/i18n.js` |
| Právní stránky | `src/js/legal.js` |
| Vzhled | `src/css/base.css` (původní styl), `src/css/site.css` (nové části) |
| Obrázky a videa | `src/assets/` |

## Co web obsahuje

- Úvodní stránku s 3D kamerou, showreelem a čtyřkrokovou poptávkou.
- Samostatnou stránku pro každou službu s vlastním vizuálním motivem.
- Přehled služeb, blog a právní stránky.
- Pro vyhledávače: samostatné adresy pro CZ i EN, `hreflang`, kanonické URL, strukturovaná data schema.org (firma, služby, FAQ, články, drobečková navigace), `sitemap.xml`, `robots.txt`, `llms.txt` a náhledové obrázky pro sdílení.

## Poptávkový formulář

Poptávky se odesílají přes službu FormSubmit na e-mail z `config.js`. **Při úplně první poptávce přijde na tento e-mail aktivační zpráva** a je potřeba v ní jednou kliknout na potvrzení. Do té doby formulář nabídne odeslání e-mailem.

Volitelně jde napojit Supabase (databáze poptávek, administrace a blog). Stačí vyplnit `supabaseUrl` a `supabaseAnonKey` v `config.js`.
