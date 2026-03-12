# Pages

Mappen `\src\content\pages` är där alla sidor bor.

## Lathund

### Jag vill redigera en sida

Så som att ändra, ta bort, eller lägga till en text eller bild.

1. Gå till filen som du vill redigera. I det här exemplet redigerar vi "Om oss"-sidan.
<img width="312" height="729" alt="image" src="https://github.com/user-attachments/assets/7d01964f-684c-43f1-8d8b-01918624c498" />

2. Tryck på penn-ikonen i filytans övre högra hörn.
<img width="288" height="72" alt="image" src="https://github.com/user-attachments/assets/d01ab46a-4907-4259-acde-de4da8539e74" />

3. Redigera filen så som du vill ha den. Filen behöver följa markdown-formatet. Du kan läsa mer om markdown [här](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax).

    Om du vill du lägga till en bild på sidan:

    a. Ladda du upp bilden i mappen images.

    b. Lägg följande där du vill ha bilden: `<img src="/images/[namnet på bilden inklusive filändelse]" />`

    Om du vill ha länk till en annan del av sidan (t.ex. `gnosjomk.se/sidans/sökväg` skriver du: `[text på länken](sidans/sökväg)`. 

4. Förhandsgranska filen genom att gå till preview-fliken, som du hittar i filytans övre vänstra hörn. Har du bilder på sidan lär de se trasiga ut i den här vyn, men text, rubriker, länkar, etc. bör se ut som de ska.
<img width="317" height="284" alt="image" src="https://github.com/user-attachments/assets/0e9086e9-6fc3-4305-afa9-754fa3aed39e" />

5. När du är nöjd trycker du på "Commit changes..." över filytans övre högra hörn.
<img width="324" height="178" alt="image" src="https://github.com/user-attachments/assets/cf936468-1f4a-462f-a593-281d4d6dfd5d" />

6. I rutan som kommer upp kan du skriva något kort om vad det är för ändring du har gjort, så att det blir tydligt för de som ska granska ändringen. **Det är viktigt att du väljer *Create new branch*** i rutans nedre del. Tryck sedan på "Propose changes".
<img width="508" height="591" alt="image" src="https://github.com/user-attachments/assets/5d13a462-4ccc-469f-837c-450cfe2b4c18" />

7. På sidan dit du nu kommer, tryck på "Create pull request".
<img width="1314" height="798" alt="image" src="https://github.com/user-attachments/assets/8cc5cb43-8e39-4d5c-923f-77ac24e45791" />

8. Du kommer nu till en ny sida, där det **efter ett par sekunder** ska komma upp en ruta lik den i bilden som är markerad i **blått**. (Dyker den inte upp har något gått fel, kontakta supporten. Om den dyker upp, men inte ser ut som på bilden kan det vara ett fel i de ändringar du försöker göra, kontakta supporten.) Gå in på någon av länkarna i rutan som på bilden är markerad i **rött**. Då kommer du till en förhandsgranskning av **hela** hemsidan.
<img width="942" height="984" alt="image" src="https://github.com/user-attachments/assets/98ef0fab-8101-48eb-968a-d3fccf992154" />

9. Granska dina ändringar på förhandsgransknings-sidan. Verifiera att ändringarna ser ut som de ska, och att inget annat på sidan har gått sönder. På den här sidan ska alla bilder och länkar fungera exakt som de ska på den riktiga sidan.

10. Om du...
    
    a. ...**inte** är nöjd med hur sidan ser ut eller fungerar, går du tillbaka till sidan du kom ifrån och trycker på "Close pull request".
    <img width="890" height="1390" alt="image" src="https://github.com/user-attachments/assets/230636f2-908e-498c-a237-f24c7fc3a6e7" />

    b. ...är nöjd med med hur sidan ser ut och fungerar, går du tillbaka till sidan du kom ifrån, kopierar länken till den *Pull request* du skapat, och skickar den till någon annan i teamet som får granska dina ändringar.
		<img width="1139" height="529" alt="image" src="https://github.com/user-attachments/assets/85087cb7-4b71-4e9a-bc59-82c9642504aa" />

11. När sidan är granskad av någon annan trycker du på den gröna knappen "Squash and merge". Står det något annat på den gröna knappen så trycker du på pilen jämte och väljer "Squash and merge" innan du trycker på knappen.
<img width="868" height="1352" alt="image" src="https://github.com/user-attachments/assets/e1d22917-6562-4dc7-b44a-301e71e8ed29" />

12. Tryck på "Confirm squash and merge".
<img width="897" height="450" alt="image" src="https://github.com/user-attachments/assets/c6205c50-a135-4104-8a01-a7bc37d5dfc2" />

13. Verifiera att dina ändringar syns på hemsidan (den riktiga hemsidan).

14. Klar!

## Struktur

Startsidan ligger i filen `index.njk`. Markdownfilerna (med filändelsen `.md`)
är undersidor som saknar egna undersidor, t.ex. `om-oss.md`.
