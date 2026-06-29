import fs from 'fs';
import { readWorkbookRows, buildStatement } from './src/lib/parseStatement.js';

const premierPath = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (2) (1).xlsx';
const childrenPath = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (3) (1).xlsx';
const arPath = '/Users/khan/Downloads/Report_from_Advanced_Orthodontics_Lab_of_San_Francisco (5).xlsx';

const round5 = (x) => Math.round(x * 1e5) / 1e5;
const round2 = (x) => Math.round(x * 100) / 100;

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
  
  // Calculate the sum two different ways to detect the rounding difference
  const premierWithTaxOffices = statement.billing.premier.offices;
  const childrenWithTaxOffices = statement.billing.children.offices;
  
  // Method 1: Sum at full precision then round to 2dp (what dashboard does for summary)
  const sum1 = (arr) => arr.reduce((a, o) => a + o.withTax, 0);
  const premSum1Full = sum1(premierWithTaxOffices);
  const premSum1Rounded = round2(premSum1Full);
  const childSum1Full = sum1(childrenWithTaxOffices);
  const childSum1Rounded = round2(childSum1Full);
  
  console.log('=== ROUNDING PATH 1: sum at full precision, then round2 ===');
  console.log('Premier: sum full=' + premSum1Full.toFixed(15));
  console.log('Premier: after round2=' + premSum1Rounded);
  console.log('Children: sum full=' + childSum1Full.toFixed(15));
  console.log('Children: after round2=' + childSum1Rounded);
  console.log('Monthly total (method 1)=' + round2(premSum1Rounded + childSum1Rounded));
  
  // Method 2: Sum round5 values directly (what code actually does at lines 224-227)
  const sumRound5 = (arr) => {
    let sum = 0;
    for (const o of arr) {
      sum += o.withTax; // o.withTax is already round5'd by line 106
    }
    return sum;
  };
  
  const premSum2 = sumRound5(premierWithTaxOffices);
  const premSum2Rounded = round2(premSum2);
  const childSum2 = sumRound5(childrenWithTaxOffices);
  const childSum2Rounded = round2(childSum2);
  
  console.log('\n=== ROUNDING PATH 2: sum pre-round5 values, then round2 ===');
  console.log('Premier: sum of round5=' + premSum2.toFixed(15));
  console.log('Premier: after round2=' + premSum2Rounded);
  console.log('Children: sum of round5=' + childSum2.toFixed(15));
  console.log('Children: after round2=' + childSum2Rounded);
  console.log('Monthly total (method 2)=' + round2(premSum2Rounded + childSum2Rounded));
  
  // Check if they differ
  console.log('\n=== DIFFERENCE ANALYSIS ===');
  console.log('Premier round2 difference: ' + (premSum1Rounded - premSum2Rounded));
  console.log('Children round2 difference: ' + (childSum1Rounded - childSum2Rounded));
  
  // Show which offices have round5 error accumulation
  console.log('\n=== PREMIER OFFICES - withTax values (sample) ===');
  premierWithTaxOffices.slice(0, 5).forEach((o, i) => {
    console.log(`${i}: ${o.office} = ${o.withTax}`);
  });
  
  console.log('\n=== CHILDREN OFFICES - withTax values (sample) ===');
  childrenWithTaxOffices.slice(0, 5).forEach((o, i) => {
    console.log(`${i}: ${o.office} = ${o.withTax}`);
  });
  
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
