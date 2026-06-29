// Shared statement store — Netlify Function + Netlify Blobs.
// Worker POSTs the processed statement (password-protected); boss GETs it (open).
import { getStore } from '@netlify/blobs';
import { timingSafeEqual } from 'node:crypto';

// Only our own two sites (and local dev) may read responses cross-origin.
const ALLOWED = new Set([
  'https://advanced-ortho-upload.netlify.app',
  'https://advanced-ortho-prem-dashboardview.netlify.app',
  'http://localhost:3000',
]);
const BOSS_ORIGIN = 'https://advanced-ortho-prem-dashboardview.netlify.app';
const cors = (origin) => ({
  'Access-Control-Allow-Origin': ALLOWED.has(origin) ? origin : BOSS_ORIGIN,
  Vary: 'Origin',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-upload-key',
});

const MONTHS = new Set(['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']);

// constant-time password compare (no early-exit timing side channel)
const samePass = (a, b) => {
  const ba = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};

export default async (req) => {
  const origin = req.headers.get('origin') || '';
  const CORS = cors(origin);
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS }); // 204 must have a null body

  const PASS = (process.env.UPLOAD_PASSWORD || '').trim();
  // eventual consistency: reads come from the edge cache (fast worldwide). A statement is
  // published once a month, so a few seconds of read staleness after an upload is fine —
  // and it removes the ~1s origin round-trip that made the boss view lag from the US.
  const store = getStore({ name: 'statements', consistency: 'eventual' });

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'invalid JSON' }, 400); }

    // ---- login check: { action:'verify', key } -> { ok:bool } (rate-limited, fail-open) ----
    if (body && body.action === 'verify') {
      if (!PASS) return json({ ok: false, error: 'not configured' }, 503);
      const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'unknown';
      try {
        const rlKey = `__rl_${ip}`;
        const rl = (await store.get(rlKey, { type: 'json' })) || { n: 0, start: Date.now() };
        const now = Date.now();
        if (now - rl.start > 300000) { rl.n = 0; rl.start = now; }  // 5-min window
        rl.n += 1;
        await store.setJSON(rlKey, rl);
        if (rl.n > 30) return json({ ok: false, error: 'too many attempts' }, 429);
      } catch { /* fail open — never lock out the operator over a rate-limit hiccup */ }
      return json({ ok: samePass((body.key || '').trim(), PASS) });
    }

    // ---- save (worker upload) — REQUIRES the upload password ----
    const key = (req.headers.get('x-upload-key') || '').trim();
    if (!PASS || !samePass(key, PASS)) return json({ error: 'unauthorized' }, 401);

    const data = body;
    if (!data || !data.month || !data.year) return json({ error: 'missing month/year' }, 400);
    if (!MONTHS.has(String(data.month))) return json({ error: 'invalid month' }, 400);
    const yr = Number(data.year);
    if (!Number.isInteger(yr) || yr < 2000 || yr > 2100) return json({ error: 'invalid year' }, 400);

    const mkey = `${yr}-${data.month}`; // e.g. "2026-May"
    try {
      await store.setJSON(mkey, data);                 // persist the statement first…
      await store.setJSON('__latest', { key: mkey });  // …then point "latest" at it
    } catch (e) {
      return json({ error: 'storage write failed' }, 502);
    }
    return json({ ok: true, key: mkey });
  }

  // ---- read (boss view / month switcher) — OPEN, no password ----
  if (req.method === 'GET') {
    const url = new URL(req.url);
    if (url.searchParams.get('list') === '1') {
      // reconstruct the month list from the actual stored keys (no __index drift/race)
      const months = [];
      try {
        const { blobs } = await store.list();
        for (const b of blobs) {
          const m = /^(\d{4})-([A-Za-z]+)$/.exec(b.key);
          if (m && MONTHS.has(m[2])) months.push({ key: b.key, label: `${m[2]} ${m[1]}` });
        }
        months.sort((a, b) => String(b.key).localeCompare(String(a.key)));
      } catch { /* return whatever we have */ }
      return json({ months });
    }
    let key = url.searchParams.get('month');
    if (!key) {
      const latest = await store.get('__latest', { type: 'json' });
      key = latest?.key;
    }
    if (!key) return json({ data: null });
    const data = await store.get(key, { type: 'json' });
    return json({ data: data || null, key });
  }

  return json({ error: 'method not allowed' }, 405);
};
