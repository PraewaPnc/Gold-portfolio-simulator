import assetStatsJson from "@/data/asset-stats.json";
import priceHistoryJson from "@/data/price-history.json";

import type { AssetKey, AssetStats, PriceHistory } from "./types";

/**
 * ข้อมูลทั้งหมดมาจาก data-pipeline/ ซึ่งเขียนไฟล์ JSON ทับที่ web/data/
 * จึงเป็น static import — ไม่มีการเรียก API ตอน runtime
 */
export const assetStats = assetStatsJson as unknown as AssetStats;
export const priceHistory = priceHistoryJson as unknown as PriceHistory;

export const dataRange = assetStats.meta.dataRange;

/**
 * ชื่อสินทรัพย์ไม่ขึ้นกับฐานสกุลเงิน (ทั้งสองชุดเก็บชื่อเดียวกัน)
 * จึงอ่านจากชุดใดก็ได้ — มีไว้ให้ server component ที่เรียก useCurrency() ไม่ได้
 */
export function assetLabel(key: AssetKey): string {
  return assetStats.byCurrency[assetStats.meta.defaultCurrency].assets[key].label;
}

export function assetLabelEn(key: AssetKey): string {
  return assetStats.byCurrency[assetStats.meta.defaultCurrency].assets[key].labelEn;
}

/** จำนวนปีของข้อมูลแบบปัดทศนิยม 1 ตำแหน่ง เช่น "18.6" */
export const dataYears = dataRange.years.toFixed(1);

/** เช่น "ก.ค. 2549 – ก.ค. 2569" สำหรับแสดงบน badge */
export function formatDataRangeLabel(): string {
  return `${formatThaiMonthYear(dataRange.start)} – ${formatThaiMonthYear(dataRange.end)}`;
}

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/** แปลง "2008-01-31" -> "ม.ค. 2008" (ค.ศ.) */
export function formatThaiMonthYear(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${THAI_MONTHS_SHORT[m - 1]} ${y}`;
}

/** แปลง "2026-08-07" -> "7 ส.ค. 2026" */
export function formatThaiDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${THAI_MONTHS_SHORT[m - 1]} ${y}`;
}

/** แปลง ISO timestamp เป็นวันที่ไทย */
export function formatThaiTimestamp(iso: string): string {
  return formatThaiDate(iso.slice(0, 10));
}
