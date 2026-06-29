import fs from 'fs';
import * as XLSX from 'xlsx';

const childrenFile = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (3) (1).xlsx';

const wb = XLSX.read(new Uint8Array(fs.readFileSync(childrenFile)), { type: 'array', cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: true, defval: null });

console.log('=== CHILDREN FILE OFFICE NAMES ===');
const cName = 1; // Assuming Name is column B

const officeSet = new Set();
for (let i = 1; i < rows.length; i++) {
  const row = rows[i] || [];
  const office = row[cName];
  if (typeof office === 'string' && office.trim()) {
    officeSet.add(office.trim());
  }
}

const offices = Array.from(officeSet).sort();
const childrenCount = offices.filter(o => o.startsWith('Children')).length;
const premierCount = offices.filter(o => o.startsWith('Premier') || o.startsWith('Sedation')).length;

console.log(`Total unique offices: ${offices.length}`);
console.log(`Starting with "Children": ${childrenCount}`);
console.log(`Starting with "Premier"/"Sedation": ${premierCount}`);
console.log('\nAll offices in Children file:');
offices.forEach(o => console.log(`  ${o}`));

