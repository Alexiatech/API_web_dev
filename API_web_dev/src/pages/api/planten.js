// Server-side API endpoint: zoekt planten in Trefle op basis van een
// zoekterm en stuurt het resultaat terug naar de browser.
//
// Waarom als endpoint i.p.v. direct vanuit een component?
// 1. De Trefle API werkt niet vanuit de browser door CORS-restricties.
// 2. We willen de API-token niet in de client bundle hebben - door de
//    fetch op de server te doen blijft de token in de server-environment.
//
// Astro herkent elk bestand in src/pages/ als een URL. Dit bestand wordt
// dus bereikbaar als /api/planten en de geëxporteerde GET-functie reageert
// op GET-requests. De browser roept 'm aan met fetch("/api/planten?q=...").
//
// Bronnen:
// - Astro endpoints: https://docs.astro.build/en/guides/endpoints/
// - Trefle search endpoint: https://docs.trefle.io/reference/#operation/searchPlants
// - URLSearchParams (querystring lezen):
//   https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams

export async function GET({ request }) {
    // Haal de ?q=... uit de URL die de browser heeft aangeroepen.
    const url = new URL(request.url);
    const query = url.searchParams.get("q");

    // Roep Trefle's search endpoint aan. De token wordt als query-parameter
    // meegestuurd zoals Trefle dat verwacht (i.p.v. een Authorization header).
    const response = await fetch(
        `https://trefle.io/api/v1/plants/search?q=${query}&token=${import.meta.env.PUBLIC_TREFLE_TOKEN}`
    );

    const data = await response.json();

    // Stuur het JSON-antwoord terug naar de browser. We zetten de
    // Content-Type expliciet zodat fetch() aan de andere kant netjes
    // .json() kan doen op de response.
    return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
    });
}
