import React from 'react';
import { money, int } from '../lib/format';

export default function Products({ data }) {
  const rows = data.topProducts;
  const max = Math.max(...rows.map((p) => p.orders), 1);

  return (
    <div className="panel">
      <div className="panel-h"><span>Top 5 Most-Ordered Appliances</span><span className="tag">EXCL. BANDS · DIGITAL MODEL</span></div>
      <div className="tbl-wrap">
        <table className="data">
          <thead>
            <tr>
              <th className="l">#</th>
              <th className="l">Appliance</th>
              <th className="l" style={{ width: 200 }}>Orders Placed</th>
              <th>Orders</th>
              <th>Cases</th>
              <th>Units Sold</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.item}>
                <td className="l idx">{i + 1}</td>
                <td className="l">{p.item}</td>
                <td className="l">
                  <div className="bartrack" style={{ width: '100%' }}>
                    <div className="barfill" style={{ width: `${(p.orders / max) * 100}%`, background: 'linear-gradient(90deg,#2b6fb3,var(--cyan))' }} />
                  </div>
                </td>
                <td style={{ fontWeight: 600 }}>{int(p.orders)}</td>
                <td className="warn">{int(p.cases)}</td>
                <td>{int(p.units)}</td>
                <td className="pos">{money(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '12px 16px', color: 'var(--txt-faint)', fontSize: 11, fontFamily: 'var(--mono)', borderTop: '1px solid var(--line-soft)' }}>
        Orders Placed = # of invoice line items · Cases = distinct patients · Units Sold = Σ quantity
      </div>
    </div>
  );
}
