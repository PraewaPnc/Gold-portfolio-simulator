import type { Currency } from "./types";

/**
 * ตัวจัดรูปแบบตัวเลขทั้งหมดถูกสร้างครั้งเดียวไว้ระดับโมดูล
 * เพื่อไม่ให้สร้าง Intl.NumberFormat ใหม่ทุกครั้งที่ re-render
 *
 * ทั้งสองสกุลใช้ locale "th-TH" เหมือนกัน เพราะหน้าเว็บเป็นภาษาไทยทั้งหมด
 * — สิ่งที่ต่างกันคือจำนวนทศนิยม ไม่ใช่รูปแบบตัวคั่นหลัก
 */
const integerFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });
const compactFormatter = new Intl.NumberFormat("th-TH", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const decimalFormatter = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** จำนวนเงินแบบเต็ม เช่น 1,234,568 — ใช้กับยอดเงินของพอร์ตทั้งสองสกุล */
export const money = (n: number): string => integerFormatter.format(Math.round(n));

/** จำนวนเงินแบบย่อ เช่น 1.2 ล้าน — ใช้กับแกนกราฟ */
export const moneyCompact = (n: number): string => compactFormatter.format(n);

/**
 * ระดับราคาของสินทรัพย์ เช่น ราคาทองต่อออนซ์
 * ฝั่ง USD ต้องมีทศนิยมเพราะราคาหลักพันต้น ๆ การปัดทิ้งทำให้เทียบรายเดือนไม่เห็นความต่าง
 * ฝั่งบาทเป็นเลขหลักแสน ทศนิยมไม่มีความหมาย
 */
export const price = (n: number, currency: Currency): string =>
  currency === "usd" ? decimalFormatter.format(n) : integerFormatter.format(Math.round(n));

/** ตัวเลขทศนิยม 2 ตำแหน่ง เช่น 12.34 — ใช้กับจำนวนหน่วยสินทรัพย์ที่สะสมได้ */
export const dec2 = (n: number): string => decimalFormatter.format(n);

/** สัดส่วนเป็นเปอร์เซ็นต์ เช่น pct(0.0959) -> "9.6%" */
export const pct = (n: number, digits = 1): string => `${(n * 100).toFixed(digits)}%`;

/** เปอร์เซ็นต์พร้อมเครื่องหมาย +/- เช่น "+51.6%" */
export const pctSigned = (n: number, digits = 1): string =>
  `${n >= 0 ? "+" : ""}${(n * 100).toFixed(digits)}%`;
