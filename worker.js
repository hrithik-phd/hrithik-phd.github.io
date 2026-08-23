// PhD Tracker sync worker — Cloudflare Workers + KV
// Setup (5 min):
// 1. dash.cloudflare.com → Workers & Pages → Create Worker → paste this code → Deploy
// 2. Worker → Settings → Bindings → Add → KV Namespace:
//      variable name: PHD_KV   (create a new namespace, any name)
// 3. Worker → Settings → Variables & Secrets → Add secret:
//      name: SECRET_TOKEN   value: <invent a long random string>
// 4. Copy the worker URL (https://<name>.<account>.workers.dev)
// 5. In the site's Settings panel, paste the URL + the same token. Done.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,X-Auth-Token",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }
    const token = request.headers.get("X-Auth-Token");
    if (!token || token !== env.SECRET_TOKEN) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    if (request.method === "GET") {
      const data = await env.PHD_KV.get("state");
      return new Response(data || "{}", {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    if (request.method === "PUT") {
      const body = await request.text();
      if (body.length > 400000) {
        return new Response(JSON.stringify({ error: "too large" }), {
          status: 413,
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
      try { JSON.parse(body); } catch {
        return new Response(JSON.stringify({ error: "invalid json" }), {
          status: 400,
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
      await env.PHD_KV.put("state", body);
      return new Response(JSON.stringify({ ok: true, savedAt: Date.now() }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  },
};
