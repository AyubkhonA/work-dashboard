import React, { useState, useEffect, useCallback, useRef } from 'react';
import './terminal.css';
import sample from './data/may2026.json';
import Upload from './screens/Upload';
import Dashboard from './screens/Dashboard';
import { saveStatement, loadStatement } from './lib/store';
import { saveToCloud, loadFromCloud, listCloudMonths, verifyKey } from './lib/cloud';

const KEY_LS = 'ortho_upload_key';
const monthKey = (d) => (d ? `${d.year}-${d.month}` : '');
// guard against malformed cached/cloud payloads crashing the dashboard render
const validStatement = (d) =>
  !!(d && typeof d === 'object' && d.month && d.year && Array.isArray(d.offices) && d.summary && d.ar);

// Worker side: gated behind the upload password, then upload + result. Upload lives ONLY here.
function WorkerView() {
  const [authKey, setAuthKey] = useState('');
  // 'checking' = verifying a stored key with the server; 'in' = unlocked; 'out' = show login.
  // No optimistic unlock: a forged localStorage key never renders the app before the server confirms.
  const [status, setStatus] = useState(() => (localStorage.getItem(KEY_LS) ? 'checking' : 'out'));

  useEffect(() => {
    const stored = localStorage.getItem(KEY_LS);
    if (!stored) return undefined;
    let alive = true;
    verifyKey(stored).then((res) => {
      if (!alive) return;
      if (res === false) { localStorage.removeItem(KEY_LS); setStatus('out'); }       // wrong/changed password
      else { setAuthKey(stored); setStatus('in'); }                                   // ok, or offline (res===null)
    });
    return () => { alive = false; };
  }, []);

  const logout = () => { localStorage.removeItem(KEY_LS); setAuthKey(''); setStatus('out'); };

  if (status === 'checking') return <Splash text="Unlocking…" />;
  if (status !== 'in') return <LoginGate onUnlock={(k) => { setAuthKey(k); setStatus('in'); }} />;
  return <WorkerApp uploadKey={authKey} onLogout={logout} />;
}

function WorkerApp({ uploadKey, onLogout }) {
  const [data, setData] = useState(() => { const d = loadStatement(); return validStatement(d) ? d : null; });
  const [months, setMonths] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingKey, setLoadingKey] = useState('');
  const [monthError, setMonthError] = useState('');
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const refreshMonths = useCallback(() => {
    listCloudMonths().then((list) => { if (mounted.current) setMonths(list); });
  }, []);
  useEffect(() => { refreshMonths(); }, [refreshMonths]);

  const onReady = (d) => {
    saveStatement(d);            // local (offline / instant)
    setData(d);                  // show immediately
    // share with the boss (cross-device, password-signed); refresh the list only on a real save
    saveToCloud(d, uploadKey).then((res) => { if (res && res.ok) refreshMonths(); });
  };

  const selectMonth = (key) => {
    if (!key || key === monthKey(data)) return;
    setLoadingMonth(true); setLoadingKey(key); setMonthError('');
    loadFromCloud(key).then((d) => {
      if (!mounted.current) return;
      setLoadingMonth(false);
      if (validStatement(d)) setData(d);
      else setMonthError('Could not load that month — try again.');
    });
  };

  if (!data) return <Upload onReady={onReady} sample={sample} onLogout={onLogout} />;
  return (
    <Dashboard
      data={data} role="worker" onReset={() => setData(null)} onLogout={onLogout}
      months={months} currentKey={monthKey(data)} onSelectMonth={selectMonth}
      loadingMonth={loadingMonth} loadingKey={loadingKey} monthError={monthError}
    />
  );
}

// Password screen — the upload page can't be entered without it.
function LoginGate({ onUnlock }) {
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const clean = pwd.trim();
    if (!clean || busy) return;
    setBusy(true); setErr('');
    const res = await verifyKey(clean);
    setBusy(false);
    if (res === true) { localStorage.setItem(KEY_LS, clean); onUnlock(clean); }
    else if (res === null) setErr('Could not reach the server — check your connection and try again.');
    else { setErr('Incorrect password. Try again.'); setPwd(''); }
  };

  return (
    <div className="term">
      <div className="topbar">
        <div className="brand">ADVANCED ORTHO LAB <span className="slash">//</span> <span className="sub">MONTHLY STATEMENT</span></div>
        <div className="live"><span className="dot" style={{ background: 'var(--amber)', boxShadow: '0 0 8px var(--amber)' }} />Secured upload</div>
      </div>
      <div className="upload-screen">
        <form className="upload-card login-card" onSubmit={submit}>
          <div className="login-lock">🔒</div>
          <h1 style={{ marginBottom: 6 }}>Upload access</h1>
          <p className="upload-sub" style={{ margin: '0 auto 20px' }}>
            Enter the password to open the upload page.
          </p>
          <input
            className="login-input" type="password" value={pwd} autoFocus
            placeholder="Password" onChange={(e) => setPwd(e.target.value)}
          />
          {err && <div className="login-err">{err}</div>}
          <button className="login-btn" type="submit" disabled={busy || !pwd}>
            {busy ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Boss side: result only — pulled from the cloud (worker's latest upload). No password.
// Can browse any past month from the dropdown.
function BossView() {
  const [data, setData] = useState(undefined); // undefined = loading
  const [months, setMonths] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingKey, setLoadingKey] = useState('');
  const [monthError, setMonthError] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    // boss shows ONLY what the worker published to the cloud — never the local worker cache
    loadFromCloud().then((d) => { if (mounted.current) setData(validStatement(d) ? d : null); });
    listCloudMonths().then((list) => { if (mounted.current) setMonths(list); });
    return () => { mounted.current = false; };
  }, []);

  const selectMonth = (key) => {
    if (!key || key === monthKey(data)) return;
    setLoadingMonth(true); setLoadingKey(key); setMonthError('');
    loadFromCloud(key).then((d) => {
      if (!mounted.current) return;
      setLoadingMonth(false);
      if (validStatement(d)) setData(d);
      else setMonthError('Could not load that month — try again.');
    });
  };

  if (data === undefined) return <Splash text="Loading the latest statement…" />;
  if (!data) return <NoReport />;
  return (
    <Dashboard
      data={data} role="boss"
      months={months} currentKey={monthKey(data)} onSelectMonth={selectMonth}
      loadingMonth={loadingMonth} loadingKey={loadingKey} monthError={monthError}
    />
  );
}

function Splash({ text }) {
  return (
    <div className="term">
      <div className="topbar">
        <div className="brand">ADVANCED ORTHO LAB <span className="slash">//</span> <span className="sub">MONTHLY STATEMENT</span></div>
        <div className="live"><span className="dot" style={{ background: 'var(--cyan)', boxShadow: '0 0 8px var(--cyan)' }} />Boss view</div>
      </div>
      <div className="upload-screen"><div className="upload-card" style={{ textAlign: 'center' }}><h1>{text}</h1></div></div>
    </div>
  );
}

function NoReport() {
  return (
    <div className="term">
      <div className="topbar">
        <div className="brand">ADVANCED ORTHO LAB <span className="slash">//</span> <span className="sub">MONTHLY STATEMENT</span></div>
        <div className="live"><span className="dot" style={{ background: 'var(--amber)', boxShadow: '0 0 8px var(--amber)' }} />Boss view</div>
      </div>
      <div className="upload-screen">
        <div className="upload-card" style={{ textAlign: 'center' }}>
          <h1>No report published yet</h1>
          <p className="upload-sub" style={{ margin: '0 auto' }}>
            This month's statement hasn't been uploaded yet. Please check back once it's ready.
          </p>
        </div>
      </div>
    </div>
  );
}

// Lightweight routing: boss site is built with VITE_ROLE=boss; /boss also forces boss view.
const ROLE = import.meta.env.VITE_ROLE;
export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '');
  const isBoss = ROLE === 'boss' || path === '/boss';
  return isBoss ? <BossView /> : <WorkerView />;
}
