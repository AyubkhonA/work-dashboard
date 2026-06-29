import fs from 'fs';
import * as XLSX from 'xlsx';
import { buildStatement, readWorkbookRows } from './src/lib/parseStatement.js';

// Create a completely unrelated Excel file (e.g., a budget spreadsheet)
const wb = XLSX.utils.book_new();
const wsData = [
  ['Department', 'Q1 Budget', 'Q1 Actual', 'Variance'],
  ['Sales', 100000, 95000, -5000],
  ['Marketing', 50000, 52000, 2000],
];
const ws = XLSX.utils.aoa_to_sheet(wsData);
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync('/tmp/wrong_budget.xlsx', buf);

const wrongFile = readWorkbookRows(new Uint8Array(fs.readFileSync('/tmp/wrong_budget.xlsx')));
const childrenRows = readWorkbookRows(new Uint8Array(fs.readFileSync('/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (3) (1).xlsx')));
const arRows = readWorkbookRows(new Uint8Array(fs.readFileSync('/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (5).xlsx')));

try {
  const data = buildStatement({
    premierRows: wrongFile,
    childrenRows,
    arRows,
    month: 'June',
    year: 2026,
  });
  
  console.log('=== SCENARIO: Completely wrong file (budget spreadsheet as Premier) ===');
  console.log('data.offices.length:', data.offices.length);
  console.log('data.summary.premierWithTax:', data.summary.premierWithTax);
  console.log('data.summary.childrenWithTax:', data.summary.childrenWithTax);
  console.log('data.summary.monthlyTotalWithTax:', data.summary.monthlyTotalWithTax);
  
  if (data.offices.length > 0) {
    console.log('\nWould error trigger? NO (!data.offices.length = false)');
    console.log('UX IMPACT: Silent failure — missing $78,342 in Premier revenue.');
  }
} catch (e) {
  console.log('Error caught:', e.message);
}
