import fs from 'fs';
import { readWorkbookRows } from './src/lib/parseStatement.js';

const arPath = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (5).xlsx';
const arRows = readWorkbookRows(new Uint8Array(fs.readFileSync(arPath)));

// Simulate parseAR exactly
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
const cDate = findCol(header, 'Date');

console.log('parseAR logic trace:');
console.log(`cCust=${cCust}, cOpen=${cOpen}, cAge=${cAge}, cDate=${cDate}`);

const allPairs = [];
const buckets = { 'Current': 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
const officeAging = {};
let maxDate = null;
const monthPairs = {};

console.log('\n=== PROCESSING ROWS ===');
let processedCount = 0;
let skippedCount = 0;
let qbTotalRow = -1;

for (let i = 1; i < arRows.length; i++) {
  const row = arRows[i] || [];
  const cust = cCust >= 0 ? row[cCust] : null;
  const bal = cOpen >= 0 ? row[cOpen] : null;
  
  // Line 157: if (!cust || !isNum(bal)) continue;
  if (!cust || !isNum(bal)) {
    skippedCount++;
    if (i === 1 || i === 758 || i === 759) {
      console.log(`Row ${i}: SKIPPED - cust=${cust}, bal=${bal} (type: ${typeof bal})`);
    }
    if (bal && !cust) {
      qbTotalRow = i;
      console.log(`  ^ This looks like QB total row!`);
    }
    continue;
  }
  
  processedCount++;
  const name = String(cust).trim();
  allPairs.push([name, bal]);
  
  const bk = arBucket(cAge >= 0 ? row[cAge] : null);
  buckets[bk] += bal;
  
  if (i <= 5 || i === 100) {
    console.log(`Row ${i}: cust="${name}", bal=${bal}, bucket=${bk}`);
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Processed: ${processedCount} data rows`);
console.log(`Skipped: ${skippedCount} rows (headers, empties, QB totals)`);
console.log(`QB total found at row: ${qbTotalRow}`);

console.log(`\nBuckets (from parseAR):`, buckets);
const totalFromBuckets = Object.values(buckets).reduce((a,b) => a + b, 0);
console.log(`Total from buckets: ${totalFromBuckets}`);

// Check Sedation grouping - the bug!
console.log('\n=== CHECKING SEDATION GROUPING BUG ===');
let premierGroupTotal = 0;
let childrenGroupTotal = 0;
let sedationTotal = 0;

for (const [cust, bal] of allPairs) {
  if (cust.startsWith('Children')) {
    childrenGroupTotal += bal;
  } else {
    premierGroupTotal += bal;
  }
  if (cust.startsWith('Sedation')) {
    sedationTotal += bal;
  }
}

console.log(`Premier group (non-Children) total: ${premierGroupTotal}`);
console.log(`Children group total: ${childrenGroupTotal}`);
console.log(`Sedation group total (included in Premier above): ${sedationTotal}`);
console.log(`BUG: Sedation is grouped as "Premier" not separately!`);

