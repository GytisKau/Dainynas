# Dainynas - Elektroninis folklorinių dainų dainynas

## Sistemos paskirtis

Kuriama internetinė sistema, skirta folklorinių dainų įrašams kaupti, saugoti, aprašyti, ieškoti ir klausytis. Sistema sujungtų archyvinę folkloro medžiagą su naudotojų kuriamu turiniu.

Sistemoje būtų saugomi folklorinių dainų garso įrašai, dainų tekstai, atlikėjų (pateikėjų) informacija bei metaduomenys. Naudotojai galėtų peržiūrėti archyvinius įrašus, klausytis dainų, ieškoti jų pagal įvairius kriterijus, taip pat įkelti savo dainų įrašus.

Naudotojai galėtų kurti asmeninius albumus, į juos įtraukti sistemoje esančias dainas ir taip sudaryti savo dainų rinkinius. Tokiu būdu sistema veiktų ne tik kaip folkloro archyvas, bet ir kaip interaktyvus elektroninis dainynas.

Pagrindinis sprendžiamas uždavinys – sukurti patogią platformą, leidžiančią struktūrizuotai kaupti folklorinę muzikinę medžiagą ir suteikti galimybę naudotojams ją atrasti, klausytis bei papildyti savo įrašais.

## Funkciniai reikalavimai

Neregistruotas naudotojas gali:
1. atlikti viešų dainų paiešką ir filtravimą;
2. atlikti viešų pateikėjų paiešką ir filtravimą;
3. atlikti viešų albumų paiešką ir filtravimą;
4. peržiūrėti viešą dainą;
5. peržiūrėti viešą pateikėją;
6. peržiūrėti viešą albumą;
7. registruotis sistemoje;
8. prisijungti prie savo paskyros

Registruotas naudotojas paveldi svečio funkcijas ir taip pat gali:
1. valdyti savo paskyros informaciją;
    1. keisti
2. kurti dainą:
    1. pridėti dainos pavadinimą;
    2. pridėti dainos žodžius;
    3. priskirti esamą ar naują pateikėją;
    4. įkelti dainos garso įrašą;
    5. pridėti įrašo įrašymo metus;
    6. pridėti įrašo įrašymo vietą;
    7. pridėti nuorodą į dainos įrašą kitame archyve;
    8. pažymėti ar daina viešai prieinama;
3. peržiūrėti savo įkeltas dainas;
4. redaguoti savo įkeltas dainas;
5. ištrinti savo įkeltas dainas;
6. kurti pateikėją:
    1. pridėti pateikėjo vardą;
    2. pridėti pateikėjo gimimo metus;
    3. pridėti pateikėjo gyvenamąją vietą;
    4. pridėti pateikėjo nuotrauką;
7. kurti albumą;
    1. pridėti albumo pavadinimą
    2. pridėti albumo aprašymą
    3. pridėti savo ar kitas viešas dainas;
    4. keisti dainų eilės tvarką;
    5. pažymėti ar albumas viešai prieinamas;
8. redaguoti savo albumą:
    1. redaguoti pavadinimą;
    2. redaguoti aprašymą;
    3. pridėti savo ar kitas viešas dainas;
    4. pašalinti dainas iš albumo;
    5. keisti dainų eilės tvarką;
    6. redaguoti albumo viešumą;
9. peržiūrėti savo albumus;
10. ištrinti savo albumus;

Administratorius gali:
1. valdyti naudotojų paskyras;
2. peržiūrėti ir moderuoti naudotojų įkeltus įrašus;
3. redaguoti arba pašalinti netinkamą turinį;
4. valdyti dainų ir jų metaduomenų informaciją;
5. valdyti pateikėjų / atlikėjų informaciją;
6. administruoti sistemos kategorijas, pvz., regionus ar dainų tipus.

## Pasirinktų technologijų aprašymas

Sistemos vartotojo sąsajai kurti pasirinkta **React** biblioteka ir **TypeScript** programavimo kalba, o serverinei daliai – **ASP.NET Core Web API** ir C#. Duomenims saugoti naudojama **PostgreSQL** duomenų bazė, su kuria sąveikaujama naudojant Entity Framework Core.

Sistemos infrastruktūrai naudojamos **Microsoft Azure** paslaugos: **Azure App Service** – aplikacijai talpinti, **Azure Database for PostgreSQL** – duomenų bazei, **Azure Blob Storage** – garso įrašams ir nuotraukoms saugoti, **Azure Key Vault** – konfidencialiems duomenims valdyti ir **Application Insights** – sistemos stebėsenai.

Projekto versijų kontrolei ir automatiniam diegimui naudojami Git, GitHub ir GitHub Actions