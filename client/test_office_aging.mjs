import fs from 'fs';
import { readWorkbookRows } from './src/lib/parseStatement.js';

const arPath = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (5).xlsx';
const arRows = readWorkbookRows(new Uint8Array(fs.readFileSync(arPath)));

const isNum = (x) => typeof x === 'number' && !Number.isNaN(x);
const findCol = (header, ...labels) => {
  for (const label of labels) {
    const i = header.findIndex((h) => typeof h === 'string' && h.trim() === label);
    if (i >= 0) return i;
  }
  return -1;
};

function arBucket(days) {
  if (!isNum(days) || days <= 0) return 'Current';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

const header = arRows[0] || [];
const cCust = findCol(header, 'Customer');
const cOpen = findCol(header, 'Open Balance');
const cAge = findCol(header, 'Aging');

// Build officeAging like parseAR does
const officeAging = {};
for (let i = 1; i < arRows.length; i++) {
  const row = arRows[i] || [];
  const cust = cCust >= 0 ? row[cCust] : null;
  const bal = cOpen >= 0 ? row[cOpen] : null;
  if (!cust || !isNum(bal)) continue;
  
  const name = String(cust).trim();
  const bk = arBucket(cAge >= 0 ? row[cAge] : null);
  const oa = officeAging[name] || (officeAging[name] = { total: 0, Current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 });
  oa.total += bal;
  oa[bk] += bal;
}

console.log('=== officeAging structure (line 191-195) ===');
const officeList = Object.entries(officeAging)
  .map(([office, b]) => ({
    office, total: Math.round(b.total * 100) / 100,
    current: Math.round(b.Current * 100) / 100, d1_30: Math.round(b['1-30'] * 100) / 100,
    d31_60: Math.round(b['31-60'] * 100) / 100, d61_90: Math.round(b['61-90'] * 100) / 100, d90: Math.round(b['90+'] * 100) / 100,
  }))
  .sort((a, b) => b.total - a.total);

console.log(`Total offices in officeAging: ${officeList.length}`);
console.log('\nTop 5:');
officeList.slice(0, 5).forEach(o => console.log(`  ${o.office}: $${o.total}`));

console.log('\nSedation offices:');
officeList.filter(o => o.office.includes('Sedation')).forEach(o => console.log(`  ${o.office}: $${o.total}`));

console.log('\n=== BUG: officeAging mixes all companies ===');
console.log('Lines 191-195 output per-office aging WITHOUT company grouping');
console.log('This creates a dashboard table with Premier, Children, and Sedation offices mixed');
console.log('But parseAR.arAggregate (lines 175-177) has premierGroup/childrenGroup summary');
console.log('that MISCLASSIFIES Sedation as Premier (line 131)');

