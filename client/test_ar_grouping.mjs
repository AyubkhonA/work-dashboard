import fs from 'fs';
import { readWorkbookRows } from './src/lib/parseStatement.js';

const arPath = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (5).xlsx';
const arRows = readWorkbookRows(new Uint8Array(fs.readFileSync(arPath)));

const isNum = (x) => typeof x === 'number' && !Number.isNaN(x);
const round2 = (x) => Math.round(x * 100) / 100;
const findCol = (header, ...labels) => {
  for (const label of labels) {
    const i = header.findIndex((h) => typeof h === 'string' && h.trim() === label);
    if (i >= 0) return i;
  }
  return -1;
};

function arAggregate(pairs) {
  const byOffice = {}; let pg = 0, cg = 0, total = 0;
  for (const [cust, bal] of pairs) {
    byOffice[cust] = (byOffice[cust] || 0) + bal;
    if (cust.startsWith('Children')) cg += bal; else pg += bal;  // BUG: Sedation goes to pg!
    total += bal;
  }
  const offices = Object.entries(byOffice)
    .map(([office, balance]) => ({ office, balance: round2(balance), share: total ? Math.round(balance / total * 1000) / 10 : 0 }))
    .sort((a, b) => b.balance - a.balance);
  return { total: round2(total), premierGroup: round2(pg), childrenGroup: round2(cg), openInvoices: pairs.length, offices };
}

const header = arRows[0] || [];
const cCust = findCol(header, 'Customer');
const cOpen = findCol(header, 'Open Balance');

const allPairs = [];
for (let i = 1; i < arRows.length; i++) {
  const row = arRows[i] || [];
  const cust = cCust >= 0 ? row[cCust] : null;
  const bal = cOpen >= 0 ? row[cOpen] : null;
  if (!cust || !isNum(bal)) continue;
  allPairs.push([String(cust).trim(), bal]);
}

const base = arAggregate(allPairs);

console.log('=== arAggregate RESULT (lines 175, 184) ===');
console.log(`premierGroup: $${base.premierGroup}`);
console.log(`childrenGroup: $${base.childrenGroup}`);
console.log(`total: $${base.total}`);

// Manually separate companies correctly
let premierTotal = 0, childrenTotal = 0, sedationTotal = 0;
for (const [cust, bal] of allPairs) {
  if (cust.startsWith('Children')) childrenTotal += bal;
  else if (cust.startsWith('Sedation')) sedationTotal += bal;
  else premierTotal += bal;
}

console.log('\n=== CORRECT SEPARATION ===');
console.log(`Premier total: $${round2(premierTotal)}`);
console.log(`Sedation total: $${round2(sedationTotal)}`);
console.log(`Children total: $${round2(childrenTotal)}`);
console.log(`Sum: $${round2(premierTotal + sedationTotal + childrenTotal)}`);

console.log('\n=== BUG: Sedation is misclassified ===');
console.log(`Sedation should be its own company or grouped with Premier carefully`);
console.log(`Currently, parseAR groups it with Premier in premierGroup`);
console.log(`But buildStatement has no separate billing.sedation section`);

