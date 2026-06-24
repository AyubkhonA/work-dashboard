# Ortho Lab — Monthly Statement: Build Plan

Single-purpose internal tool. One operator uploads 3 real `.xlsx` files; the system
parses them, applies per-office sales tax, computes every dashboard number, regenerates
the two finalized "with TAX" workbooks in the exact established format, and renders a
**dark financial-terminal** dashboard with copy-ready email text and downloadable charts.
**No mock data anywhere** — every number is computed from the uploaded bytes.

> Ground truth verified 2026-06-19 against the real May files. All four reference numbers
> reconcile: Premier+Sedation w/tax **$75,020.73**, Children's **$3,532.71**, monthly total
> **$78,553.44**, AR **$148,851.90**.

---

## Current state (shipped)

- `tools/parse_may.py` — real openpyxl parser. Groups invoice line items by office,
  applies per-office tax, parses the AR aging file (header-based column detection),
  computes group totals + aging buckets + top products. Emits `client/src/data/may2026.json`.
- `client/` — Vite + React dark-terminal dashboard reading the real parsed JSON.
  Tabs: Overview (KPIs + tax reconciliation + AR-by-group), Offices (sortable, per-office
  rate), AR Aging (top-15, aging buckets, group split), Products (top-5, excl. Bands/Digital Model).

## Verified facts (the hard-won ground truth)

### Per-office tax rates — keyed on exact `(company, office)`, NOT per-city
- Premier/Sedation: **Vacaville 8.125%**, **Yuba City 7.25%**, all others **8.5%**.
- Children's: **Antioch 9.75%**, **Glendora 10.25%**, **San Diego 7.25%**, **Oxnard 7.75%**, all others **8.5%**.
- Gotcha: Premier Glendora = 8.5% but Children's Glendora = 10.25%. Same city, different rate by company.

### Raw invoice export layout (the QuickBooks "Report_from_..." files)
Data in odd columns, blank spacers in even: Type=E, Date=G, Num=I, Memo=K, Name(office)=M,
Patient=O, Item=Q, Qty=S, SalesPrice=U, Amount=W, Balance=Y. Line amount =
`ROUND(IF(ISNUMBER(price), qty*price, qty), 5)`. Office banner row = name in col B, data cols blank.
Subtotal row = `Total <office>` in col B.

### Finalized "with TAX" workbook layout (PremMay2026 / Children_sMay2026)
2-column left shift, drop Type/Memo/Balance → Date=E, Num=G, Name=I, Patient=K, Item=M,
Qty=O, SalesPrice=Q, Amount=S. Per office: subtotal row (`O,S = ROUND(SUM,5)`), then a
**tax row** at subtotal+1 (`S = =S{sub}+S{sub}*{rate}%`, `T = "with TAX"`), then a blank
spacer, then grand `TOTAL` (A="TOTAL"; **O sums pre-tax subtotal rows, S sums the with-tax rows**).
Fonts: Arial 8 throughout; "with TAX" label = Aptos Narrow bold right, size 10 Premier / 11 Children's.
Number formats: `#,##0.00;\-#,##0.00` (money), `#,##0.00###;\-#,##0.00###` (qty), `mm/dd/yyyy` (date).

### AR aging file
Header-based columns (Customer, Open Balance, Aging). **Skip rows with blank Customer**
(QB total row) — this is what reconciles the total. Group by name prefix
(Premier/Sedation vs Children's). Bucket by Aging days: Current(≤0), 1-30, 31-60, 61-90, 90+.
The file that matches May month-end ($148,851.90) is `...-6.xlsx`; `(3).xlsx` is a June snapshot ($179,544.91).

### Performance / openpyxl gotchas
- Read with `ws.iter_rows(values_only=True)`, NEVER `read_only=True` + random `ws.cell()` (hangs >3min).
- openpyxl drops cached formula values on save → re-run a headless recalc (`soffice --headless --convert-to xlsx`) so `data_only` readers don't see `None`.
- Rebuild tax-row `Alignment` from a fresh object to avoid openpyxl "general" drift.

---

## Next phase — the real upload → process → export pipeline

Recommended: **Python FastAPI + openpyxl backend** (keep the intricate Excel transform in
openpyxl where the precision lives), **Vite + React** frontend (dark terminal, already built).
No database — one in-memory run object + files on disk per upload.

### Backend modules (`server/app/`)
- `tax.py` — rate maps + `rate_for / with_tax / rate_literal`.
- `parser_invoice.py` — `parse_invoice()` via `iter_rows`, 5-rule row classifier.
- `parser_ar.py` — `parse_ar()`, skip blank-Customer, group + aging buckets.
- `engine.py` — `apply_tax`, `top_products`, `build_statement`, `build_email_text`.
- `workbook.py` — `build_finalized_workbook()` (top-down emit so SUM ranges/grand-total refs are
  correct by construction; apply fonts/numfmts/widths), `recalc_with_libreoffice()`.
- `workbook_verify.py` — column-by-column diff vs golden file; must be zero diffs.
- `main.py` — FastAPI: `POST /api/statement` (multipart 3 files + month/year), `GET /api/statement/{id}`,
  `GET /api/download/{id}/{premier.xlsx|childrens.xlsx|email.txt|charts.zip}`.

### Email summary template (verbatim, offices sorted high→low by with-tax)
```
📊 <MONTH> 2026 – Monthly Summary

Premier Orthodontics & Sedation

<Office> — $<amount with tax>
...
Subtotal : $<sum>


Children's Choice

<Office> — $<amount with tax>
...
Subtotal : $<sum>


💰 Total for <Month> 2026

$<combined total>


Overall Total Due as of <Month-end>, 2026

Premier Orthodontics & Sedation: $<AR total>
Children's Choice: $<AR total>

Grand Total Due: $<AR grand total>


Thanks!
Khan
```

### Charts (5)
1. Top 15 offices — share of balance (pie) · 2. Top 15 by balance (h-bar) ·
3. All offices ranked (h-bar) · 4. Top 10 — share of total (donut) — all from AR open balances.
5. Top 5 most-ordered appliances (triple metric: Orders Placed / Units Sold / Revenue),
**excluding Bands and Digital Model** — from invoice line items.
Orders Placed = # of line items; Units Sold = Σ qty.

### Build order
1. Backend core (parse→tax→numbers) + reconciliation test gated on the verified numbers above.
2. Workbook regeneration + golden-file verification (zero diffs).
3. FastAPI endpoints + download routes.
4. Frontend: upload screen (3 dropzones + month/year) → dashboard (already built) reading live API.
5. Charts + PNG export → charts.zip. End-to-end on the real files.
