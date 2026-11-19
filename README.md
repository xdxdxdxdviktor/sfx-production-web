# SFX production – web

Statický web v češtině a angličtině s administrací na adrese **/admin/**. Obsah se upravuje v administraci a každé uložení vytvoří commit na GitHubu. GitHub Actions pak web automaticky sestaví a nasadí na GitHub Pages, obvykle do 2 minut.

## Administrace (/admin/)

Co se v ní dá dělat:

- **Blog:** psát a mazat články, nahrávat úvodní fotku a galerii a vložit video odkazem z YouTube. Text se formátuje jednoduše: `## Mezititulek`, `- odrážka`, `**tučně**`.
- **Služby:** upravovat texty, techniku, časté dotazy a štítky a nahrát hlavní fotku a galerii „Ukázky práce“ s videem z YouTube.
- **Ukázky práce:** projekty s krátkou náhledovou smyčkou, plakátkem a odkazem na celé video na YouTube. Lze je filtrovat podle kategorie a přehrávají se v prohlížeči na celou obrazovku. Náhledy z dlouhých videí vyrobí `tools/make-previews.py` (potřebuje ffmpeg).
- **Reference:** citáty klientů. Na webu se ukážou až po zapnutí a doplnění jména nebo firmy. Zveřejňujte jen se svolením klienta.
- **Kde působíme:** stránky pro Ústecký kraj, Liberecký kraj a Prahu (texty, města, časté dotazy, fotka). Slouží pro místní vyhledávání.
- **Stránky a nastavení:**
  - O nás: tým, u každého člověka fotka, role, texty, e-mail a telefon,
  - úvodní stránka (nadpis a showreel z YouTube),
  - kontakty, fakturační údaje (IČO, DIČ, sídlo, plátce DPH) a provozovna. Adresa provozovny je důležitá pro Google mapy a místní výsledky.
  - oblasti působnosti, ověřovací kódy pro Google a Seznam a měření návštěvnosti bez cookies (Plausible, Umami, GoatCounter nebo Cloudflare).

Fotky se nahrávají do administrace a samy se převedou na WebP s maximální šířkou 2400 px. Videa se nenahrávají, vkládají se odkazem z YouTube. Článek, který má vyplněnou jen češtinu, se zobrazí jen na české verzi webu.

### Přihlášení

1. Na GitHubu otevřete **Settings → Developer settings → Fine-grained tokens → Generate new token**.
2. Vyberte jen tento repozitář a v Repository permissions nastavte **Contents: Read and write**.
3. Na `/admin/` zvolte **Přihlásit se pomocí přístupového tokenu** a token vložte. Prohlížeč si ho zapamatuje.

Bez GitHubu jde administrace používat i lokálně. V Chrome zvolte **Pracovat s lokálním repozitářem**, vyberte složku projektu a změny se uloží přímo do souborů. Výsledek uvidíte po `node build.mjs`.

## Jak to funguje

| Co | Kde |
| --- | --- |
| Obsah (texty, články, nastavení) | `content/*.json`, upravuje je administrace |
| Nahrané fotky | `src/assets/uploads/` |
| Nastavení administrace | `src/admin/cms-config.mjs` |
| Doména, repozitář pro administraci, formulář | `src/js/config.js` |
| Šablony stránek | `src/js/pages.js`, `src/js/ui.js` |
| Texty rozhraní (tlačítka, formulář) | `src/js/i18n.js` |
| Vzhled | `src/css/base.css`, `src/css/site.css` |
| Nasazení | `.github/workflows/deploy.yml` |

Sestavení: `tools/content.mjs` převede `content/` na data pro web a `build.mjs` vygeneruje hotový web do `github-pages/`. Výstup se do gitu neukládá, sestavuje ho GitHub Actions.

## Lokální náhled

```bash
npm install
```

```bash
node build.mjs
```

```bash
node serve.mjs
```

Náhled pak běží na http://localhost:4173/.

## Poptávkový formulář

Poptávky se odesílají přes FormSubmit na e-mail z nastavení. **Při první poptávce přijde aktivační e-mail** a je potřeba v něm jednou kliknout na potvrzení.

## Fotka v sekci „O mně“

Fotka nahraná v administraci má přednost. Bez ní se použije `brand/jiri-hromadka.jpg`: čtvercová fotka se vezme celá, jiný formát se ořízne na 1:1 kolem obličeje.

## Ochrana před spamem

Formulář má skryté pole proti robotům a odmítne odeslání do 4 sekund od začátku vyplňování. Dál blokuje popis s víc než třemi odkazy a opakované odeslání do minuty a FormSubmit filtruje typická spamová slova. Když spam i tak začne chodit, jde doplnit Cloudflare Turnstile.

## SFX Studio (`/studio/`)

Vlastní administrace týmu v designu SFX: přehled, blog s náhledem a SEO kontrolou, statistiky z Umami a poptávky.

- **Přihlášení:** přístupový klíč GitHub (fine-grained, jen tento repozitář, *Contents: Read and write* + *Actions: Read-only*). Klíč zůstává jen v prohlížeči.
- **Blog:** uložení = jeden commit (článek + nahrané fotky převedené na WebP), web se sám nasadí a Studio ukáže, kdy je článek venku.
- **Statistiky:** v Nastavení vložte API klíč z Umami (cloud.umami.is → Settings → API keys). Klíč zůstává jen v prohlížeči.
- **Poptávky:** po zapnutí Supabase (`SUPABASE` v `src/js/config.js`) se ukládají do databáze a ve Studiu je tabule se stavy, poznámkami a přiřazením.
- Fotky ke službám, ukázky práce, texty a reference se zatím upravují ve Sveltia CMS (`/admin/`), Studio na ně odkazuje.
