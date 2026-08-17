# Gold Portfolio Simulator

**Live: [gold-portfolio-simulator.vercel.app](https://gold-portfolio-simulator.vercel.app)** —
deployed from `main` on every push.

A case study answering **"how much gold belongs in a portfolio?"** — a web app driven by
20 years of real historical prices for gold, US equity (S&P 500) and US Treasuries, instead of
assumed figures.

Two ways of asking the question, kept separate on purpose:

- **Portfolio simulation** — a Monte Carlo over 1,200 runs showing what an allocation could do
  from here, as a distribution. The gold weight is the single control; a cash reserve is carved
  out before anything is invested.
- **DCA backtest** — what buying gold every month would actually have produced on the prices that
  did occur, as one auditable equity curve with a money-weighted return.

All three assets are USD-denominated, so a toggle in the nav switches the whole site between a
**USD basis** and a **THB basis**. It is not a unit conversion — the THB basis has its own
returns, volatilities, correlations and risk-free rate, because currency movement is a second
source of risk for a Thai investor.

Neither is a forecast. The web app's interface is in Thai; all documentation is in English.

## Layout

| Path | Description |
| --- | --- |
| [`gold-case-study/`](gold-case-study/) | The project — **start with the [project README](gold-case-study/README.md)** |
| `gold-case-study/data-pipeline/` | Python: fetches and processes real historical prices |
| `gold-case-study/web/` | Next.js 14 + TypeScript + Tailwind + Recharts |
| `gold-portfolio-simulator.jsx` | The original prototype (assumed figures), kept as the design reference |

## Quick start

```bash
cd gold-case-study/web
npm install
npm run dev          # http://localhost:3000
```

The generated JSON is committed, so the site runs without running the data pipeline first.
See [`data-pipeline/README.md`](gold-case-study/data-pipeline/README.md) to refresh the data.

## Data sources

| Asset | Source | Status |
| --- | --- | --- |
| Gold | `GC=F` — COMEX front-month futures (Yahoo Finance) | Real data (tracks spot closely) |
| US equity | `SPY` — SPDR S&P 500 ETF (Yahoo Finance) | Real data (total return, dividend-adjusted) |
| US Treasury | `DGS10` — US 10Y yield (FRED) | Real yield; total-return index **reconstructed** |
| USD/THB | `USDTHB=X` (Yahoo Finance) | Real data — drives the THB basis |
| Risk-free (USD) | `DGS3MO` — US 3M T-bill (FRED) | Real data |

What each source can and cannot stand for, and every limitation that follows, is documented in
the [project README](gold-case-study/README.md#on-sources-and-their-limits).

> This is an educational case study, not investment advice.
> Past performance does not guarantee future results.
