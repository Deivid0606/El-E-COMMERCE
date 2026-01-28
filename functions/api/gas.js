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

  async function postFollow(url) {
    const r1 = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "manual",
    });

    if ([301,302,303,307,308].includes(r1.status)) {
      const loc = r1.headers.get("Location") || "";
      // Seguimos 1 redirect (suficiente para Apps Script)
      const r2 = await fetch(loc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        redirect: "manual",
      });
      return { res: r2, first: r1 };
    }
    return { res: r1, first: null };
  }

  try {
    const { res, first } = await postFollow(GAS_WEBAPP_URL);
    const text = await res.text();

    // Intentar parsear JSON
    try {
      const data = JSON.parse(text);
      return Response.json(data, { status: 200 });
    } catch {
      // Debug cuando viene HTML/no-JSON
      return Response.json({
        ok: false,
        error: "Respuesta no-JSON desde Apps Script",
        debug: {
          used_url: GAS_WEBAPP_URL,
          upstream_status: res.status,
          upstream_content_type: res.headers.get("content-type"),
          first_redirect_status: first?.status || null,
          first_redirect_location: first?.headers?.get("location") || null,
          body_head: text.slice(0, 300) // primeros 300 chars
        }
      }, { status: 200 });
    }
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
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
