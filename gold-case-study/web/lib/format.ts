/**
 * ตัวจัดรูปแบบตัวเลขทั้งหมดใช้ locale "th-TH" และถูกสร้างครั้งเดียวไว้ระดับโมดูล
 * เพื่อไม่ให้สร้าง Intl.NumberFormat ใหม่ทุกครั้งที่ re-render
 */
const integerFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });
const compactFormatter = new Intl.NumberFormat("th-TH", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** จำนวนเงินบาทแบบเต็ม เช่น 1,234,568 */
export const thb = (n: number): string => integerFormatter.format(Math.round(n));

const usdFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** จำนวนเงินดอลลาร์ เช่น 4,340.70 */
export const usd = (n: number): string => usdFormatter.format(n);

/** จำนวนเงินแบบย่อ เช่น 1.2 ล้าน — ใช้กับแกนกราฟ */
export const thbCompact = (n: number): string => compactFormatter.format(n);

/** สัดส่วนเป็นเปอร์เซ็นต์ เช่น pct(0.0959) -> "9.6%" */
export const pct = (n: number, digits = 1): string => `${(n * 100).toFixed(digits)}%`;

/** เปอร์เซ็นต์พร้อมเครื่องหมาย +/- เช่น "+51.6%" */
export const pctSigned = (n: number, digits = 1): string =>
  `${n >= 0 ? "+" : ""}${(n * 100).toFixed(digits)}%`;
