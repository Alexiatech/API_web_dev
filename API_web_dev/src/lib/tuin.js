
//
// Een plant wordt opgeslagen als:
//   { id, common_name, scientific_name, image_url, opgeslagen_op,
//     laatst_water, interval_dagen }
//
// Video bronnen:
// - localStorage API (sessionStorage & localStorage uitgelegd):
//   https://www.youtube.com/watch?v=2hyOJRXgHLo
// - JavaScript array methodes (filter, map, some, etc.) - Web Dev Simplified:
//   https://www.youtube.com/watch?v=R8rmfD9Y5-c
//
// Bronnen:
// - localStorage API: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
// - JSON.parse foutafhandeling: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
// - Date.now(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now



const SLEUTEL = "mijn-tuin"; // de localStorage key
const STANDAARD_INTERVAL = 7; // 7 dagen tussen water-beurten als de gebruiker niets kiest
const MS_PER_DAG = 24 * 60 * 60 * 1000; // 1 dag in milliseconden



// Haalt alle opgeslagen planten op uit localStorage en geeft ze terug
// als array. Werkt in drie stappen:
//   1. Lees de ruwe string uit localStorage
//   2. Zet de string om naar een JavaScript array via JSON.parse
//   3. Normaliseer elke plant met standaardwaarden voor laatst_water
//      en interval_dagen - zodat oude entries nooit undefined-waardes
//      hebben. 
//
// Geeft altijd een array terug ook als de key ontbreekt, de JSON
// corrupt is, of localStorage geblokkeerd is (private mode/quota).
export function laden() {
    try {
        const ruw = localStorage.getItem(SLEUTEL);
        if (!ruw) return [];
        const lijst = JSON.parse(ruw);
        if (!Array.isArray(lijst)) return [];
        return lijst.map((p) => ({
            laatst_water: null,
            interval_dagen: STANDAARD_INTERVAL,
            ...p,
        }));
    } catch {
        return [];
    }
}

// Schrijft de volledige plantenlijst terug naar localStorage als string.
// Wordt intern aangeroepen door opslaan(), verwijderen() en patchPlant()
// na elke wijziging. Niet geëxporteerd - alleen bruikbaar binnen tuin.js.
// Faalt stil bij een volle of geblokkeerde localStorage.
//
// - localStorage.setItem():
//   https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem
// - JSON.stringify():
//   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
function schrijven(lijst) {
    try {
        localStorage.setItem(SLEUTEL, JSON.stringify(lijst));
    } catch {
        
    }
}


// Stappen:
//   1. Controleer of de plant een id heeft als dat niet zo is stop 'ie meteen.
//   2. Laad de huidige lijst en check op duplicaten via some()
//   3. Maak een nieuwe array met spread (...lijst) en voeg de plant toe
//      met alle benodigde velden. Ontbrekende velden worden null via ??
//   4. Sla de nieuwe lijst op en geef hem terug
//   Gebruikte concepten:
// - Spread operator (...) om een kopie te maken zonder de originele
//   array aan te passen:
//   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax
// - Nullish coalescing (??) om undefined-waardes te vervangen door null:
//   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing
// - Array.some() om te checken of een plant al bestaat zonder de hele
//   lijst door te lopen:
//   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some

export function opslaan(plant) {

    const lijst = laden();
    if (lijst.some((p) => p.id === plant.id)) {
        return lijst; // al opgeslagen, niet dubbel toevoegen
    }

    const nieuw = [
        ...lijst,
        {
            id: plant.id,
            common_name: plant.common_name ?? null,
            scientific_name: plant.scientific_name ?? null,
            image_url: plant.image_url ?? null,
            opgeslagen_op: Date.now(),
            laatst_water: null,
            interval_dagen: STANDAARD_INTERVAL,
        },
    ];
    schrijven(nieuw);
    return nieuw;
}

// Verwijdert een plant uit de tuin op basis van id.
// filter() maakt een nieuwe array zonder de plant met het opgegeven id.
// Returnt de nieuwe lijst zodat de UI direct kan re-renderen.
//
// Array.filter():
//   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter

export function verwijderen(id) {
    const lijst = laden().filter((p) => p.id !== id);
    schrijven(lijst);
    return lijst;
}

// Controleert of een plant al in de tuin zit op basis van id.
// some() stopt zodra hij een match vindt en geeft true of false terug.
// Wordt gebruikt in PlantenDetail om de juiste knop te tonen
// (opslaan vs verwijderen).
//
// - Array.some():
//   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some

export function bevatPlant(id) {
    return laden().some((p) => p.id === id);
}

// ====================  Water-tracking  ====================

// Werkt 1 plant bij in de lijst. Pakt 'm met de id, vervangt 'm door
// een nieuwe versie met de gegeven patch, schrijft alles terug.
function patchPlant(id, patch) {
    const lijst = laden();
    const nieuw = lijst.map((p) => (p.id === id ? { ...p, ...patch } : p));
    schrijven(nieuw);
    return nieuw;
}

// Markeert een plant als zojuist water gekregen. Returnt de nieuwe lijst.
export function markeerWater(id) {
    return patchPlant(id, { laatst_water: Date.now() });
}

// Stelt het water-interval (in dagen) in. Klemt tussen 1 en 60 zodat de
// gebruiker geen onmogelijke waardes kan zetten via een leeg / negatief
// invoer veld.
export function setWaterInterval(id, dagen) {
    const veilig = Math.max(1, Math.min(60, Math.round(Number(dagen) || STANDAARD_INTERVAL)));
    return patchPlant(id, { interval_dagen: veilig });
}

// Hoeveel volle dagen geleden was de laatste water-beurt? null als nog
// nooit water is gegeven.
export function dagenSindsWater(plant) {
    if (!plant?.laatst_water) return null;
    return Math.floor((Date.now() - plant.laatst_water) / MS_PER_DAG);
}

// True als de plant water nodig heeft. Een plant die nog nooit water
// heeft gekregen telt ook als "vraagt water" zodat de gebruiker geen
// nieuwe plant per ongeluk vergeet.
export function vraagtWater(plant) {
    if (!plant) return false;
    if (!plant.laatst_water) return true;
    const dagen = dagenSindsWater(plant);
    return dagen >= (plant.interval_dagen ?? STANDAARD_INTERVAL);
}
