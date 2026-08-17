# Data pipeline

Fetches real price history for three asset classes and computes the statistics that drive the
Monte Carlo simulation in the web app.

All three assets are **USD-denominated**, so the pipeline computes every statistic **twice** —
once on the raw USD levels, and once on the same levels multiplied by USDTHB. The web app can
therefore switch between an American investor's view and a Thai investor's view, where the
second carries currency risk on top of the asset itself.

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
python fetch_data.py               # Fetch from 2006-07-16 to today (20-year window, see DEFAULT_START)
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

Five series are fetched: three investable assets, the exchange rate used for the THB basis, and
a short rate used as the USD risk-free rate.

### 1. Gold — global price in USD

- `GC=F` — COMEX Gold Futures continuous contract, from Yahoo Finance
- If `GC=F` is unavailable the script falls back to `GLD`, then `IAU`

**Limitation:** this is the global gold price, not the domestic 96.5% bullion price quoted by the
Gold Traders Association, which has no public API for historical data. Domestic prices track it
closely but differ by premium and purity.

There is also no free, scriptable source for true spot (XAU/USD): Yahoo has no `XAUUSD=X` ticker,
stooq requires solving a JavaScript proof-of-work challenge, and FRED has removed its LBMA gold
fixing series (`GOLDPMGBD228NLBM` now returns 404). Front-month futures is the closest available
stand-in and typically differs from spot by under 1%.

### 2. US equity — S&P 500 tracker ETF

- `SPY` — SPDR S&P 500 ETF Trust. `auto_adjust=True` makes it a total-return series including
  dividends, net of the fund's expense ratio.
- Fallbacks: `IVV`, then `VOO`, then `^GSPC`.

**Why an ETF rather than the index:** `^GSPC` is a *price* index — it excludes dividends, worth
roughly 2%/year over this window. An S&P 500 ETF is what an investor can actually hold, so its
total return is the honest figure. The first three tickers are all flagged `isProxy: false`;
only the `^GSPC` last resort is flagged as a proxy, precisely because of the missing dividends.

### 3. Bonds — US 10-year Treasury yield

- `DGS10` from FRED (Federal Reserve Bank of St. Louis), via the public CSV endpoint — no API key
  required.

**Limitation:** the yield series is exact, but the *total-return index* built from it (see below)
is a reconstruction from duration and convexity, not the NAV of a tradable bond fund. It
therefore excludes fund fees and bid-ask spreads, and the asset stays flagged as a proxy in the
web app for that reason.

### 4. USDTHB — exchange rate for the THB basis

- `USDTHB=X` from Yahoo Finance, falling back to `THB=X`.

Not an investable asset. It is the multiplier that turns all three USD series into their THB
counterparts, and it is the sole reason the two statistic sets differ.

### 5. Risk-free rate — US 3-month T-bill

- `DGS3MO` from FRED.

Averaged over the same window as the statistics to give the USD risk-free rate used in the Sharpe
ratio and for growing the cash reserve. The THB risk-free rate remains an assumption (1.5%),
since no free historical source for Thai policy rates is reachable — see `RISK_FREE_THB` in
`compute_stats.py`.

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

The result has roughly 7.5% annualised volatility on the USD basis, consistent with a real bond
ETF such as `IEF` (7–10 year, about 6.5%) and slightly higher as expected, since its duration is
longer.

### The two currency bases

```
USD basis:  level(t)
THB basis:  level(t) × usdthb(t)
```

The multiplication is applied to the whole frame at once, at the same observation dates, so both
bases are guaranteed to come from one set of data points. Statistics are then computed
independently on each — you cannot convert a volatility or a correlation after the fact, because
FX is a second source of variance and a common factor across all three assets.

The effect is not uniform, which is the interesting part:

| | Gold | US equity | US Treasury |
| --- | --- | --- | --- |
| Volatility, USD basis | 17.2% | 15.3% | 7.5% |
| Volatility, THB basis | 15.8% | 14.8% | 9.8% |

FX *reduces* gold's volatility for a Thai investor (the baht tends to weaken when gold rallies,
partly offsetting) but *raises* the bond's, because currency noise is large relative to a low
-volatility asset. Correlations move too — gold vs US equity is +0.08 in USD and −0.05 in THB.

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
only 7 and 13 points. The chart therefore uses a weekly series (1,048 points; 26 points over
6 months), while **statistics stay monthly** because monthly returns give more stable volatility
and correlation estimates and are less sensitive to weekly noise.

`build_frames(rule, periods_per_year)` produces both frequencies — and both currency bases —
from the same code path; the bond index computes its carry per period according to the frequency
passed in.

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
  "meta": {
    "generatedAt": "...", "normalizedBase": 100,
    "baseCurrency": "usd",         // everything below is USD; THB is derived in the web app
    "dataRange": { ... }
  },
  "latest": {                      // real price levels, latest point only, both currencies
    "date": "2026-08-13",
    "goldUsdPerOz": 4437.3, "goldThbPerOz": 146785.89,
    "equityCloseUsd": 776.34, "equityCloseThb": 25681.33,
    "bondYieldPct": 4.63, "usdthb": 33.08
  },
  "series": [                      // weekly (Friday close) — drives the chart
    { "date": "2006-07-21", "gold": 100, "equity": 100, "bond": 100, "usdthb": 37.88 }
  ],
  "monthly": [                     // monthly — drives the per-asset data tables
    {
      "date": "2006-07-31",
      "gold": 100, "equity": 100, "bond": 100,
      "goldUsdPerOz": 634.2, "equityCloseUsd": 88.5,
      "bondYieldPct": 4.99, "usdthb": 37.82
    }
  ]
}
```

**Only the USD basis is stored.** The THB basis is derived in the web app (`lib/currency.ts`)
from the per-row `usdthb` field:

```
THB price level(t) = USD level(t) × usdthb(t)
THB index(t)       = USD index(t) × usdthb(t) / usdthb(first row)
```

Storing both would double a file that is bundled into the page for no new information. The
derivation reproduces the pipeline's own THB statistics to within 0.001 percentage points, so the
chart and the statistics tables cannot disagree.

`series` carries only the index values the chart needs; keeping the real price levels out of it
and in `latest` instead is what keeps the bundled file reasonably small.

### `../web/data/asset-stats.json`

```jsonc
{
  "meta": {
    "dataRange": { ... },
    "currencies": ["usd", "thb"],
    "defaultCurrency": "thb",
    "currencyLabels": { "usd": { "th": "ดอลลาร์", "code": "USD", "symbol": "$" }, ... },
    "latestFxRate": 33.08,     // used to convert amounts the user typed when switching
    "currencyNote": "...", "riskFreeRateNote": "...", "returnConvention": "..."
  },
  "byCurrency": {
    "usd": {
      "riskFreeRate": 0.0166,  // averaged DGS3MO over the window
      "assets": {
        "gold": {
          "annualReturn": 0.1078,   // arithmetic — the Monte Carlo input
          "annualVolatility": 0.1718,
          "cagr": 0.0971,
          "maxDrawdown": -0.4201,
          "bestYear": { ... }, "worstYear": { ... },
          "calendarYearReturns": { "2007": ..., ... }
        },
        "equity": { ... }, "bond": { ... }
      },
      "trailingReturns": [ ... ],  // 1y / 5y / 10y / all, per asset
      "correlation": { "gold": { "equity": 0.081, ... }, ... }
    },
    "thb": { ... }             // same shape, riskFreeRate 0.015
  },
  "sources": { ... },          // ticker, provider, range, isProxy flag, limitations
  "riskFreeSource": { ... },   // the DGS3MO series metadata
  "disclaimers": [ ... ]       // rendered directly in the site footer
}
```

Everything under `byCurrency` is currency-specific; everything outside it is not. The web app
reads exactly one `byCurrency` block at a time, chosen by the toggle in the nav — including the
means, volatilities, correlations and risk-free rate fed into the Monte Carlo.

`sources` and `disclaimers` are written so the web app can render them verbatim. If a source
changes — for example a fallback ticker kicks in — the site's wording updates automatically.
