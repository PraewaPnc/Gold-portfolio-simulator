import { assetStats, priceHistory } from "./data";
import type { Currency, MonthlyPoint, MonthlyRow, PricePoint } from "./types";

/**
 * การแปลงฐานสกุลเงินทั้งหมดอยู่ในไฟล์นี้ไฟล์เดียว
 *
 * data-pipeline เก็บ price-history.json เป็นฐาน USD อย่างเดียว พร้อมอัตราแลกเปลี่ยน
 * ของทุกแถว (ฟิลด์ usdthb) การเก็บฐานบาทซ้ำอีกชุดจะทำให้ JSON ที่ถูก bundle
 * เข้าเว็บใหญ่ขึ้นเท่าตัวโดยไม่ได้ข้อมูลใหม่เลย เพราะหาได้ตรง ๆ จากสองค่านี้:
 *
 *     ระดับราคาบาท(t) = ระดับราคา USD(t) x fx(t)
 *     ดัชนีบาท(t)      = ดัชนี USD(t) x fx(t) / fx(แถวแรก)
 *
 * บรรทัดที่สองมาจากการ normalize ใหม่ให้แถวแรกเท่ากับ 100 ในสกุลบาทเช่นกัน
 * ตรงกับที่ compute_stats.py คำนวณสถิติฝั่งบาท จึงไม่มีทางที่กราฟกับตารางจะขัดกัน
 *
 * ส่วนสถิติ (mean, volatility, correlation, CAGR) แปลงแบบนี้ไม่ได้ — ต้องคำนวณ
 * จากอนุกรมผลตอบแทนของสกุลนั้นโดยตรง จึงถูกคำนวณไว้ล่วงหน้าทั้งสองชุดใน asset-stats.json
 */

export const CURRENCY_LABELS = assetStats.meta.currencyLabels;

/** อัตราแลกเปลี่ยนล่าสุด ใช้แปลงจำนวนเงินที่ผู้ใช้กรอกเมื่อสลับสกุล */
export const LATEST_FX = assetStats.meta.latestFxRate;

/** ชื่อหน่วยเงินสำหรับต่อท้ายตัวเลขในข้อความไทย เช่น "1,000,000 บาท" */
export function unitLabel(currency: Currency): string {
  return CURRENCY_LABELS[currency].th;
}

/** สัญลักษณ์สั้น ๆ สำหรับแกนกราฟและที่แคบ ๆ */
export function currencySymbol(currency: Currency): string {
  return CURRENCY_LABELS[currency].symbol;
}

/**
 * แปลงจำนวนเงินข้ามสกุลด้วยอัตราแลกเปลี่ยนล่าสุด แล้วปัดให้เป็นตัวเลขกลม ๆ
 *
 * ใช้ตอนผู้ใช้สลับสกุลเงินระหว่างกรอกตัวเลข — เงินก้อนเดิมควรมีมูลค่าเท่าเดิม
 * ไม่ใช่กลายเป็นคนละขนาดเพราะตัวเลขค้างอยู่ที่เดิม
 * ปัดให้เหลือราวสองหลักนัยสำคัญ (1,000,000 บาท -> 31,000 ดอลลาร์ ไม่ใช่ 30,769)
 * เพราะตัวเลขที่ผู้ใช้ตั้งเองมักเป็นเลขกลม ๆ ผลลัพธ์หลังสลับสกุลจึงควรเป็นเลขกลมด้วย
 */
export function convertAmount(amount: number, from: Currency, to: Currency): number {
  if (from === to || amount <= 0) return amount;
  const converted = to === "thb" ? amount * LATEST_FX : amount / LATEST_FX;
  const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(converted)) - 1);
  return Math.max(magnitude, Math.round(converted / magnitude) * magnitude);
}

/**
 * จำนวนเงินตั้งต้นที่หน้าเว็บใช้เป็นค่าเริ่มต้น กำหนดไว้ในสกุลบาทแล้วแปลงตามสกุลที่เลือก
 * ทำให้พาดหัวหน้าแรกกับค่าตั้งต้นของหน้าจำลองพอร์ตพูดถึงเงินก้อนเดียวกันเสมอ
 */
export const DEFAULT_CAPITAL_THB = 1_000_000;

export function defaultCapital(currency: Currency): number {
  return convertAmount(DEFAULT_CAPITAL_THB, "thb", currency);
}

/**
 * แปลงอนุกรมดัชนีรายสัปดาห์เป็นสกุลที่เลือก แล้ว normalize ให้แถวแรกเท่ากับ 100
 * ฐาน USD คืนอาร์เรย์เดิมโดยไม่คัดลอก เพราะไฟล์เก็บเป็นฐาน USD อยู่แล้ว
 */
export function toCurrencySeries(series: PricePoint[], currency: Currency): PricePoint[] {
  if (currency === "usd" || series.length === 0) return series;
  const baseFx = series[0].usdthb;
  return series.map((p) => {
    const k = p.usdthb / baseFx;
    return { ...p, gold: p.gold * k, equity: p.equity * k, bond: p.bond * k };
  });
}

/**
 * แปลงแถวรายเดือนเป็นสกุลที่เลือก — ทั้งดัชนีฐาน 100 และระดับราคาจริง
 * ระดับราคาถูกยกขึ้นมาเป็น goldPerOz/equityClose เพื่อให้ผู้เรียกใช้ได้โดยไม่ต้องรู้สกุล
 */
export function toCurrencyMonthly(rows: MonthlyPoint[], currency: Currency): MonthlyRow[] {
  if (rows.length === 0) return [];
  const baseFx = rows[0].usdthb;
  return rows.map((r) => {
    const fx = currency === "thb" ? r.usdthb : 1;
    const k = currency === "thb" ? r.usdthb / baseFx : 1;
    return {
      ...r,
      gold: r.gold * k,
      equity: r.equity * k,
      bond: r.bond * k,
      goldPerOz: r.goldUsdPerOz * fx,
      equityClose: r.equityCloseUsd * fx,
    };
  });
}

/** ระดับราคาล่าสุดในสกุลที่เลือก — ตัว bondYieldPct ไม่ขึ้นกับสกุลเงินเพราะเป็นอัตราผลตอบแทน */
export function latestIn(currency: Currency) {
  const l = priceHistory.latest;
  return {
    date: l.date,
    goldPerOz: currency === "thb" ? l.goldThbPerOz : l.goldUsdPerOz,
    equityClose: currency === "thb" ? l.equityCloseThb : l.equityCloseUsd,
    bondYieldPct: l.bondYieldPct,
    usdthb: l.usdthb,
    goldUsdPerOz: l.goldUsdPerOz,
  };
}
