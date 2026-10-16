# README

Här finns information om hur man arbetar med hemsidan.

## Lathund

- [Jag vill lägga upp en nyhet.](src/content/pages/nyheter/README.md#jag-vill-lägga-upp-en-nyhet)
- Jag vill ladda upp en fil till...
  - [...medlemssidan.](#jag-vill-ladda-upp-en-fil-till-medlemssidan)
  - [...predikningar-sidan.](#jag-vill-ladda-upp-en-predikan)
  - [...Utsikt-sidan.](#jag-vill-ladda-upp-ett-nytt-nummer-av-utsikt)
- [Jag vill redigera en sida,](src/content/pages/README.md) så som att ändra, ta
  bort, eller lägga till en text eller bild.
- [Jag vill lägga till en verksamhet](src/content/pages/verksamheter/README.md#jag-vill-l%C3%A4gga-upp-en-verksamhet)
- [Jag vill redigera en verksamhet](src/content/pages/verksamheter/README.md#jag-vill-redigera-en-verksamhet)
- [Jag vill ändra utseendet på hemsidan.](#jag-vill-ändra-utseendet-på-hemsidan)
- Jag vill göra något annat. Var hittar jag mer info om...
  - [...nyheter?](src/content/pages/nyheter/README.md)
  - [...verksamheter?](src/content/pages/verksamheter/)
  - [...filerna på medlemssidan, predikningar och Utsikt?](#var-ligger-filerna)

### Jag vill ladda upp ett nytt nummer av Utsikt

1. Gå till [www.gnosjomk.se/admin](https://www.gnosjomk.se/admin) och logga in.
2. Välj **Utsikt** och tryck på **Ny**.
3. Fyll i nummer, tema och utgivningsdatum. Rubriken på sidan blir t.ex.
   "Utsikt #2 2026: Glädje trots orostider". Året tas från datumet.
4. Ladda upp PDF:en i fältet **PDF**.
5. Tryck på **Spara**. Efter någon minut ligger numret ute, och "Utsikt" i menyn
   går till det senaste numret.

### Jag vill ladda upp en predikan

1. Gå till [www.gnosjomk.se/admin](https://www.gnosjomk.se/admin) och logga in.
2. Välj **Predikningar** och tryck på **Ny**.
3. Fyll i talare och datum, och rubrik om predikan har en.
4. Ladda upp mp3-filen i fältet **Ljudfil**.
5. Tryck på **Spara**.

### Jag vill ladda upp en fil till medlemssidan

1. Gå till [www.gnosjomk.se/admin](https://www.gnosjomk.se/admin) och logga in.
2. Välj **Medlemsfiler** och tryck på **Lägg till Fil**. Nya filer hamnar
   överst.
3. Fyll i titel och datum, och ladda upp filen.
4. Tryck på **Spara**. Filen syns bara för den som har loggat in på
   medlemssidan.

**Första gången** du laddar upp en fil frågar CMS:et efter en "Secret Access
Key". Den får du av hemsidans utvecklare. Den sparas bara i din webbläsare, så
du behöver skriva in den en gång per dator.

### Jag vill ändra utseendet på hemsidan

1. **Är det en liten ändring?** Om det du vill ändra går att beskriva i ett par
   meningar, förmedla det bara till hemsidans utvecklare.
2. **Är det en större ändring?** Då behöver utvecklaren en "ritning" att utgå
   ifrån. Det kan vara en enkel skiss på papper och penna, eller något lite mer
   avancerat:
   - Spara sidan, gör ändringarna i DevTools, spara och skicka.
     <!-- TODO, utveckla -->
   - Importera sidan i Figma och skissa där.
     <!-- TODO, undersök och utveckla -->

## Hur fungerar sidan?

### Cloudflare

Hemsidan ligger som en Cloudflare Worker. Branchen master här i Github är den som byggs till hemsidan.

### Var ligger filerna?

PDF:er, ljudfiler och medlemsfiler ligger inte i det här repot utan i
Cloudflare R2 (bucketen `gnmk-files`), eftersom de är stora och medlemsfilerna
inte får vara publika. Repot innehåller bara uppgifterna om varje fil:

| Vad | Uppgifterna i repot | Filerna i R2 |
| --- | --- | --- |
| Utsikt | `src/content/pages/utsikt/*.md` | `public/utsikt/pdfer/` |
| Predikningar | `src/content/pages/predikningar/*.md` | `public/predikningar/ljudfiler/` |
| Medlemsfiler | `src/content/data/member-files.json` | `members/member-files/` (kräver inloggning) |

Workern lämnar ut filerna via `/api/file/...`. Äldre poster har bara filnamnet i
fältet `file`; poster från CMS:et har hela adressen. Filtret `fileUrl` i
`.eleventy.js` hanterar båda.

**Backup.** Varje natt kopierar Workern alla nya och ändrade filer till bucketen
`gnmk-files-backup`. Ingenting raderas någonsin ur backupen, så en fil som
tagits bort av misstag finns kvar där. När en fil har ersatts sparas den gamla
versionen under `_ersatta/<datum>/`. För att återställa en fil: ladda ner den
från `gnmk-files-backup` i Cloudflares dashboard och ladda upp den igen.

### 11ty (och Nunjucks)

<!-- TODO -->

### Markdown

Läs mer om markdown [här](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax).

### HTML

<!-- TODO -->

### CSS

<!-- TODO -->

### JavaScript (och Typescript)

<!-- TODO -->
