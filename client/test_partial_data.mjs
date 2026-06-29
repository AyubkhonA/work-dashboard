// Simulate a partial/corrupted data object being loaded from localStorage
const partialData = {
  month: 'May',
  year: 2026,
  summary: { monthlyTotalWithTax: 100 },
  offices: [],
  // ar is MISSING
};

// Simulate what Dashboard.jsx line 53 does:
try {
  console.log(`as of ${partialData.ar.asOf} · ${partialData.ar.openInvoices} open invoices`);
} catch (e) {
  console.error('ERROR:', e.message);
  console.error('This would crash the dashboard!');
}

// Simulate what Dashboard.jsx line 89 does:
try {
  const output = `...${partialData.ar.openInvoices} open AR invoices · AR as of ${partialData.ar.asOf}`;
} catch (e) {
  console.error('ERROR:', e.message);
  console.error('This would crash the footer!');
}
