# Gold Allocation Case Study

**Live: [gold-portfolio-simulator.vercel.app](https://gold-portfolio-simulator.vercel.app)**

A web app answering *"how much gold belongs in a portfolio?"* using real historical prices
rather than assumed figures. The portfolio holds gold, US equity (S&P 500) and US Treasuries.

It answers that from two directions, deliberately kept apart. A **Monte Carlo simulation** asks
what a given allocation could do from here, as a distribution. A **DCA backtest** asks what
buying every month would actually have produced on the prices that did occur, as a single
auditable curve. Neither is a forecast, and they are never mixed on the same screen.

All three assets are USD-denominated, so the site can be read in **either currency basis** —
a toggle in the nav switches between an American investor's view and a Thai one. It is not a
unit conversion: the THB basis has its own returns, volatilities, correlations and risk-free
rate, because currency movement is a second source of risk.

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
    │   ├── simulation/page.tsx         # Monte Carlo simulation
    │   └── dca/page.tsx                # DCA backtest on real monthly prices
    ├── components/
    ├── lib/                            # Maths, kept separate from UI
    │   ├── portfolio.ts                #   Allocation, cash reserve, Monte Carlo
    │   ├── dca.ts                      #   DCA schedule and money-weighted return
    │   └── currency.ts                 #   USD → THB derivation, in one place
    └── data/                           # JSON produced by the data pipeline
```

**The two layers meet at the JSON files in `web/data/`** — the pipeline writes them, the web app
reads them. Every mean, volatility and correlation used in the Monte Carlo simulation, and every
price the DCA backtest buys at, therefore comes from real data.

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
| Gold | `GC=F` — COMEX front-month futures, Yahoo Finance | Real data (global spot-equivalent price) |
| US equity | `SPY` — SPDR S&P 500 ETF, Yahoo Finance | Real data (total return, dividend-adjusted) |
| US Treasury | `DGS10` — US 10Y yield, FRED | Real yield; total-return index is **reconstructed** |

Two more series are fetched that are not investable assets: `USDTHB=X` for the THB basis, and
`DGS3MO` (US 3-month T-bill) for the USD risk-free rate.

Coverage: July 2006 to the present — exactly 20 years / 240 months. The start date is chosen
deliberately (see `DEFAULT_START` in `fetch_data.py`) so a plain re-run keeps this round window.

Statistics are computed from **monthly** data (240 observations); the chart uses a **weekly**
series (1,048 points) so that the short ranges have enough resolution.

### Currency bases

Every statistic is computed twice by the pipeline: once on the USD levels, once on the same
levels multiplied by USDTHB. The effect is not a uniform shift — FX *lowers* gold's volatility
for a Thai investor (17.2% → 15.8%) while *raising* the bond's (7.5% → 9.8%), and gold's
correlation with US equity flips from +0.08 to −0.05.

The JSON stores only the USD basis plus a per-row exchange rate; the web app derives the THB
levels from those two. The derivation reproduces the pipeline's independently computed THB
statistics to within 0.001 percentage points, so the chart and the tables cannot disagree.

### On sources and their limits

- **US equity** — an S&P 500 ETF rather than the `^GSPC` index, because the index is price-only
  and excludes dividends worth roughly 2%/year. The ETF is what an investor can actually hold.
  `^GSPC` remains as a last-resort fallback and *is* flagged `PROXY` if it ever kicks in.
- **US Treasury** — the yield series is exact, but a yield is not a return. The total-return
  index is reconstructed from duration and convexity (formula in the pipeline README), so it
  excludes fund fees and spreads and stays tagged `PROXY` for that reason.
- **Gold** — no free, scriptable source for true spot (XAU/USD) exists: Yahoo has no
  `XAUUSD=X` ticker, stooq is behind a JavaScript proof-of-work challenge, and FRED has removed
  its LBMA gold fixing series (404). Front-month COMEX futures (`GC=F`) is the closest
  obtainable stand-in and typically differs from spot by less than 1%.

Anything tagged `PROXY` is marked on the **Historical data** page and stated in the disclaimer on
every page.

---

## Pages

### Home (`/`)
Case study overview and a table comparing compound annual growth rate (CAGR) across trailing
1-year, 5-year, 10-year and full-period windows, with the CAGR formula shown above it. The
comparison makes the central point visible: on the THB basis gold returned about 25% over the
past year but about 9.0% annualised over the full period, and bonds are negative over both the
5- and 10-year windows.

### Historical data (`/reference`)
- Line chart comparing all three assets rebased to index 100, with 6-month / 1-year / 5-year /
  10-year / all range options. Changing the range rebases to 100 at the start of that range, so
  you compare direction within the window rather than just zooming.
- The four major global crises inside the data window are shaded as background bands. The crisis
  name appears in the tooltip rather than as a chart label, so the bands stay behind the price
  lines instead of competing with them.
- Statistics table: CAGR, expected return, volatility, Sharpe, max drawdown, best and worst years.
- Correlation matrix shaded by value. Switching currency changes every cell — a compact way to
  show that FX is a common factor pushing all three assets together.
- Source cards per asset with ticker, provider, raw data range, methodology and a `PROXY` tag —
  **click a card to open that asset's detail page**.

### Per-asset detail (`/reference/gold`, `/reference/equity`, `/reference/bond`)
- Summary statistics: CAGR, volatility, Sharpe, max drawdown.
- Returns by period (1 / 5 / 10 years / all) including cumulative return and the drawdown within
  each window.
- Calendar-year returns with diverging bars.
- A full 242-row monthly data table with a year filter that accepts both Buddhist and Gregorian
  years. Price columns adapt per asset and per currency: on the THB basis gold and equity show
  both currencies side by side, so you can see whether a month moved because of the asset or
  because of the baht. Bonds show the yield, which is currency-independent.
- Rows for a month still in progress are labelled, because their "change" is not a full-month
  return.

### Simulation (`/simulation`)
- Four persona presets (near retirement / mid-career / early career / risk-averse), each with its
  own cash reserve — largest for the persona with the least time to recover from a forced
  withdrawal.
- Sliders for investment horizon, cash reserve and gold weight, buttons for risk tolerance, and a
  capital input.
- Stacked allocation bar over the whole pot (gold / equity / bonds / cash) and four stat cards.
- Switching currency rebuilds the market model outright — means, volatilities, correlations and
  the risk-free rate all come from the selected basis — and converts the capital you typed at the
  latest FX rate so the same money is being simulated.
- Monte Carlo fan chart over 1,200 runs (5–95% and 25–75% percentile bands).
- Histogram of ending portfolio values.
- Comparison table across all four personas.
- A badge stating exactly which historical window the figures come from.

**How the cash reserve fits in.** The reserve is carved out of the capital *first*, and only what
remains is allocated across gold, equity and bonds. Ordering it that way keeps the risk level a
property of the invested portfolio, so raising the reserve cannot drag the portfolio across a risk
band boundary. The consequence is that the gold slider reads as a share of the invested part while
the bar shows the share of the whole pot; the conversion between the two is printed under the
slider. Cash compounds at the risk-free rate with zero volatility and is never rebalanced back
into the market, which is what a reserve actually is.

One property is worth using as a correctness check: because cash scales excess return and
volatility by the same factor, **the Sharpe ratio is invariant to it**. Drag the reserve from 0%
to 30% and every other figure moves while Sharpe stays put — the capital allocation line, on
screen.

### DCA (`/dca`)
Answers a different question from the simulator: not *what could happen* but *what did happen if
you had bought every month*. It runs on the real month-end price series rather than Monte Carlo,
because the output wanted here is a single auditable equity curve, not a probability band.

- Inputs: an initial amount, a monthly contribution, and a horizon of 1–20 years counted back
  from the latest data. Setting either amount to zero turns it into a pure lump-sum or pure DCA
  run, so the two can be compared directly.
- Equity curve of cumulative contributions against portfolio value; the gap between them is the
  unrealised gain.
- Gold accumulated in ounces, with average cost against the latest price.
- A **money-weighted annual return (IRR)** alongside the raw gain. Total gain over contributions
  systematically understates DCA, because the last instalments have only been invested for a few
  months — at the default settings the same run is +163% total but 16% a year.
- How the run felt from inside: how many months the portfolio sat below what had been paid in,
  and the deepest shortfall. That figure decides whether someone keeps contributing at all, so it
  sits next to the outcome rather than in a footnote.
- The same contribution schedule applied to US equity and Treasuries, for comparison.
- Switching currency re-runs the backtest against gold priced in that currency and converts the
  contribution schedule, which separates how much of the gain came from gold and how much from
  the baht.

Purchases stop at the last complete month, matching how the rest of the case study treats the
partial final month, but the latest price is still used as the closing valuation.

---

## Technical notes

**The Monte Carlo uses a seeded PRNG** (`mulberry32`) rather than `Math.random()`, so results are
identical on every render. That matters for presenting: figures can be quoted and reproduced, and
it avoids server/client hydration mismatches.

**Correlated returns** are generated via Cholesky decomposition of the covariance matrix built
from the real volatilities and correlations.

**Portfolio maths is separate from the UI** — all of it lives in
[`web/lib/portfolio.ts`](web/lib/portfolio.ts) and [`web/lib/dca.ts`](web/lib/dca.ts) as pure
functions with no React dependency.

**Currency conversion lives in exactly one file**, [`web/lib/currency.ts`](web/lib/currency.ts).
The DCA engine and the Monte Carlo never see a currency: they are handed price rows and a market
model already in the selected basis, so no component can convert twice or forget to convert.

**IRR is solved by bisection**, not Newton–Raphson, so it needs no derivative and cannot escape
its bracket. The bracket is widened from narrow to wide rather than starting at −99.99%: with
several hundred monthly periods the discount factor near −100% overflows to infinity, and the
solver would report no root for a run whose answer is perfectly ordinary.

**Every page is static.** The JSON is imported at build time; there are no runtime API calls, so
the app deploys to any static host. It currently runs on Vercel, rebuilt from `main` on every
push. Note that the Next.js app is not at the repository root, so the host's root directory has
to be set to `gold-case-study/web` — otherwise the framework is not detected at all.

---

## Model limitations

- The model assumes annual returns are normally distributed with constant statistics. Real markets
  have crisis periods with far worse tails, and correlations that shift exactly when
  diversification is needed most.
- The 2006–present window was an unusually strong period for both gold and US equity, so the
  simulation is structurally favourable to them. Future results may differ substantially.
- Fees, taxes and rebalancing are not modelled anywhere. Ongoing contributions are absent from the
  simulation specifically — modelling those is what the DCA page is for.
- Gold is the global price, not the domestic 96.5% bullion price.
- On the USD basis the cash reserve earns the averaged 3-month T-bill rate over the window, which
  is fetched. On the THB basis it earns a flat 1.5%, an assumed policy-rate level. Inflation is
  not deducted in either case, so the reserve's purchasing power can fall even though its figure
  never does.
- The THB basis captures currency risk only through statistics estimated from the past. FX is not
  simulated as a separate variable, and neither conversion costs nor hedging are modelled.
- The DCA page is the outcome of **one history that happened**, not a distribution. Choosing a
  different window can reverse the conclusion, and this window flatters gold in particular. It
  also assumes purchases land exactly on the month-end close in fractional units, which is closer
  to a gold fund than to buying physical bullion.

> This is an educational case study, not investment advice.
> Past performance does not guarantee future results.
