export async function onRequestPost({ request, env }) {
  const GAS_WEBAPP_URL = env.GAS_WEBAPP_URL;
  const GAS_SECRET = env.GAS_SECRET || "";

  if (!GAS_WEBAPP_URL) {
    return Response.json({ ok:false, error:"GAS_WEBAPP_URL no configurado" }, { status: 500 });
  }

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ ok:false, error:"JSON inválido" }, { status: 400 }); }

  const payload = { ...body, secret: GAS_SECRET };

  async function postFollow(url) {
    const r1 = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "manual",
    });

    if ([301,302,303,307,308].includes(r1.status)) {
      const loc = r1.headers.get("Location");
      if (!loc) return r1;
      return fetch(loc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    return r1;
  }

  const up = await postFollow(GAS_WEBAPP_URL);
  const text = await up.text();

  let data;
  try { data = JSON.parse(text); }
  catch { data = { ok:false, error:"Respuesta no-JSON desde Apps Script", raw: text }; }

  return Response.json(data, { status: 200 });
}
