import React, { useState } from 'react';
import { money, money0, officeName } from '../lib/format';

// 3 buckets only (Current dropped; 61-90 and 90+ merged into 61-90+)
const BUCKETS = [
  { key: 'd1_30', label: '1–30', color: '#5EB95C' },
  { key: 'd31_60', label: '31–60', color: '#DEC141' },
  { key: 'd61plus', label: '61–90+', color: '#D04F3A' },
];

export default function AgingByOffice({ data }) {
  const rows = (data.ar.officeAging || []).filter((o) => (o.d31_60 + o.d61_90 + o.d90) > 0);
  const [tip, setTip] = useState(null);

  const showTip = (e, office, s, v, pct) =>
    setTip({ x: e.clientX, y: e.clientY, office, label: s.label, color: s.color, v, pct });

  return (
    <div className="panel">
      <div className="panel-b">
        {/* legend */}
        <div className="aging-leg" style={{ marginBottom: 18 }}>
          {BUCKETS.map((s) => (
            <div className="it" key={s.key}>
              <span className="sw" style={{ background: s.color }} />
              <span>{s.label} days</span>
            </div>
          ))}
        </div>

        {/* one stacked bar per office — 1-30 / 31-60 / 61-90+ proportions */}
        <div className="agbars">
          {rows.map((o, i) => {
            const vals = { d1_30: o.d1_30, d31_60: o.d31_60, d61plus: o.d61_90 + o.d90 };
            const sum = vals.d1_30 + vals.d31_60 + vals.d61plus;
            return (
              <div className="agrow" key={o.office}>
                <span className="nm"><span className="idx">{i + 1}</span>{officeName(o.office)}</span>
                <div className="agtrack">
                  {BUCKETS.map((s) => {
                    const v = vals[s.key];
                    if (!(v > 0)) return null;
                    const pct = sum ? (v / sum) * 100 : 0;
                    return (
                      <div key={s.key}
                        onMouseMove={(e) => showTip(e, o.office, s, v, pct)}
                        onMouseLeave={() => setTip(null)}
                        style={{ width: `${pct}%`, background: s.color }}>
                        {pct >= 12 ? `${pct.toFixed(1)}%` : ''}
                      </div>
                    );
                  })}
                </div>
                <span className="amt">{money0(o.total)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {tip && (
        <div className="ag-tooltip" style={{ left: tip.x + 14, top: tip.y + 14 }}>
          <span className="ag-tip-dot" style={{ background: tip.color }} />
          <span>{tip.label} days — <b>{money(tip.v)}</b> · {tip.pct.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
