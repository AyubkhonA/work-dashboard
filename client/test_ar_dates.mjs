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

const dayRound = (d) => new Date(Math.round(d.getTime() / 86400000) * 86400000);
const ymd = (d) => { const r = dayRound(d); return `${r.getUTCFullYear()}-${String(r.getUTCMonth() + 1).padStart(2, '0')}-${String(r.getUTCDate()).padStart(2, '0')}`; };

const header = arRows[0] || [];
const cCust = findCol(header, 'Customer');
const cOpen = findCol(header, 'Open Balance');
const cDate = findCol(header, 'Date');

console.log('=== CHECKING DATE HANDLING IN parseAR ===\n');

const allDates = [];
let maxDate = null;
const monthPairs = {};

for (let i = 1; i < arRows.length; i++) {
  const row = arRows[i] || [];
  const cust = cCust >= 0 ? row[cCust] : null;
  const bal = cOpen >= 0 ? row[cOpen] : null;
  
  if (!cust || !isNum(bal)) continue;
  
  const d = cDate >= 0 ? row[cDate] : null;
  let mkey = 'undated';
  
  if (d instanceof Date) {
    allDates.push(d);
    if (!maxDate || d > maxDate) maxDate = d;
    const r = dayRound(d);
    mkey = `${r.getUTCFullYear()}-${String(r.getUTCMonth() + 1).padStart(2, '0')}`;
  } else if (d !== null) {
    console.log(`WARNING: Row ${i} has non-Date date value: ${d} (type: ${typeof d})`);
  }
}

console.log(`Total data rows processed: ${allDates.length}`);
console.log(`Dates found: ${allDates.length}`);
console.log(`Max date (asOf): ${maxDate ? ymd(maxDate) : 'null'}`);

// Sort dates to see range
const sortedDates = allDates.sort((a, b) => a.getTime() - b.getTime());
console.log(`\nDate range:`);
console.log(`  Earliest: ${ymd(sortedDates[0])}`);
console.log(`  Latest: ${ymd(sortedDates[sortedDates.length - 1])}`);

// Check for "undated" entries
let undatedCount = 0;
for (let i = 1; i < arRows.length; i++) {
  const row = arRows[i] || [];
  const cust = cCust >= 0 ? row[cCust] : null;
  const bal = cOpen >= 0 ? row[cOpen] : null;
  if (!cust || !isNum(bal)) continue;
  const d = cDate >= 0 ? row[cDate] : null;
  if (!(d instanceof Date)) undatedCount++;
}
console.log(`\nUndated rows: ${undatedCount}`);

console.log(`\n=== CHECKING FOR "Total" OR SUMMARY ROWS ===`);
const custValues = new Set();
for (let i = 1; i < arRows.length; i++) {
  const row = arRows[i] || [];
  const cust = cCust >= 0 ? row[cCust] : null;
  if (cust && typeof cust === 'string') {
    if (cust.includes('Total') || cust.includes('TOTAL') || cust.trim() === '') {
      const bal = cOpen >= 0 ? row[cOpen] : null;
      console.log(`Row ${i}: "${cust}" -> bal=${bal}`);
    }
  }
}

