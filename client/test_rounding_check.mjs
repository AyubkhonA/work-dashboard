import fs from 'fs';
import { readWorkbookRows, buildStatement } from './src/lib/parseStatement.js';
import { buildCompanyWorkbook } from './src/lib/exportStatement.js';

// Read the June test files
const premierPath = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (2) (1).xlsx';
const childrenPath = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (3) (1).xlsx';
const arPath = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (5).xlsx';

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
  
  console.log('=== DASHBOARD SUMMARY ===');
  console.log('Premier Pre-Tax:  ', statement.summary.premierPreTax);
  console.log('Premier With-Tax: ', statement.summary.premierWithTax);
  console.log('Children Pre-Tax: ', statement.summary.childrenPreTax);
  console.log('Children With-Tax:', statement.summary.childrenWithTax);
  console.log('Monthly Total:    ', statement.summary.monthlyTotalWithTax);
  console.log('Total Tax:        ', statement.summary.totalTax);
  
  // Trace individual office totals to see the rounding
  console.log('\n=== PREMIER OFFICES (sample) ===');
  const premOffices = statement.billing.premier.offices.slice(0, 3);
  premOffices.forEach(office => {
    console.log(`${office.office}: preTax=${office.preTax}, withTax=${office.withTax}, tax=${office.tax}`);
  });
  
  console.log('\n=== CHILDREN OFFICES (sample) ===');
  const childOffices = statement.billing.children.offices.slice(0, 3);
  childOffices.forEach(office => {
    console.log(`${office.office}: preTax=${office.preTax}, withTax=${office.withTax}, tax=${office.tax}`);
  });
  
} catch (err) {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
}
