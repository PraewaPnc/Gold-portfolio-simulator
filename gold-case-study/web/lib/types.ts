export type AssetKey = "gold" | "equity" | "bond";

export const ASSETS: AssetKey[] = ["gold", "equity", "bond"];

/**
 * สินทรัพย์ทั้งสามเป็นสินทรัพย์สกุลดอลลาร์ ผลตอบแทนที่นักลงทุนไทยได้รับจริง
 * จึงรวมการเคลื่อนไหวของค่าเงินเข้าไปด้วย เว็บจึงแสดงได้ทั้งสองฐาน
 */
export type Currency = "usd" | "thb";

export const CURRENCIES: Currency[] = ["usd", "thb"];

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

/**
 * สถิติครบชุดของฐานสกุลเงินหนึ่ง
 *
 * ผลตอบแทน ความผันผวน และสหสัมพันธ์ต่างกันระหว่างสองฐาน เพราะค่าเงินเป็นอีก
 * แหล่งความผันผวนหนึ่ง data-pipeline จึงคำนวณแยกกันคนละชุด ไม่ใช่แปลงตัวเลขสุดท้าย
 */
export interface CurrencyStats {
  riskFreeRate: number;
  assets: Record<AssetKey, AssetStat>;
  trailingReturns: TrailingReturn[];
  correlation: Record<AssetKey, Record<AssetKey, number>>;
}

export interface CurrencyLabel {
  th: string;
  code: string;
  symbol: string;
}

export interface AssetStats {
  meta: {
    generatedAt: string;
    fetchedAt: string;
    dataRange: DataRange;
    currencies: Currency[];
    defaultCurrency: Currency;
    currencyLabels: Record<Currency, CurrencyLabel>;
    /** อัตราแลกเปลี่ยนล่าสุด ใช้แปลงจำนวนเงินที่ผู้ใช้กรอกเมื่อสลับสกุล */
    latestFxRate: number;
    currencyNote: string;
    riskFreeRateNote: string;
    returnConvention: string;
  };
  byCurrency: Record<Currency, CurrencyStats>;
  sources: Record<AssetKey, AssetSource>;
  riskFreeSource?: PriceSource;
  disclaimers: string[];
}

/**
 * จุดข้อมูลรายสัปดาห์บนกราฟ — เก็บดัชนีฐาน 100 ในสกุล USD พร้อมอัตราแลกเปลี่ยนของแถวนั้น
 * ฐานบาทคำนวณในเว็บด้วย toCurrencySeries() ไม่ได้เก็บซ้ำอีกชุดเพื่อไม่ให้ไฟล์ใหญ่เป็นเท่าตัว
 */
export interface PricePoint {
  date: string;
  gold: number;
  equity: number;
  bond: number;
  usdthb: number;
}

/** ระดับราคาจริง ณ จุดล่าสุด — ใช้แสดงในการ์ดสรุป */
export interface LatestPrices {
  date: string;
  goldUsdPerOz: number;
  goldThbPerOz: number;
  equityCloseUsd: number;
  equityCloseThb: number;
  bondYieldPct: number;
  usdthb: number;
}

/** แถวข้อมูลรายเดือนดิบจาก data-pipeline — ดัชนีและระดับราคาเป็นฐาน USD */
export interface MonthlyPoint {
  date: string;
  gold: number;
  equity: number;
  bond: number;
  goldUsdPerOz: number;
  equityCloseUsd: number;
  bondYieldPct: number;
  usdthb: number;
}

/**
 * แถวรายเดือนหลังแปลงเป็นสกุลที่ผู้ใช้เลือกแล้ว
 * gold/equity/bond ถูก rebase ให้แถวแรกของชุดเท่ากับ 100 ในสกุลนั้น
 * ส่วน goldPerOz/equityClose เป็นระดับราคาจริงในสกุลนั้น
 */
export interface MonthlyRow extends MonthlyPoint {
  goldPerOz: number;
  equityClose: number;
}

export interface PriceHistory {
  meta: {
    generatedAt: string;
    description: string;
    normalizedBase: number;
    baseCurrency: Currency;
    currencyNote: string;
    dataRange: DataRange;
    fields: Record<string, string>;
  };
  latest: LatestPrices;
  series: PricePoint[];
  monthly: MonthlyPoint[];
}
