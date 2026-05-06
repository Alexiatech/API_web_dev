// Notificaties helper - laat de browser een melding tonen voor planten
// die water nodig hebben. We gebruiken de Notification API (geen
// service worker / push), dus notificaties verschijnen alleen wanneer
// de gebruiker de app opent. Dat past bij een "open de app even, kijk
// wat er moet" workflow en vereist geen server.
//
// Bronnen:
// - Notification API: https://developer.mozilla.org/en-US/docs/Web/API/Notification
// - requestPermission: https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static
// - tag (voor dedupe per plant in de browser): https://developer.mozilla.org/en-US/docs/Web/API/Notification/tag

import { laden, vraagtWater } from "./tuin.js";

const DEDUP_SLEUTEL = "notificaties-laatst";
// 12 uur: voorkomt dat één plant je elke keer dat je de app opent
// opnieuw lastig valt. Na 12u mag dezelfde plant weer een notificatie.
const DEDUP_VENSTER_MS = 12 * 60 * 60 * 1000;

// True als de browser notificaties ondersteunt. Op iOS Safari < 16.4
// in een gewone tab is dit bijvoorbeeld niet zo.
export function wordtOndersteund() {
    return typeof window !== "undefined" && "Notification" in window;
}

// "default" | "granted" | "denied" | "unsupported"
export function huidigeStaat() {
    if (!wordtOndersteund()) return "unsupported";
    return Notification.permission;
}

// Vraagt de gebruiker om toestemming. Returnt de nieuwe staat.
// De aanroep moet uit een user gesture komen (knop click) anders
// negeert de browser het verzoek.
export async function vraagToestemming() {
    if (!wordtOndersteund()) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    try {
        return await Notification.requestPermission();
    } catch {
        return Notification.permission;
    }
}

// ----------- Dedup laag (localStorage) -----------

function leesDedup() {
    try {
        const ruw = localStorage.getItem(DEDUP_SLEUTEL);
        return ruw ? JSON.parse(ruw) : {};
    } catch {
        return {};
    }
}

function schrijfDedup(state) {
    try {
        localStorage.setItem(DEDUP_SLEUTEL, JSON.stringify(state));
    } catch {
        // stil falen
    }
}

// ----------- Hoofdfunctie -----------

// Loopt door de tuin en vuurt voor elke dorstige plant een notificatie.
// Rate-limit: dezelfde plant niet vaker dan eens per 12 uur. Returnt
// het aantal verstuurde notificaties (handig voor debugging).
export function notificeerDorstigePlanten() {
    if (!wordtOndersteund() || Notification.permission !== "granted") {
        return 0;
    }

    const planten = laden().filter(vraagtWater);
    if (planten.length === 0) return 0;

    const dedup = leesDedup();
    const nu = Date.now();
    let verstuurd = 0;

    planten.forEach((p) => {
        const laatst = dedup[p.id] ?? 0;
        if (nu - laatst < DEDUP_VENSTER_MS) return; // recent al gewaarschuwd

        const naam = p.common_name ?? p.scientific_name ?? "Your plant";

        try {
            new Notification(`${naam} needs water`, {
                body: "Tap to mark it as watered in My Garden.",
                icon: p.image_url ?? "/favicon.svg",
                // tag zorgt dat een nieuwe melding voor dezelfde plant de
                // oude vervangt in plaats van naast elkaar te tonen.
                tag: `water-${p.id}`,
            });
            dedup[p.id] = nu;
            verstuurd++;
        } catch {
            // Sommige browsers gooien als de tab op de achtergrond staat
            // of als de quota op is. Negeer.
        }
    });

    schrijfDedup(dedup);
    return verstuurd;
}
