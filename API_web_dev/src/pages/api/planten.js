export async function GET({ request }) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");

  const response = await fetch(
    `https://trefle.io/api/v1/plants/search?q=${query}&token=${import.meta.env.PUBLIC_TREFLE_TOKEN}`
  );

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}