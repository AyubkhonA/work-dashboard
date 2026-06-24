export const money = (n) =>
  '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const money0 = (n) =>
  '$' + Math.round(n ?? 0).toLocaleString('en-US');

export const pct = (n) => (n ?? 0).toFixed(n % 1 === 0 ? 0 : 3) + '%';

export const int = (n) => (n ?? 0).toLocaleString('en-US');

// short company tag from office name
export const tagOf = (office) => {
  if (office.startsWith('Sedation')) return 'SED';
  if (office.startsWith('Premier')) return 'PREM';
  if (office.startsWith("Children")) return 'CHC';
  return '—';
};

// strip the leading brand words so the table reads cleanly
export const shortOffice = (office) =>
  office
    .replace(/^Premier Orthodontics\s*/, '')
    .replace(/^Children'?s Choice\s*/, '')
    .replace(/^Sedation\s*/, 'Sedation ')
    .trim() || office;

// full office name, with "Orthodontics" abbreviated to "Ortho" to fit (e.g. "Premier Ortho Mission")
export const officeName = (office) =>
  office.replace(/^Premier Orthodontics\s+/, 'Premier Ortho ');
