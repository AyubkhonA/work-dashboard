import React, { useState } from 'react';
import { money, money0, officeName } from '../lib/format';
import Products from './Products';

const BUCKET_COLOR = {
  'Current': 'var(--green)',
  '1-30': '#7ee0a6',
  '31-60': 'var(--amber)',
  '61-90': '#ff9d5c',
  '90+': 'var(--red)',
};

export default function ARHero({ data }) {
  const ar = data.ar;
  const [period, setPeriod] = useState('all');
  const isAll = period === 'all';

  // Per-office BILLING (with tax) for the statement month — taken from the uploaded
  // monthly invoice files (Premier + Children's), NOT the AR aging file.
  const billed = [
    ...(data.billing?.premier?.offices || []),
    ...(data.billing?.children?.offices || []),
  ].map((o) => ({ office: o.office, balance: o.withTax })).sort((a, b) => b.balance - a.balance);

  // "All" → AR open balances (all months, from the AR file). A month → invoice billing.
  const offices = isAll ? ar.offices : billed;
  const max = offices[0]?.balance || 1;
  const buckets = (ar.buckets || []).filter((b) => b.balance > 0);
  const monthLabel = `${data.month} ${data.year}`;
  const monthlyBilled = data.summary.monthlyTotalWithTax;

  return (
    <>
      {/* All = AR open balance (all AR months) · month = THIS statement's invoice billing */}
      <div className="period-bar">
        <span className="period-label">View</span>
        <button className={`seg ${isAll ? 'on' : ''}`} onClick={() => setPeriod('all')}>All · AR open balance</button>
        <button className={`seg ${!isAll ? 'on' : ''}`} onClick={() => setPeriod('month')}>{data.month} billed (w/ tax)</button>
        {!isAll && <span className="period-active">▸ {monthLabel} · {money0(monthlyBilled)} from the invoice files</span>}
      </div>

      <div className="hero-grid">
        {/* LEFT — offices: open balance (All) or this month's billed (month) */}
        <div className="panel">
          <div className="panel-h">
            <span>{isAll ? 'All Offices — Open Balance' : `All Offices — ${data.month} Billed (w/ tax)`}</span>
            <span className="tag">{offices.length} OFFICES{isAll ? ` · ${ar.openInvoices} INV` : ' · W/ TAX'}</span>
          </div>
          <div className="panel-b">
            <div className="barlist barscroll">
              {offices.map((o, i) => (
                <div className="barrow" key={o.office}>
                  <span className="nm"><span className="idx">{i + 1}</span> {officeName(o.office)}</span>
                  <div className="bartrack"><div className="barfill" style={{ width: `${(o.balance / max) * 100}%` }} /></div>
                  <span className="amt">{money0(o.balance)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — fixed cards (AR total + monthly billing), aging, products */}
        <div className="hero-right">
          <div className="hero-cards">
            <div className="kpi" style={{ '--accent': 'var(--red)' }}>
              <div className="k">Total AR Due</div>
              <div className="v neg">{money0(ar.total)}</div>
              <div className="s">{ar.openInvoices} open invoices · all months</div>
            </div>
            <div className="kpi" style={{ '--accent': 'var(--cyan)' }}>
              <div className="k">Premier + Sedation</div>
              <div className="v">{money0(data.summary.premierWithTax)}</div>
              <div className="s">{data.month} billed · with tax</div>
            </div>
            <div className="kpi" style={{ '--accent': 'var(--amber)' }}>
              <div className="k">Children's Choice</div>
              <div className="v">{money0(data.summary.childrenWithTax)}</div>
              <div className="s">{data.month} billed · with tax</div>
            </div>
          </div>

          {isAll && buckets.length > 0 && (
            <div className="panel">
              <div className="panel-h"><span>AR Aging</span><span className="tag">DAYS OUTSTANDING</span></div>
              <div className="panel-b">
                <div className="aging">
                  <div className="aging-seg">
                    {buckets.map((b) => (
                      <div key={b.bucket} title={`${b.bucket}: ${money(b.balance)}`}
                        style={{ width: `${b.pct}%`, background: BUCKET_COLOR[b.bucket] || 'var(--txt-dim)' }}>
                        {b.pct >= 8 ? `${b.pct}%` : ''}
                      </div>
                    ))}
                  </div>
                  <div className="aging-leg">
                    {buckets.map((b) => (
                      <div className="it" key={b.bucket}>
                        <span className="sw" style={{ background: BUCKET_COLOR[b.bucket] || 'var(--txt-dim)' }} />
                        <span>{b.bucket} days · {money0(b.balance)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Products data={data} />
        </div>
      </div>
    </>
  );
}
