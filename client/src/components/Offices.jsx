import React, { useState } from 'react';
import { money, pct, int, tagOf, shortOffice } from '../lib/format';

const COLS = [
  { key: 'office', label: 'Office', l: true },
  { key: 'tag', label: 'Co', l: true },
  { key: 'invoices', label: 'Inv' },
  { key: 'preTax', label: 'Pre-Tax' },
  { key: 'taxRate', label: 'Rate' },
  { key: 'tax', label: 'Tax' },
  { key: 'withTax', label: 'Billed' },
];

export default function Offices({ data }) {
  const [sort, setSort] = useState({ key: 'withTax', dir: -1 });

  const rows = [...data.offices].map((o) => ({ ...o, tag: tagOf(o.office) }));
  rows.sort((a, b) => {
    const v = a[sort.key], w = b[sort.key];
    const c = typeof v === 'string' ? v.localeCompare(w) : v - w;
    return c * sort.dir;
  });

  const click = (k) =>
    setSort((s) => (s.key === k ? { key: k, dir: -s.dir } : { key: k, dir: k === 'office' || k === 'tag' ? 1 : -1 }));

  // footer totals come from the authoritative summary (rounded once), so they match the headline
  const s = data.summary;
  const tot = {
    inv: rows.reduce((a, o) => a + o.invoices, 0),
    pre: s.premierPreTax + s.childrenPreTax,
    tax: s.totalTax,
    bill: s.monthlyTotalWithTax,
  };

  return (
    <div className="panel">
      <div className="panel-h"><span>Office Breakdown — {rows.length} offices</span><span className="tag">SORT ↓ {sort.key}</span></div>
      <div className="tbl-wrap">
        <table className="data">
          <thead>
            <tr>
              <th className="l">#</th>
              {COLS.map((c) => (
                <th key={c.key} className={c.l ? 'l' : ''} onClick={() => click(c.key)}>
                  {c.label}{sort.key === c.key && <span className="ar">{sort.dir < 0 ? '▼' : '▲'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((o, i) => (
              <tr key={o.office}>
                <td className="l idx">{i + 1}</td>
                <td className="l">{shortOffice(o.office)}</td>
                <td className="l"><span className={`badge ${o.tag}`}>{o.tag}</span></td>
                <td>{o.invoices}</td>
                <td>{money(o.preTax)}</td>
                <td className={o.taxRate > 8.5 ? 'rate-hi' : 'rate-pill'}>{pct(o.taxRate)}</td>
                <td className="pos">{money(o.tax)}</td>
                <td style={{ fontWeight: 600 }}>{money(o.withTax)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--bg-panel2)' }}>
              <td></td>
              <td className="l" style={{ fontFamily: 'var(--sans)', color: 'var(--txt-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</td>
              <td></td>
              <td className="num">{int(tot.inv)}</td>
              <td className="num">{money(tot.pre)}</td>
              <td></td>
              <td className="num pos">{money(tot.tax)}</td>
              <td className="num" style={{ fontWeight: 700 }}>{money(tot.bill)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
