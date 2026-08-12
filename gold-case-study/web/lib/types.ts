export type AssetKey = "gold" | "equity" | "bond";

export const ASSETS: AssetKey[] = ["gold", "equity", "bond"];

export interface DataRange {
  start: string;
  end: string;
  months: number;
  years: number;
  frequency: string;
  /** ช่วงของ time series บนกราฟ ซึ่งเป็นรายสัปดาห์และอาจใหม่กว่าช่วงที่ใช้คำนวณสถิติ */
  seriesStart: string;
  seriesEnd: string;
  seriesFrequency: string;
  seriesPoints: number;
  excludedPartialFinalMonth: boolean;
}

export interface AssetStat {
  key: AssetKey;
  label: string;
  labelEn: string;
  /** arithmetic mean ของผลตอบแทนรายเดือน x 12 — ใช้เป็น input ของ Monte Carlo */
  annualReturn: number;
  annualVolatility: number;
  /** ผลตอบแทนทบต้นที่เกิดขึ้นจริงในช่วงข้อมูล */
  cagr: number;
  totalReturn: number;
  sharpe: number;
  maxDrawdown: number;
  bestYear: { year: string; return: number };
  worstYear: { year: string; return: number };
  calendarYearReturns: Record<string, number>;
}

export interface PriceSource {
  ticker: string;
  description: string;
  provider: string;
  rows: number;
  start: string;
  end: string;
  isProxy?: boolean;
  proxyNote?: string;
  currency?: string;
}

export interface AssetSource {
  label: string;
  method: string;
  priceSource: PriceSource;
  fxSource?: PriceSource;
  isProxy: boolean;
  notes: string;
}

/** สถิติของสินทรัพย์หนึ่งตัวภายในช่วงเวลาย้อนหลังช่วงหนึ่ง */
export interface WindowAssetStat {
  cagr: number;
  totalReturn: number;
  annualVolatility: number;
  maxDrawdown: number;
}

/** ผลตอบแทนย้อนหลังช่วงหนึ่ง เช่น 1 ปี / 5 ปี / 10 ปี / ทั้งหมด */
export interface TrailingReturn {
  key: string;
  label: string;
  months: number;
  years: number;
  start: string;
  end: string;
  assets: Record<AssetKey, WindowAssetStat>;
}

export interface AssetStats {
  meta: {
    generatedAt: string;
    fetchedAt: string;
    dataRange: DataRange;
    riskFreeRate: number;
    riskFreeRateNote: string;
    returnConvention: string;
  };
  assets: Record<AssetKey, AssetStat>;
  trailingReturns: TrailingReturn[];
  correlation: Record<AssetKey, Record<AssetKey, number>>;
  sources: Record<AssetKey, AssetSource>;
  disclaimers: string[];
}

/** จุดข้อมูลรายสัปดาห์บนกราฟ — เก็บเฉพาะดัชนีฐาน 100 เพื่อให้ไฟล์เล็ก */
export interface PricePoint {
  date: string;
  gold: number;
  equity: number;
  bond: number;
}

/** ระดับราคาจริง ณ จุดล่าสุด — ใช้แสดงในการ์ดสรุป */
export interface LatestPrices {
  date: string;
  goldUsdPerOz: number;
  goldThbPerOz: number;
  equityClose: number;
  bondYieldPct: number;
  usdthb: number;
}

/** แถวข้อมูลรายเดือน ใช้ในตารางหน้ารายละเอียดสินทรัพย์ */
export interface MonthlyPoint {
  date: string;
  gold: number;
  equity: number;
  bond: number;
  goldUsdPerOz: number;
  goldThbPerOz: number;
  equityClose: number;
  bondYieldPct: number;
}

export interface PriceHistory {
  meta: {
    generatedAt: string;
    description: string;
    normalizedBase: number;
    dataRange: DataRange;
    fields: Record<string, string>;
  };
  latest: LatestPrices;
  series: PricePoint[];
  monthly: MonthlyPoint[];
}
