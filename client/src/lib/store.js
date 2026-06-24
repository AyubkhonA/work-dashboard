// Local persistence so the worker's processed statement survives navigation and is
// readable by the /boss view (same browser). Cross-device sharing comes later via a backend.
const KEY = 'ortho-statement-v1';

export function saveStatement(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save statement locally:', e.message);
  }
}

export function loadStatement() {
  try {
    const s = localStorage.getItem(KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
}

export function clearStatement() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}
