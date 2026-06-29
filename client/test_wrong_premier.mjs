import fs from 'fs';
import * as XLSX from 'xlsx';
import { buildStatement } from './src/lib/parseStatement.js';
import { readWorkbookRows } from './src/lib/parseStatement.js';

// Create a bad Premier file (missing "Name" column)
const wb = XLSX.utils.book_new();
const wsData = [
  ['Invoice', 'Qty', 'Sales Price'],  // Missing "Name" column
  ['12345', 10, 100],
  ['12346', 20, 200],
];
const ws = XLSX.utils.aoa_to_sheet(wsData);
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync('/tmp/bad_premier.xlsx', buf);

const badPremierRows = readWorkbookRows(new Uint8Array(fs.readFileSync('/tmp/bad_premier.xlsx')));
const childrenRows = readWorkbookRows(new Uint8Array(fs.readFileSync('/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (3) (1).xlsx')));
const arRows = readWorkbookRows(new Uint8Array(fs.readFileSync('/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (5).xlsx')));

try {
  const data = buildStatement({
    premierRows: badPremierRows,
    childrenRows,
    arRows,
    month: 'June',
    year: 2026,
  });
  
  console.log('=== SCENARIO: Bad Premier file (missing headers) ===');
  console.log('data.offices.length:', data.offices.length);
  console.log('data.summary.premierWithTax:', data.summary.premierWithTax);
  console.log('data.summary.childrenWithTax:', data.summary.childrenWithTax);
  console.log('data.summary.monthlyTotalWithTax:', data.summary.monthlyTotalWithTax);
  
  if (data.offices.length > 0) {
    console.log('\nERROR CONDITION CHECK (line 40 of Upload.jsx):');
    console.log('!data.offices.length =', !data.offices.length);
    console.log('Would error trigger? NO');
    console.log('\nUX IMPACT: User uploads wrong Premier file → no warning → dashboard shows ONLY Children data ($82,483) → missing $78,342 in expected Premier revenue.');
  }
} catch (e) {
  console.log('Error caught:', e.message);
}
