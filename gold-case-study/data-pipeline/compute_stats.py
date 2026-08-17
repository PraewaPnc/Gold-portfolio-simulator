"""
compute_stats.py — ประมวลผลข้อมูลดิบใน raw/ ให้เป็น JSON ที่เว็บแอปใช้งานได้

อ่านจาก:  data-pipeline/raw/*.csv        (สร้างโดย fetch_data.py)
เขียนไป:  web/data/price-history.json    time series ราคา normalize เป็น index 100 (ฐาน USD)
          web/data/asset-stats.json      mean, volatility, correlation matrix แยกตามสกุลเงิน

หลักการคำนวณ
------------
1. ทองคำ         = ราคาทองคำ USD/ounce
2. หุ้นสหรัฐฯ     = ราคาปิด ETF อ้างอิงดัชนี S&P 500 (สกุล USD, ปรับเงินปันผลแล้ว)
3. พันธบัตรสหรัฐฯ = สร้าง "ดัชนีผลตอบแทนรวม" (total return index) จากอัตราผลตอบแทน 10 ปี
                    เนื่องจากตัว yield เองไม่ใช่ผลตอบแทนที่นักลงทุนได้รับ
                    ใช้สูตรมาตรฐาน carry + duration + convexity รายเดือน:

                        r(t) = y(t-1)/12  -  D_mod * Δy  +  0.5 * C * Δy^2

                    โดย D_mod (modified duration) และ C (convexity) คำนวณจากพันธบัตร
                    ราคาพาร์อายุ 10 ปี ที่จ่ายคูปองเท่ากับ yield ณ เวลานั้น (คำนวณใหม่ทุกเดือน)

สองฐานสกุลเงิน
--------------
สินทรัพย์ทั้งสามเป็นสินทรัพย์สกุลดอลลาร์ ผลตอบแทนที่นักลงทุนไทยได้รับจริงจึงรวม
การเคลื่อนไหวของค่าเงินเข้าไปด้วย เคสนี้จึงคำนวณสถิติสองชุดจากข้อมูลชุดเดียวกัน:

    ฐาน USD : ระดับราคาตามที่ดึงมา                  — มุมมองนักลงทุนอเมริกัน
    ฐาน THB : ระดับราคา x อัตราแลกเปลี่ยน USDTHB    — มุมมองนักลงทุนไทย

ทั้ง mean, volatility, correlation, CAGR และ max drawdown ต่างกันระหว่างสองฐาน
เพราะค่าเงินเป็นอีกแหล่งความผันผวนหนึ่ง จึงต้องคำนวณแยก ไม่ใช่แค่คูณตัวเลขสุดท้าย

4. ผลตอบแทนทั้งหมดคิดเป็นรายเดือน แล้วแปลงเป็นรายปีด้วย x12 (mean) และ xsqrt(12) (S.D.)
   ตัวเลข annualReturn เป็น arithmetic mean เพราะ Monte Carlo ในเว็บแอปสุ่มผลตอบแทน
   รายปีจากการแจกแจงปกติ ซึ่งต้องใช้ arithmetic mean จึงจะไม่เกิด bias
   ส่วน cagr คือผลตอบแทนทบต้นที่เกิดขึ้นจริง (geometric) ใช้แสดงในตารางอ้างอิง

รันซ้ำได้เสมอ:
    python compute_stats.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

PIPELINE_DIR = Path(__file__).parent
RAW_DIR = PIPELINE_DIR / "raw"
WEB_DATA_DIR = PIPELINE_DIR.parent / "web" / "data"

MONTHS_PER_YEAR = 12
WEEKS_PER_YEAR = 52
BOND_MATURITY_YEARS = 10

ASSET_KEYS = ("gold", "equity", "bond")
CURRENCIES = ("usd", "thb")

# อัตราผลตอบแทนปราศจากความเสี่ยงฝั่งบาท
# ตั้งเป็นค่าคงที่โดยอ้างอิงระดับอัตราดอกเบี้ยนโยบายของไทยในระยะยาว (ประมาณ 1.5%)
# ไม่ได้ดึงจาก API เพราะข้อมูลอัตราดอกเบี้ยนโยบายไทยย้อนหลังไม่มีแหล่งฟรีที่เข้าถึงได้
# ส่วนฝั่ง USD คำนวณจากตั๋วเงินคลัง 3 เดือนที่ดึงมาจริง (ดู risk_free_usd.csv)
RISK_FREE_THB = 0.015

ASSET_LABELS = {
    "gold": {"th": "ทองคำ", "en": "Gold"},
    "equity": {"th": "หุ้นสหรัฐฯ", "en": "US Equity (S&P 500)"},
    "bond": {"th": "พันธบัตรสหรัฐฯ", "en": "US Treasury 10Y"},
}

# th เป็นคำที่เอาไปต่อท้ายตัวเลขในประโยค จึงต้องสั้น ("30,000 ดอลลาร์")
# ส่วนชื่อเต็มอยู่ในฟิลด์ code ให้ใช้ตรงที่ต้องระบุให้ชัด
CURRENCY_LABELS = {
    "usd": {"th": "ดอลลาร์", "code": "USD", "symbol": "$"},
    "thb": {"th": "บาท", "code": "THB", "symbol": "฿"},
}


def _log(msg: str) -> None:
    print(msg, flush=True)


def read_raw(filename: str) -> pd.Series:
    path = RAW_DIR / filename
    if not path.exists():
        raise FileNotFoundError(
            f"ไม่พบไฟล์ {path}\nกรุณารัน `python fetch_data.py` ก่อน"
        )
    frame = pd.read_csv(path, parse_dates=["date"]).set_index("date").sort_index()
    return frame.iloc[:, 0].dropna()


def resample_last(series: pd.Series, rule: str) -> pd.Series:
    """แปลงข้อมูลรายวันเป็นค่าปิด ณ สิ้นคาบ (rule เช่น "ME" รายเดือน, "W-FRI" รายสัปดาห์)."""
    return series.resample(rule).last().dropna()


def par_bond_duration_convexity(y: float, maturity: int = BOND_MATURITY_YEARS) -> tuple[float, float]:
    """
    คำนวณ modified duration และ convexity ของพันธบัตรราคาพาร์
    ที่จ่ายคูปองรายปีเท่ากับ yield y (y เป็นทศนิยม เช่น 0.045)

    ราคาพาร์ = 100, กระแสเงินสด = คูปอง y*100 ปีที่ 1..maturity + เงินต้น 100 ปีสุดท้าย
    """
    if y <= 0:
        # กรณี yield ติดลบหรือเป็นศูนย์ ใช้ค่าประมาณของพันธบัตรไม่จ่ายคูปอง
        return float(maturity), float(maturity * (maturity + 1))

    times = np.arange(1, maturity + 1, dtype=float)
    cashflows = np.full(maturity, y * 100.0)
    cashflows[-1] += 100.0

    discount = (1.0 + y) ** times
    pv = cashflows / discount
    price = pv.sum()  # ≈ 100 สำหรับพันธบัตรราคาพาร์

    macaulay = float((times * pv).sum() / price)
    modified = macaulay / (1.0 + y)
    convexity = float((times * (times + 1.0) * cashflows / (1.0 + y) ** (times + 2.0)).sum() / price)
    return modified, convexity


def bond_total_return_index(
    yield_pct: pd.Series, periods_per_year: int
) -> tuple[pd.Series, pd.Series]:
    """
    สร้างดัชนีผลตอบแทนรวมของพันธบัตรอายุ 10 ปี จากอนุกรม yield (หน่วย %)

    periods_per_year กำหนดความถี่ของอนุกรมที่ส่งเข้ามา (12 = รายเดือน, 52 = รายสัปดาห์)
    ซึ่งใช้คำนวณ carry ต่อคาบ (y / periods_per_year)

    คืนค่า (ดัชนีผลตอบแทนรวม, ผลตอบแทนต่อคาบ)
    """
    y = yield_pct / 100.0  # แปลง % เป็นทศนิยม
    returns: list[float] = []
    dates: list[pd.Timestamp] = []

    prev_y = None
    for date, y_t in y.items():
        if prev_y is not None:
            d_mod, convexity = par_bond_duration_convexity(float(prev_y))
            delta_y = float(y_t) - float(prev_y)
            carry = float(prev_y) / periods_per_year
            price_change = -d_mod * delta_y + 0.5 * convexity * delta_y**2
            returns.append(carry + price_change)
            dates.append(date)
        prev_y = y_t

    period_returns = pd.Series(returns, index=pd.DatetimeIndex(dates), name="bond")
    # ดัชนีเริ่มที่ 1.0 ณ คาบแรกของ yield (ก่อนมีผลตอบแทนคาบแรก)
    index = pd.concat(
        [pd.Series([1.0], index=[y.index[0]]), (1.0 + period_returns).cumprod()]
    )
    index.name = "bond"
    return index, period_returns


def max_drawdown(index: pd.Series) -> float:
    """Maximum drawdown จากจุดสูงสุดสะสม (คืนค่าเป็นจำนวนลบ เช่น -0.35)."""
    running_max = index.cummax()
    return float((index / running_max - 1.0).min())


def window_stats(frame: pd.DataFrame, months: int | None) -> dict | None:
    """
    คำนวณสถิติของทุกสินทรัพย์ในช่วงเวลาย้อนหลัง N เดือนล่าสุด

    months=None หมายถึงใช้ข้อมูลทั้งหมด
    คืนค่า None ถ้าข้อมูลไม่พอสำหรับช่วงที่ขอ

    ต้องใช้ months+1 จุด เพราะ N เดือนของผลตอบแทนต้องการราคา N+1 จุด
    """
    if months is None:
        sub = frame
    else:
        if len(frame) < months + 1:
            return None
        sub = frame.iloc[-(months + 1) :]

    years = (len(sub) - 1) / MONTHS_PER_YEAR
    returns = sub.pct_change().dropna()

    assets: dict[str, dict] = {}
    for key in ASSET_KEYS:
        idx = sub[key]
        growth = float(idx.iloc[-1] / idx.iloc[0])
        assets[key] = {
            "cagr": round(growth ** (1.0 / years) - 1.0, 6),
            "totalReturn": round(growth - 1.0, 6),
            "annualVolatility": round(
                float(returns[key].std(ddof=1) * np.sqrt(MONTHS_PER_YEAR)), 6
            ),
            "maxDrawdown": round(max_drawdown(idx), 6),
        }

    return {
        "months": int(len(sub) - 1),
        "years": round(years, 2),
        "start": str(sub.index[0].date()),
        "end": str(sub.index[-1].date()),
        "assets": assets,
    }


def calendar_year_returns(index: pd.Series) -> dict[str, float]:
    """ผลตอบแทนรายปีปฏิทิน คำนวณจากค่าดัชนี ณ สิ้นปี."""
    yearly = index.resample("YE").last()
    changes = yearly.pct_change().dropna()
    return {str(ts.year): round(float(v), 6) for ts, v in changes.items()}


def currency_block(stats_frame: pd.DataFrame, n_years: float, risk_free: float) -> dict:
    """
    สถิติครบชุดของสินทรัพย์ทั้งสามในฐานสกุลเงินหนึ่ง

    stats_frame คือระดับราคา/ดัชนีรายเดือนในสกุลนั้น ๆ ที่ตัดเดือนไม่เต็มออกแล้ว
    คืนค่า dict ที่มี assets, trailingReturns และ correlation
    """
    monthly_returns = stats_frame.pct_change().dropna()

    assets: dict[str, dict] = {}
    for key in ASSET_KEYS:
        r = monthly_returns[key]
        idx = stats_frame[key]

        arithmetic_annual = float(r.mean() * MONTHS_PER_YEAR)
        annual_vol = float(r.std(ddof=1) * np.sqrt(MONTHS_PER_YEAR))
        total_return = float(idx.iloc[-1] / idx.iloc[0] - 1.0)
        cagr = float((idx.iloc[-1] / idx.iloc[0]) ** (1.0 / n_years) - 1.0)
        yearly = calendar_year_returns(idx)
        best_year = max(yearly.items(), key=lambda kv: kv[1]) if yearly else ("-", 0.0)
        worst_year = min(yearly.items(), key=lambda kv: kv[1]) if yearly else ("-", 0.0)

        assets[key] = {
            "key": key,
            "label": ASSET_LABELS[key]["th"],
            "labelEn": ASSET_LABELS[key]["en"],
            "annualReturn": round(arithmetic_annual, 6),
            "annualVolatility": round(annual_vol, 6),
            "cagr": round(cagr, 6),
            "totalReturn": round(total_return, 6),
            "sharpe": round((arithmetic_annual - risk_free) / annual_vol, 4) if annual_vol > 0 else 0.0,
            "maxDrawdown": round(max_drawdown(idx), 6),
            "bestYear": {"year": best_year[0], "return": best_year[1]},
            "worstYear": {"year": worst_year[0], "return": worst_year[1]},
            "calendarYearReturns": yearly,
        }

    corr = monthly_returns.corr()
    correlation = {
        a: {b: round(float(corr.loc[a, b]), 4) for b in ASSET_KEYS} for a in ASSET_KEYS
    }

    trailing_returns = []
    for key, label, months in (
        ("1y", "1 ปี", 12),
        ("5y", "5 ปี", 60),
        ("10y", "10 ปี", 120),
        # จำนวนปีของช่วง "ทั้งหมด" อยู่ในฟิลด์ years แล้ว หน้าเว็บจึงนำไปแสดงเองได้
        ("all", "ทั้งหมด", None),
    ):
        window = window_stats(stats_frame, months)
        if window is not None:
            trailing_returns.append({"key": key, "label": label, **window})

    return {
        "riskFreeRate": round(risk_free, 6),
        "assets": assets,
        "trailingReturns": trailing_returns,
        "correlation": correlation,
    }


def log_currency_block(code: str, block: dict) -> None:
    """พิมพ์สรุปสถิติของฐานสกุลเงินหนึ่งลง stdout เพื่อให้ตรวจได้ทันทีหลังรัน."""
    label = CURRENCY_LABELS[code]["code"]
    _log("-" * 72)
    _log(f"  ฐาน {label} — อัตราปราศจากความเสี่ยง {block['riskFreeRate']*100:.2f}%/ปี")
    for key in ASSET_KEYS:
        a = block["assets"][key]
        _log(
            f"    {ASSET_LABELS[key]['th']:<14s} ผลตอบแทน(arith) {a['annualReturn']*100:6.2f}%/ปี | "
            f"CAGR {a['cagr']*100:6.2f}% | ผันผวน {a['annualVolatility']*100:6.2f}% | "
            f"MaxDD {a['maxDrawdown']*100:7.2f}%"
        )

    _log(f"    correlation  {'':<8s}" + "".join(f"{ASSET_LABELS[b]['th']:>14s}" for b in ASSET_KEYS))
    for a in ASSET_KEYS:
        row = "".join(f"{block['correlation'][a][b]:>14.3f}" for b in ASSET_KEYS)
        _log(f"    {ASSET_LABELS[a]['th']:<20s}{row}")

    _log("    CAGR แยกตามช่วงเวลา")
    header = "".join(f"{w['label']:>14s}" for w in block["trailingReturns"])
    _log(f"      {'':<14s}{header}")
    for a in ASSET_KEYS:
        row = "".join(f"{w['assets'][a]['cagr'] * 100:>13.2f}%" for w in block["trailingReturns"])
        _log(f"      {ASSET_LABELS[a]['th']:<14s}{row}")


def build() -> int:
    _log("=" * 72)
    _log("ประมวลผลข้อมูล (compute_stats.py)")
    _log("=" * 72)

    manifest_path = RAW_DIR / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"ไม่พบ {manifest_path} — กรุณารัน `python fetch_data.py` ก่อน")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    raw_sources = manifest["sources"]

    # ---------------- โหลดข้อมูลดิบ ----------------
    gold_usd = read_raw("gold_usd.csv")
    usdthb = read_raw("usdthb.csv")
    equity_usd = read_raw("equity_us.csv")
    bond_yield_raw = read_raw("bond_yield.csv")
    risk_free_raw = read_raw("risk_free_usd.csv")

    # วันสุดท้ายที่มีข้อมูลครบทั้ง 3 สินทรัพย์ + อัตราแลกเปลี่ยน
    # (ต้องรวม FX ด้วย เพราะฐานบาทใช้มันทุกจุด)
    actual_end = min(
        gold_usd.index[-1], equity_usd.index[-1], bond_yield_raw.index[-1], usdthb.index[-1]
    )

    def build_frames(rule: str, periods_per_year: int) -> tuple[dict[str, pd.DataFrame], pd.DataFrame, bool]:
        """
        รวมสินทรัพย์ทั้ง 3 เป็นตารางเดียวที่ความถี่ตาม rule ทั้งสองฐานสกุลเงิน

        คืนค่า ({usd: ตาราง, thb: ตาราง}, ตารางระดับราคาจริงประกอบ, จุดสุดท้ายเป็นคาบที่ยังไม่จบหรือไม่)
        """
        bond_index, _ = bond_total_return_index(
            resample_last(bond_yield_raw, rule), periods_per_year
        )
        usd_frame = pd.DataFrame(
            {
                "gold": resample_last(gold_usd, rule),
                "equity": resample_last(equity_usd, rule),
                "bond": bond_index,
            }
        ).dropna()

        # resample จะตีตราวันสุดท้ายของคาบเสมอ แม้ข้อมูลจริงจะมีถึงกลางคาบ
        # จึงเปลี่ยนป้ายวันที่ของจุดสุดท้ายให้ตรงกับวันที่มีข้อมูลจริง
        partial = bool(actual_end < usd_frame.index[-1])
        if partial:
            relabelled = usd_frame.index.to_list()
            relabelled[-1] = actual_end
            usd_frame.index = pd.DatetimeIndex(relabelled)

        def align(series: pd.Series) -> pd.Series:
            """ดึงค่าของอนุกรมรายวันมาที่ปฏิทินของตาราง โดย forward fill วันหยุดที่ไม่ตรงกัน."""
            return series.reindex(series.index.union(usd_frame.index)).ffill().reindex(usd_frame.index)

        fx = align(usdthb)
        # ฐานบาท = ระดับราคาสกุลดอลลาร์ x อัตราแลกเปลี่ยน ณ จุดเดียวกัน
        # คูณทั้งตารางทีเดียว จึงรับประกันว่าทั้งสองฐานมาจากจุดข้อมูลชุดเดียวกันเสมอ
        thb_frame = usd_frame.mul(fx, axis=0).dropna()

        extra = pd.DataFrame(
            {
                "goldUsd": usd_frame["gold"],
                "equityUsd": usd_frame["equity"],
                "bondYieldPct": align(bond_yield_raw),
                "usdthb": fx,
            }
        )
        return {"usd": usd_frame, "thb": thb_frame}, extra, partial

    # ---------------- รายเดือน: ใช้คำนวณสถิติ ----------------
    # ความถี่รายเดือนให้ค่า volatility และ correlation ที่เสถียรกว่ารายสัปดาห์
    monthly_frames, monthly_extra, has_partial_final_month = build_frames("ME", MONTHS_PER_YEAR)
    combined = monthly_frames["usd"]
    if len(combined) < 60:
        raise RuntimeError(f"ข้อมูลที่ทับซ้อนกันมีเพียง {len(combined)} เดือน — น้อยเกินไป")
    _log(f"  รายเดือน (สถิติ)  : {len(combined):4d} คาบ  {combined.index[0].date()} → {combined.index[-1].date()}")

    # ---------------- รายสัปดาห์: ใช้วาดกราฟ ----------------
    # รายเดือนหยาบเกินไปสำหรับช่วง 6 เดือน (ได้แค่ 7 จุด) จึงใช้รายสัปดาห์กับกราฟ
    weekly_frames, weekly_extra, _ = build_frames("W-FRI", WEEKS_PER_YEAR)
    weekly = weekly_frames["usd"]
    _log(f"  รายสัปดาห์ (กราฟ) : {len(weekly):4d} คาบ  {weekly.index[0].date()} → {weekly.index[-1].date()}")

    if has_partial_final_month:
        _log(
            f"  หมายเหตุ: เดือนสุดท้ายยังไม่จบ (ข้อมูลถึง {actual_end.date()}) "
            "— แสดงในกราฟแต่ไม่นำไปคำนวณสถิติ"
        )

    # normalize กราฟเป็น index 100 ที่จุดแรก (เก็บเฉพาะฐาน USD — ดูหมายเหตุตอนเขียนไฟล์)
    normalized = weekly / weekly.iloc[0] * 100.0
    series_end = weekly.index[-1]

    # กรอบข้อมูลที่ใช้คำนวณสถิติ — ตัดเดือนที่ยังไม่จบออก
    stats_frames = {
        code: (frame.iloc[:-1] if has_partial_final_month else frame)
        for code, frame in monthly_frames.items()
    }
    start_date, end_date = stats_frames["usd"].index[0], stats_frames["usd"].index[-1]
    # ข้อมูลราคา N จุด ให้ผลตอบแทน N-1 คาบ และกินเวลาจริง N-1 เดือน
    # ต้องใช้ N-1 เป็นตัวหารของ CAGR ไม่ใช่จำนวนจุดข้อมูล
    n_months = len(stats_frames["usd"]) - 1
    n_years = n_months / MONTHS_PER_YEAR
    _log("-" * 72)
    _log(f"  ช่วงข้อมูลร่วม: {start_date.date()} → {end_date.date()}  ({n_months} เดือน ≈ {n_years:.1f} ปี)")

    # ---------------- อัตราผลตอบแทนปราศจากความเสี่ยง ----------------
    # ฝั่ง USD ใช้ค่าเฉลี่ยของตั๋วเงินคลัง 3 เดือนตลอดช่วงข้อมูลเดียวกับที่คำนวณสถิติ
    # จึงเทียบกับผลตอบแทนของสินทรัพย์ในช่วงเดียวกันได้ตรง ๆ
    risk_free_window = risk_free_raw[
        (risk_free_raw.index >= start_date) & (risk_free_raw.index <= end_date)
    ]
    risk_free = {
        "usd": float(risk_free_window.mean()) / 100.0,
        "thb": RISK_FREE_THB,
    }

    # ---------------- สถิติแยกตามฐานสกุลเงิน ----------------
    currency_blocks = {
        code: currency_block(stats_frames[code], n_years, risk_free[code]) for code in CURRENCIES
    }
    for code in CURRENCIES:
        log_currency_block(code, currency_blocks[code])

    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    data_range = {
        "start": str(start_date.date()),
        "end": str(end_date.date()),
        "months": int(n_months),
        "years": round(n_years, 2),
        "frequency": "monthly (month-end)",
        # จุดสุดท้ายของกราฟราคา (รายสัปดาห์) อาจใหม่กว่า end ถ้าเดือนปัจจุบันยังไม่จบ
        "seriesEnd": str(series_end.date()),
        "seriesStart": str(weekly.index[0].date()),
        "seriesFrequency": "weekly (Friday close)",
        "seriesPoints": int(len(weekly)),
        "excludedPartialFinalMonth": bool(has_partial_final_month),
    }

    # ---------------- เขียน price-history.json ----------------
    WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)

    # เก็บเฉพาะฐาน USD พร้อมอัตราแลกเปลี่ยนของแต่ละแถว ไม่เก็บฐานบาทซ้ำอีกชุด
    # เพราะฐานบาทหาได้ตรง ๆ จากสองค่านี้:  ดัชนีบาท(t) = ดัชนี USD(t) x fx(t) / fx(0)
    # เก็บสองชุดจะทำให้ไฟล์ที่ถูก bundle เข้าเว็บใหญ่ขึ้นเท่าตัวโดยไม่ได้ข้อมูลใหม่เลย
    series_records = [
        {
            "date": str(ts.date()),
            "gold": round(float(normalized.loc[ts, "gold"]), 2),
            "equity": round(float(normalized.loc[ts, "equity"]), 2),
            "bond": round(float(normalized.loc[ts, "bond"]), 2),
            "usdthb": round(float(weekly_extra.loc[ts, "usdthb"]), 4),
        }
        for ts in weekly.index
    ]

    # ตารางข้อมูลรายเดือนสำหรับหน้ารายละเอียดของแต่ละสินทรัพย์
    # เก็บทั้งดัชนีฐาน 100 และระดับราคาจริง เพื่อให้แสดงเป็นตารางดูได้ตรง ๆ
    monthly_normalized = combined / combined.iloc[0] * 100.0
    monthly_records = [
        {
            "date": str(ts.date()),
            "gold": round(float(monthly_normalized.loc[ts, "gold"]), 2),
            "equity": round(float(monthly_normalized.loc[ts, "equity"]), 2),
            "bond": round(float(monthly_normalized.loc[ts, "bond"]), 2),
            "goldUsdPerOz": round(float(monthly_extra.loc[ts, "goldUsd"]), 2),
            "equityCloseUsd": round(float(monthly_extra.loc[ts, "equityUsd"]), 4),
            "bondYieldPct": round(float(monthly_extra.loc[ts, "bondYieldPct"]), 4),
            "usdthb": round(float(monthly_extra.loc[ts, "usdthb"]), 4),
        }
        for ts in combined.index
    ]

    last_ts = weekly.index[-1]
    last_fx = float(weekly_extra.loc[last_ts, "usdthb"])
    last_gold_usd = float(weekly_extra.loc[last_ts, "goldUsd"])
    last_equity_usd = float(weekly_extra.loc[last_ts, "equityUsd"])
    latest = {
        "date": str(last_ts.date()),
        "goldUsdPerOz": round(last_gold_usd, 2),
        "goldThbPerOz": round(last_gold_usd * last_fx, 2),
        "equityCloseUsd": round(last_equity_usd, 4),
        "equityCloseThb": round(last_equity_usd * last_fx, 2),
        "bondYieldPct": round(float(weekly_extra.loc[last_ts, "bondYieldPct"]), 4),
        "usdthb": round(last_fx, 4),
    }

    price_history = {
        "meta": {
            "generatedAt": generated_at,
            "description": (
                "ราคาย้อนหลังรายสัปดาห์ (ราคาปิดวันศุกร์) ของทองคำ, หุ้นสหรัฐฯ และพันธบัตรสหรัฐฯ "
                "โดย gold/equity/bond ถูก normalize ให้เริ่มต้นที่ 100 ณ วันแรกของช่วงข้อมูล "
                "ใช้ความถี่รายสัปดาห์เพื่อให้กราฟช่วงสั้น (6 เดือน / 1 ปี) มีจุดข้อมูลเพียงพอ "
                "ส่วนสถิติใน asset-stats.json คำนวณจากข้อมูลรายเดือน"
            ),
            "normalizedBase": 100,
            "baseCurrency": "usd",
            "currencyNote": (
                "ดัชนีและระดับราคาทั้งหมดในไฟล์นี้เป็นฐาน USD "
                "ฐานบาทคำนวณในเว็บแอปจากอัตราแลกเปลี่ยนรายแถว (ฟิลด์ usdthb): "
                "ดัชนีบาท(t) = ดัชนี USD(t) x usdthb(t) / usdthb(แถวแรก) "
                "และระดับราคาบาท(t) = ระดับราคา USD(t) x usdthb(t)"
            ),
            "dataRange": data_range,
            "fields": {
                "gold": "ดัชนีทองคำสกุล USD (ฐาน 100)",
                "equity": "ดัชนีหุ้นสหรัฐฯ S&P 500 (ฐาน 100, รวมเงินปันผล)",
                "bond": "ดัชนีผลตอบแทนรวมพันธบัตรรัฐบาลสหรัฐฯ 10 ปี (ฐาน 100)",
                "usdthb": "อัตราแลกเปลี่ยน USD/THB ณ แถวนั้น ใช้แปลงเป็นฐานบาท",
                "monthly.goldUsdPerOz": "ราคาทองคำตลาดโลก หน่วย USD ต่อทรอยออนซ์",
                "monthly.equityCloseUsd": "ราคาปิดจริงของ ETF อ้างอิง S&P 500 (USD)",
                "monthly.bondYieldPct": "อัตราผลตอบแทนพันธบัตรรัฐบาลสหรัฐฯ 10 ปี (%)",
                "latest.goldThbPerOz": "ราคาทองคำแปลงเป็นเงินบาท ต่อทรอยออนซ์",
                "latest.equityCloseThb": "ราคาปิด ETF แปลงเป็นเงินบาท",
                "latest.usdthb": "อัตราแลกเปลี่ยน USD/THB ล่าสุด",
            },
        },
        "latest": latest,
        "series": series_records,
        "monthly": monthly_records,
    }
    price_path = WEB_DATA_DIR / "price-history.json"
    price_path.write_text(json.dumps(price_history, ensure_ascii=False, indent=2), encoding="utf-8")

    # ---------------- เขียน asset-stats.json ----------------
    asset_stats = {
        "meta": {
            "generatedAt": generated_at,
            "fetchedAt": manifest.get("fetchedAt"),
            "dataRange": data_range,
            "currencies": list(CURRENCIES),
            "defaultCurrency": "thb",
            "currencyLabels": CURRENCY_LABELS,
            "latestFxRate": latest["usdthb"],
            "currencyNote": (
                "สินทรัพย์ทั้งสามเป็นสินทรัพย์สกุลดอลลาร์ สถิติจึงคำนวณสองชุดจากข้อมูลชุดเดียวกัน "
                "ฐาน USD คือผลตอบแทนของตัวสินทรัพย์เอง ส่วนฐานบาทคูณอัตราแลกเปลี่ยน USDTHB เข้าไปด้วย "
                "จึงรวมผลของค่าเงินซึ่งเป็นสิ่งที่นักลงทุนไทยเจอจริง — ตัวเลขทั้งสองชุดต่างกันทั้ง "
                "ผลตอบแทน ความผันผวน และสหสัมพันธ์"
            ),
            "riskFreeRateNote": (
                "ฐาน USD ใช้ค่าเฉลี่ยอัตราผลตอบแทนตั๋วเงินคลังสหรัฐฯ อายุ 3 เดือน (FRED: DGS3MO) "
                "ตลอดช่วงข้อมูลเดียวกับที่คำนวณสถิติ · "
                f"ฐานบาทใช้ค่าสมมติ {RISK_FREE_THB*100:.1f}% ต่อปี อ้างอิงระดับอัตราดอกเบี้ยนโยบายของไทย "
                "โดยประมาณ เพราะไม่มีแหล่งข้อมูลย้อนหลังที่เข้าถึงได้ฟรี"
            ),
            "returnConvention": (
                "annualReturn เป็น arithmetic mean ของผลตอบแทนรายเดือน x 12 "
                "ใช้เป็น input ของ Monte Carlo simulation | "
                "cagr เป็นผลตอบแทนทบต้นที่เกิดขึ้นจริงในช่วงข้อมูล"
            ),
        },
        "byCurrency": currency_blocks,
        "sources": {
            "gold": {
                "label": "ทองคำ",
                "method": "ราคาทองคำตลาดโลก หน่วย USD ต่อทรอยออนซ์ (ฐานบาทคูณอัตราแลกเปลี่ยน USDTHB)",
                "priceSource": raw_sources["gold_usd"],
                "fxSource": raw_sources["usdthb"],
                "isProxy": False,
                "notes": (
                    "ใช้ราคาตลาดโลก ไม่ใช่ราคาทองคำแท่ง 96.5% ของสมาคมค้าทองคำ "
                    "ซึ่งไม่มี API สาธารณะให้ดึงย้อนหลัง "
                    "ราคาทองคำแท่งในประเทศจะเคลื่อนไหวใกล้เคียงกันแต่มีส่วนต่างค่าพรีเมียมและความบริสุทธิ์"
                ),
            },
            "equity": {
                "label": "หุ้นสหรัฐฯ",
                "method": "ราคาปิดรายวันของ ETF อ้างอิงดัชนี S&P 500 ปรับเงินปันผลแล้ว แปลงเป็นรายเดือน",
                "priceSource": raw_sources["equity"],
                "fxSource": raw_sources["usdthb"],
                "isProxy": bool(raw_sources["equity"].get("isProxy", False)),
                "notes": raw_sources["equity"].get(
                    "proxyNote",
                    "ใช้ ETF อ้างอิง S&P 500 แทนตัวดัชนีโดยตรง เพราะดัชนี S&P 500 เป็นดัชนีราคาล้วน "
                    "ไม่รวมเงินปันผลซึ่งคิดเป็นผลตอบแทนราว 2% ต่อปี ตัวเลขจาก ETF จึงตรงกับ "
                    "ผลตอบแทนที่นักลงทุนได้รับจริงมากกว่า โดยหักค่าบริหารจัดการของกองทุนไปแล้ว",
                ),
            },
            "bond": {
                "label": "พันธบัตรสหรัฐฯ",
                "method": (
                    "แปลงอัตราผลตอบแทนพันธบัตรรัฐบาลสหรัฐฯ 10 ปี เป็นดัชนีผลตอบแทนรวมรายเดือน "
                    "ด้วยสูตร carry + duration + convexity: r = y/12 - D_mod x Δy + 0.5 x C x Δy²"
                ),
                "priceSource": raw_sources["bond_yield"],
                "fxSource": raw_sources["usdthb"],
                "isProxy": True,
                "notes": raw_sources["bond_yield"].get("proxyNote", ""),
            },
        },
        "riskFreeSource": raw_sources.get("risk_free_usd"),
        "disclaimers": [
            "เคสศึกษานี้จัดทำเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน",
            "ผลตอบแทนในอดีตไม่ได้รับประกันผลตอบแทนในอนาคต",
            "สินทรัพย์ทั้งสามเป็นสินทรัพย์สกุลดอลลาร์ ผู้ลงทุนไทยจึงรับความเสี่ยงค่าเงินเพิ่มอีกชั้นหนึ่ง — "
            "สลับฐานสกุลเงินบนหน้าเว็บเพื่อดูว่าตัวเลขต่างกันแค่ไหน",
            "ดัชนีผลตอบแทนรวมของพันธบัตรสร้างจากอัตราผลตอบแทน 10 ปีด้วยสูตร duration/convexity "
            "ไม่ใช่มูลค่าหน่วยลงทุนจริงของกองทุนพันธบัตร",
            "ราคาทองคำใช้ราคาตลาดโลก ไม่ใช่ราคาทองคำแท่งในประเทศ",
            "ตัวเลขทั้งหมดไม่รวมค่าธรรมเนียมการซื้อขาย ภาษี และต้นทุนการแปลงสกุลเงิน",
            "Monte Carlo simulation สมมติว่าผลตอบแทนมีการแจกแจงแบบปกติและคงที่ตลอดช่วงเวลา ซึ่งเป็นข้อสมมติที่ง่ายกว่าความเป็นจริง",
        ],
    }
    stats_path = WEB_DATA_DIR / "asset-stats.json"
    stats_path.write_text(json.dumps(asset_stats, ensure_ascii=False, indent=2), encoding="utf-8")

    _log("-" * 72)
    _log(f"  เขียน {price_path}  ({len(series_records)} จุดข้อมูล)")
    _log(f"  เขียน {stats_path}")
    _log("เสร็จสิ้น")
    return 0


if __name__ == "__main__":
    sys.exit(build())
