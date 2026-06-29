import fs from 'fs';
import { readWorkbookRows, buildStatement } from './src/lib/parseStatement.js';
import { buildCompanyWorkbook } from './src/lib/exportStatement.js';

const premierPath = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (2) (1).xlsx';
const childrenPath = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (3) (1).xlsx';
const arPath = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (5).xlsx';

const round5 = (x) => Math.round(x * 1e5) / 1e5;
const round2 = (x) => Math.round(x * 100) / 100;

try {
  const premierData = new Uint8Array(fs.readFileSync(premierPath));
  const childrenData = new Uint8Array(fs.readFileSync(childrenPath));
  const arData = new Uint8Array(fs.readFileSync(arPath));
  
  const premierRows = readWorkbookRows(premierData);
  const childrenRows = readWorkbookRows(childrenData);
  const arRows = readWorkbookRows(arData);
  
  const statement = buildStatement({
    premierRows,
    childrenRows,
    arRows,
    month: 'June',
    year: 2026
  });
  
  // Now let's trace what the Excel grand total SHOULD be
  // by summing the individual office calculations
  
  console.log('=== TRACING EXCEL GRAND TOTAL CALCULATION ===\n');
  
  // For each office, the Excel formula does:
  // tax_row_value = subtotal + subtotal * rate%
  // Then the grand total sums all tax rows and rounds to 5dp
  
  let premierTotal = 0;
  let childrenTotal = 0;
  
  console.log('Premier offices:');
  for (const office of statement.billing.premier.offices) {
    // This is what Excel computes:
    // subtotal is already round5(d.preTax) in parseStatement.js line 102
    const subtotal = office.preTax; // already round5'd
    const taxRowValue = subtotal + subtotal * office.taxRate / 100; // Excel: S+S*rate%
    console.log(`  ${office.office.padEnd(35)} pre=${subtotal.toString().padStart(10)} rate=${office.taxRate.toFixed(2)}% -> taxRow=${taxRowValue.toFixed(5)}`);
    premierTotal += taxRowValue;
  }
  
  console.log('\nChildren offices:');
  for (const office of statement.billing.children.offices) {
    const subtotal = office.preTax;
    const taxRowValue = subtotal + subtotal * office.taxRate / 100;
    console.log(`  ${office.office.padEnd(35)} pre=${subtotal.toString().padStart(10)} rate=${office.taxRate.toFixed(2)}% -> taxRow=${taxRowValue.toFixed(5)}`);
    childrenTotal += taxRowValue;
  }
  
  console.log('\n=== FINAL TOTALS ===');
  console.log('Premier before ROUND(5):', premierTotal.toFixed(15));
  console.log('Premier after ROUND(5):', round5(premierTotal).toFixed(15));
  console.log('Children before ROUND(5):', childrenTotal.toFixed(15));
  console.log('Children after ROUND(5):', round5(childrenTotal).toFixed(15));
  
  const excelPremierTotal = round5(premierTotal);
  const excelChildrenTotal = round5(childrenTotal);
  const excelMonthlyTotal = round5(excelPremierTotal + excelChildrenTotal);
  
  console.log('\n=== EXCEL vs DASHBOARD ===');
  console.log('Excel monthly total (via grand SUM+ROUND5):', excelMonthlyTotal.toFixed(5));
  console.log('Dashboard monthly total (round2):', statement.summary.monthlyTotalWithTax.toFixed(2));
  console.log('Difference:', (excelMonthlyTotal - statement.summary.monthlyTotalWithTax).toFixed(15));
  
} catch (err) {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
}
