// Simulate the company-detection logic from parseStatement.js

const childrenFile = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (3) (1).xlsx';
const premierFile = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (2) (1).xlsx';

// Mock office data
const childrenOffices = [
  "Children's Choice Antioch",
  "Children's Choice Bakersfield",
  "Children's Choice Glendora",
  "Children's Choice Lodi",
  "Children's Choice Merced",
  "Children's Choice Moreno Valley",
  "Children's Choice Oxnard",
  "Children's Choice San Bernardino",
  "Children's Choice San Diego",
  "Children's Choice Sedation NLV",
  "Children's Choice Sedation Pahrump",
  "Children's Choice Stockton",
  "Children's Choice Vallejo",
  "Children's Choice Visalia",
  "Premier Orthodontics Antioch",
  "Premier Orthodontics Bakersfield",
  "Premier Orthodontics Chico",
  "Premier Orthodontics Fresno",
  "Premier Orthodontics Glendora",
  "Premier Orthodontics Howe",
  "Premier Orthodontics Merced",
  "Premier Orthodontics Mission",
  "Premier Orthodontics Modesto",
  "Premier Orthodontics Moreno Valley",
  "Premier Orthodontics Oxnard",
  "Premier Orthodontics Redding",
  "Premier Orthodontics Roseville",
  "Premier Orthodontics San Bernardino",
  "Premier Orthodontics San Diego",
  "Premier Orthodontics Stockton",
  "Premier Orthodontics Truxel",
  "Premier Orthodontics Vacaville",
  "Premier Orthodontics Vallejo",
  "Premier Orthodontics Victorville",
  "Premier Orthodontics Visalia",
  "Premier Orthodontics Yuba City",
  "Sedation Anthem",
  "Sedation NLV",
  "Sedation Pahrump",
  "Sedation Summerlin",
];

const premierOffices = [
  "Premier Orthodontics Antioch",
  "Premier Orthodontics Bakersfield",
  "Premier Orthodontics Chico",
  "Premier Orthodontics Fresno",
  "Premier Orthodontics Glendora",
  "Premier Orthodontics Howe",
  "Premier Orthodontics Merced",
  "Premier Orthodontics Mission",
  "Premier Orthodontics Modesto",
  "Premier Orthodontics Moreno Valley",
  "Premier Orthodontics Oxnard",
  "Premier Orthodontics Redding",
  "Premier Orthodontics Roseville",
  "Premier Orthodontics San Bernardino",
  "Premier Orthodontics San Diego",
  "Premier Orthodontics Stockton",
  "Premier Orthodontics Truxel",
  "Premier Orthodontics Vacaville",
  "Premier Orthodontics Vallejo",
  "Premier Orthodontics Victorville",
  "Premier Orthodontics Visalia",
  "Premier Orthodontics Yuba City",
  "Sedation Anthem",
  "Sedation NLV",
  "Sedation Pahrump",
  "Sedation Summerlin",
];

function detectCompany(names, companyHint) {
  const childrenish = names.filter((n) => n.startsWith("Children")).length;
  const company = names.length && childrenish > names.length / 2 ? 'children'
    : (childrenish === names.length && names.length ? 'children' : (companyHint || 'premier'));
  return { company, childrenish, total: names.length };
}

console.log('=== COMPANY DETECTION LOGIC ===');
console.log('\nChildren file:');
const childResult = detectCompany(childrenOffices, 'children');
console.log(`  Names: ${childrenOffices.length} offices`);
console.log(`  Starting with "Children": ${childResult.childrenish}`);
console.log(`  Ratio: ${childResult.childrenish}/${childResult.total} = ${(childResult.childrenish/childResult.total).toFixed(2)}`);
console.log(`  > 50%? ${childResult.childrenish > childResult.total / 2}`);
console.log(`  Detected company: "${childResult.company}"`);
console.log(`  Comment: 14 "Children" offices out of 40 total = 35%, which is NOT > 50%`);
console.log(`  So first condition (childrenish > names.length / 2) is FALSE`);
console.log(`  Second condition (childrenish === names.length) is FALSE (14 !== 40)`);
console.log(`  Falls through to companyHint: "children" (CORRECT)`);

console.log('\nPremier file:');
const premResult = detectCompany(premierOffices, 'premier');
console.log(`  Names: ${premierOffices.length} offices`);
console.log(`  Starting with "Children": ${premResult.childrenish}`);
console.log(`  Ratio: ${premResult.childrenish}/${premResult.total}`);
console.log(`  > 50%? ${premResult.childrenish > premResult.total / 2}`);
console.log(`  Detected company: "${premResult.company}"`);

console.log('\n=== THE REAL PROBLEM ===');
console.log('The Children file has ALL 26 Premier offices in addition to 14 Children offices.');
console.log('The code bases company detection on office NAMES, not invoice deduplication.');
console.log('');
console.log('When the same office name appears in both files:');
console.log('  - Its invoice numbers are merged into ONE office entry in the billing data');
console.log('  - But both file parsers independently count their line items');
console.log('  - The second parser (children) overwrites/sums with the first (premier)');
console.log('  - This inflates the invoice count AND the amounts');
console.log('');
console.log('Example: Premier Orthodontics Antioch');
console.log('  - Premier file: 36 invoices, $3620 pre-tax');
console.log('  - Children file: 36 invoices, $3620 pre-tax (SAME DATA!)');
console.log('  - Result in billing.children: 36 invoices (not 72)');
console.log('  - But pre-tax: $3620 is summed correctly');
console.log('  - Tax rate: applied as CHILDREN rate (9.75%) instead of PREMIER rate (8.5%)');
console.log('  - Children total: ~$82,483 (inflated by wrong tax + Premier offices miscategorized)');

