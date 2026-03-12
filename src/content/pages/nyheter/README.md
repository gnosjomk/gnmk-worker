# Nyheter

Mappen `\src\content\pages\nyheter` är där alla nyheter bor.

## Lathund

### Jag vill lägga upp en nyhet

1.  Se till att du står i [mappen nyheter](). (Den mappen där du läser detta.)
2.  Högt upp till höger hittar du knappen _Add file_. Tryck på den.

    ![alt text](../../../../doc_attachements/image.png)

3.  I menyn som fälls ut, tryck på _Create new file_.

    ![alt text](../../../../doc_attachements/image-1.png)

4.  Nu ska du ha fått upp en yta där du kan skriva in texten till filen. Ovanför
    den ser du en ruta där du skriver in namnet på filen. Välj ett beskrivande
    namn, och glöm inte att ha med filändelsen `.md`.

    ![alt text](../../../../doc_attachements/image-2.png)

5.  Kopiera och fyll i den här mallen:

    ```
    ---
    title:
    puff:
    expires:
    date:
    img:
    ---

    [Ditt innehåll]
    ```

    - `title`: Det här är rubriken på nyheten. Den kommer synas överst på
      nyhetens egna sida, men också synas på https://www.gnosjomk.se/nyheter och
      i nyhets-sektionen på startsidan.
    - `puff`: En kort text som kompletterar rubriken. Bör inte vara mer än en
      mening.
    - `expires`: Det datum då nyheten inte längre ska visas på hemsidan. T.ex.,
      om nyheten gäller ett evenemang som äger rum 2025-09-29, bör sättas till
      dagen efter, alltså 2025-09-30. **Det är viktigt att datumet har just det
      formatet: 2025-09-30.** Detta fält kan lämnas blankt, men då kommer
      nyheten aldrig att försvinna av sig självt.
    - `date`: Om nyheten är associerat med ett visst datum anger du det här. Det
      används för att nyheter om saker i närtid ska visas högre än om saker som
      äger rum längre bort i tid. Om din nyhet inte har en exakt förankring i
      tid kan du ta ett ungefärligt datum för att det ska hamna i en logisk
      kronologisk ordning med de andra nyheterna - det kommer inte att skrivas
      ut på hemsidan.
    - `img`: Filnamnet (inklusive filändelse) på den bild som ska användas på
      https://www.gnosjomk.se/nyheter och i nyhets-sektionen på startsidan.
      Bilden måste ligga i mappen [src/content/images](../../images/).

6.  Ersätt därefter "[Ditt innehåll]" med ditt innehåll. **Obs!** Nyheten kommer
    automatiskt att få som rubrik det du angett i fältet `title`. Däremot
    behöver du själv länka till bilden, om du vill ha den på nyhetens egen sida.
    Du hittar mer info om hur du skriver i markdown-format
    [här](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax).

    Om du vill du lägga till en bild på sidan:
    
    a. Ladda du upp bilden i mappen [images](../../images).
    
    b. Lägg följande där du vill ha bilden: `<img src="/images/[namnet på bilden inklusive filändelse]" />`

	Om du vill ha länk till en annan del av sidan (t.ex. `gnosjomk.se/sidans/sökväg` skriver du: `[text på länken](sidans/sökväg)`.
    	
8.  Högt upp till höger hittar du knappen _Commit changes_. Tryck på den.

    ![alt text](../../../../doc_attachements/image-3.png)

9. I rutan som kommer upp kan du skriva något kort om vad det är för ändring du har gjort, så att det blir tydligt för de som ska granska ändringen. **Det är viktigt att du väljer *Create new branch*** i rutans nedre del. Tryck sedan på "Propose changes".
<img width="508" height="591" alt="image" src="https://github.com/user-attachments/assets/5d13a462-4ccc-469f-837c-450cfe2b4c18" />

10. På sidan dit du nu kommer, tryck på "Create pull request".
<img width="1314" height="798" alt="image" src="https://github.com/user-attachments/assets/8cc5cb43-8e39-4d5c-923f-77ac24e45791" />

11. Du kommer nu till en ny sida, där det **efter ett par sekunder** ska komma upp en ruta lik den i bilden som är markerad i **blått**. (Dyker den inte upp har något gått fel, kontakta supporten. Om den dyker upp, men inte ser ut som på bilden kan det vara ett fel i de ändringar du försöker göra, kontakta supporten.) Gå in på någon av länkarna i rutan som på bilden är markerad i **rött**. Då kommer du till en förhandsgranskning av **hela** hemsidan.
<img width="942" height="984" alt="image" src="https://github.com/user-attachments/assets/98ef0fab-8101-48eb-968a-d3fccf992154" />

12. Granska dina ändringar på förhandsgransknings-sidan. Verifiera att ändringarna ser ut som de ska, och att inget annat på sidan har gått sönder. På den här sidan ska alla bilder och länkar fungera exakt som de ska på den riktiga sidan.

13. Om du...
    
    a. ...**inte** är nöjd med hur sidan ser ut eller fungerar, går du tillbaka till sidan du kom ifrån och trycker på "Close pull request".
    <img width="890" height="1390" alt="image" src="https://github.com/user-attachments/assets/230636f2-908e-498c-a237-f24c7fc3a6e7" />

    b. ...är nöjd med med hur sidan ser ut och fungerar, går du tillbaka till sidan du kom ifrån, kopierar länken till den *Pull request* du skapat, och skickar den till någon annan i teamet som får granska dina ändringar.
		<img width="1139" height="529" alt="image" src="https://github.com/user-attachments/assets/85087cb7-4b71-4e9a-bc59-82c9642504aa" />

14. När sidan är granskad av någon annan trycker du på den gröna knappen "Squash and merge". Står det något annat på den gröna knappen så trycker du på pilen jämte och väljer "Squash and merge" innan du trycker på knappen.
<img width="868" height="1352" alt="image" src="https://github.com/user-attachments/assets/e1d22917-6562-4dc7-b44a-301e71e8ed29" />

15. Tryck på "Confirm squash and merge".
<img width="897" height="450" alt="image" src="https://github.com/user-attachments/assets/c6205c50-a135-4104-8a01-a7bc37d5dfc2" />

16. Verifiera att dina ändringar syns på hemsidan (den riktiga hemsidan).

17. Klar!

### Jag vill redigera en nyhet

1. Gå till filen du vill redigera, till exempel
   `src/content/pages/nyheter/exempel.md`.
2. Högt upp till höger hittar du en knapp med en penna. Tryck på den.

   ![alt text](../../../../doc_attachements/image-5.png)

3. Nu får du upp en yta där du kan redigera filen. Härifrån kan du följa stegen
   i [guiden om hur du lägger upp en ny nyhet](#jag-vill-lägga-upp-en-nyhet)
   från steg 4.

## Struktur

<!-- TODO expandera -->

- index.njk beskriver gnosjomk.se/nyheter
- Varje .md-fil är en nyhet
  - Frontmatter
  - Innehåll
