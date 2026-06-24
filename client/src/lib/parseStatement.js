// Client-side parser — mirrors tools/parse_may.py. Reads the 3 uploaded xlsx files
// and produces the same data shape the dashboard consumes. No backend, no mock data.
import * as XLSX from 'xlsx';

// ---- per-office tax rates (matched by city substring), keyed on the company FILE ----
const PREMIER_RATES = { 'Vacaville': 8.125, 'Yuba City': 7.25 };
const CHILDREN_RATES = { 'Antioch': 9.75, 'Glendora': 10.25, 'San Diego': 7.25, 'Oxnard': 7.75 };
const DEFAULT_RATE = 8.5;

const round5 = (x) => Math.round(x * 1e5) / 1e5;
const round2 = (x) => Math.round(x * 100) / 100;
const isNum = (x) => typeof x === 'number' && !Number.isNaN(x);

function rateFor(company, office) {
  const table = company === 'children' ? CHILDREN_RATES : PREMIER_RATES;
  for (const city of Object.keys(table)) if (office.includes(city)) return table[city];
  return DEFAULT_RATE;
}

// Read an xlsx (ArrayBuffer / Uint8Array) into an array-of-rows (each row an array, 0-indexed).
export function readWorkbookRows(data) {
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: true, defval: null });
}

const findCol = (header, ...labels) => {
  for (const label of labels) {
    const i = header.findIndex((h) => typeof h === 'string' && h.trim() === label);
    if (i >= 0) return i;
  }
  return -1;
};

// ---- invoice parser + with-tax conversion (single source of truth) ----
// Retains every line item per office in ORIGINAL file order so the same converted
// structure feeds both the dashboard numbers and the exact-format Excel export.
function parseInvoice(rows, companyHint) {
  const header = rows[0] || [];
  const cName = findCol(header, 'Name');
  const cQty = findCol(header, 'Qty');
  const cPrice = findCol(header, 'Sales Price');
  const cNum = findCol(header, 'Num');
  const cDate = findCol(header, 'Date');
  const cPatient = findCol(header, 'Patient Name:', 'Patient Name', 'Patient');
  const cMemo = findCol(header, 'Memo');
  const cItem = findCol(header, 'Item');

  const officeMap = {};        // office -> {preTax, qty, invoices:Set, items:[]} (insertion order kept)
  const products = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const office = cName >= 0 ? row[cName] : null;
    const qty = cQty >= 0 ? row[cQty] : null;
    // a line item has the office name in the data column AND a numeric qty
    if (typeof office !== 'string' || !office.trim() || !isNum(qty)) continue;
    const name = office.trim();
    const price = cPrice >= 0 ? row[cPrice] : null;
    const amount = isNum(price) ? round5(qty * price) : round5(qty);
    // Col M ("Item") for the Excel line item = source "Item" column verbatim
    // ("Category (Detail)", e.g. "Lingual Arch (Upper Lingual Arch)") to match the golden.
    let item = (cItem >= 0 && row[cItem]) || (cMemo >= 0 && row[cMemo]) || 'Unknown';
    item = String(item).trim();
    // The dashboard Products table uses the cleaner "Memo" name for display/grouping.
    let productName = (cMemo >= 0 && row[cMemo]) || (cItem >= 0 && row[cItem]) || 'Unknown';
    productName = String(productName).trim();
    const patient = cPatient >= 0 ? row[cPatient] : null;
    const num = cNum >= 0 ? row[cNum] : null;
    const date = cDate >= 0 ? row[cDate] : null;

    const o = officeMap[name] || (officeMap[name] = { preTax: 0, qty: 0, invoices: new Set(), items: [] });
    o.preTax += amount;
    o.qty += qty;
    if (num != null) o.invoices.add(num);
    o.items.push({
      date: date instanceof Date ? ymd(date) : (date != null ? String(date) : null),
      num: num != null ? num : null,
      patient: patient != null ? String(patient) : null,
      item,
      qty,
      price: isNum(price) ? price : null,
    });

    const p = products[productName] || (products[productName] = { orders: 0, units: 0, revenue: 0, cases: new Set() });
    p.orders += 1;
    p.units += qty;
    p.revenue += amount;
    if (patient) p.cases.add(name + '|' + String(patient).trim());
  }

  // company is decided by the file's offices (same city differs by company)
  const names = Object.keys(officeMap);
  const childrenish = names.filter((n) => n.startsWith("Children")).length;
  const company = names.length && childrenish > names.length / 2 ? 'children'
    : (childrenish === names.length && names.length ? 'children' : (companyHint || 'premier'));

  // offices in ORIGINAL file order, each carrying its line items (for the Excel export)
  const offices = names.map((name) => {
    const d = officeMap[name];
    const rate = rateFor(company, name);
    const pre = round5(d.preTax);              // Excel: subtotal = ROUND(SUM(...),5)
    const withTax = pre + pre * rate / 100;    // Excel: =S+S*rate%  (no per-office 2dp rounding)
    return { office: name, company, invoices: d.invoices.size, lines: d.items.length,
      qtyTotal: round5(d.qty), preTax: round5(pre), taxRate: rate,
      tax: round5(withTax - pre), withTax: round5(withTax), items: d.items };
  });

  return { company, offices, products };
}

// ---- AR aging parser ----
function arBucket(days) {
  if (!isNum(days) || days <= 0) return 'Current';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

const AR_MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (key) => { const [y, m] = String(key).split('-'); return AR_MONTHS[Number(m)] ? `${AR_MONTHS[Number(m)]} ${y}` : key; };
// SheetJS loses a few seconds converting Excel serials — round to nearest calendar day.
const dayRound = (d) => new Date(Math.round(d.getTime() / 86400000) * 86400000);
const ymd = (d) => { const r = dayRound(d); return `${r.getUTCFullYear()}-${String(r.getUTCMonth() + 1).padStart(2, '0')}-${String(r.getUTCDate()).padStart(2, '0')}`; };

function arAggregate(pairs) {
  const byOffice = {}; let pg = 0, cg = 0, total = 0;
  for (const [cust, bal] of pairs) {
    byOffice[cust] = (byOffice[cust] || 0) + bal;
    if (cust.startsWith('Children')) cg += bal; else pg += bal;
    total += bal;
  }
  const offices = Object.entries(byOffice)
    .map(([office, balance]) => ({ office, balance: round2(balance), share: total ? Math.round(balance / total * 1000) / 10 : 0 }))
    .sort((a, b) => b.balance - a.balance);
  return { total: round2(total), premierGroup: round2(pg), childrenGroup: round2(cg), openInvoices: pairs.length, offices };
}

function parseAR(rows) {
  const header = rows[0] || [];
  const cCust = findCol(header, 'Customer');
  const cOpen = findCol(header, 'Open Balance');
  const cAge = findCol(header, 'Aging');
  const cDate = findCol(header, 'Date');

  const allPairs = [];
  const monthPairs = {};
  const buckets = { 'Current': 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  const officeAging = {};
  let maxDate = null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const cust = cCust >= 0 ? row[cCust] : null;
    const bal = cOpen >= 0 ? row[cOpen] : null;
    if (!cust || !isNum(bal)) continue;          // skip blank-customer QB total rows
    const name = String(cust).trim();
    allPairs.push([name, bal]);
    const bk = arBucket(cAge >= 0 ? row[cAge] : null);
    buckets[bk] += bal;
    const oa = officeAging[name] || (officeAging[name] = { total: 0, Current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 });
    oa.total += bal;
    oa[bk] += bal;
    const d = cDate >= 0 ? row[cDate] : null;
    let mkey = 'undated';
    if (d instanceof Date) {
      if (!maxDate || d > maxDate) maxDate = d;
      const r = dayRound(d);
      mkey = `${r.getUTCFullYear()}-${String(r.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    (monthPairs[mkey] || (monthPairs[mkey] = [])).push([name, bal]);
  }

  const base = arAggregate(allPairs);
  const total = base.total;
  const byMonth = {};
  for (const m of Object.keys(monthPairs)) byMonth[m] = arAggregate(monthPairs[m]);
  const months = Object.keys(byMonth)
    .map((m) => ({ key: m, label: monthLabel(m), total: byMonth[m].total, invoices: byMonth[m].openInvoices }))
    .sort((a, b) => String(b.key).localeCompare(String(a.key)));

  return {
    ...base,
    asOf: maxDate ? ymd(maxDate) : null,
    buckets: Object.entries(buckets).map(([bucket, balance]) => ({
      bucket, balance: round2(balance), pct: total ? Math.round(balance / total * 1000) / 10 : 0,
    })),
    months,
    byMonth,
    officeAging: Object.entries(officeAging).map(([office, b]) => ({
      office, total: round2(b.total),
      current: round2(b.Current), d1_30: round2(b['1-30']),
      d31_60: round2(b['31-60']), d61_90: round2(b['61-90']), d90: round2(b['90+']),
    })).sort((a, b) => b.total - a.total),
  };
}

const excluded = (name) => { const n = name.toLowerCase(); return n.includes('band') || n.includes('digital model'); };

// ---- assemble the full statement ----
export function buildStatement({ premierRows, childrenRows, arRows, month, year }) {
  const prem = parseInvoice(premierRows, 'premier');
  const child = parseInvoice(childrenRows, 'children');

  const products = {};
  for (const src of [prem.products, child.products]) {
    for (const [item, d] of Object.entries(src)) {
      const p = products[item] || (products[item] = { orders: 0, units: 0, revenue: 0, cases: new Set() });
      p.orders += d.orders; p.units += d.units; p.revenue += d.revenue;
      d.cases.forEach((c) => p.cases.add(c));
    }
  }
  const topProducts = Object.entries(products)
    .filter(([item]) => !excluded(item))
    .map(([item, v]) => ({ item, orders: v.orders, cases: v.cases.size, units: v.units, revenue: round2(v.revenue) }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5);

  const ar = parseAR(arRows);

  // sum at full precision (Excel grand total), round once for display
  const sum = (arr, k) => arr.reduce((a, o) => a + o[k], 0);
  const premierPreTax = round2(sum(prem.offices, 'preTax'));
  const premierWithTax = round2(sum(prem.offices, 'withTax'));
  const childrenPreTax = round2(sum(child.offices, 'preTax'));
  const childrenWithTax = round2(sum(child.offices, 'withTax'));

  // flat list for the dashboard table — strip line items, sort by billed
  const flat = [...prem.offices, ...child.offices]
    .map(({ items, ...rest }) => rest)
    .sort((a, b) => b.withTax - a.withTax);

  return {
    month, year,
    summary: {
      premierPreTax, premierWithTax, childrenPreTax, childrenWithTax,
      monthlyTotalWithTax: round2(premierWithTax + childrenWithTax),
      totalTax: round2((premierWithTax - premierPreTax) + (childrenWithTax - childrenPreTax)),
      arTotal: ar.total, arPremierGroup: ar.premierGroup, arChildrenGroup: ar.childrenGroup,
      openInvoices: ar.openInvoices,
    },
    offices: flat,
    ar,
    topProducts,
    // converted with-tax structure (offices in original order, with line items) — the
    // single source for both the numbers above and the exact-format Excel export.
    billing: {
      premier: { offices: prem.offices },
      children: { offices: child.offices },
    },
  };
}
