export async function onRequestPost({ request, env }) {
  const GAS_WEBAPP_URL = (env.GAS_WEBAPP_URL || "").trim();
  const GAS_SECRET = (env.GAS_SECRET || "").trim();

  if (!GAS_WEBAPP_URL) {
    return Response.json({ ok: false, error: "GAS_WEBAPP_URL no configurado" }, { status: 500 });
  }

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ ok: false, error: "JSON inválido" }, { status: 400 }); }

  const payload = { ...body, secret: GAS_SECRET };

  async function repost(url, max = 5) {
    let currentUrl = url;

    for (let i = 0; i < max; i++) {
      const r = await fetch(currentUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        redirect: "manual",
      });

      // Si no hay redirect, devolvemos respuesta
      if (![301, 302, 303, 307, 308].includes(r.status)) return r;

      const loc = r.headers.get("Location");
      if (!loc) return r;

      currentUrl = loc;
    }

    // si se pasa de redirects
    return new Response(JSON.stringify({ ok: false, error: "Demasiados redirects" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const upstream = await repost(GAS_WEBAPP_URL, 5);
  const text = await upstream.text();

  let data;
  try { data = JSON.parse(text); }
  catch { data = { ok: false, error: "Respuesta no-JSON desde Apps Script", raw: text.slice(0, 400) }; }

  return Response.json(data, { status: 200 });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
