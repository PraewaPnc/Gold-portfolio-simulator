# Gold Portfolio Simulator

A case study answering **"how much gold belongs in a portfolio?"** — a web app driven by
18.5 years of real historical prices for gold, Thai equity and bonds, instead of assumed figures.

Two ways of asking the question, kept separate on purpose:

- **Portfolio simulation** — a Monte Carlo over 1,200 runs showing what an allocation could do
  from here, as a distribution. The gold weight is the single control; a cash reserve is carved
  out before anything is invested.
- **DCA backtest** — what buying gold every month would actually have produced on the prices that
  did occur, as one auditable equity curve with a money-weighted return.

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
| Gold | `GC=F` × `USDTHB=X` (Yahoo Finance) | Real data (futures, tracks spot closely) |
| Thai equity | `TDEX.BK` — ThaiDEX SET50 ETF | **Proxy** for the SET index |
| Bonds | `DGS10` — US 10Y Treasury (FRED) | **Proxy** for Thai government bonds |

Why proxies are necessary, and every limitation that follows from them, is documented in the
[project README](gold-case-study/README.md#why-proxies-are-used).

> This is an educational case study, not investment advice.
> Past performance does not guarantee future results.
