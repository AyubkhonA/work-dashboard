// Builds the copy-ready monthly email summary in the established format.
const MN = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const moneyPlain = (n) => '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const readableDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-').map(Number);
  return `${MN[m] || ''} ${d}, ${y}`;
};

export function buildEmailText(data) {
  if (!data) return '';
  const { month, year, billing } = data;
  const summary = data.summary || {};
  const ar = data.ar || {};
  const prem = [...(billing?.premier?.offices || [])].sort((a, b) => b.withTax - a.withTax);
  const child = [...(billing?.children?.offices || [])].sort((a, b) => b.withTax - a.withTax);
  const line = (o) => `${o.office} — ${moneyPlain(o.withTax)}`;

  const L = [];
  L.push(`📊 ${month} ${year} – Monthly Summary`, '');
  L.push('Premier Orthodontics & Sedation', '');
  prem.forEach((o) => L.push(line(o)));
  L.push('', `Subtotal : ${moneyPlain(summary.premierWithTax)}`, '', '');
  L.push("Children's Choice", '');
  child.forEach((o) => L.push(line(o)));
  L.push('', `Subtotal : ${moneyPlain(summary.childrenWithTax)}`, '', '');
  L.push(`💰 Total for ${month} ${year}`, '', moneyPlain(summary.monthlyTotalWithTax), '', '');
  L.push(`Overall Total Due as of ${readableDate(ar.asOf) || `${month} ${year}`}`, '');
  L.push(`Premier Orthodontics & Sedation: ${moneyPlain(ar.premierGroup)}`);
  L.push(`Children's Choice: ${moneyPlain(ar.childrenGroup)}`, '');
  L.push(`Grand Total Due: ${moneyPlain(ar.total)}`, '', '');
  L.push('Thanks!', 'Khan');
  return L.join('\n');
}
