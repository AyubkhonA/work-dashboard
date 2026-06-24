// Exact-format Excel generator for the Ortho Lab monthly statement.
// Reproduces the finalized "with TAX" workbook (PremMay2026.xlsx /
// Children_sMay2026.xlsx) faithfully: every cell A..T carries the golden's font
// (Arial 8 / Aptos Narrow 11, colour FF323232), per-column number format,
// alignment, borders (thick header underline, medium subtotal rules, double
// grand-total rule), C2 freeze panes and 15pt rows.
//
// Public API:
//   buildCompanyWorkbook(offices, company, month, year) -> ExcelJS.Workbook
//   downloadStatement(data, month, year) -> builds BOTH workbooks + downloads
import ExcelJS from 'exceljs';

// ---- number formats (verbatim from golden) ----
const FMT_TEXT = '@';
const FMT_DATE = 'mm/dd/yyyy';
const FMT_QTY = '#,##0.00###;\\-#,##0.00###';   // col O
const FMT_MONEY = '#,##0.00;\\-#,##0.00';       // cols Q, S
const FMT_GEN = 'General';                       // col T

// ---- per-company layout (extracted from each golden via openpyxl) ----
const LAYOUT = {
  premier: {
    widths: { A: 3.0, B: 31.33, C: 2.33, E: 8.67, F: 2.33, G: 6.16, H: 2.33,
              I: 27.16, J: 2.33, K: 25.83, L: 2.33, M: 30.66, N: 2.33, O: 7.0,
              P: 2.33, Q: 9.67, R: 2.33, S: 7.83, T: 8.83 },
    taxFontSize: 10,                       // T1 + "with TAX" -> Aptos Narrow 10 bold
    blankBold: ['C', 'D', 'G', 'M', 'Q'],  // template quirk: bold empties on the spacer row
    totalDefault: ['C', 'D', 'M', 'Q'],    // grand-total cells left at workbook default (Aptos 11)
    totalTSize: 10,                        // grand-total "TOTAL" col T -> Arial 10 bold
  },
  children: {
    widths: { A: 3.0, B: 24.5, C: 2.33, E: 8.67, F: 2.33, G: 5.33, H: 2.33,
              I: 20.5, J: 2.33, K: 21.5, L: 2.33, M: 30.66, N: 2.33, O: 5.67,
              P: 2.33, Q: 9.67, R: 2.33, S: 7.33, T: 8.83 },
    taxFontSize: 11,                       // T1 + "with TAX" -> Aptos Narrow 11 bold
    blankBold: ['G', 'M', 'Q'],
    totalDefault: ['M', 'Q'],
    totalTSize: 8,
  },
};

const COLS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'];
const BODY = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S']; // A..S (T handled apart)

// per-column number format used on every data row (A..T)
const NUMFMT = {
  A: FMT_TEXT, B: FMT_TEXT, C: FMT_TEXT, D: FMT_TEXT, E: FMT_DATE, F: FMT_TEXT,
  G: FMT_TEXT, H: FMT_TEXT, I: FMT_TEXT, J: FMT_TEXT, K: FMT_TEXT, L: FMT_TEXT,
  M: FMT_TEXT, N: FMT_TEXT, O: FMT_QTY, P: FMT_TEXT, Q: FMT_MONEY, R: FMT_TEXT,
  S: FMT_MONEY, T: FMT_GEN,
};

// Excel date anchored at UTC midnight so ExcelJS serialises the exact y-m-d
// (date1904 false) with no timezone back-shift.
function excelDate(ymd) {
  if (!ymd) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd).trim());
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export function buildCompanyWorkbook(offices, company, month, year) {
  const layout = LAYOUT[company] || LAYOUT.premier;
  const taxSize = layout.taxFontSize;

  const wb = new ExcelJS.Workbook();
  wb.properties.date1904 = false;
  const ws = wb.addWorksheet('Sheet1', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 1, topLeftCell: 'C2', activeCell: 'C2' }],
    properties: { defaultRowHeight: 15 },
  });

  // ---- fonts ----
  const ARIAL = { name: 'Arial', size: 8, color: { argb: 'FF323232' } };
  const ARIAL_B = { name: 'Arial', size: 8, bold: true, color: { argb: 'FF323232' } };
  const APTOS = { name: 'Aptos Narrow', size: 11, color: { theme: 1 } };
  const APTOS_TAX_B = { name: 'Aptos Narrow', size: taxSize, bold: true, color: { theme: 1 } };

  // ---- alignments ----
  const AL_CENTER = { horizontal: 'center', vertical: 'bottom' };
  const AL_BODY = { horizontal: 'general', vertical: 'bottom' };
  const AL_RIGHT_B = { horizontal: 'right', vertical: 'bottom' };
  const AL_RIGHT = { horizontal: 'right' };

  // ---- column widths ----
  COLS.forEach((L, i) => { const w = layout.widths[L]; if (w != null) ws.getColumn(i + 1).width = w; });

  // style cells A..S of a row with one font + (optional) alignment, per-column numFmt
  const styleBody = (r, font, align) => {
    for (const L of BODY) {
      const cell = ws.getCell(`${L}${r}`);
      cell.font = font;
      cell.numFmt = NUMFMT[L];
      if (align) cell.alignment = align;
    }
  };
  const setT = (r, font, align) => {
    const cell = ws.getCell(`T${r}`);
    cell.font = font;
    cell.numFmt = FMT_GEN;
    if (align) cell.alignment = align;
  };

  // ---- header row 1 ----
  const HEAD_FILLER = ['A', 'B', 'C', 'D', 'F', 'H', 'J', 'L', 'N', 'P', 'R'];
  for (const L of HEAD_FILLER) {
    const cell = ws.getCell(`${L}1`);
    cell.font = APTOS; cell.numFmt = FMT_TEXT; cell.alignment = AL_CENTER;
  }
  const HEAD = { E: 'Date', G: 'Num', I: 'Name', K: 'Patient Name:', M: 'Item', O: 'Qty', Q: 'Sales Price', S: 'Amount' };
  for (const [L, text] of Object.entries(HEAD)) {
    const cell = ws.getCell(`${L}1`);
    cell.value = text; cell.font = ARIAL_B; cell.numFmt = FMT_TEXT;
    cell.alignment = AL_CENTER; cell.border = { bottom: { style: 'thick' } };
  }
  setT(1, APTOS_TAX_B, AL_RIGHT_B);

  let r = 2;
  const subtotalRows = [];
  const taxRows = [];
  const lastIdx = offices.length - 1;

  offices.forEach((office, oi) => {
    const name = office.office;
    const rate = office.taxRate;
    const items = office.items || [];

    // (a) banner row — A..S Arial 8 bold, T Aptos 11
    styleBody(r, ARIAL_B, AL_BODY);
    ws.getCell(`B${r}`).value = name;
    setT(r, APTOS, null);
    r += 1;

    const bannerRow = r - 1;
    const firstItemRow = r;
    // (b) item rows
    for (const it of items) {
      styleBody(r, ARIAL, AL_BODY);
      setT(r, APTOS, null);
      const d = excelDate(it.date);
      if (d) ws.getCell(`E${r}`).value = d;
      if (it.num != null) ws.getCell(`G${r}`).value = String(it.num);
      ws.getCell(`I${r}`).value = name;
      if (it.patient != null) ws.getCell(`K${r}`).value = String(it.patient);
      if (it.item != null) ws.getCell(`M${r}`).value = String(it.item);
      if (typeof it.qty === 'number' && !Number.isNaN(it.qty)) ws.getCell(`O${r}`).value = it.qty;
      else if (it.qty != null) ws.getCell(`O${r}`).value = it.qty;
      if (typeof it.price === 'number' && !Number.isNaN(it.price)) ws.getCell(`Q${r}`).value = it.price;
      ws.getCell(`S${r}`).value = { formula: `ROUND(IF(ISNUMBER(Q${r}), O${r}*Q${r}, O${r}),5)` };
      r += 1;
    }
    const lastItemRow = r - 1;

    // (c) subtotal row — A..S Arial 8 (not bold)
    const subRow = r;
    subtotalRows.push(subRow);
    styleBody(subRow, ARIAL, AL_BODY);
    setT(subRow, APTOS, null);
    ws.getCell(`B${subRow}`).value = `Total ${name}`;
    ws.getCell(`O${subRow}`).value = { formula: `ROUND(SUM(O${bannerRow}:O${lastItemRow}),5)` };
    ws.getCell(`S${subRow}`).value = { formula: `ROUND(SUM(S${bannerRow}:S${lastItemRow}),5)` };
    r += 1;

    // medium rule: above each subtotal. Stored as bottom-of-last-item for all
    // offices except the last, which uses top-of-subtotal (matches both golden).
    if (oi !== lastIdx) {
      ws.getCell(`O${lastItemRow}`).border = { bottom: { style: 'medium' } };
      ws.getCell(`S${lastItemRow}`).border = { bottom: { style: 'medium' } };
    } else {
      ws.getCell(`O${subRow}`).border = { top: { style: 'medium' } };
      ws.getCell(`S${subRow}`).border = { top: { style: 'medium' } };
    }

    // (d) tax row — A..S Arial 8 (no alignment), G & S bold, T "with TAX"
    const taxRow = r;
    taxRows.push(taxRow);
    styleBody(taxRow, ARIAL, null);
    ws.getCell(`G${taxRow}`).font = ARIAL_B;        // golden quirk: Num col bold
    const Stax = ws.getCell(`S${taxRow}`);
    Stax.font = ARIAL_B;
    Stax.value = { formula: `S${subRow}+S${subRow}*${rate}%` };
    setT(taxRow, APTOS_TAX_B, AL_RIGHT);
    ws.getCell(`T${taxRow}`).value = 'with TAX';
    r += 1;
  });

  // ---- one blank spacer row ----
  styleBody(r, ARIAL, AL_BODY);
  for (const L of layout.blankBold) ws.getCell(`${L}${r}`).font = ARIAL_B;
  setT(r, APTOS, null);
  r += 1;

  // ---- grand TOTAL row ----
  const totalRow = r;
  styleBody(totalRow, ARIAL_B, AL_BODY);
  // some columns stay the workbook default (Aptos 11, General, no alignment) in the golden
  for (const L of layout.totalDefault) {
    const cell = ws.getCell(`${L}${totalRow}`);
    cell.font = APTOS; cell.numFmt = FMT_GEN; cell.alignment = undefined;
  }
  ws.getCell(`A${totalRow}`).value = 'TOTAL';
  const Otot = ws.getCell(`O${totalRow}`);
  Otot.value = { formula: `ROUND(${subtotalRows.map((rr) => `O${rr}`).join('+')},5)` };
  Otot.border = { top: { style: 'medium' }, bottom: { style: 'double' } };
  const Stot = ws.getCell(`S${totalRow}`);
  Stot.value = { formula: `ROUND(${taxRows.map((rr) => `S${rr}`).join('+')},5)` };
  Stot.border = { top: { style: 'medium' }, bottom: { style: 'double' } };
  setT(totalRow, { name: 'Arial', size: layout.totalTSize, bold: true, color: { argb: 'FF323232' } }, AL_RIGHT_B);

  // ---- explicit 15pt row heights (matches the golden's dominant height) ----
  for (let rr = 1; rr <= totalRow; rr += 1) ws.getRow(rr).height = 15;

  return wb;
}

// ---- browser download of BOTH workbooks ----
async function triggerDownload(wb, filename) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadStatement(data, month, year) {
  const premierOffices = data?.billing?.premier?.offices || [];
  const childrenOffices = data?.billing?.children?.offices || [];
  const premWb = buildCompanyWorkbook(premierOffices, 'premier', month, year);
  const childWb = buildCompanyWorkbook(childrenOffices, 'children', month, year);
  await triggerDownload(premWb, `Prem${month}${year}.xlsx`);
  await triggerDownload(childWb, `Children_s${month}${year}.xlsx`);
}
