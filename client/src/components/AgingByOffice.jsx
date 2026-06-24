import React from 'react';
import { money0, officeName } from '../lib/format';

// heatmap columns — cell brightness encodes dollars outstanding in that bucket
const COLS = [
  { key: 'd1_30',   label: '1–30 days',   rgb: '94,185,92',  head: '#5EB95C' },
  { key: 'd31_60',  label: '31–60 days',  rgb: '222,193,65', head: '#DEC141' },
  { key: 'd61plus', label: '61–90+ days', rgb: '208,79,58',  head: '#D04F3A' },
];

export default function AgingByOffice({ data }) {
  // same source rows as before (offices with aging past the 1–30 bucket), ranked by total desc.
  // current dropped; 61-90 and 90+ merged into 61–90+.
  const rows = (data.ar.officeAging || [])
    .filter((o) => (o.d31_60 + o.d61_90 + o.d90) > 0)
    .map((o) => ({ ...o, d61plus: o.d61_90 + o.d90 }))
    .sort((a, b) => b.total - a.total);

  const maxBucket = Math.max(...rows.flatMap((o) => [o.d1_30, o.d31_60, o.d61plus]), 1);
  const cellBg = (v, rgb) => `rgba(${rgb}, ${(0.08 + Math.min(v / maxBucket, 1) * 0.8).toFixed(3)})`;

  return (
    <div className="panel">
      <div className="panel-b">
        <div className="heatmap">
          {/* header */}
          <div className="hm-head">Office</div>
          {COLS.map((c) => (
            <div className="hm-head" key={c.key} style={{ color: c.head, textAlign: 'center' }}>{c.label}</div>
          ))}
          <div className="hm-head" style={{ textAlign: 'right' }}>Total</div>

          {/* one row per office */}
          {rows.map((o, i) => (
            <React.Fragment key={o.office}>
              <div className="hm-office"><span className="idx">{i + 1}</span> {officeName(o.office)}</div>
              {COLS.map((c) => {
                const v = o[c.key];
                const empty = !(v > 0);
                return (
                  <div className="hm-cell" key={c.key}
                    style={empty ? { background: 'transparent', color: 'var(--txt-faint)' } : { background: cellBg(v, c.rgb) }}>
                    {empty ? '·' : money0(v)}
                  </div>
                );
              })}
              <div className="hm-total">{money0(o.total)}</div>
            </React.Fragment>
          ))}
        </div>
        <div className="hm-caption">Brighter cell = more dollars outstanding in that bucket · &quot;·&quot; = none.</div>
      </div>
    </div>
  );
}
