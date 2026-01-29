export async function onRequestPost({ request, env }) {
  const GAS_WEBAPP_URL = (env.GAS_WEBAPP_URL || "").trim();
  const GAS_SECRET = (env.GAS_SECRET || "").trim();

  if (!GAS_WEBAPP_URL) {
    return Response.json({ ok: false, error: "GAS_WEBAPP_URL no configurado" }, { status: 500 });
  }

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ ok: false, error: "JSON inválido" }, { status: 400 }); }

  // 🔐 mandamos el secret en el body
  const payload = { ...body, secret: GAS_SECRET };

  // ✅ POST con redirect manual (para evitar que se convierta en GET)
  async function postRepost(url) {
    const r1 = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "manual",
    });

    if ([301, 302, 303, 307, 308].includes(r1.status)) {
      const loc = r1.headers.get("Location");
      if (!loc) return r1;

      // Re-POST al Location
      return fetch(loc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        redirect: "manual",
      });
    }

    return r1;
  }

  const upstream = await postRepost(GAS_WEBAPP_URL);
  const text = await upstream.text();

  // ✅ siempre devolver JSON al frontend
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
