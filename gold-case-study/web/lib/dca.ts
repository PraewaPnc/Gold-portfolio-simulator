import type { MonthlyRow } from "./types";

/**
 * แบบจำลอง DCA ทำงานบน "ราคาจริงรายเดือน" ที่ดึงมาจริง ไม่ใช่การสุ่ม
 * ต่างจากหน้าจำลองพอร์ตที่ใช้ Monte Carlo — หน้านี้ตอบคำถามว่า
 * "ถ้าทำแบบนี้ในอดีตที่เกิดขึ้นจริง ผลจะเป็นอย่างไร" ซึ่งตรวจสอบย้อนกลับได้ทุกงวด
 */

export interface DcaInput {
  /** เงินก้อนแรกที่ลงในงวดแรกพร้อมกับเงินงวดของเดือนนั้น */
  initial: number;
  /** เงินที่ลงเพิ่มทุกสิ้นเดือน */
  monthly: number;
}

export interface DcaPoint {
  date: string;
  /** เงินที่ใส่เข้าไปสะสมถึงงวดนี้ */
  invested: number;
  /** มูลค่าของหน่วยที่ถืออยู่ ณ ราคาปิดของงวดนี้ */
  value: number;
  units: number;
  price: number;
  gain: number;
}

export interface DcaResult {
  points: DcaPoint[];
  /** จำนวนงวดที่ซื้อจริง */
  periods: number;
  invested: number;
  value: number;
  gain: number;
  /** กำไรคิดเป็นสัดส่วนของเงินที่ใส่ทั้งหมด — ไม่ใช่ผลตอบแทนต่อปี */
  gainPct: number;
  units: number;
  /** ต้นทุนเฉลี่ยต่อหน่วย = เงินที่ใส่ทั้งหมด / หน่วยที่ได้ */
  avgCost: number;
  finalPrice: number;
  /**
   * ผลตอบแทนต่อปีแบบถ่วงน้ำหนักด้วยเงิน (money-weighted / IRR)
   * ต้องใช้ตัวนี้กับ DCA เพราะเงินแต่ละก้อนอยู่ในตลาดไม่เท่ากัน
   * ถ้าใช้ "กำไรรวม ÷ เงินที่ใส่" จะดูต่ำเกินจริงเสมอ เนื่องจากเงินงวดท้าย ๆ เพิ่งเข้าไปไม่กี่เดือน
   */
  irr: number;
  start: string;
  end: string;
  /** สัดส่วนที่มูลค่าต่ำกว่าเงินที่ใส่ไปมากที่สุดระหว่างทาง (ค่าติดลบ) */
  worstShortfall: number;
  /** จำนวนงวดที่มูลค่าพอร์ตต่ำกว่าเงินที่ใส่ไปแล้ว */
  monthsUnderwater: number;
}

/**
 * ราคาที่ใช้ซื้อของแต่ละสินทรัพย์ — ทองใช้ราคาต่อออนซ์จริง ที่เหลือใช้ดัชนีฐาน 100
 *
 * แถวที่ส่งเข้ามาต้องผ่าน toCurrencyMonthly() มาแล้ว ทั้งราคาและดัชนีจึงอยู่ในสกุล
 * ที่ผู้ใช้เลือก การคำนวณ DCA ที่เหลือจึงไม่ต้องรู้เรื่องสกุลเงินเลย
 */
export const PRICE_OF = {
  gold: (r: MonthlyRow) => r.goldPerOz,
  equity: (r: MonthlyRow) => r.equity,
  bond: (r: MonthlyRow) => r.bond,
} as const;

export type DcaAssetKey = keyof typeof PRICE_OF;

export interface DcaWindow {
  /** งวดที่ซื้อได้ — เดือนที่ปิดครบเดือนแล้วเท่านั้น */
  buyRows: MonthlyRow[];
  /**
   * จุดตีมูลค่าปิดท้ายจากเดือนล่าสุดที่ยังไม่ครบเดือน (ถ้ามี)
   * ไม่ซื้อเพิ่มในงวดนี้ เพื่อให้คงหลักเดียวกับสถิติส่วนอื่นของเคสที่ตัดเดือนไม่เต็มทิ้ง
   * แต่ยังได้ใช้ราคาล่าสุดที่มีเป็นมูลค่าปัจจุบัน
   */
  finalRow: MonthlyRow | null;
}

/**
 * ตัดหน้าต่างเวลาแบบ "ย้อนหลัง N ปีจากข้อมูลล่าสุด"
 * completeThrough คือวันสุดท้ายที่ถือว่าเดือนนั้นปิดครบแล้ว (dataRange.end)
 */
export function dcaWindow(
  monthly: MonthlyRow[],
  years: number,
  completeThrough: string,
): DcaWindow {
  const complete = monthly.filter((r) => r.date <= completeThrough);
  const partial = monthly.filter((r) => r.date > completeThrough);
  const wanted = Math.max(1, Math.round(years * 12));
  return {
    buyRows: complete.slice(Math.max(0, complete.length - wanted)),
    finalRow: partial.length > 0 ? partial[partial.length - 1] : null,
  };
}

/**
 * จำนวนปีสูงสุดที่ข้อมูลรองรับ — ปัดลงให้ได้ปีเต็ม
 * นับจากจำนวนแถว ไม่ใช่ระดับราคา จึงเท่ากันทุกสกุลเงินและรับแถวดิบได้เลย
 */
export function maxDcaYears(monthly: { date: string }[], completeThrough: string): number {
  return Math.floor(monthly.filter((r) => r.date <= completeThrough).length / 12);
}

/**
 * หา IRR รายเดือนด้วยการแบ่งครึ่งช่วง (bisection)
 * เลือกวิธีนี้เพราะไม่ต้องหาอนุพันธ์และไม่หลุดกรอบเหมือน Newton–Raphson
 * flows[i] คือกระแสเงินสด ณ เดือนที่ i (ติดลบ = จ่ายเงินเข้า, บวก = มูลค่าที่ได้คืน)
 *
 * NPV เป็นฟังก์ชันลดลงตาม r สำหรับรูปแบบกระแสเงินสดของ DCA (จ่ายเข้าตลอด รับคืนก้อนเดียวตอนท้าย)
 * จึงมีรากเดียวและ bisection ลู่เข้าเสมอเมื่อคร่อมรากได้
 */
export function irrMonthly(flows: number[]): number {
  const npv = (r: number) => {
    // คูณสะสมตัวคิดลดแทนการยกกำลังทีละงวด เพื่อไม่ให้เสียความแม่นยำเมื่อจำนวนงวดมาก
    let acc = 0;
    let disc = 1;
    const step = 1 / (1 + r);
    for (const f of flows) {
      acc += f * disc;
      disc *= step;
    }
    return acc;
  };

  /*
   * ต้องไล่ขอบล่างจากช่วงแคบไปกว้าง ไม่ใช่กระโดดไปที่ -99.99% ทันที
   * เพราะตัวคิดลดที่ r ใกล้ -1 จะโตจนล้นเลขทศนิยมเมื่อมีหลายร้อยงวด
   * แล้ว NPV จะกลายเป็น NaN ทั้งที่รากอยู่ในช่วงที่คำนวณได้สบาย ๆ
   */
  let lo = NaN;
  for (const candidate of [-0.5, -0.8, -0.95, -0.999]) {
    const v = npv(candidate);
    if (!Number.isNaN(v) && v > 0) {
      lo = candidate;
      break;
    }
  }

  let hi = NaN;
  for (const candidate of [1, 5, 20]) {
    const v = npv(candidate);
    if (!Number.isNaN(v) && v < 0) {
      hi = candidate;
      break;
    }
  }

  // คร่อมรากไม่ได้ = ไม่มีรากที่มีความหมาย (เช่น ไม่ได้ลงเงินเลย)
  if (Number.isNaN(lo) || Number.isNaN(hi)) return NaN;

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const v = npv(mid);
    if (!Number.isNaN(v) && v > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * รัน DCA บนงวดที่กำหนด — ซื้อที่ราคาปิดของทุกงวดด้วยจำนวนเงินเท่ากัน
 * งวดแรกลงเงินก้อนแรกพร้อมเงินงวดของเดือนนั้นด้วย
 */
export function runDca(
  win: DcaWindow,
  priceOf: (r: MonthlyRow) => number,
  input: DcaInput,
): DcaResult {
  const { buyRows, finalRow } = win;
  const initial = Math.max(0, input.initial);
  const monthly = Math.max(0, input.monthly);

  const points: DcaPoint[] = [];
  const flows: number[] = [];

  let units = 0;
  let invested = 0;

  buyRows.forEach((row, i) => {
    const price = priceOf(row);
    const contribution = monthly + (i === 0 ? initial : 0);

    if (price > 0) units += contribution / price;
    invested += contribution;
    flows.push(-contribution);

    const value = units * price;
    points.push({ date: row.date, invested, value, units, price, gain: value - invested });
  });

  // งวดปิดท้ายไม่มีการซื้อ มีแต่การตีมูลค่าใหม่ตามราคาล่าสุด
  if (finalRow) {
    const price = priceOf(finalRow);
    const value = units * price;
    flows.push(0);
    points.push({ date: finalRow.date, invested, value, units, price, gain: value - invested });
  }

  const last = points[points.length - 1];
  const value = last?.value ?? 0;
  const finalPrice = last?.price ?? 0;

  // มูลค่าปลายทางเป็นกระแสเงินสดรับของงวดสุดท้าย จึงบวกทับเข้าไปในงวดนั้น
  if (flows.length > 0) flows[flows.length - 1] += value;

  const r = irrMonthly(flows);
  const irr = Number.isFinite(r) ? (1 + r) ** 12 - 1 : 0;

  let worstShortfall = 0;
  let monthsUnderwater = 0;
  for (const p of points) {
    if (p.invested <= 0) continue;
    const rel = (p.value - p.invested) / p.invested;
    if (rel < worstShortfall) worstShortfall = rel;
    if (p.value < p.invested) monthsUnderwater++;
  }

  return {
    points,
    periods: buyRows.length,
    invested,
    value,
    gain: value - invested,
    gainPct: invested > 0 ? (value - invested) / invested : 0,
    units,
    avgCost: units > 0 ? invested / units : 0,
    finalPrice,
    irr,
    start: buyRows[0]?.date ?? "",
    end: last?.date ?? "",
    worstShortfall,
    monthsUnderwater,
  };
}
