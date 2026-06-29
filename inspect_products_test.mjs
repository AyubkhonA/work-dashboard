import fs from 'fs';
import * as XLSX from 'xlsx';

const files = [
  '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (2) (1).xlsx',
  '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (3) (1).xlsx',
];

const fileLabels = ['Premier (file 2)', 'Children (file 3)'];

for (const [idx, path] of files.entries()) {
  try {
    const data = fs.readFileSync(path);
    const wb = XLSX.read(data, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
    
    console.log(`\n=== ${fileLabels[idx]} ===`);
    
    // Find column indices
    const header = rows[0] || [];
    const cMemo = header.findIndex(h => typeof h === 'string' && h.trim() === 'Memo');
    const cPrice = header.findIndex(h => typeof h === 'string' && h.trim() === 'Sales Price');
    const cQty = header.findIndex(h => typeof h === 'string' && h.trim() === 'Qty');
    
    const products = new Map();
    for (let i = 1; i < Math.min(rows.length, 100); i++) {
      const row = rows[i] || [];
      const memo = cMemo >= 0 ? row[cMemo] : null;
      const price = cPrice >= 0 ? row[cPrice] : null;
      const qty = cQty >= 0 ? row[cQty] : null;
      
      if (memo) {
        const key = String(memo).toLowerCase();
        if (key.includes('band') || key.includes('digital')) {
          if (!products.has(memo)) {
            products.set(memo, []);
          }
          products.get(memo).push({ price, qty });
        }
      }
    }
    
    console.log(`Found ${products.size} excluded items:`);
    for (const [name, records] of products) {
      const prices = records.map(r => r.price);
      const qtys = records.map(r => r.qty);
      console.log(`  "${name}": price=${JSON.stringify(prices)}, qty=${JSON.stringify(qtys)}, count=${records.length}`);
    }
  } catch (e) {
    console.error(`Error reading ${path}:`, e.message);
  }
}
