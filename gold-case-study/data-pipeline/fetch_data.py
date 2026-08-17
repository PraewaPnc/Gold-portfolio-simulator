"""
fetch_data.py — ดึงข้อมูลราคาย้อนหลังดิบของสินทรัพย์ 3 ประเภท แล้วเก็บเป็น CSV ใน raw/

สินทรัพย์ (ทั้งหมดเป็นสินทรัพย์สกุลดอลลาร์สหรัฐฯ):
  1. ทองคำ        : ราคาทองคำ USD/ounce (COMEX futures)
  2. หุ้นสหรัฐฯ    : ETF ที่อ้างอิงดัชนี S&P 500 (สกุล USD, ปรับเงินปันผลแล้ว)
  3. พันธบัตรสหรัฐฯ : อัตราผลตอบแทนพันธบัตรรัฐบาลสหรัฐฯ อายุ 10 ปี จาก FRED

นอกจากนี้ยังดึงอีกสองชุดที่ไม่ใช่สินทรัพย์ลงทุน แต่จำเป็นต่อการคำนวณ:
  - อัตราแลกเปลี่ยน USDTHB  : ใช้แปลงทุกสินทรัพย์เป็นฐานเงินบาท (เว็บสลับสกุลเงินได้)
  - ตั๋วเงินคลัง 3 เดือน      : ใช้เป็นอัตราผลตอบแทนปราศจากความเสี่ยงฝั่ง USD

สคริปต์นี้ทำหน้าที่ "ดึงข้อมูลดิบ" อย่างเดียว ไม่คำนวณสถิติ
การคำนวณทั้งหมดอยู่ใน compute_stats.py ซึ่งอ่านไฟล์ CSV จาก raw/

รันซ้ำได้เสมอ (idempotent) — ไฟล์ใน raw/ จะถูกเขียนทับด้วยข้อมูลล่าสุดทุกครั้ง

วิธีใช้:
    python fetch_data.py                  # ดึงตั้งแต่ 2005-01-01 ถึงปัจจุบัน
    python fetch_data.py --start 2010-01-01
"""

from __future__ import annotations

import argparse
import io
import json
import sys
import warnings
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

warnings.filterwarnings("ignore")

RAW_DIR = Path(__file__).parent / "raw"
# เลือกให้ช่วงข้อมูลร่วมของทั้ง 3 สินทรัพย์ (หลัง reindex/dropna ใน compute_stats.py)
# ลงตัวที่ 240 เดือนเต็มพอดี = 20.0 ปี ซึ่งเป็นตัวเลขที่หน้าแรกของเว็บอ้างถึงตรง ๆ
# ("ข้อมูลจริงย้อนหลัง 20 ปี") รันซ้ำแบบไม่ใส่ --start จึงยังได้กรอบเวลาเดิมนี้เสมอ
DEFAULT_START = "2006-07-16"

FRED_CSV_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) gold-case-study/1.0"


# --------------------------------------------------------------------------
# ตัวเลือกแหล่งข้อมูล (fallback chain)
# ถ้า ticker ตัวแรกใช้ไม่ได้ จะไล่ลองตัวถัดไป และบันทึกว่าใช้ตัวไหนจริง
# --------------------------------------------------------------------------

GOLD_USD_CANDIDATES = [
    ("GC=F", "COMEX Gold Futures (continuous front-month), USD/troy ounce"),
    ("GLD", "SPDR Gold Shares ETF (NYSE Arca), USD — สะท้อนราคาทองคำหักค่าบริหารจัดการ"),
    ("IAU", "iShares Gold Trust ETF (NYSE Arca), USD"),
]

FX_CANDIDATES = [
    ("USDTHB=X", "อัตราแลกเปลี่ยน USD/THB (Yahoo Finance)"),
    ("THB=X", "อัตราแลกเปลี่ยน USD/THB (Yahoo Finance, ticker สำรอง)"),
]

# หุ้นสหรัฐฯ: ใช้ ETF ที่อ้างอิง S&P 500 ไม่ใช่ตัวดัชนี (^GSPC) โดยตรง
# เพราะดัชนี S&P 500 เป็นดัชนีราคาล้วน ไม่รวมเงินปันผล ซึ่งคิดเป็นผลตอบแทนราว 2%/ปี
# ETF กับ auto_adjust=True ให้ผลตอบแทนรวม (total return) ที่นักลงทุนได้รับจริง
# ^GSPC อยู่ท้ายสุดในฐานะทางเลือกสุดท้าย และถูกทำเครื่องหมายว่าเป็น proxy ถ้าได้ใช้จริง
EQUITY_CANDIDATES = [
    ("SPY", "SPDR S&P 500 ETF Trust (NYSE Arca) — ETF อ้างอิงดัชนี S&P 500 สกุลเงิน USD ปรับเงินปันผลแล้ว"),
    ("IVV", "iShares Core S&P 500 ETF (NYSE Arca) — สกุลเงิน USD ปรับเงินปันผลแล้ว"),
    ("VOO", "Vanguard S&P 500 ETF (NYSE Arca) — สกุลเงิน USD ปรับเงินปันผลแล้ว"),
    ("^GSPC", "ดัชนี S&P 500 โดยตรง — เป็นดัชนีราคาล้วน ไม่รวมเงินปันผล"),
]

# ETF ทั้งสามตัวข้างต้นเป็นตัวแทนที่ตรงของ S&P 500 (ต่างกันแค่ค่าบริหารจัดการหลักร้อยละ 0.0x)
# มีแต่ ^GSPC ที่ต้องนับเป็น proxy เพราะขาดเงินปันผลไปทั้งก้อน
EQUITY_TOTAL_RETURN_TICKERS = {"SPY", "IVV", "VOO"}

# พันธบัตรรัฐบาลสหรัฐฯ อายุ 10 ปี — เป็นสินทรัพย์ที่ต้องการโดยตรง ไม่ใช่ตัวแทนของอย่างอื่น
BOND_FRED_SERIES = "DGS10"
BOND_FRED_DESC = "US 10-Year Treasury Constant Maturity Rate (FRED: DGS10) — อัตราผลตอบแทนพันธบัตรรัฐบาลสหรัฐฯ อายุ 10 ปี"

# ตั๋วเงินคลังสหรัฐฯ อายุ 3 เดือน ใช้เป็นอัตราผลตอบแทนปราศจากความเสี่ยงฝั่ง USD
# (ของเดิมเป็นค่าคงที่สมมติ เพราะพอร์ตอยู่ในสกุลบาทอย่างเดียว)
RISK_FREE_FRED_SERIES = "DGS3MO"
RISK_FREE_FRED_DESC = "US 3-Month Treasury Bill Secondary Market Rate (FRED: DGS3MO) — ใช้เป็นอัตราผลตอบแทนปราศจากความเสี่ยงสกุล USD"


def _log(msg: str) -> None:
    print(msg, flush=True)


def _flatten_close(df: pd.DataFrame) -> pd.Series | None:
    """ดึงคอลัมน์ Close ออกมาเป็น Series เดียว (yfinance คืน MultiIndex columns)."""
    if df is None or df.empty or "Close" not in df:
        return None
    close = df["Close"]
    if isinstance(close, pd.DataFrame):
        if close.shape[1] == 0:
            return None
        close = close.iloc[:, 0]
    close = pd.to_numeric(close, errors="coerce").dropna()
    close.index = pd.to_datetime(close.index).tz_localize(None)
    return close if len(close) > 0 else None


def fetch_yahoo(ticker: str, start: str) -> pd.Series | None:
    """ดึงราคาปิดรายวันจาก Yahoo Finance (auto_adjust=True เพื่อรวมผลของเงินปันผล)."""
    import yfinance as yf

    try:
        df = yf.download(
            ticker,
            start=start,
            interval="1d",
            auto_adjust=True,
            progress=False,
            threads=False,
        )
    except Exception as exc:  # noqa: BLE001
        _log(f"      ! {ticker}: ดึงข้อมูลไม่สำเร็จ ({type(exc).__name__}: {exc})")
        return None

    close = _flatten_close(df)
    if close is None:
        _log(f"      ! {ticker}: ไม่พบข้อมูลย้อนหลัง")
        return None

    # ต้องมีข้อมูลอย่างน้อย ~2 ปี จึงจะถือว่าใช้ได้ (กันกรณีได้มาแค่ราคาล่าสุด)
    span_days = (close.index[-1] - close.index[0]).days
    if span_days < 730:
        _log(f"      ! {ticker}: ข้อมูลสั้นเกินไป ({len(close)} แถว / {span_days} วัน) — ข้าม")
        return None

    _log(f"      ✓ {ticker}: {len(close):,} แถว  {close.index[0].date()} → {close.index[-1].date()}")
    return close


def fetch_first_available(
    candidates: list[tuple[str, str]], start: str, label: str
) -> tuple[str, str, pd.Series]:
    """ไล่ลอง ticker ตามลำดับ คืน (ticker, คำอธิบาย, series) ตัวแรกที่ใช้ได้."""
    _log(f"  · {label}")
    for ticker, desc in candidates:
        series = fetch_yahoo(ticker, start)
        if series is not None:
            return ticker, desc, series
    raise RuntimeError(
        f"ดึงข้อมูล '{label}' ไม่สำเร็จเลยสักแหล่ง — ลองแล้ว: {[t for t, _ in candidates]}"
    )


def fetch_fred_series(series_id: str, start: str, label: str) -> pd.Series:
    """ดึง time series จาก FRED ผ่าน CSV endpoint สาธารณะ (ไม่ต้องใช้ API key)."""
    _log(f"  · {label} (FRED {series_id})")
    url = FRED_CSV_URL.format(series_id=series_id)
    last_exc: Exception | None = None

    for attempt in range(1, 4):
        try:
            resp = requests.get(url, timeout=60, headers={"User-Agent": USER_AGENT})
            resp.raise_for_status()
            frame = pd.read_csv(io.StringIO(resp.text))
            break
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            _log(f"      ! ครั้งที่ {attempt} ไม่สำเร็จ ({type(exc).__name__}) — ลองใหม่")
    else:
        raise RuntimeError(f"ดึงข้อมูลจาก FRED ไม่สำเร็จ: {last_exc}")

    # FRED เปลี่ยนชื่อคอลัมน์วันที่จาก DATE เป็น observation_date จึงรองรับทั้งสองแบบ
    date_col = next(
        (c for c in frame.columns if c.lower() in ("date", "observation_date")), frame.columns[0]
    )
    value_col = next((c for c in frame.columns if c != date_col), frame.columns[-1])

    frame[date_col] = pd.to_datetime(frame[date_col], errors="coerce")
    # ค่าที่ยังไม่ประกาศจะเป็น "." ใน FRED -> แปลงเป็น NaN
    frame[value_col] = pd.to_numeric(frame[value_col], errors="coerce")
    out = (
        frame.dropna(subset=[date_col])
        .set_index(date_col)[value_col]
        .dropna()
        .sort_index()
    )
    out = out[out.index >= pd.Timestamp(start)]
    if out.empty:
        raise RuntimeError(f"FRED {series_id}: ไม่มีข้อมูลหลังวันที่ {start}")

    _log(f"      ✓ {series_id}: {len(out):,} แถว  {out.index[0].date()} → {out.index[-1].date()}")
    return out


def write_csv(series: pd.Series, filename: str, value_name: str) -> Path:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    path = RAW_DIR / filename
    out = series.rename(value_name)
    out.index.name = "date"
    out.to_csv(path, date_format="%Y-%m-%d")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="ดึงข้อมูลราคาย้อนหลังดิบสำหรับเคสศึกษาทองคำ")
    parser.add_argument("--start", default=DEFAULT_START, help=f"วันเริ่มต้น (default {DEFAULT_START})")
    args = parser.parse_args()

    _log("=" * 72)
    _log("ดึงข้อมูลราคาย้อนหลัง (fetch_data.py)")
    _log(f"ช่วงข้อมูล: ตั้งแต่ {args.start} ถึงปัจจุบัน")
    _log("=" * 72)

    sources: dict[str, dict] = {}

    # 1) ทองคำ (USD) + อัตราแลกเปลี่ยน
    gold_ticker, gold_desc, gold_usd = fetch_first_available(
        GOLD_USD_CANDIDATES, args.start, "ทองคำ (สกุล USD)"
    )
    write_csv(gold_usd, "gold_usd.csv", "close_usd")
    sources["gold_usd"] = {
        "ticker": gold_ticker,
        "description": gold_desc,
        "provider": "Yahoo Finance",
        "rows": int(len(gold_usd)),
        "start": str(gold_usd.index[0].date()),
        "end": str(gold_usd.index[-1].date()),
    }

    fx_ticker, fx_desc, fx = fetch_first_available(FX_CANDIDATES, args.start, "อัตราแลกเปลี่ยน USD/THB")
    write_csv(fx, "usdthb.csv", "usdthb")
    sources["usdthb"] = {
        "ticker": fx_ticker,
        "description": fx_desc,
        "provider": "Yahoo Finance",
        "rows": int(len(fx)),
        "start": str(fx.index[0].date()),
        "end": str(fx.index[-1].date()),
    }

    # 2) หุ้นสหรัฐฯ (S&P 500)
    eq_ticker, eq_desc, equity = fetch_first_available(
        EQUITY_CANDIDATES, args.start, "หุ้นสหรัฐฯ (ETF อ้างอิง S&P 500)"
    )
    write_csv(equity, "equity_us.csv", "close_usd")
    is_total_return = eq_ticker in EQUITY_TOTAL_RETURN_TICKERS
    sources["equity"] = {
        "ticker": eq_ticker,
        "description": eq_desc,
        "provider": "Yahoo Finance",
        "currency": "USD",
        "isProxy": not is_total_return,
        "rows": int(len(equity)),
        "start": str(equity.index[0].date()),
        "end": str(equity.index[-1].date()),
    }
    if not is_total_return:
        sources["equity"]["proxyNote"] = (
            "ดึง ETF อ้างอิง S&P 500 ที่ปรับเงินปันผลแล้วไม่สำเร็จ จึงใช้ดัชนี S&P 500 โดยตรง "
            "ซึ่งเป็นดัชนีราคาล้วน ผลตอบแทนที่ได้จะต่ำกว่าความเป็นจริงประมาณ 2% ต่อปี"
        )

    # 3) พันธบัตรรัฐบาลสหรัฐฯ อายุ 10 ปี
    bond_yield = fetch_fred_series(BOND_FRED_SERIES, args.start, "พันธบัตรสหรัฐฯ 10 ปี")
    write_csv(bond_yield, "bond_yield.csv", "yield_pct")
    sources["bond_yield"] = {
        "ticker": BOND_FRED_SERIES,
        "description": BOND_FRED_DESC,
        "provider": "FRED (Federal Reserve Bank of St. Louis)",
        "currency": "USD",
        # ตัวอัตราผลตอบแทนเป็นข้อมูลจริงของสินทรัพย์ที่ต้องการตรง ๆ ไม่ใช่ตัวแทนของอย่างอื่น
        # แต่ "ดัชนีผลตอบแทนรวม" ที่ compute_stats.py สร้างต่อจากมันเป็นการจำลอง
        # จึงยังต้องกำกับว่าไม่ใช่ผลตอบแทนของกองทุนพันธบัตรที่ซื้อขายได้จริง
        "isProxy": True,
        "proxyNote": (
            "อัตราผลตอบแทนที่ดึงมาเป็นข้อมูลจริงของพันธบัตรรัฐบาลสหรัฐฯ อายุ 10 ปี "
            "แต่ดัชนีผลตอบแทนรวมที่ใช้ในเคสนี้สร้างขึ้นจากอัตราผลตอบแทนด้วยสูตร duration/convexity "
            "ไม่ใช่มูลค่าหน่วยลงทุนจริงของกองทุนพันธบัตร จึงไม่รวมค่าธรรมเนียมและส่วนต่างราคาซื้อขาย"
        ),
        "rows": int(len(bond_yield)),
        "start": str(bond_yield.index[0].date()),
        "end": str(bond_yield.index[-1].date()),
    }

    # 4) อัตราผลตอบแทนปราศจากความเสี่ยงสกุล USD (ตั๋วเงินคลัง 3 เดือน)
    risk_free = fetch_fred_series(RISK_FREE_FRED_SERIES, args.start, "ตั๋วเงินคลังสหรัฐฯ 3 เดือน")
    write_csv(risk_free, "risk_free_usd.csv", "yield_pct")
    sources["risk_free_usd"] = {
        "ticker": RISK_FREE_FRED_SERIES,
        "description": RISK_FREE_FRED_DESC,
        "provider": "FRED (Federal Reserve Bank of St. Louis)",
        "currency": "USD",
        "rows": int(len(risk_free)),
        "start": str(risk_free.index[0].date()),
        "end": str(risk_free.index[-1].date()),
    }

    manifest = {
        "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "requestedStart": args.start,
        "sources": sources,
    }
    manifest_path = RAW_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    _log("-" * 72)
    _log(f"เขียนไฟล์ดิบลงใน {RAW_DIR}")
    for name in sorted(p.name for p in RAW_DIR.glob("*")):
        _log(f"  - {name}")
    _log("เสร็จสิ้น — ขั้นตอนถัดไป: python compute_stats.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
