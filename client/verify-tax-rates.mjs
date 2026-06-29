import fs from 'fs';
import { readWorkbookRows, buildStatement } from './src/lib/parseStatement.js';

const premierFile = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (2) (1).xlsx';
const childrenFile = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (3) (1).xlsx';
const arFile = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (5).xlsx';

const premierRows = readWorkbookRows(new Uint8Array(fs.readFileSync(premierFile)));
const childrenRows = readWorkbookRows(new Uint8Array(fs.readFileSync(childrenFile)));
const arRows = readWorkbookRows(new Uint8Array(fs.readFileSync(arFile)));

const result = buildStatement({ premierRows, childrenRows, arRows, month: 'June', year: 2026 });

console.log('=== TAX RATE DISCREPANCIES ===');
console.log('Offices with SAME NAME but different tax rates (indicating double-count from both files):');

// Find officeswith same name in both premier and children
const premierNames = new Set(result.billing.premier.offices.map(o => o.office));
const childrenNames = new Set(result.billing.children.offices.map(o => o.office));

const childrenOffices = new Map(result.billing.children.offices.map(o => [o.office, o]));
const premierOffices = new Map(result.billing.premier.offices.map(o => [o.office, o]));

premierNames.forEach(name => {
  if (childrenNames.has(name)) {
    const p = premierOffices.get(name);
    const c = childrenOffices.get(name);
    console.log(`\n${name}:`);
    console.log(`  Premier: rate=${p.taxRate}%, preTax=$${p.preTax}, withTax=$${p.withTax}`);
    console.log(`  Children: rate=${c.taxRate}%, preTax=$${c.preTax}, withTax=$${c.withTax}`);
  }
});

console.log('\n=== EXPECTED VS ACTUAL ===');
console.log('Expected: Premier offices taxed with PREMIER_RATES only');
console.log('Actual: All 26 Premier offices appear in BOTH files with different rates');
console.log('Result: They are counted twice with different tax rates');

