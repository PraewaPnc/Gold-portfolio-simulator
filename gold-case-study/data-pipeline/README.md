# Data pipeline

Fetches real price history for three asset classes and computes the statistics that drive the
Monte Carlo simulation in the web app.

The pipeline is split into two independent stages that communicate through CSV files in `raw/`:

| Stage | Script | Responsibility | Output |
| --- | --- | --- | --- |
| 1 | `fetch_data.py` | Download raw data from the internet | `raw/*.csv` + `raw/manifest.json` |
| 2 | `compute_stats.py` | Turn it into statistics and time series | `../web/data/*.json` |

The split means you can change a formula and re-run stage 2 immediately without re-downloading.

---

## Install

Requires Python 3.10+.

```bash
cd data-pipeline
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
python fetch_data.py               # Fetch from 2005-01-01 to today
python compute_stats.py            # Process and write JSON for the web app
```

Both scripts are idempotent — re-run them any time to refresh the data; existing files are
overwritten.

Custom start date:

```bash
python fetch_data.py --start 2010-01-01
```

---

## Sources

### 1. Gold — global price converted to THB

```
Gold price (THB/troy oz) = GC=F (USD/oz) × USDTHB=X
```

- `GC=F` — COMEX Gold Futures continuous contract, from Yahoo Finance
- `USDTHB=X` — USD/THB exchange rate, from Yahoo Finance
- If `GC=F` is unavailable the script falls back to `GLD`, then `IAU`

**Limitation:** this is the global gold price, not the domestic 96.5% bullion price quoted by the
Gold Traders Association, which has no public API for historical data. Domestic prices track it
closely but differ by premium and purity.

There is also no free, scriptable source for true spot (XAU/USD): Yahoo has no `XAUUSD=X` ticker,
stooq requires solving a JavaScript proof-of-work challenge, and FRED has removed its LBMA gold
fixing series (`GOLDPMGBD228NLBM` now returns 404). Front-month futures is the closest available
stand-in and typically differs from spot by under 1%.

### 2. Thai equity — SET50 tracker ETF

- `TDEX.BK` — ThaiDEX SET50 ETF, listed in Bangkok and therefore **already denominated in THB**,
  so no currency conversion is needed. `auto_adjust=True` makes it a total-return series
  including dividends.
- Fallbacks: `BSET50.BK`, then `THD` (iShares MSCI Thailand ETF — priced in USD, converted
  automatically).

**Limitation:** the SET index tickers on Yahoo Finance were tested and none are usable —
`^SET.BK` returns only a single current quote with no history, and `^SETI` and `^SET50` return
nothing at all. SET50 covers the 50 largest listed companies, so it tracks the SET closely but
excludes mid- and small-caps. Its history starts in 2008, which sets the start of the common
window for all three assets.

### 3. Bonds — 10-year government yield (US proxy)

- `DGS10` from FRED (Federal Reserve Bank of St. Louis), via the public CSV endpoint — no API key
  required.

**Limitation:** no free API exists for Thai 10-year government bond yields (ThaiBMA and the Bank
of Thailand both require registration or an API key), so US Treasuries are used instead.
**Every bond figure in this case study is therefore proxy data**, and it is labelled as such in
the web app.

To switch to real Thai data: write `raw/bond_yield.csv` with columns `date,yield_pct` (yield in
percent, e.g. `3.45`) and re-run `compute_stats.py`. No code changes are required.

---

## Methodology notes

### Turning yields into investor returns

A bond yield is **not** the return an investor earns — when yields rise, prices fall. The script
builds a total-return index using the standard carry + duration + convexity decomposition:

```
r(t) = y(t-1)/periods  −  D_mod × Δy  +  0.5 × C × Δy²
```

`D_mod` (modified duration) and `C` (convexity) are recomputed every period from a par bond with
10 years to maturity paying a coupon equal to the prevailing yield — see
`par_bond_duration_convexity`.

The result has roughly 7.5% annualised volatility, consistent with a real bond ETF such as `IEF`
(7–10 year, about 6.5%) and slightly higher as expected, since its duration is longer.

### Arithmetic mean vs CAGR

`asset-stats.json` deliberately carries two different return figures:

- **`annualReturn`** — arithmetic mean of monthly returns × 12. This is the Monte Carlo input,
  because sampling from a normal distribution requires the arithmetic mean to avoid bias.
- **`cagr`** — the compound growth actually realised, used in the reference tables.

`annualReturn` is always higher than `cagr`; the gap is volatility drag and is expected.

### CAGR denominator

N monthly observations span N−1 months of elapsed time, so CAGR is annualised over
`(N−1)/12` years, not `N/12`. The reported `months` field is the elapsed count, so
`months / 12 == years` holds exactly.

### Weekly series for charts, monthly for statistics

The chart offers 6-month and 1-year ranges, which monthly data cannot support — they would show
only 7 and 13 points. The chart therefore uses a weekly series (971 points; 26 points over
6 months), while **statistics stay monthly** because monthly returns give more stable volatility
and correlation estimates and are less sensitive to weekly noise.

`build_frame(rule, periods_per_year)` produces both frequencies from the same code path; the bond
index computes its carry per period according to the frequency passed in.

### Incomplete final month

Resampling to month-end always stamps the last day of the month, even when the underlying data
only runs to mid-month. The script relabels that final point with the real observation date and
**excludes the incomplete month from the statistics** while still showing it in the chart — see
`dataRange.excludedPartialFinalMonth` in the JSON.

---

## Output files

### `../web/data/price-history.json`

```jsonc
{
  "meta": { "generatedAt": "...", "normalizedBase": 100, "dataRange": { ... } },
  "latest": {                      // real price levels, latest point only
    "date": "2026-08-07",
    "goldUsdPerOz": 4340.7,
    "goldThbPerOz": 143677.17,
    "equityClose": 10.64,
    "bondYieldPct": 4.65,
    "usdthb": 33.1
  },
  "series": [                      // weekly (Friday close) — drives the chart
    { "date": "2008-01-04", "gold": 100, "equity": 100, "bond": 100 }
  ],
  "monthly": [                     // monthly — drives the per-asset data tables
    {
      "date": "2008-01-31",
      "gold": 100, "equity": 100, "bond": 100,
      "goldUsdPerOz": 922.7, "goldThbPerOz": 28628.61,
      "equityClose": 3.2768, "bondYieldPct": 3.67
    }
  ]
}
```

`series` carries only the index values the chart needs; keeping the real price levels out of it
and in `latest` instead is what keeps the file bundled into the page reasonably small.

### `../web/data/asset-stats.json`

```jsonc
{
  "meta": { "dataRange": { ... }, "riskFreeRate": 0.015, ... },
  "assets": {
    "gold": {
      "annualReturn": 0.0959,     // arithmetic — the Monte Carlo input
      "annualVolatility": 0.1539,
      "cagr": 0.0875,
      "maxDrawdown": -0.3057,
      "bestYear": { ... }, "worstYear": { ... },
      "calendarYearReturns": { "2008": ..., ... }
    },
    "equity": { ... }, "bond": { ... }
  },
  "trailingReturns": [ ... ],  // 1y / 5y / 10y / all, per asset
  "correlation": { "gold": { "equity": 0.02, ... }, ... },
  "sources": { ... },          // ticker, provider, range, isProxy flag, limitations
  "disclaimers": [ ... ]       // rendered directly in the site footer
}
```

`sources` and `disclaimers` are written so the web app can render them verbatim. If a source
changes — for example a fallback ticker kicks in — the site's wording updates automatically.
