export async function onRequestPost({ request, env }) {
  const GAS_WEBAPP_URL = (env.GAS_WEBAPP_URL || "").trim();
  const GAS_SECRET = (env.GAS_SECRET || "").trim();

  if (!GAS_WEBAPP_URL) {
    return Response.json({ ok: false, error: "GAS_WEBAPP_URL no configurado" }, { status: 500 });
  }

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ ok: false, error: "JSON inválido" }, { status: 400 }); }

  // ✅ Mandar secret en el body (Apps Script no expone headers bien)
  const payload = { ...body, secret: GAS_SECRET };

  // ✅ Manejo de redirect de Google SIN perder POST
  async function postWithManualRedirect(url) {
    const r1 = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "manual",
    });

    if ([301, 302, 303, 307, 308].includes(r1.status)) {
      const loc = r1.headers.get("Location");
      if (!loc) return r1;

      // Re-POST al Location (no GET)
      return fetch(loc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        redirect: "manual",
      });
    }

    return r1;
  }

  const upstream = await postWithManualRedirect(GAS_WEBAPP_URL);
  const text = await upstream.text();

  // ✅ Siempre devolver JSON al frontend
  let data;
  try { data = JSON.parse(text); }
  catch {
    data = { ok: false, error: "Respuesta no-JSON desde Apps Script", raw: text.slice(0, 400) };
  }

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
