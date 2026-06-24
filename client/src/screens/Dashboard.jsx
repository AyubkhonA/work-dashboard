import React from 'react';
import ARHero from '../components/ARHero';
import AgingByOffice from '../components/AgingByOffice';
import ExportExcel from '../components/ExportExcel';
import EmailSummary from '../components/EmailSummary';

export default function Dashboard({ data, onReset, role = 'worker', onLogout, months, currentKey, onSelectMonth, loadingMonth }) {
  const isBoss = role === 'boss';

  // month dropdown: list every saved month, making sure the current one is present
  const curOpt = { key: currentKey, label: `${data.month} ${data.year}` };
  const monthOpts = (months && months.length)
    ? (months.some((m) => m.key === currentKey) ? months : [curOpt, ...months])
    : [curOpt];

  return (
    <div className="term">
      {/* fixed background photo + dark overlay; frosted panels blur this through */}
      <div className="bg-layer">
        <img src="/ortho-bg.webp" alt="" className="bg-image" />
        <div className="bg-overlay" />
      </div>
      <div className="topbar">
        <div className="brand">
          ADVANCED ORTHO LAB <span className="slash">//</span> <span className="sub">MONTHLY STATEMENT</span>
        </div>
        {onSelectMonth && monthOpts.length > 1 ? (
          <label className="month-nav">
            <span className="month-nav-label">MONTH</span>
            <select className="month-select" value={currentKey} onChange={(e) => onSelectMonth(e.target.value)}>
              {monthOpts.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            {loadingMonth && <span className="month-loading">loading…</span>}
          </label>
        ) : (
          <div className="period">{data.month.toUpperCase()} {data.year}</div>
        )}
        <div className="live">
          <span className="dot" style={isBoss ? { background: 'var(--cyan)', boxShadow: '0 0 8px var(--cyan)' } : undefined} />
          {isBoss ? 'Boss view' : 'Live data — parsed from uploaded files'}
        </div>
        {!isBoss && onReset && <button className="reset-btn" onClick={onReset}>↺ New Upload</button>}
        {!isBoss && <a className="reset-btn" href="/boss" target="_blank" rel="noreferrer">Boss view ↗</a>}
        {!isBoss && onLogout && <button className="reset-btn" onClick={onLogout}>🔒 Lock</button>}
        {isBoss && <span className="reset-btn" style={{ color: 'var(--cyan)', borderColor: 'var(--cyan)' }}>BOSS VIEW</span>}
      </div>

      <main className="page">
        {/* 1 — Accounts Receivable */}
        <section className="sec">
          <div className="sec-h">
            <span className="t">Accounts Receivable</span>
            <span className="meta">as of {data.ar.asOf} · {data.ar.openInvoices} open invoices</span>
          </div>
          <ARHero data={data} />
        </section>

        {/* 2 — AR Aging by Office (all months, from the AR report) */}
        <section className="sec">
          <div className="sec-h">
            <span className="t">AR Aging by Office</span>
            <span className="meta">intensity = dollars outstanding per bucket</span>
          </div>
          <AgingByOffice data={data} />
        </section>

        {/* 3 — Generate Report (Excel "build") */}
        <section className="sec">
          <div className="sec-h">
            <span className="t">Generate Report</span>
            <span className="meta">exact-template .xlsx</span>
          </div>
          <ExportExcel data={data} />
        </section>

        {/* 3 — (a list will be inserted here later, between Generate Report and Email Summary) */}

        {/* 4 — Email Summary (last section) */}
        <section className="sec">
          <div className="sec-h">
            <span className="t">Email Summary</span>
            <span className="meta">copy-ready</span>
          </div>
          <EmailSummary data={data} />
        </section>
      </main>

      <div className="foot">
        ADV-ORTHO-LAB · {data.month} {data.year} · parsed {data.offices.length} offices · {data.ar.openInvoices} open AR invoices · AR as of {data.ar.asOf}
      </div>
    </div>
  );
}
