export async function onRequestPost(context) {
  const { request, env } = context;

  const GAS_WEBAPP_URL = env.GAS_WEBAPP_URL;
  const GAS_SECRET = env.GAS_SECRET;

  if (!GAS_WEBAPP_URL) {
    return new Response(JSON.stringify({ ok:false, error:"GAS_WEBAPP_URL no configurado" }), { status:500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok:false, error:"JSON inválido" }), { status:400 });
  }

  const payload = { ...body, secret: GAS_SECRET || "" };

  async function post(url){
    const r = await fetch(url, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload),
      redirect:"manual"
    });
    if ([301,302,303,307,308].includes(r.status)) {
      const loc = r.headers.get("Location");
      if (loc) return fetch(loc, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(payload)
      });
    }
    return r;
  }

  try {
    const up = await post(GAS_WEBAPP_URL);
    const txt = await up.text();
    let data;
    try { data = JSON.parse(txt); }
    catch { data = { ok:false, raw:txt }; }

    return new Response(JSON.stringify(data), {
      headers:{ "Content-Type":"application/json; charset=utf-8", "Access-Control-Allow-Origin":"*" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500 });
  }
}

export async function onRequestOptions(){
  return new Response(null,{
    status:204,
    headers:{
      "Access-Control-Allow-Origin":"*",
      "Access-Control-Allow-Methods":"POST, OPTIONS",
      "Access-Control-Allow-Headers":"Content-Type"
    }
  });
}
