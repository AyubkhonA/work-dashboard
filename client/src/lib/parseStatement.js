// Client-side parser — mirrors tools/parse_may.py. Reads the 3 uploaded xlsx files
// and produces the same data shape the dashboard consumes. No backend, no mock data.
import * as XLSX from 'xlsx';

// ---- per-office tax rates (matched by city substring), keyed on the office's COMPANY ----
// Premier offices (incl. Sedation) default to 8.5% except the two below; Children's by city.
const PREMIER_RATES = { 'Vacaville': 8.125, 'Yuba City': 7.25 };
const CHILDREN_RATES = { 'Antioch': 9.75, 'Glendora': 10.25, 'San Diego': 7.25, 'Oxnard': 7.75 };
const DEFAULT_RATE = 8.5;

const round5 = (x) => Math.round(x * 1e5) / 1e5;
const round2 = (x) => Math.round(x * 100) / 100;
const isNum = (x) => typeof x === 'number' && !Number.isNaN(x);

// Company is a property of the OFFICE NAME, never of which file the row came from.
// "Children's Choice *" => children; "Premier Orthodontics *" / "Sedation *" => premier.
const companyOf = (office) => (String(office).startsWith('Children') ? 'children' : 'premier');

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

// case-insensitive, whitespace-tolerant header match
const findCol = (header, ...labels) => {
  for (const label of labels) {
    const want = label.trim().toLowerCase();
    const i = header.findIndex((h) => typeof h === 'string' && h.trim().toLowerCase() === want);
    if (i >= 0) return i;
  }
  return -1;
};

// ---- invoice parser + with-tax conversion (single source of truth) ----
// Retains every line item per office in ORIGINAL file order so the same converted
// structure feeds both the dashboard numbers and the exact-format Excel export.
// Company/tax are assigned PER OFFICE by name, so a file containing the "wrong"
// offices (contamination or a file swap) is still taxed correctly.
function parseInvoice(rows) {
  const header = rows[0] || [];
  const cName = findCol(header, 'Name');
  const cQty = findCol(header, 'Qty');
  const cPrice = findCol(header, 'Sales Price');
  const cNum = findCol(header, 'Num');
  const cDate = findCol(header, 'Date');
  const cPatient = findCol(header, 'Patient Name:', 'Patient Name', 'Patient');
  const cMemo = findCol(header, 'Memo');
  const cItem = findCol(header, 'Item');
  const cType = findCol(header, 'Type');

  if (cName < 0 || cQty < 0 || cPrice < 0) {
    throw new Error('Invoice file is missing required columns (Name / Qty / Sales Price). Is this the right export?');
  }

  const officeMap = {};        // office -> {preTax, qty, invoices:Set, items:[], prods:{}} (insertion order kept)

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const office = row[cName];
    const qty = row[cQty];
    // a line item has the office name in the data column AND a numeric qty
    if (typeof office !== 'string' || !office.trim() || !isNum(qty)) continue;
    // only real invoices (skip credit memos / statement charges / blank-type summary rows)
    if (cType >= 0) { const t = row[cType]; if (t != null && String(t).trim() && String(t).trim() !== 'Invoice') continue; }
    const price = cPrice >= 0 ? row[cPrice] : null;
    // skip credit lines (negative qty/price) — they are not part of a monthly billing total
    if (qty < 0 || (isNum(price) && price < 0)) continue;
    const name = office.trim();
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

    const o = officeMap[name] || (officeMap[name] = { preTax: 0, qty: 0, invoices: new Set(), items: [], prods: {} });
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

    const pp = o.prods[productName] || (o.prods[productName] = { orders: 0, units: 0, revenue: 0, cases: new Set() });
    pp.orders += 1;
    pp.units += qty;
    pp.revenue += amount;
    if (patient) pp.cases.add(name + '|' + String(patient).trim());
  }

  // offices in ORIGINAL file order; company + tax derived from the office NAME (not the file)
  const offices = Object.keys(officeMap).map((name) => {
    const d = officeMap[name];
    const company = companyOf(name);
    const rate = rateFor(company, name);
    const pre = round5(d.preTax);              // Excel: subtotal = ROUND(SUM(...),5)
    const withTax = pre + pre * rate / 100;    // Excel: =S+S*rate%  (no per-office 2dp rounding)
    return { office: name, company, invoices: d.invoices.size, lines: d.items.length,
      qtyTotal: round5(d.qty), preTax: pre, taxRate: rate,
      tax: round5(withTax - pre), withTax: round5(withTax), items: d.items, prods: d.prods };
  });

  return { offices };
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
// SheetJS lands Excel date serials a few seconds before midnight of the prior day; rounding
// to the nearest day (then reading UTC components) recovers the intended calendar date.
const dayRound = (d) => new Date(Math.round(d.getTime() / 86400000) * 86400000);
const ymd = (d) => { const r = dayRound(d); return `${r.getUTCFullYear()}-${String(r.getUTCMonth() + 1).padStart(2, '0')}-${String(r.getUTCDate()).padStart(2, '0')}`; };

function arAggregate(pairs) {
  const byOffice = {}; let pg = 0, cg = 0, total = 0;
  for (const [cust, bal] of pairs) {
    byOffice[cust] = (byOffice[cust] || 0) + bal;
    if (cust.startsWith('Children')) cg += bal; else pg += bal; // Premier company incl. Sedation
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

  if (cCust < 0 || cOpen < 0) {
    throw new Error('AR file is missing required columns (Customer / Open Balance). Is this the right export?');
  }

  const allPairs = [];
  const monthPairs = {};
  const buckets = { 'Current': 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  const officeAging = {};
  let maxDate = null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const cust = row[cCust];
    const bal = row[cOpen];
    if (!cust || !isNum(bal)) continue;          // skip blank-customer rows
    const name = String(cust).trim();
    if (name.toLowerCase().includes('total')) continue; // skip QB "Total"/"Grand Total" summary rows
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
  const prem = parseInvoice(premierRows);
  const child = parseInvoice(childrenRows);

  // Merge offices from BOTH files and de-duplicate by office name. An office that appears
  // in both files (contaminated export / file swap) is the same data — keep it once. Then
  // route each office to its company by NAME, so totals + tax are correct regardless of
  // which file an office showed up in.
  const seen = new Set();
  const dupes = [];
  const allOffices = [];
  for (const o of [...prem.offices, ...child.offices]) {
    if (seen.has(o.office)) { dupes.push(o.office); continue; }
    seen.add(o.office);
    allOffices.push(o);
  }
  const warnings = [];
  if (dupes.length) {
    const uniq = [...new Set(dupes)];
    warnings.push(`${uniq.length} office(s) appeared in BOTH invoice files and were counted once: ${uniq.slice(0, 4).join(', ')}${uniq.length > 4 ? '…' : ''}. Check that each office's data isn't split across files.`);
  }

  const premierOffices = allOffices.filter((o) => o.company === 'premier');
  const childrenOffices = allOffices.filter((o) => o.company === 'children');

  // top products — aggregated from the DE-DUPED offices (no double-count under contamination)
  const products = {};
  for (const o of allOffices) {
    for (const [name, d] of Object.entries(o.prods || {})) {
      const p = products[name] || (products[name] = { orders: 0, units: 0, revenue: 0, cases: new Set() });
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
  const premierPreTax = round2(sum(premierOffices, 'preTax'));
  const premierWithTax = round2(sum(premierOffices, 'withTax'));
  const childrenPreTax = round2(sum(childrenOffices, 'preTax'));
  const childrenWithTax = round2(sum(childrenOffices, 'withTax'));

  // strip internals for output: dashboard flat list has no items/prods; billing keeps items
  const stripBilling = ({ prods, ...rest }) => rest;          // keep items, drop prods
  const flat = allOffices
    .map(({ items, prods, ...rest }) => rest)
    .sort((a, b) => b.withTax - a.withTax);

  return {
    month, year,
    warnings,
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
      premier: { offices: premierOffices.map(stripBilling) },
      children: { offices: childrenOffices.map(stripBilling) },
    },
  };
}
