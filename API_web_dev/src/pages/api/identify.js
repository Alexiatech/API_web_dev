// API route die een foto ontvangt, deze naar Pl@ntNet stuurt voor herkenning,
// en dan voor de top 3 resultaten Trefle doorzoekt zodat we een link naar
// de detail pagina kunnen maken.

export async function POST({ request }) {
    const PLANTNET_TOKEN = import.meta.env.PUBLIC_PLANTNET_TOKEN;
    const TREFLE_TOKEN = import.meta.env.PUBLIC_TREFLE_TOKEN;

    // ------- Stap 1: ontvang de foto van de browser -------
    let formData;
    try {
        formData = await request.formData();
    } catch (e) {
        return jsonRespons({ error: "No photo in the request" }, 400);
    }

    const imageFile = formData.get("image");
    if (!imageFile) {
        return jsonRespons({ error: "No photo received" }, 400);
    }

    // Welk plant-deel staat er op de foto? (bloem / blad / vrucht / schors)
    // Als de gebruiker niets kiest, stuur ik "flower" mee als veilige default.
    const gekozenOrgaan = formData.get("organ") || "flower";

    // ------- Stap 2: stuur de foto door naar Pl@ntNet -------
    const plantNetForm = new FormData();
    // Pl@ntNet wil de foto als 'images' met een bestandsnaam
    plantNetForm.append("images", imageFile, "plant.jpg");
    // Geldige waarden: leaf, flower, fruit, bark  (NIET "auto")
    plantNetForm.append("organs", gekozenOrgaan);

    let plantNetResponse;
    try {
        plantNetResponse = await fetch(
            `https://my-api.plantnet.org/v2/identify/all?api-key=${PLANTNET_TOKEN}`,
            {
                method: "POST",
                body: plantNetForm,
            }
        );
    } catch (e) {
        return jsonRespons(
            {
                error: "Could not reach Pl@ntNet",
                details: e.message,
            },
            502
        );
    }

    if (!plantNetResponse.ok) {
        // Pl@ntNet geeft vaak een JSON met een message veld bij fouten
        const errorText = await plantNetResponse.text();
        let parsedMessage = errorText;
        try {
            const parsed = JSON.parse(errorText);
            parsedMessage = parsed.message ?? parsed.error ?? errorText;
        } catch {
            // geen JSON - laat de plain text staan
        }
        return jsonRespons(
            {
                error: `Pl@ntNet error (${plantNetResponse.status})`,
                details: parsedMessage,
            },
            plantNetResponse.status
        );
    }

    const plantNetData = await plantNetResponse.json();
    const topResultaten = (plantNetData.results ?? []).slice(0, 3);

    // ------- Stap 3: voor elke top-match Trefle doorzoeken -------
    const resultaten = await Promise.all(
        topResultaten.map(async (r) => {
            const wetenschappelijkeNaam = r.species?.scientificNameWithoutAuthor;
            const commonName = r.species?.commonNames?.[0];

            let trefleMatch = null;
            if (wetenschappelijkeNaam) {
                try {
                    const trefleResp = await fetch(
                        `https://trefle.io/api/v1/plants/search?q=${encodeURIComponent(
                            wetenschappelijkeNaam
                        )}&token=${TREFLE_TOKEN}`
                    );
                    const trefleData = await trefleResp.json();
                    trefleMatch = trefleData.data?.[0] ?? null;
                } catch (e) {
                    // stil mislukken - we laten Trefle info gewoon leeg
                }
            }

            return {
                score: r.score,
                scientific_name: wetenschappelijkeNaam,
                common_name: commonName,
                trefle_id: trefleMatch?.id ?? null,
                trefle_common_name: trefleMatch?.common_name ?? null,
                trefle_image: trefleMatch?.image_url ?? null,
            };
        })
    );

    return jsonRespons({ results: resultaten });
}

// Kleine helper zodat we niet elke keer dezelfde Response hoeven te typen
function jsonRespons(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
