"""
compute_stats.py — ประมวลผลข้อมูลดิบใน raw/ ให้เป็น JSON ที่เว็บแอปใช้งานได้

อ่านจาก:  data-pipeline/raw/*.csv        (สร้างโดย fetch_data.py)
เขียนไป:  web/data/price-history.json    time series ราคา normalize เป็น index 100
          web/data/asset-stats.json      mean, volatility, correlation matrix, metadata

หลักการคำนวณ
------------
1. ทองคำ (บาท)   = ราคาทองคำ USD/ounce x อัตราแลกเปลี่ยน USDTHB
2. หุ้นไทย        = ราคาปิด ETF อ้างอิง SET50 (สกุลบาท, ปรับเงินปันผลแล้ว)
3. ตราสารหนี้     = สร้าง "ดัชนีผลตอบแทนรวม" (total return index) จากอัตราผลตอบแทน 10 ปี
                    เนื่องจากตัว yield เองไม่ใช่ผลตอบแทนที่นักลงทุนได้รับ
                    ใช้สูตรมาตรฐาน carry + duration + convexity รายเดือน:

                        r(t) = y(t-1)/12  -  D_mod * Δy  +  0.5 * C * Δy^2

                    โดย D_mod (modified duration) และ C (convexity) คำนวณจากพันธบัตร
                    ราคาพาร์อายุ 10 ปี ที่จ่ายคูปองเท่ากับ yield ณ เวลานั้น (คำนวณใหม่ทุกเดือน)

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

# อัตราผลตอบแทนปราศจากความเสี่ยงที่ใช้คำนวณ Sharpe ratio
# ตั้งเป็นค่าคงที่โดยอ้างอิงระดับอัตราดอกเบี้ยนโยบายของไทยในระยะยาว (ประมาณ 1.5%)
# ไม่ได้ดึงจาก API เพราะข้อมูลอัตราดอกเบี้ยนโยบายไทยย้อนหลังไม่มีแหล่งฟรีที่เข้าถึงได้
RISK_FREE_RATE = 0.015

ASSET_LABELS = {
    "gold": {"th": "ทองคำ", "en": "Gold (THB)"},
    "equity": {"th": "หุ้นไทย", "en": "Thai Equity"},
    "bond": {"th": "ตราสารหนี้", "en": "Government Bond"},
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
    for key in ("gold", "equity", "bond"):
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
    equity_raw = read_raw("equity_th.csv")
    bond_yield_raw = read_raw("bond_yield.csv")

    # ---------------- ทองคำในหน่วยบาท ----------------
    # อัตราแลกเปลี่ยนและราคาทองคำมีวันหยุดไม่ตรงกัน จึง reindex + forward fill
    fx_daily = usdthb.reindex(
        gold_usd.index.union(usdthb.index)
    ).ffill().reindex(gold_usd.index)
    gold_thb_daily = (gold_usd * fx_daily).dropna()
    gold_usd_daily = gold_usd.reindex(gold_thb_daily.index)

    # ---------------- หุ้นไทย ----------------
    equity_currency = raw_sources["equity"].get("currency", "THB")
    if equity_currency == "USD":
        fx_eq = usdthb.reindex(
            equity_raw.index.union(usdthb.index)
        ).ffill().reindex(equity_raw.index)
        equity_raw = (equity_raw * fx_eq).dropna()
        _log("  หมายเหตุ: แปลงราคาหุ้นจาก USD เป็น THB ด้วยอัตราแลกเปลี่ยนรายวัน")

    # วันสุดท้ายที่มีข้อมูลครบทั้ง 3 สินทรัพย์
    actual_end = min(
        gold_thb_daily.index[-1], equity_raw.index[-1], bond_yield_raw.index[-1]
    )

    def build_frame(rule: str, periods_per_year: int) -> tuple[pd.DataFrame, pd.DataFrame, bool]:
        """
        รวมสินทรัพย์ทั้ง 3 เป็นตารางเดียวที่ความถี่ตาม rule

        คืนค่า (ตารางดัชนีสินทรัพย์, ตารางระดับราคาจริงประกอบ, จุดสุดท้ายเป็นคาบที่ยังไม่จบหรือไม่)
        """
        bond_index, _ = bond_total_return_index(
            resample_last(bond_yield_raw, rule), periods_per_year
        )
        frame = pd.DataFrame(
            {
                "gold": resample_last(gold_thb_daily, rule),
                "equity": resample_last(equity_raw, rule),
                "bond": bond_index,
            }
        ).dropna()

        # resample จะตีตราวันสุดท้ายของคาบเสมอ แม้ข้อมูลจริงจะมีถึงกลางคาบ
        # จึงเปลี่ยนป้ายวันที่ของจุดสุดท้ายให้ตรงกับวันที่มีข้อมูลจริง
        partial = bool(actual_end < frame.index[-1])
        if partial:
            relabelled = frame.index.to_list()
            relabelled[-1] = actual_end
            frame.index = pd.DatetimeIndex(relabelled)

        def align(series: pd.Series) -> pd.Series:
            return series.reindex(series.index.union(frame.index)).ffill().reindex(frame.index)

        extra = pd.DataFrame(
            {
                "goldUsd": align(gold_usd_daily),
                "goldThb": frame["gold"],
                "equityClose": frame["equity"],
                "bondYieldPct": align(bond_yield_raw),
            }
        )
        return frame, extra, partial

    # ---------------- รายเดือน: ใช้คำนวณสถิติ ----------------
    # ความถี่รายเดือนให้ค่า volatility และ correlation ที่เสถียรกว่ารายสัปดาห์
    combined, monthly_extra, has_partial_final_month = build_frame("ME", MONTHS_PER_YEAR)
    if len(combined) < 60:
        raise RuntimeError(f"ข้อมูลที่ทับซ้อนกันมีเพียง {len(combined)} เดือน — น้อยเกินไป")
    _log(f"  รายเดือน (สถิติ)  : {len(combined):4d} คาบ  {combined.index[0].date()} → {combined.index[-1].date()}")

    # ---------------- รายสัปดาห์: ใช้วาดกราฟ ----------------
    # รายเดือนหยาบเกินไปสำหรับช่วง 6 เดือน (ได้แค่ 7 จุด) จึงใช้รายสัปดาห์กับกราฟ
    weekly, weekly_extra, _ = build_frame("W-FRI", WEEKS_PER_YEAR)
    _log(f"  รายสัปดาห์ (กราฟ) : {len(weekly):4d} คาบ  {weekly.index[0].date()} → {weekly.index[-1].date()}")

    if has_partial_final_month:
        _log(
            f"  หมายเหตุ: เดือนสุดท้ายยังไม่จบ (ข้อมูลถึง {actual_end.date()}) "
            "— แสดงในกราฟแต่ไม่นำไปคำนวณสถิติ"
        )

    # normalize กราฟเป็น index 100 ที่จุดแรก
    normalized = weekly / weekly.iloc[0] * 100.0
    series_end = weekly.index[-1]

    # กรอบข้อมูลที่ใช้คำนวณสถิติ — ตัดเดือนที่ยังไม่จบออก
    stats_frame = combined.iloc[:-1] if has_partial_final_month else combined
    start_date, end_date = stats_frame.index[0], stats_frame.index[-1]
    # ข้อมูลราคา N จุด ให้ผลตอบแทน N-1 คาบ และกินเวลาจริง N-1 เดือน
    # ต้องใช้ N-1 เป็นตัวหารของ CAGR ไม่ใช่จำนวนจุดข้อมูล
    n_months = len(stats_frame) - 1
    n_years = n_months / MONTHS_PER_YEAR
    _log("-" * 72)
    _log(f"  ช่วงข้อมูลร่วม: {start_date.date()} → {end_date.date()}  ({n_months} เดือน ≈ {n_years:.1f} ปี)")

    # ---------------- ผลตอบแทนรายเดือน + สถิติ ----------------
    monthly_returns = stats_frame.pct_change().dropna()

    assets: dict[str, dict] = {}
    for key in ("gold", "equity", "bond"):
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
            "sharpe": round((arithmetic_annual - RISK_FREE_RATE) / annual_vol, 4) if annual_vol > 0 else 0.0,
            "maxDrawdown": round(max_drawdown(idx), 6),
            "bestYear": {"year": best_year[0], "return": best_year[1]},
            "worstYear": {"year": worst_year[0], "return": worst_year[1]},
            "calendarYearReturns": yearly,
        }
        _log(
            f"  {ASSET_LABELS[key]['th']:<12s} ผลตอบแทน(arith) {arithmetic_annual*100:6.2f}%/ปี | "
            f"CAGR {cagr*100:6.2f}% | ผันผวน {annual_vol*100:6.2f}% | MaxDD {assets[key]['maxDrawdown']*100:7.2f}%"
        )

    # ---------------- correlation matrix ----------------
    corr = monthly_returns.corr()
    correlation = {
        a: {b: round(float(corr.loc[a, b]), 4) for b in ("gold", "equity", "bond")}
        for a in ("gold", "equity", "bond")
    }
    _log("-" * 72)
    _log("  Correlation matrix (ผลตอบแทนรายเดือน)")
    _log(f"    {'':<10s}{'ทองคำ':>10s}{'หุ้นไทย':>11s}{'ตราสารหนี้':>13s}")
    for a in ("gold", "equity", "bond"):
        row = "".join(f"{correlation[a][b]:>11.3f}" for b in ("gold", "equity", "bond"))
        _log(f"    {ASSET_LABELS[a]['th']:<10s}{row}")

    # ---------------- สถิติแยกตามช่วงเวลาย้อนหลัง ----------------
    # ใช้เปรียบเทียบว่าผลตอบแทนช่วงสั้นกับช่วงยาวต่างกันแค่ไหน
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

    _log("-" * 72)
    _log("  ผลตอบแทนทบต้น (CAGR) แยกตามช่วงเวลา")
    header = "".join(f"{w['label']:>14s}" for w in trailing_returns)
    _log(f"    {'':<12s}{header}")
    for a in ("gold", "equity", "bond"):
        row = "".join(f"{w['assets'][a]['cagr'] * 100:>13.2f}%" for w in trailing_returns)
        _log(f"    {ASSET_LABELS[a]['th']:<12s}{row}")

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

    # series เก็บเฉพาะค่าที่กราฟต้องใช้ เพื่อไม่ให้ JSON ที่ถูก bundle เข้าไปในเว็บใหญ่เกินจำเป็น
    # ส่วนระดับราคาจริงต้องใช้แค่จุดล่าสุด จึงแยกไว้ใน latest
    series_records = [
        {
            "date": str(ts.date()),
            "gold": round(float(normalized.loc[ts, "gold"]), 2),
            "equity": round(float(normalized.loc[ts, "equity"]), 2),
            "bond": round(float(normalized.loc[ts, "bond"]), 2),
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
            "goldThbPerOz": round(float(monthly_extra.loc[ts, "goldThb"]), 2),
            "equityClose": round(float(monthly_extra.loc[ts, "equityClose"]), 4),
            "bondYieldPct": round(float(monthly_extra.loc[ts, "bondYieldPct"]), 4),
        }
        for ts in combined.index
    ]

    last_ts = weekly.index[-1]
    latest = {
        "date": str(last_ts.date()),
        "goldUsdPerOz": round(float(weekly_extra.loc[last_ts, "goldUsd"]), 2),
        "goldThbPerOz": round(float(weekly_extra.loc[last_ts, "goldThb"]), 2),
        "equityClose": round(float(weekly_extra.loc[last_ts, "equityClose"]), 4),
        "bondYieldPct": round(float(weekly_extra.loc[last_ts, "bondYieldPct"]), 4),
        "usdthb": round(
            float(weekly_extra.loc[last_ts, "goldThb"] / weekly_extra.loc[last_ts, "goldUsd"]), 4
        ),
    }

    price_history = {
        "meta": {
            "generatedAt": generated_at,
            "description": (
                "ราคาย้อนหลังรายสัปดาห์ (ราคาปิดวันศุกร์) ของทองคำ, หุ้นไทย และตราสารหนี้ "
                "โดย gold/equity/bond ถูก normalize ให้เริ่มต้นที่ 100 ณ วันแรกของช่วงข้อมูล "
                "ใช้ความถี่รายสัปดาห์เพื่อให้กราฟช่วงสั้น (6 เดือน / 1 ปี) มีจุดข้อมูลเพียงพอ "
                "ส่วนสถิติใน asset-stats.json คำนวณจากข้อมูลรายเดือน"
            ),
            "normalizedBase": 100,
            "dataRange": data_range,
            "fields": {
                "gold": "ดัชนีทองคำในสกุลบาท (ฐาน 100)",
                "equity": "ดัชนีหุ้นไทย (ฐาน 100, รวมเงินปันผล)",
                "bond": "ดัชนีผลตอบแทนรวมตราสารหนี้ (ฐาน 100)",
                "latest.goldUsdPerOz": "ราคาทองคำตลาดโลก หน่วย USD ต่อทรอยออนซ์",
                "latest.goldThbPerOz": "ราคาทองคำแปลงเป็นเงินบาท ต่อทรอยออนซ์",
                "latest.equityClose": "ราคาปิดจริงของ ETF อ้างอิง SET50 (บาท)",
                "latest.bondYieldPct": "อัตราผลตอบแทนพันธบัตร 10 ปี (%)",
                "latest.usdthb": "อัตราแลกเปลี่ยน USD/THB ที่ใช้แปลงราคาทองคำ",
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
            "riskFreeRate": RISK_FREE_RATE,
            "riskFreeRateNote": (
                "สมมติฐานอัตราผลตอบแทนปราศจากความเสี่ยงที่ 1.5% ต่อปี "
                "อ้างอิงระดับอัตราดอกเบี้ยนโยบายของไทยโดยประมาณ (ไม่ได้ดึงจาก API)"
            ),
            "returnConvention": (
                "annualReturn เป็น arithmetic mean ของผลตอบแทนรายเดือน x 12 "
                "ใช้เป็น input ของ Monte Carlo simulation | "
                "cagr เป็นผลตอบแทนทบต้นที่เกิดขึ้นจริงในช่วงข้อมูล"
            ),
        },
        "assets": assets,
        "trailingReturns": trailing_returns,
        "correlation": correlation,
        "sources": {
            "gold": {
                "label": "ทองคำ",
                "method": "ราคาทองคำ USD/troy ounce x อัตราแลกเปลี่ยน USDTHB = ราคาในสกุลบาท",
                "priceSource": raw_sources["gold_usd"],
                "fxSource": raw_sources["usdthb"],
                "isProxy": False,
                "notes": (
                    "ใช้ราคาตลาดโลกแปลงเป็นเงินบาท ไม่ใช่ราคาทองคำแท่ง 96.5% "
                    "ของสมาคมค้าทองคำ ซึ่งไม่มี API สาธารณะให้ดึงย้อนหลัง "
                    "ราคาทองคำแท่งในประเทศจะเคลื่อนไหวใกล้เคียงกันแต่มีส่วนต่างค่าพรีเมียมและความบริสุทธิ์"
                ),
            },
            "equity": {
                "label": "หุ้นไทย",
                "method": "ราคาปิดรายวันของ ETF อ้างอิงดัชนี SET50 ปรับเงินปันผลแล้ว แปลงเป็นรายเดือน",
                "priceSource": raw_sources["equity"],
                "isProxy": True,
                "notes": (
                    "ดัชนี SET โดยตรง (^SET.BK) บน Yahoo Finance ไม่มีข้อมูล time series ย้อนหลัง "
                    "จึงใช้ ETF ที่จดทะเบียนในตลาดหลักทรัพย์ไทยและอ้างอิงดัชนี SET50 เป็นตัวแทน "
                    "SET50 ครอบคลุมหุ้นขนาดใหญ่ 50 ตัวแรก จึงมีทิศทางใกล้เคียงดัชนี SET "
                    "แต่ไม่รวมหุ้นขนาดกลาง-เล็ก"
                ),
            },
            "bond": {
                "label": "ตราสารหนี้",
                "method": (
                    "แปลงอัตราผลตอบแทนพันธบัตร 10 ปี เป็นดัชนีผลตอบแทนรวมรายเดือน "
                    "ด้วยสูตร carry + duration + convexity: r = y/12 - D_mod x Δy + 0.5 x C x Δy²"
                ),
                "priceSource": raw_sources["bond_yield"],
                "isProxy": True,
                "notes": raw_sources["bond_yield"].get("proxyNote", ""),
            },
        },
        "disclaimers": [
            "เคสศึกษานี้จัดทำเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน",
            "ผลตอบแทนในอดีตไม่ได้รับประกันผลตอบแทนในอนาคต",
            "ข้อมูลหุ้นไทยใช้ ETF อ้างอิงดัชนี SET50 เป็นตัวแทนของตลาดหุ้นไทย",
            "ข้อมูลตราสารหนี้ใช้พันธบัตรรัฐบาลสหรัฐฯ อายุ 10 ปี เป็น proxy เนื่องจากไม่มีแหล่งข้อมูลพันธบัตรไทยที่เข้าถึงได้ฟรี",
            "ราคาทองคำใช้ราคาตลาดโลกแปลงเป็นเงินบาท ไม่ใช่ราคาทองคำแท่งในประเทศ",
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
