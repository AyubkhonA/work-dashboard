# Ortho Lab — Monthly Statement

A dark financial-terminal dashboard for Advanced Orthodontics Lab's monthly AR & sales
reporting. Parses the real QuickBooks invoice + AR exports, applies per-office sales tax,
and renders every figure live — **no mock data**.

## Run it

```bash
# 1. Parse the real source files → client/src/data/may2026.json
python3 tools/parse_may.py

# 2. Start the dashboard
cd client && npm install && npm run dev
# → http://localhost:3000
```

## Status

- ✅ Real parser (`tools/parse_may.py`) — penny-accurate to the reference:
  Premier+Sedation **$75,020.73**, Children's **$3,532.71**, total **$78,553.44**, AR **$148,851.90**.
- ✅ Dark-terminal dashboard — Overview / Offices / AR Aging / Products tabs.
- ⏳ Next: upload → process → export pipeline (regenerate finalized `.xlsx`, email text, charts).
  See [BUILD_PLAN.md](BUILD_PLAN.md).

## Layout

```
tools/parse_may.py        real openpyxl parser → JSON
client/                   Vite + React dark-terminal dashboard
  src/data/may2026.json   real parsed May data (generated)
  src/components/         Overview, Offices, AR, Products
  src/terminal.css        dark-terminal design system
BUILD_PLAN.md             verified ground truth + path to the full app
```
