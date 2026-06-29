import fs from 'fs';
import { readWorkbookRows, buildStatement } from './src/lib/parseStatement.js';
import { buildCompanyWorkbook } from './src/lib/exportStatement.js';

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
  
  // Build the workbooks
  const premWb = buildCompanyWorkbook(statement.billing.premier.offices, 'premier', 'June', 2026);
  const childWb = buildCompanyWorkbook(statement.billing.children.offices, 'children', 'June', 2026);
  
  const premWs = premWb.worksheets[0];
  const childWs = childWb.worksheets[0];
  
  // Find last row
  let premLastRow = 1, childLastRow = 1;
  premWs.eachRow((row) => { premLastRow = row.number; });
  childWs.eachRow((row) => { childLastRow = row.number; });
  
  console.log('=== EXCEL GRAND TOTAL FORMULAS ===');
  console.log('Premier last row:', premLastRow);
  console.log('Children last row:', childLastRow);
  
  const premSTotal = premWs.getCell(`S${premLastRow}`);
  const childSTotal = childWs.getCell(`S${childLastRow}`);
  
  console.log('\nPremier S column formula:');
  console.log(premSTotal.value?.formula);
  console.log('\nChildren S column formula:');
  console.log(childSTotal.value?.formula);
  
  // Count the tax rows to understand formula structure
  const premTaxRows = [];
  const childTaxRows = [];
  
  for (let r = 1; r <= premLastRow; r++) {
    const cell = premWs.getCell(`T${r}`);
    if (cell.value === 'with TAX') premTaxRows.push(r);
  }
  for (let r = 1; r <= childLastRow; r++) {
    const cell = childWs.getCell(`T${r}`);
    if (cell.value === 'with TAX') childTaxRows.push(r);
  }
  
  console.log('\n=== TAX ROW ANALYSIS ===');
  console.log('Premier tax rows count:', premTaxRows.length);
  console.log('Children tax rows count:', childTaxRows.length);
  console.log('Premier tax rows (first 5):', premTaxRows.slice(0, 5));
  console.log('Children tax rows (first 5):', childTaxRows.slice(0, 5));
  
} catch (err) {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
}
