import fs from 'fs';
import { readWorkbookRows, buildStatement } from './src/lib/parseStatement.js';

const premierFile = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (2) (1).xlsx';
const childrenFile = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (3) (1).xlsx';
const arFile = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (5).xlsx';

const premierRows = readWorkbookRows(new Uint8Array(fs.readFileSync(premierFile)));
const childrenRows = readWorkbookRows(new Uint8Array(fs.readFileSync(childrenFile)));
const arRows = readWorkbookRows(new Uint8Array(fs.readFileSync(arFile)));

const result = buildStatement({ premierRows, childrenRows, arRows, month: 'June', year: 2026 });

// Compare a single office before and after parsing
const testOffice = 'Premier Orthodontics Antioch';

console.log(`=== DATA FLOW FOR ${testOffice} ===`);

const premierVersion = result.billing.premier.offices.find(o => o.office === testOffice);
const childrenVersion = result.billing.children.offices.find(o => o.office === testOffice);

console.log('\nFrom Premier file:');
console.log(`  Company: premier`);
console.log(`  Invoices: ${premierVersion.invoices}`);
console.log(`  PreTax: $${premierVersion.preTax}`);
console.log(`  Tax Rate: ${premierVersion.taxRate}% (from PREMIER_RATES table)`);
console.log(`  With Tax: $${premierVersion.withTax}`);
console.log(`  Line items: ${premierVersion.items.length}`);

console.log('\nFrom Children file:');
console.log(`  Company: children`);
console.log(`  Invoices: ${childrenVersion.invoices}`);
console.log(`  PreTax: $${childrenVersion.preTax}`);
console.log(`  Tax Rate: ${childrenVersion.taxRate}% (from CHILDREN_RATES table)`);
console.log(`  With Tax: $${childrenVersion.withTax}`);
console.log(`  Line items: ${childrenVersion.items.length}`);

console.log('\nFinal output (from result.offices):');
const flatVersion = result.offices.find(o => o.office === testOffice);
if (flatVersion) {
  console.log(`  Count: ${flatVersion.invoices} invoices`);
  console.log(`  With Tax: $${flatVersion.withTax}`);
  console.log(`  Company: ${flatVersion.company}`);
}

console.log('\n=== DOUBLE-COUNTING MECHANISM ===');
console.log('The parsing happens in TWO SEPARATE PASSES:');
console.log('1. parseInvoice(premierRows, "premier") -> result.billing.premier');
console.log('2. parseInvoice(childrenRows, "children") -> result.billing.children');
console.log('');
console.log('The Children file contains the SAME line items as Premier file for this office.');
console.log('Both parsers accumulate the items in officeMap[name], creating:');
console.log('  - billing.premier.offices[Antioch] with 36 invoices from Premier file');
console.log('  - billing.children.offices[Antioch] with 36 invoices from Children file');
console.log('');
console.log('Then in result.offices (line 230-232), BOTH are flattened together.');
console.log('Because they have the same office name, the second one either overrides');
console.log('or they are listed separately. Looking at the output above:');
console.log('  - result.offices only shows the LAST one added to the flat array');
console.log('  - But billing data retains BOTH');
console.log('');
console.log('For summary calculations (line 224-227), it sums ALL offices from BOTH:');
const dupCount = result.billing.premier.offices.length + result.billing.children.offices.length;
const uniqueCount = new Set([...result.billing.premier.offices.map(o => o.office), 
                             ...result.billing.children.offices.map(o => o.office)]).size;
console.log(`  - Premier offices: ${result.billing.premier.offices.length}`);
console.log(`  - Children offices: ${result.billing.children.offices.length}`);
console.log(`  - Total in calculation: ${dupCount}`);
console.log(`  - Unique office names: ${uniqueCount}`);
console.log(`  - DUPLICATES: ${dupCount - uniqueCount}`);

