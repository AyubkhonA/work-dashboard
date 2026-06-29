import { buildStatement } from './src/lib/parseStatement.js';

// Simulate calling buildStatement with empty AR rows (or none)
const result = buildStatement({
  premierRows: [['Name', 'Qty', 'Sales Price'], ['Test Office', 1, 100]],
  childrenRows: [['Name', 'Qty', 'Sales Price']],
  arRows: [], // Empty AR
  month: 'Test',
  year: 2026
});

console.log('AR object with empty arRows:');
console.log('ar:', result.ar);
console.log('ar.asOf:', result.ar.asOf);
console.log('ar.openInvoices:', result.ar.openInvoices);
