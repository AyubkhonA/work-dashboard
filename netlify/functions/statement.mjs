// Shared statement store — Netlify Function + Netlify Blobs.
// Worker POSTs the processed statement (password-protected); boss GETs it (open).
import { getStore } from '@netlify/blobs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-upload-key',
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS });

  // Secret upload password — set as a Netlify env var on the WORKER site only.
  // Never shipped to the client bundle, so it can't be read or bypassed.
  const PASS = (process.env.UPLOAD_PASSWORD || '').trim();
  // strong consistency: the month list/latest reflect a just-uploaded month immediately
  // (no eventual-consistency lag), so switching months works right after upload.
  const store = getStore({ name: 'statements', consistency: 'strong' });

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'invalid JSON' }, 400); }

    // ---- login check: { action:'verify', key } -> { ok:bool } ----
    if (body && body.action === 'verify') {
      if (!PASS) return json({ ok: false, error: 'not configured' }, 503);
      return json({ ok: (body.key || '').trim() === PASS });
    }

    // ---- save (worker upload) — REQUIRES the upload password ----
    const key = (req.headers.get('x-upload-key') || '').trim();
    if (!PASS || key !== PASS) return json({ error: 'unauthorized' }, 401);

    const data = body;
    if (!data || !data.month || !data.year) return json({ error: 'missing month/year' }, 400);

    const mkey = `${data.year}-${data.month}`; // e.g. "2026-May"
    await store.setJSON(mkey, data);

    const index = (await store.get('__index', { type: 'json' })) || [];
    if (!index.find((m) => m.key === mkey)) {
      index.unshift({ key: mkey, label: `${data.month} ${data.year}` });
      await store.setJSON('__index', index);
    }
    await store.setJSON('__latest', { key: mkey });
    return json({ ok: true, key: mkey });
  }

  // ---- read (boss view / month switcher) — OPEN, no password ----
  if (req.method === 'GET') {
    const url = new URL(req.url);
    if (url.searchParams.get('list') === '1') {
      const index = (await store.get('__index', { type: 'json' })) || [];
      return json({ months: index });
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
