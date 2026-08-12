# Gold Allocation Case Study

A web app answering *"how much gold belongs in a portfolio?"* using real historical prices
rather than assumed figures.

The project has two clearly separated layers:

```
gold-case-study/
├── data-pipeline/          # Data layer — Python
│   ├── fetch_data.py       #   Fetches real price history → raw/*.csv
│   ├── compute_stats.py    #   Processes it → web/data/*.json
│   ├── requirements.txt
│   ├── README.md           #   Source details and calculation methodology
│   └── raw/                #   Raw data (created by fetch_data.py)
│
└── web/                    # Presentation layer — Next.js 14 + TypeScript + Tailwind
    ├── app/
    │   ├── page.tsx                    # Home — case study overview
    │   ├── reference/page.tsx          # Historical data — chart, stats, sources
    │   ├── reference/[asset]/page.tsx  # Per-asset detail and data tables
    │   └── simulation/page.tsx         # Monte Carlo simulation
    ├── components/
    ├── lib/                            # Portfolio maths (kept separate from UI)
    └── data/                           # JSON produced by the data pipeline
```

**The two layers meet at the JSON files in `web/data/`** — the pipeline writes them, the web app
reads them. Every mean, volatility and correlation used in the Monte Carlo simulation therefore
comes from real data.

---

## Getting started

### 1. Run the data pipeline (first time, or to refresh the data)

```bash
cd data-pipeline
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

python fetch_data.py               # Fetch raw data
python compute_stats.py            # Write JSON for the web app
```

The JSON files are committed to the repository, so you can skip this step unless you want
fresher data.

Source details, limitations and formulas are in [`data-pipeline/README.md`](data-pipeline/README.md).

### 2. Run the web app

```bash
cd web
npm install
npm run dev                        # http://localhost:3000
```

Other commands:

```bash
npm run build      # Production build (every page is static)
npm start          # Serve the production build
npm run typecheck  # TypeScript check
```

---

## Data

| Asset | Source | Status |
| --- | --- | --- |
| Gold (THB) | `GC=F` × `USDTHB=X` — Yahoo Finance | Real data (global spot-equivalent price) |
| Thai equity | `TDEX.BK` — ThaiDEX SET50 ETF, Yahoo Finance | **Proxy** for the SET index |
| Bonds | `DGS10` — US 10Y Treasury, FRED | **Proxy** for Thai government bonds |

Coverage: January 2008 to the present — about 18.5 years / 222 months. The start date is set by
the shortest series, the Thai equity ETF.

Statistics are computed from **monthly** data (222 observations); the chart uses a **weekly**
series (971 points) so that the short ranges have enough resolution.

### Why proxies are used

- **Thai equity** — the SET index tickers on Yahoo Finance (`^SET.BK`, `^SETI`, `^SET50`) return
  no usable history: `^SET.BK` gives only a single current quote and the others are empty. The
  substitute is a Bangkok-listed ETF tracking the SET50, which is denominated in THB and
  dividend-adjusted. SET50 covers the 50 largest listed companies, so it tracks the SET closely
  but excludes mid- and small-caps.
- **Bonds** — there is no free API for Thai government bond yields (ThaiBMA and the Bank of
  Thailand both require registration or an API key), so the US 10-year is used instead.
- **Gold** — no free, scriptable source for true spot (XAU/USD) exists: Yahoo has no
  `XAUUSD=X` ticker, stooq is behind a JavaScript proof-of-work challenge, and FRED has removed
  its LBMA gold fixing series (404). Front-month COMEX futures (`GC=F`) is the closest
  obtainable stand-in and typically differs from spot by less than 1%.

Both proxies are tagged `PROXY` on the **Historical data** page and stated in the disclaimer on
every page. To switch to a real Thai source later, replace the relevant CSV in `raw/` and re-run
`compute_stats.py` — no code changes needed (see the pipeline README).

---

## Pages

### Home (`/`)
Case study overview and a table comparing compound annual growth rate (CAGR) across trailing
1-year, 5-year, 10-year and full-period windows, with the CAGR formula shown above it. The
comparison makes the central point visible: gold returned about 25% over the past year but
about 8.7% annualised over the full period, and bonds are negative over both the 5- and 10-year
windows.

### Historical data (`/reference`)
- Line chart comparing all three assets rebased to index 100, with 6-month / 1-year / 5-year /
  10-year / all range options. Changing the range rebases to 100 at the start of that range, so
  you compare direction within the window rather than just zooming.
- Statistics table: CAGR, expected return, volatility, Sharpe, max drawdown, best and worst years.
- Correlation matrix shaded by value.
- Source cards per asset with ticker, provider, raw data range, methodology and a `PROXY` tag —
  **click a card to open that asset's detail page**.

### Per-asset detail (`/reference/gold`, `/reference/equity`, `/reference/bond`)
- Summary statistics: CAGR, volatility, Sharpe, max drawdown.
- Returns by period (1 / 5 / 10 years / all) including cumulative return and the drawdown within
  each window.
- Calendar-year returns with diverging bars.
- A full 224-row monthly data table with a year filter that accepts both Buddhist and Gregorian
  years. Price columns adapt per asset: gold shows both THB and USD per ounce, equity shows the
  ETF close, bonds show the yield.
- Rows for a month still in progress are labelled, because their "change" is not a full-month
  return.

### Simulation (`/simulation`)
- Four persona presets (near retirement / mid-career / early career / risk-averse).
- Sliders for investment horizon and gold weight, buttons for risk tolerance, and a capital input.
- Stacked allocation bar and four stat cards.
- Monte Carlo fan chart over 1,200 runs (5–95% and 25–75% percentile bands).
- Histogram of ending portfolio values.
- Efficient frontier with the current portfolio marked.
- Comparison table across all four personas.
- A badge stating exactly which historical window the figures come from.

---

## Technical notes

**The Monte Carlo uses a seeded PRNG** (`mulberry32`) rather than `Math.random()`, so results are
identical on every render. That matters for presenting: figures can be quoted and reproduced, and
it avoids server/client hydration mismatches.

**Correlated returns** are generated via Cholesky decomposition of the covariance matrix built
from the real volatilities and correlations.

**Portfolio maths is separate from the UI** — all of it lives in
[`web/lib/portfolio.ts`](web/lib/portfolio.ts) as pure functions with no React dependency.

**Every page is static.** The JSON is imported at build time; there are no runtime API calls, so
the app deploys to any static host.

---

## Model limitations

- The model assumes annual returns are normally distributed with constant statistics. Real markets
  have crisis periods with far worse tails, and correlations that shift exactly when
  diversification is needed most.
- The 2008–present window was an unusually strong period for gold, so the simulation is
  structurally favourable to it. Future results may differ substantially.
- Fees, taxes, rebalancing and additional contributions are not modelled.
- Gold is the global price converted to THB, not the domestic 96.5% bullion price.

> This is an educational case study, not investment advice.
> Past performance does not guarantee future results.
