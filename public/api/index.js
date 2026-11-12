// Vercel serverless proxy for /api/* → Render backend.
// Replaces the old vercel.json rewrite because rewrites cannot add headers:
// this function forwards the request with `x-proxy-key: PROXY_SECRET`, which
// the Render app requires on every request when PROXY_SECRET is set there.
// PROXY_SECRET must exist as a Vercel env var (production).
// Keep dependency-free: global fetch (Node 18+), CJS for max compat.

const RENDER_ORIGIN = 'https://accessscan-9gcz.onrender.com';

const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade', 'host', 'content-length',
]);

async function handler(req, res) {
  const secret = process.env.PROXY_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Proxy is not configured.' });
  }

  // req.url includes path + query (e.g. /api/scan/abc?format=pdf).
  const incoming = new URL(req.url, 'http://localhost');
  const target = `${RENDER_ORIGIN}${incoming.pathname}${incoming.search}`;

  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    const key = k.toLowerCase();
    if (!HOP_BY_HOP.has(key) && v !== undefined) headers[key] = v;
  }
  headers['x-proxy-key'] = secret;

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  let upstream;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      // Node fetch requires duplex:'half' to stream a request body.
      body: hasBody ? req : undefined,
      duplex: 'half',
    });
  } catch {
    return res.status(502).json({ error: 'Backend unreachable.' });
  }

  res.status(upstream.status);
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) res.setHeader(key, value);
  });

  // Buffer the body: responses are small (JSON status, HTML/PDF export) and
  // manual chunk streaming returned empty bodies on Vercel's runtime.
  // shortcut: a very large export would buffer in function memory; fine at
  // current report sizes, upgrade to true streaming if exports grow.
  try {
    const buf = Buffer.from(await upstream.arrayBuffer());
    console.log('proxy', req.method, incoming.pathname, '->', upstream.status, buf.length, 'bytes');
    res.send(buf);
  } catch {
    if (!res.headersSent) res.status(502).json({ error: 'Backend response failed.' });
    else res.end();
  }
}

module.exports = handler;
// Hobby plan caps functions at 60s. PDF export reuses the scan's browser and
// can be slow — if exports time out, this is the first knob to revisit.
module.exports.maxDuration = 60;
module.exports.config = { runtime: 'nodejs' };
