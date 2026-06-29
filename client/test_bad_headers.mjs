import fs from 'fs';
import * as XLSX from 'xlsx';
import { readWorkbookRows, buildStatement } from './src/lib/parseStatement.js';

// Create a minimal bad file (missing the "Name" column)
const wb = XLSX.utils.book_new();
const wsData = [
  ['Invoice', 'Qty', 'Sales Price'],  // Missing "Name" column
  ['12345', 10, 100],
  ['12346', 20, 200],
];
const ws = XLSX.utils.aoa_to_sheet(wsData);
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

const badPath = '/tmp/bad_headers.xlsx';
fs.writeFileSync(badPath, buf);

console.log('Created bad file with missing "Name" column');

const badRows = readWorkbookRows(new Uint8Array(fs.readFileSync(badPath)));
console.log('Bad file rows:', badRows);

// Now try to parse it
const premierRows = badRows;
const childrenRows = readWorkbookRows(new Uint8Array(fs.readFileSync('/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (3) (1).xlsx')));
const arRows = readWorkbookRows(new Uint8Array(fs.readFileSync('/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (5).xlsx')));

try {
  const data = buildStatement({
    premierRows,
    childrenRows,
    arRows,
    month: 'June',
    year: 2026,
  });
  
  console.log('offices.length:', data.offices.length);
  if (data.offices.length === 0) {
    console.log('SUCCESS: Empty office list detected (would trigger "No offices found" error)');
  } else {
    console.log('WARNING: File with missing "Name" column still produced offices:', data.offices.slice(0, 3));
  }
} catch (e) {
  console.log('Error caught:', e.message);
}
