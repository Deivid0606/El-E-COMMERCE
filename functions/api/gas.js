export async function onRequestPost({ request, env }) {
  const url = (env.GAS_WEBAPP_URL || "").trim();
  const secret = (env.GAS_SECRET || "").trim();
  const body = await request.json();
  const payload = { ...body, secret };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  return new Response(text, { status: 200, headers: { "Content-Type": "application/json" } });
}
