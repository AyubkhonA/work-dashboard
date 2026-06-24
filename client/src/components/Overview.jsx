import React from 'react';
import { money, money0 } from '../lib/format';

export default function Overview({ data }) {
  const s = data.summary;
  return (
    <>
      <div className="kpis">
        <div className="kpi" style={{ '--accent': 'var(--green)' }}>
          <div className="k">Monthly Billed · w/ tax</div>
          <div className="v pos">{money(s.monthlyTotalWithTax)}</div>
          <div className="s">pre-tax {money0(s.premierPreTax + s.childrenPreTax)}</div>
        </div>
        <div className="kpi" style={{ '--accent': 'var(--cyan)' }}>
          <div className="k">Premier + Sedation</div>
          <div className="v">{money(s.premierWithTax)}</div>
          <div className="s">pre-tax {money0(s.premierPreTax)}</div>
        </div>
        <div className="kpi" style={{ '--accent': 'var(--amber)' }}>
          <div className="k">Children's Choice</div>
          <div className="v">{money(s.childrenWithTax)}</div>
          <div className="s">pre-tax {money0(s.childrenPreTax)}</div>
        </div>
        <div className="kpi" style={{ '--accent': 'var(--violet)' }}>
          <div className="k">Sales Tax Collected</div>
          <div className="v">{money(s.totalTax)}</div>
          <div className="s">blended on {money0(s.premierPreTax + s.childrenPreTax)}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h"><span>Tax Reconciliation</span><span className="tag">PRE → TAX → BILLED</span></div>
        <div className="panel-b">
          <table className="recon">
            <tbody>
              <tr><td className="lbl">Premier + Sedation — pre-tax</td><td>{money(s.premierPreTax)}</td></tr>
              <tr><td className="lbl">+ sales tax</td><td className="pos">{money(s.premierWithTax - s.premierPreTax)}</td></tr>
              <tr><td className="lbl">= billed</td><td>{money(s.premierWithTax)}</td></tr>
              <tr><td className="lbl" style={{ paddingTop: 14 }}>Children's Choice — pre-tax</td><td style={{ paddingTop: 14 }}>{money(s.childrenPreTax)}</td></tr>
              <tr><td className="lbl">+ sales tax</td><td className="pos">{money(s.childrenWithTax - s.childrenPreTax)}</td></tr>
              <tr><td className="lbl">= billed</td><td>{money(s.childrenWithTax)}</td></tr>
              <tr className="grand"><td className="lbl">Grand total billed</td><td className="pos">{money(s.monthlyTotalWithTax)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
