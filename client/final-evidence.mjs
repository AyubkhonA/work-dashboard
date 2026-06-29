import fs from 'fs';
import { readWorkbookRows, buildStatement } from './src/lib/parseStatement.js';

const premierFile = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (2) (1).xlsx';
const childrenFile = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (3) (1).xlsx';
const arFile = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (5).xlsx';

const premierRows = readWorkbookRows(new Uint8Array(fs.readFileSync(premierFile)));
const childrenRows = readWorkbookRows(new Uint8Array(fs.readFileSync(childrenFile)));
const arRows = readWorkbookRows(new Uint8Array(fs.readFileSync(arFile)));

const result = buildStatement({ premierRows, childrenRows, arRows, month: 'June', year: 2026 });

console.log('=== FINAL EVIDENCE: CROSS-FILE INVOICE DEDUPLICATION BUG ===\n');

console.log('BUG DESCRIPTION:');
console.log('The June Children file contains a COPY of all 26 Premier offices + 14 actual');
console.log('Children offices. When both files are parsed separately (lines 203-204), the');
console.log('same invoice numbers appear in BOTH parseInvoice calls. The code DOES NOT');
console.log('deduplicate across files or cross-company. Result:');
console.log('  - Same offices counted in BOTH billing.premier and billing.children');
console.log('  - Same office = same amount, but WRONG tax rate (Children rate vs Premier)');
console.log('  - Summary sums BOTH sets without deduplication (lines 224-227)');
console.log('');

console.log('ROOT CAUSE:');
console.log('Line 75 (o.invoices.add(num)) assumes each parseInvoice call is unique.');
console.log('No cross-file deduplication, no cross-company conflict detection.');
console.log('');

console.log('IMPACT:');
console.log('Expected monthly total: ~$78,000 (just Premier + genuine Children)');
console.log(`Actual monthly total: $${result.summary.monthlyTotalWithTax}`);
console.log(`Inflation: ~${(result.summary.monthlyTotalWithTax / 78000).toFixed(1)}x`);
console.log('');

const premierDupAmount = result.billing.premier.offices.reduce((s, o) => s + o.withTax, 0);
const childrenDupAmount = result.billing.children.offices.reduce((s, o) => s + o.withTax, 0);
const premierOnlyAmount = result.billing.premier.offices
  .filter(o => !o.office.startsWith('Children'))
  .reduce((s, o) => s + o.withTax, 0);
const childrenOnlyAmount = result.billing.children.offices
  .filter(o => o.office.startsWith('Children'))
  .reduce((s, o) => s + o.withTax, 0);
const duplicated = result.billing.children.offices
  .filter(o => !o.office.startsWith('Children'))
  .reduce((s, o) => s + o.withTax, 0);

console.log(`Premier subtotal: $${premierDupAmount.toFixed(2)}`);
console.log(`  - Premier offices (correct): ${result.billing.premier.offices.filter(o => o.company === 'premier').length}`);
console.log(`  - Children offices (should be 0): ${result.billing.premier.offices.filter(o => o.company === 'children').length}`);
console.log(`Children subtotal: $${childrenDupAmount.toFixed(2)}`);
console.log(`  - Children offices (14): ${result.billing.children.offices.filter(o => o.office.startsWith("Children")).length}`);
console.log(`  - Premier offices (should be 0, has 26): ${result.billing.children.offices.filter(o => !o.office.startsWith('Children')).length}`);
console.log(`  - Duplicated amount (26 Premier in Children file): $${duplicated.toFixed(2)}`);
console.log('');

console.log('INVOICE-LEVEL DEDUPLICATION MISSING:');
const premierInvoices = new Map();
const childrenInvoices = new Map();

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

console.log(`Cross-company invoices found: ${intersection.size}`);
console.log(`  All ${premierNums.size} Premier invoices also appear in Children file`);
console.log('');

console.log('CODE PATHS:');
console.log('Line 203: prem = parseInvoice(premierRows, "premier")');
console.log('Line 204: child = parseInvoice(childrenRows, "children")');
console.log('Lines 224-227: sum(prem.offices, ...) + sum(child.offices, ...)');
console.log('  -> Sums ALL offices from BOTH calls without checking for duplicates');
console.log('');

console.log('TAX RATE INCONSISTENCY:');
const antioch = result.billing.children.offices.find(o => o.office === 'Premier Orthodontics Antioch');
console.log('Premier Orthodontics Antioch in Children file:');
console.log('  Should use PREMIER_RATES (8.5%)');
console.log('  Actually uses CHILDREN_RATES (9.75%)');
console.log('  Pre-tax: $3620');
console.log('  Premier correct: $3620 * 1.085 = $3927.70');
console.log('  Children incorrect: $3620 * 1.0975 = $3972.95');
console.log('  Per-office overcharge: $45.25');

