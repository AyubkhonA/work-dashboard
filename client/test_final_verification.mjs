import fs from 'fs';
import { readWorkbookRows, buildStatement } from './src/lib/parseStatement.js';

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
  
  // EXACT TRACING OF LINES 224-227 in parseStatement.js
  const sum = (arr, k) => arr.reduce((a, o) => a + o[k], 0);
  
  // Line 224: const premierPreTax = round2(sum(prem.offices, 'preTax'));
  // Line 225: const premierWithTax = round2(sum(prem.offices, 'withTax'));
  const dashboardPremierWithTaxSum = sum(statement.billing.premier.offices, 'withTax');
  const dashboardPremierWithTax = round2(dashboardPremierWithTaxSum);
  
  // Line 227: const childrenWithTax = round2(sum(child.offices, 'withTax'));
  const dashboardChildrenWithTaxSum = sum(statement.billing.children.offices, 'withTax');
  const dashboardChildrenWithTax = round2(dashboardChildrenWithTaxSum);
  
  // Line 238: monthlyTotalWithTax: round2(premierWithTax + childrenWithTax),
  const dashboardMonthlyTotal = round2(dashboardPremierWithTax + dashboardChildrenWithTax);
  
  console.log('=== LINES 224-227 TRACED ===');
  console.log('sum(prem.offices, "withTax") =', dashboardPremierWithTaxSum.toFixed(15));
  console.log('round2(...) =', dashboardPremierWithTax.toFixed(2));
  console.log('sum(child.offices, "withTax") =', dashboardChildrenWithTaxSum.toFixed(15));
  console.log('round2(...) =', dashboardChildrenWithTax.toFixed(2));
  console.log('monthlyTotalWithTax =', dashboardMonthlyTotal.toFixed(2));
  
  // EXACT TRACING OF EXCEL GRAND TOTAL (line 206 in exportStatement.js)
  // ROUND(SUM(S_tax_rows), 5)
  let excelSum = 0;
  for (const office of statement.billing.premier.offices) {
    const subtotal = office.preTax;
    const taxRow = subtotal + subtotal * office.taxRate / 100;
    excelSum += taxRow;
  }
  for (const office of statement.billing.children.offices) {
    const subtotal = office.preTax;
    const taxRow = subtotal + subtotal * office.taxRate / 100;
    excelSum += taxRow;
  }
  
  const excelMonthlyTotal = round5(excelSum);
  
  console.log('\n=== EXCEL LINE 206 TRACED ===');
  console.log('SUM of all tax rows =', excelSum.toFixed(15));
  console.log('ROUND(..., 5) =', excelMonthlyTotal.toFixed(5));
  
  console.log('\n=== DISCREPANCY ===');
  console.log('Excel (5dp):', excelMonthlyTotal.toFixed(5));
  console.log('Dashboard (2dp):', dashboardMonthlyTotal.toFixed(2));
  console.log('Difference:', (excelMonthlyTotal - dashboardMonthlyTotal).toFixed(5));
  
  // The core issue: dashboard rounds to 2dp, Excel keeps 5dp for the grand total
  // But when you display it, if someone looks at 5 decimal places in Excel...
  console.log('\n=== WHEN DISPLAYED AS 2 DECIMAL PLACES ===');
  console.log('Excel displayed (2dp):', round2(excelMonthlyTotal).toFixed(2));
  console.log('Dashboard (2dp):', dashboardMonthlyTotal.toFixed(2));
  console.log('Match?', round2(excelMonthlyTotal) === dashboardMonthlyTotal);
  
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
