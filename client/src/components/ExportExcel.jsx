import React, { useState } from 'react';

async function downloadWb(wb, name) {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export default function ExportExcel({ data }) {
  const [busy, setBusy] = useState('');
  const { month, year } = data;
  const hasBilling = !!(data.billing?.premier?.offices?.length);

  const dl = async (which) => {
    setBusy(which);
    try {
      // lazy-load ExcelJS only when the user actually exports — keeps it out of the initial bundle
      const { downloadStatement, buildCompanyWorkbook } = await import('../lib/exportStatement');
      if (which === 'both') await downloadStatement(data, month, year);
      else if (which === 'premier') await downloadWb(buildCompanyWorkbook(data.billing.premier.offices, 'premier', month, year), `Prem${month}${year}.xlsx`);
      else if (which === 'children') await downloadWb(buildCompanyWorkbook(data.billing.children.offices, 'children', month, year), `Children_s${month}${year}.xlsx`);
    } catch (e) {
      console.error(e);
      alert('Export error: ' + e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="panel">
      <div className="panel-b">
        {!hasBilling ? (
          <div className="note"><span>▸</span><span>Upload your 3 files to generate the finalized workbooks.</span></div>
        ) : (
          <div className="export-btns">
            <button className="build-btn" disabled={!!busy} onClick={() => dl('both')}>
              {busy === 'both' ? 'Generating…' : '⬇ Download both .xlsx'}
            </button>
            <button className="seg" disabled={!!busy} onClick={() => dl('premier')}>⬇ Prem{month}{year}.xlsx</button>
            <button className="seg" disabled={!!busy} onClick={() => dl('children')}>⬇ Children_s{month}{year}.xlsx</button>
          </div>
        )}
        <div className="export-note">Byte-faithful to your template — formulas, fonts, number formats, and column widths all match.</div>
      </div>
    </div>
  );
}
