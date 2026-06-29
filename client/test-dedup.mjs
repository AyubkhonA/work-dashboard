import fs from 'fs';
import { readWorkbookRows, buildStatement } from './src/lib/parseStatement.js';

const premierFile = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (2) (1).xlsx';
const childrenFile = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (3) (1).xlsx';
const arFile = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (5).xlsx';

const premierRows = readWorkbookRows(new Uint8Array(fs.readFileSync(premierFile)));
const childrenRows = readWorkbookRows(new Uint8Array(fs.readFileSync(childrenFile)));
const arRows = readWorkbookRows(new Uint8Array(fs.readFileSync(arFile)));

const result = buildStatement({ premierRows, childrenRows, arRows, month: 'June', year: 2026 });

console.log('=== JUNE SUMMARY ===');
console.log(`Premier Pre-Tax: $${result.summary.premierPreTax}`);
console.log(`Premier With Tax: $${result.summary.premierWithTax}`);
console.log(`Children Pre-Tax: $${result.summary.childrenPreTax}`);
console.log(`Children With Tax: $${result.summary.childrenWithTax}`);
console.log(`Monthly Total With Tax: $${result.summary.monthlyTotalWithTax}`);
console.log(`Open Invoices (from AR): ${result.summary.openInvoices}`);
console.log('');

console.log('=== OFFICES IN BILLING DATA ===');
console.log('Premier offices:');
result.billing.premier.offices.forEach(o => {
  console.log(`  ${o.office}: ${o.invoices} invoices, $${o.withTax}`);
});

console.log('\nChildren offices:');
result.billing.children.offices.forEach(o => {
  console.log(`  ${o.office}: ${o.invoices} invoices, $${o.withTax}`);
});

console.log('\n=== ANALYZING INVOICE NUMBERS ===');
const premierInvoices = new Map();
const childrenInvoices = new Map();

// Extract invoice numbers from premier offices
result.billing.premier.offices.forEach(office => {
  office.items.forEach(item => {
    if (item.num != null) {
      if (!premierInvoices.has(item.num)) {
        premierInvoices.set(item.num, []);
      }
      premierInvoices.get(item.num).push(office.office);
    }
  });
});

// Extract invoice numbers from children offices
result.billing.children.offices.forEach(office => {
  office.items.forEach(item => {
    if (item.num != null) {
      if (!childrenInvoices.has(item.num)) {
        childrenInvoices.set(item.num, []);
      }
      childrenInvoices.get(item.num).push(office.office);
    }
  });
});

const premierNums = new Set(premierInvoices.keys());
const childrenNums = new Set(childrenInvoices.keys());
const intersection = new Set([...premierNums].filter(n => childrenNums.has(n)));

console.log(`Premier unique invoice numbers: ${premierNums.size}`);
console.log(`Children unique invoice numbers: ${childrenNums.size}`);
console.log(`Invoice numbers in BOTH files (cross-company): ${intersection.size}`);

if (intersection.size > 0) {
  console.log(`  Examples: ${Array.from(intersection).slice(0, 5).join(', ')}`);
}

// Check for duplicates within each company
let premierDuplicates = 0;
premierInvoices.forEach((offices, num) => {
  if (offices.length > 1) premierDuplicates++;
});

let childrenDuplicates = 0;
childrenInvoices.forEach((offices, num) => {
  if (offices.length > 1) childrenDuplicates++;
});

console.log(`\nInvoice numbers appearing multiple times within Premier: ${premierDuplicates}`);
console.log(`Invoice numbers appearing multiple times within Children: ${childrenDuplicates}`);

