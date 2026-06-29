// Talks to the Netlify function so the worker's upload is shared with the boss
// (cross-device). VITE_API_BASE points the boss site at the worker site's backend;
// empty = same-origin functions.
const BASE = import.meta.env.VITE_API_BASE || '';
const FN = `${BASE}/.netlify/functions/statement`;

const url = (params) => {
  const u = new URL(FN, window.location.origin);
  for (const [k, v] of Object.entries(params || {})) u.searchParams.set(k, v);
  return u.toString();
};

// Check the upload password against the server (login).
// Returns: true = correct, false = wrong, null = couldn't reach the server.
export async function verifyKey(key) {
  try {
    const r = await fetch(FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', key: (key || '').trim() }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return !!j.ok;
  } catch {
    return null;
  }
}

export async function saveToCloud(data, key) {
  try {
    const r = await fetch(FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-upload-key': (key || '').trim() },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.warn('Cloud save failed:', e.message);
    return null;
  }
}

export async function loadFromCloud(monthKey) {
  try {
    const r = await fetch(monthKey ? url({ month: monthKey }) : FN);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    return (j.data && typeof j.data === 'object') ? j.data : null;
  } catch (e) {
    console.warn('Cloud load failed:', e.message);
    return null;
  }
}

export async function listCloudMonths() {
  try {
    const r = await fetch(url({ list: '1' }));
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    return Array.isArray(j.months) ? j.months : [];
  } catch (e) {
    console.warn('Cloud month list failed:', e.message);
    return [];
  }
}
