# Plant App

Een mobile-first webapp waarmee je planten kunt herkennen via een foto, plant-info kunt opzoeken, en je eigen "tuin" kunt bijhouden met water-reminders. Gebouwd met Astro (server-side rendering), Trefle voor plant-data en Pl@ntNet voor plant-herkenning.


## Wat doet de app

De app heeft drie hoofdschermen, bereikbaar via één bottom-nav balk onderaan:

- **Species** — bladeren door en zoeken in de Trefle plant-database. Sorteren op naam (A-Z) of jaar van eerste beschrijving. Klik door naar een detailpagina met alle info, een "did you know?" sectie met conversationele feitjes, en een care-badge die de moeilijkheid inschat.
- **Scan** — open de camera, maak een foto van een bloem/blad/vrucht/schors, en de app stuurt 'm via een eigen API endpoint naar Pl@ntNet. Top 3 matches komen terug met een match-percentage, en zijn klikbaar naar de Trefle detailpagina.
- **Garden** — planten die je via "Save to garden" hebt opgeslagen. Per plant kun je het water-interval (1-60 dagen) instellen, "Mark as watered" klikken, en notificaties aanzetten zodat de browser je waarschuwt wanneer een plant water nodig heeft.

## Technologie

- **[Astro](https://astro.build/) v5+** in `output: "server"` mode (SSR)
- **[Node adapter](https://docs.astro.build/en/guides/integrations-guide/node/)** in `standalone` mode (Render kan 'm draaien met `node ./dist/server/entry.mjs`)
- **Vanilla JS** in scripts, geen frontend framework — de app is bewust klein gehouden
- **Native CSS features**: nesting, `@scope`, container queries, custom properties, `@layer`
- **Trefle API** voor plant-data en zoeken
- **Pl@ntNet API** voor plant-herkenning vanuit een foto

## Web API's gebruikt

De minor vroeg om gebruik van browser web APIs. Hier wat ik heb toegepast:

- **[MediaDevices.getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)** — live camera-stream in `ScanCamera.astro`. Vraagt de achterkant-camera op met `facingMode: { ideal: "environment" }` zodat je een plant kunt fotograferen.
- **[Canvas + toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)** — een frame uit de video naar een JPEG blob converteren om naar Pl@ntNet te uploaden.
- **[localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)** — opslaan van de tuin (`mijn-tuin` key), water-tracking (`laatst_water`, `interval_dagen`) en notificatie dedup (`notificaties-laatst`).
- **[Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notification)** — water-reminders via browser notificaties zonder service worker.
- **[storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)** — sync tussen meerdere tabs: als je in de ene tab een plant verwijdert uit je tuin, ververst de andere tab automatisch.
- **[CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent)** — communicatie tussen `Layout.astro` en `ScanCamera.astro` (camera start/stopt op basis van actieve view).
- **[visibilitychange](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)** — als de tab weer zichtbaar wordt opnieuw checken of er planten dorstig zijn.
- **[URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)** — querystrings parsen in API endpoints en server-rendered pages.
- **[FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData)** — multipart upload van de foto naar `/api/identify`.
- **[CSS @scope](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope)** — geneste styling per component zonder class-namespace pollution.
- **[Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)** — de info-grid op de detail pagina past zich aan aan de breedte van de kaart, niet aan de viewport.

## Architectuur

```
src/
├── pages/
│   ├── index.astro              ← single-page app (alle views via #hash)
│   ├── soorten/
│   │   └── [id].astro           ← dynamische detail-page
│   └── api/
│       ├── planten.js           ← server-proxy: zoek planten in Trefle
│       └── identify.js          ← server-proxy: foto → Pl@ntNet → Trefle
├── layouts/
│   └── Layout.astro             ← view toggle via hash, hoofd-script
├── components/
│   ├── Header.astro             ← bottom-nav (3 knoppen + center camera)
│   ├── SoortenLijst.astro       ← Species view
│   ├── ScanCamera.astro         ← Scan view
│   ├── MijnTuin.astro           ← Garden view
│   ├── PlantDetail.astro        ← detail view (op /soorten/[id])
│   └── AchtergrondBloemen.astro ← bewegende achtergrond
└── lib/
    ├── tuin.js                  ← localStorage helpers + water-tracking
    └── notificaties.js          ← Notification API + dedup
```

### Server-side vs client-side

API tokens (`TREFLE_TOKEN`, `PLANTNET_TOKEN`) zijn alleen op de server beschikbaar. De browser praat met `/api/planten` en `/api/identify` — die endpoints (Astro [endpoints](https://docs.astro.build/en/guides/endpoints/)) draaien server-side, halen data op van de externe API's, en sturen JSON terug. Twee redenen:

1. **CORS**: Trefle en Pl@ntNet staan geen browser-requests toe.
2. **Security**: tokens horen niet in de client bundle.

### CORS + Astro security.checkOrigin

Astro 5 heeft sinds kort `security.checkOrigin: true` standaard aanstaan, wat elke POST blokkeert als de Origin header niet matcht met de Host. Achter de Render proxy gaat dat fout (proxy interne host ≠ public host), dus elke foto-upload kreeg een 403 met de letterlijke tekst "Cross-site POST forbidden". Omdat `/api/identify` stateless is (geen cookies, geen sessie) is CSRF-bescherming hier niet relevant; staat uit in `astro.config.mjs`.

Daarnaast heeft de endpoint zelf nog een OPTIONS handler en `Access-Control-Allow-Origin` headers voor de standaard CORS preflight die de browser doet bij multipart POSTs.

## Externe assets

- **[Lucide Icons](https://lucide.dev/)** (MIT) — alle iconen in de app komen hier vandaan: list, camera, sprout, droplet. Inline SVG zodat ze meekleuren met `currentColor`.
- **[Google Fonts: Carter One](https://fonts.google.com/specimen/Carter+One)** — display-font voor de hoofd-titel.

## Process / Checkouts

> _De data zijn richtlijnen — pas aan aan jouw eigen tijdlijn._

### Checkout — week 1
Begonnen met het idee: een plant-app die de Trefle API combineert met Pl@ntNet, voor mensen die hun planten thuis willen leren kennen en water-reminders willen krijgen. Gekozen voor Astro met SSR omdat ik server-side fetch wil kunnen doen zonder dat tokens in de browser terechtkomen.

### Checkout — week 2
Eerste opzet van de Species pagina (Trefle search) en de basis layout met bottom-nav. Stuk gelopen op CORS — Trefle wil niet vanuit de browser geraadpleegd worden. Opgelost door een eigen API-endpoint `/api/planten.js` te maken die als proxy fungeert. Sindsdien gaan alle externe API calls via mijn server.

### Checkout — week 3
Detail pagina toegevoegd via een dynamische route (`src/pages/soorten/[id].astro`). De Trefle data is enorm; ik heb een `alleInfo` array gebouwd die ik filter op niet-lege waardes en die ik renderen tot een kaart-grid. Voor de "did you know?" sectie schrijf ik conversationele feitjes op basis van of velden bestaan, zodat planten met weinig data geen halve zinnen tonen.

### Weekly checkout — week 4
Begonnen aan de Scan view. Live camera via `getUserMedia`, dan een frame naar canvas, naar blob, en als FormData naar `/api/identify`. Pl@ntNet retourneert een score + scientific name, daarna doe ik per resultaat nog een Trefle search om de plant te kunnen linken naar mijn detail-pagina.

### Checkout — week 5
Garden view toegevoegd. Planten opslaan in localStorage met een eigen `tuin.js` helper module. Daarna water-tracking erop gebouwd: `laatst_water`, `interval_dagen` en helpers `markeerWater`, `vraagtWater`, `dagenSindsWater`. Planten die water vragen krijgen een oranje rand en worden in de lijst bovenaan gezet.

### Checkout — week 6
Notificaties werkend gekregen. Notification API gebruikt zonder service worker — notificaties verschijnen alleen wanneer de tab open is (of `visibilitychange` triggert). Een knop op de Garden view vraagt permission (browsers eisen een user gesture). Dedup laag in localStorage zodat dezelfde plant niet vaker dan 1× per 12u meldt.

### Weekafsluiting — week 7
Stats overzicht balk op de Garden view: totaal aantal planten, hoeveel water nodig hebben, en wanneer de eerstvolgende waterbeurt is. UI verfijnd: kaartjes gecentreerd, bottom-nav verkleind en gericht op 3 hoofd-acties (Species/Scan/Garden), camera-icon op de center-knop.

### Laatste loodjes
Code opgeruimd en gedocumenteerd. Astro `security.checkOrigin` uitgezet om CORS-probleem op Render op te lossen. Year, Author en pH velden uit de info-grid weggehaald omdat ze in de praktijk weinig zeggen over de plant. Trefle/Pl@ntNet integratie bewust achter eigen API endpoints zodat tokens server-side blijven.

## Bronnen

### APIs

- [Trefle API documentatie](https://docs.trefle.io/) — plant-data, search, en detail endpoints
- [Pl@ntNet API documentatie](https://my.plantnet.org/doc) — plant-herkenning vanuit foto's

### Astro

- [Astro endpoints](https://docs.astro.build/en/guides/endpoints/) — voor `/api/planten` en `/api/identify`
- [Astro environment variables](https://docs.astro.build/en/guides/environment-variables/) — `import.meta.env.TREFLE_TOKEN`
- [Astro security.checkOrigin](https://docs.astro.build/en/reference/configuration-reference/#securitycheckorigin) — CSRF check uitgezet
- [Astro Node adapter](https://docs.astro.build/en/guides/integrations-guide/node/) — standalone mode voor Render

### Web APIs (MDN)

- [MediaDevices.getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [HTMLCanvasElement.toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notification)
- [Notification.requestPermission](https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static)
- [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)
- [visibilitychange event](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)
- [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent)
- [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
- [FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
- [HTMLElement.dataset](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset)
- [Element.scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView)
- [HTTP CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

### CSS

- [CSS @scope](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope) — component-scoped styling
- [CSS @layer](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) — explicit cascade ordering
- [CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
- [CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [CSS isolation](https://developer.mozilla.org/en-US/docs/Web/CSS/isolation)
- [CSS env() / safe-area-inset](https://developer.mozilla.org/en-US/docs/Web/CSS/env)
- [@property](https://web.dev/articles/at-property) — getypeerde custom properties

### Iconen + fonts

- [Lucide Icons](https://lucide.dev/) — MIT-gelicenseerde icon-set, inline SVG
- [Google Fonts: Carter One](https://fonts.google.com/specimen/Carter+One)

## Lokaal draaien

Je hebt Node 18+ nodig en een `.env` bestand met geldige tokens:

```
TREFLE_TOKEN=jouw-trefle-token
PLANTNET_TOKEN=jouw-plantnet-api-key
```

- Trefle token: aanvragen via [https://trefle.io/users/sign_up](https://trefle.io/users/sign_up)
- Pl@ntNet API-key: aanvragen via [https://my.plantnet.org/account/settings](https://my.plantnet.org/account/settings)

## Commands

| Command           | Wat het doet                                       |
| ----------------- | -------------------------------------------------- |
| `npm install`     | Installeert dependencies                           |
| `npm run dev`     | Start de dev-server (lokaal op `localhost:4321`)   |
| `npm run build`   | Bouwt de productie-versie naar `./dist/`           |
| `npm run preview` | Preview de productie-build lokaal                  |
| `npm run start`   | Start de gebouwde app op de juiste poort (Render)  |
