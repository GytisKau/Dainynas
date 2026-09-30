# Dainynas API – Bruno testai

Kolekcija skirta Bruno 3+ / OpenCollection YAML formatui.

## Paleidimas

1. Paleisk API adresu `http://localhost:5272`.
2. Bruno atidaryk šį katalogą kaip kolekciją.
3. Pasirink `Local` environment.
4. Paleisk visą kolekciją eilės tvarka.

CLI:

```bash
bru run --env Local
```

## Kintamųjų grandinė

- `testEmail` – sugeneruojamas registracijos užklausoje.
- `token` – išsaugomas iš registracijos / prisijungimo atsakymo.
- `performerId` – iš `POST /api/Performers`.
- `songId` – iš `POST /api/Songs`.
- `commentId` – iš `POST /api/Comments`.
- `albumId` – iš `POST /api/Albums`.
- `adminToken` – pasirenkamas environment secret, reikalingas tik `Auth/admin` testui.

## Pastabos

OpenAPI specifikacijoje nėra `securitySchemes`, todėl Bearer autentifikacija mutavimo operacijoms ir `/api/Auth/me` pritaikyta pagal projekto funkcinius reikalavimus. Jei tavo API autorizacija sukonfigūruota kitaip, pakeisk atitinkamų request failų `http.auth`.

`Auth/admin` testas įdėtas į `90 Optional`; jis nebus prasmingas, kol `adminToken` nėra užpildytas administratoriaus JWT.

Testai tikrina:
- statuso kodus;
- pagrindinę atsakymo struktūrą;
- grąžinamų reikšmių sutapimą su runtime kintamaisiais;
- filtrus ir puslapiavimą;
- 400 validacijos atvejus;
- 404 neegzistuojančių / ištrintų resursų atvejus;
- CRUD grandinę ir cleanup.
