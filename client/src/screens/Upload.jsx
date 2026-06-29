import React, { useState } from 'react';
import { readWorkbookRows, buildStatement } from '../lib/parseStatement';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function Drop({ label, hint, file, onPick, accent }) {
  return (
    <label className={`dropzone ${file ? 'filled' : ''}`} style={{ '--accent': accent }}>
      <input type="file" accept=".xlsx,.xls" onChange={onPick} />
      <div className="dz-icon">{file ? '✓' : '＋'}</div>
      <div className="dz-label">{label}</div>
      <div className="dz-hint">{file ? file.name : hint}</div>
    </label>
  );
}

export default function Upload({ onReady, sample, onLogout }) {
  const [files, setFiles] = useState({ premier: null, children: null, ar: null });
  const [month, setMonth] = useState('May');
  const [year, setYear] = useState(2026);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = (key) => (e) => { setFiles((f) => ({ ...f, [key]: e.target.files[0] || null })); setError(''); };
  const ready = files.premier && files.children && files.ar;

  const build = async () => {
    setBusy(true);
    setError('');
    try {
      const readFile = async (file, label) => {
        try { return readWorkbookRows(new Uint8Array(await file.arrayBuffer())); }
        catch { throw new Error(`Couldn't read the ${label} file — is it a valid .xlsx export?`); }
      };
      const data = buildStatement({
        premierRows: await readFile(files.premier, 'Premier invoices'),
        childrenRows: await readFile(files.children, "Children's invoices"),
        arRows: await readFile(files.ar, 'AR aging'),
        month,
        year: Number(year),
      });
      if (!data.offices.length) throw new Error('No offices found in the invoice files — are these the right exports?');
      if (!data.ar.total) throw new Error('No open balances found in the AR file — check the aging report.');
      onReady(data); // data.warnings (e.g. contamination) surface as a banner on the dashboard
    } catch (e) {
      setError(e.message || 'Failed to parse the files.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="term">
      <div className="topbar">
        <div className="brand">
          ADVANCED ORTHO LAB <span className="slash">//</span> <span className="sub">MONTHLY STATEMENT</span>
        </div>
        <div className="live"><span className="dot" />Upload to build this month's statement</div>
        {onLogout && <button className="reset-btn" onClick={onLogout}>🔒 Lock</button>}
      </div>

      <div className="upload-screen">
        <div className="upload-card">
          <h1>Build Monthly Statement</h1>
          <p className="upload-sub">
            Upload the three files you export each month. Tax is applied per office and every figure is
            computed in your browser — nothing is sent anywhere.
          </p>

          <div className="period-inputs">
            <label className="pi"><span>Statement Month</span>
              <select value={month} onChange={(e) => setMonth(e.target.value)}>
                {MONTHS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label className="pi"><span>Year</span>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </label>
          </div>

          <div className="dropzones">
            <Drop label="Premier Invoices" hint="e.g. PremMay2026.xlsx" file={files.premier} onPick={pick('premier')} accent="var(--cyan)" />
            <Drop label="Children's Invoices" hint="e.g. Children_sMay2026.xlsx" file={files.children} onPick={pick('children')} accent="var(--amber)" />
            <Drop label="AR Aging Report" hint="QuickBooks open balances" file={files.ar} onPick={pick('ar')} accent="var(--red)" />
          </div>

          {error && (
            <div className="note" style={{ borderColor: 'rgba(255,92,108,0.4)', background: 'rgba(255,92,108,0.08)' }}>
              <span style={{ color: 'var(--red)' }}>✕</span><span>{error}</span>
            </div>
          )}

          <div className="upload-actions">
            <button className="build-btn" disabled={!ready || busy} onClick={build}>
              {busy ? 'Parsing…' : 'Build Statement →'}
            </button>
            <button className="sample-btn" onClick={() => onReady(sample)}>Load May 2026 sample</button>
          </div>
        </div>
      </div>
    </div>
  );
}
