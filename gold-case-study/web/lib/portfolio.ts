import { ASSETS, type AssetKey, type AssetStats } from "./types";

/**
 * น้ำหนักของเงินทุนทั้งก้อน — รวมกันได้ 1 เสมอ
 * cash คือ "สำรองเงินสด" ที่กันออกก่อน ไม่ใช่สินทรัพย์ลงทุน จึงไม่อยู่ใน ASSETS
 * (ไม่มีสถิติผลตอบแทน/ความผันผวน/สหสัมพันธ์ใน asset-stats.json)
 */
export type Weights = Record<AssetKey, number> & { cash: number };

/** เพดานสำรองเงินสด — กันไม่ให้เหลือเงินลงทุนน้อยจนแบบจำลองไม่มีความหมาย */
export const MAX_CASH = 0.3;

export interface MarketModel {
  /** ผลตอบแทนคาดหวังรายปี (arithmetic) ของแต่ละสินทรัพย์ */
  mu: Record<AssetKey, number>;
  /** ความผันผวนรายปี */
  sigma: Record<AssetKey, number>;
  corr: Record<AssetKey, Record<AssetKey, number>>;
  cov: number[][];
  /** Cholesky factor ของ covariance matrix ใช้สร้างผลตอบแทนที่มีสหสัมพันธ์กัน */
  chol: number[][];
  riskFree: number;
}

/**
 * สร้าง market model จากสถิติที่คำนวณจากข้อมูลย้อนหลังจริง (asset-stats.json)
 * แทนที่จะใช้ตัวเลขสมมติฐานแบบต้นแบบ
 */
export function buildMarketModel(stats: AssetStats): MarketModel {
  const mu = {} as Record<AssetKey, number>;
  const sigma = {} as Record<AssetKey, number>;
  for (const a of ASSETS) {
    mu[a] = stats.assets[a].annualReturn;
    sigma[a] = stats.assets[a].annualVolatility;
  }
  const corr = stats.correlation;

  const cov = ASSETS.map((i) => ASSETS.map((j) => sigma[i] * sigma[j] * corr[i][j]));

  return { mu, sigma, corr, cov, chol: cholesky(cov), riskFree: stats.meta.riskFreeRate };
}

/** Cholesky decomposition ของเมทริกซ์สมมาตร n x n (คืน lower-triangular L โดย L·Lᵀ = A) */
export function cholesky(a: number[][]): number[][] {
  const n = a.length;
  const l = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += l[i][k] * l[j][k];
      if (i === j) l[i][j] = Math.sqrt(Math.max(a[i][i] - sum, 0));
      else l[i][j] = l[j][j] !== 0 ? (a[i][j] - sum) / l[j][j] : 0;
    }
  }
  return l;
}

/**
 * PRNG แบบกำหนด seed ได้ (mulberry32)
 * ใช้แทน Math.random() เพื่อให้ผลลัพธ์ simulation เหมือนเดิมทุกครั้งที่ render
 * — ป้องกัน hydration mismatch ระหว่าง server/client และทำให้ตัวเลขที่นำเสนอทำซ้ำได้
 */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** สุ่มค่าจากการแจกแจงปกติมาตรฐานด้วยวิธี Box–Muller */
function makeNormal(rand: () => number): () => number {
  return () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

export interface PortfolioStats {
  ret: number;
  vol: number;
  sharpe: number;
}

/**
 * ผลตอบแทนคาดหวัง ความผันผวน และ Sharpe ratio ของเงินทุนทั้งก้อนตามน้ำหนักที่กำหนด
 *
 * สำรองเงินสดเข้าสูตรในฐานะสินทรัพย์ที่ให้ผลตอบแทนเท่าอัตราปราศจากความเสี่ยง
 * และมีความผันผวนเป็นศูนย์ จึงไม่มีพจน์ความแปรปรวนร่วมกับสินทรัพย์อื่น
 * ผลที่ตามมาคือเงินสดลดทั้งผลตอบแทนคาดหวังและความผันผวนตามสัดส่วนเดียวกัน
 * Sharpe ratio จึงไม่เปลี่ยน (เป็นพฤติกรรมของ capital allocation line ตามทฤษฎี)
 */
export function portfolioStats(w: Weights, model: MarketModel): PortfolioStats {
  const wArr = ASSETS.map((a) => w[a]);
  let ret = w.cash * model.riskFree;
  ASSETS.forEach((a, i) => {
    ret += wArr[i] * model.mu[a];
  });

  let variance = 0;
  for (let i = 0; i < ASSETS.length; i++) {
    for (let j = 0; j < ASSETS.length; j++) {
      variance += wArr[i] * wArr[j] * model.cov[i][j];
    }
  }
  const vol = Math.sqrt(Math.max(variance, 0));
  const sharpe = vol > 0 ? (ret - model.riskFree) / vol : 0;
  return { ret, vol, sharpe };
}

export interface RiskProfile {
  gold: number;
  equity: number;
  bond: number;
  label: string;
}

export const PROFILES: Record<string, RiskProfile> = {
  conservative: { gold: 0.2, equity: 0.2, bond: 0.6, label: "อนุรักษ์นิยม" },
  moderate: { gold: 0.15, equity: 0.5, bond: 0.35, label: "ปานกลาง" },
  aggressive: { gold: 0.08, equity: 0.8, bond: 0.12, label: "เชิงรุก" },
};

export type ProfileKey = keyof typeof PROFILES;

/**
 * หมุดของแต่ละโปรไฟล์บนแกน "สัดส่วนทองคำ" เรียงจากทองน้อยไปมาก
 * ทองยิ่งมาก = ยิ่งอนุรักษ์นิยม จึงได้ลำดับ เชิงรุก → ปานกลาง → อนุรักษ์นิยม
 */
export const GOLD_ANCHORS: { key: ProfileKey; label: string; gold: number; equityShare: number }[] =
  (["aggressive", "moderate", "conservative"] as ProfileKey[]).map((key) => {
    const p = PROFILES[key];
    const denom = p.equity + p.bond;
    return { key, label: p.label, gold: p.gold, equityShare: denom > 0 ? p.equity / denom : 0.5 };
  });

export interface RiskBand {
  key: ProfileKey;
  label: string;
  /** สัดส่วนทองคำที่เป็นหมุดของระดับนี้ */
  gold: number;
  /** ขอบล่างของช่วงสัดส่วนทองคำ (0 สำหรับระดับเสี่ยงสูงสุด) */
  lo: number;
  /** ขอบบนของช่วงสัดส่วนทองคำ (Infinity สำหรับระดับเสี่ยงต่ำสุด) */
  hi: number;
}

/**
 * ช่วงสัดส่วนทองคำของแต่ละระดับความเสี่ยง
 * เส้นแบ่งคือจุดกึ่งกลางระหว่างหมุดที่ติดกัน จึงรับประกันว่าหมุดของแต่ละระดับตกในช่วงของตัวเองเสมอ
 */
export const RISK_BANDS: RiskBand[] = GOLD_ANCHORS.map((a, i) => ({
  key: a.key,
  label: a.label,
  gold: a.gold,
  lo: i === 0 ? 0 : (GOLD_ANCHORS[i - 1].gold + a.gold) / 2,
  hi: i === GOLD_ANCHORS.length - 1 ? Infinity : (a.gold + GOLD_ANCHORS[i + 1].gold) / 2,
}));

/** หาว่าสัดส่วนทองคำที่ให้มาตกอยู่ในระดับความเสี่ยงใด — ใช้ตัดสินว่าปุ่มไหนควรไฮไลต์ */
export function riskBandForGold(goldW: number): RiskBand {
  return RISK_BANDS.find((b) => goldW < b.hi) ?? RISK_BANDS[RISK_BANDS.length - 1];
}

export interface Persona {
  id: string;
  label: string;
  /** อายุตัวแทนของ persona — ใช้บรรยายบริบทเท่านั้น ไม่ได้เข้าสูตรคำนวณ */
  age: number;
  /** ช่วงอายุโดยประมาณของ persona นี้ */
  ageRange: string;
  horizon: number;
  /** สัดส่วนทองคำในส่วนที่ลงทุน — ตัวแปรเดียวที่กำหนดพอร์ตลงทุน ระดับความเสี่ยงอนุมานจากค่านี้ */
  gold: number;
  /**
   * สำรองเงินสดเป็นสัดส่วนของเงินทุนทั้งก้อน
   * ยิ่งเหลือเวลาลงทุนสั้นยิ่งกันมาก เพราะไม่มีเวลารอให้พอร์ตฟื้นถ้าต้องใช้เงินกะทันหัน
   */
  cash: number;
  blurb: string;
}

export const PERSONAS: Persona[] = [
  {
    id: "A",
    label: "ใกล้เกษียณ",
    age: 57,
    ageRange: "55–60 ปี",
    horizon: 4,
    gold: 0.2,
    cash: 0.15,
    blurb: "เหลือเวลาลงทุนสั้น ต้องการรักษาเงินต้นเป็นหลัก",
  },
  {
    id: "B",
    label: "วัยทำงานกลาง",
    age: 40,
    ageRange: "38–45 ปี",
    horizon: 12,
    gold: 0.15,
    cash: 0.1,
    blurb: "สมดุลระหว่างการเติบโตและการป้องกันความเสี่ยง",
  },
  {
    id: "C",
    label: "วัยเริ่มทำงาน",
    age: 27,
    ageRange: "25–32 ปี",
    horizon: 25,
    gold: 0.08,
    cash: 0.05,
    blurb: "ระยะเวลายาว รับความผันผวนได้สูง เน้นการเติบโต",
  },
  {
    id: "D",
    label: "เน้นป้องกันความเสี่ยง",
    age: 45,
    ageRange: "40–50 ปี",
    horizon: 10,
    gold: 0.28,
    cash: 0.1,
    blurb: "กังวลเงินเฟ้อและวิกฤต จึงถือทองคำในสัดส่วนสูง",
  },
];

/**
 * สัดส่วนหุ้นในส่วนที่ไม่ใช่ทองคำ เป็นฟังก์ชันต่อเนื่องของสัดส่วนทองคำ
 * ลากเส้นตรงเชื่อมหมุดของทั้งสามโปรไฟล์ และคงค่าคงที่นอกช่วงหมุด
 *
 * ที่ต้องต่อเนื่องเพราะสัดส่วนทองคำเป็น "แกนเดียว" ที่ควบคุมพอร์ตทั้งใบ
 * ถ้าให้กระโดดเป็นขั้นตอนข้ามเส้นแบ่งระดับความเสี่ยง สัดส่วนและตัวเลขสถิติจะกระตุกตอนลากสไลเดอร์
 */
export function equityShareForGold(goldW: number): number {
  const first = GOLD_ANCHORS[0];
  const last = GOLD_ANCHORS[GOLD_ANCHORS.length - 1];
  if (goldW <= first.gold) return first.equityShare;
  if (goldW >= last.gold) return last.equityShare;

  for (let i = 0; i < GOLD_ANCHORS.length - 1; i++) {
    const a = GOLD_ANCHORS[i];
    const b = GOLD_ANCHORS[i + 1];
    if (goldW <= b.gold) {
      const t = (goldW - a.gold) / (b.gold - a.gold);
      return a.equityShare + (b.equityShare - a.equityShare) * t;
    }
  }
  return last.equityShare;
}

/**
 * น้ำหนักของเงินทุนทั้งก้อนจากสัดส่วนทองคำและสำรองเงินสด
 *
 * ลำดับการคิดตรงกับลำดับการตัดสินใจจริง — กันสำรองเงินสดออกก่อน
 * แล้วค่อยจัดสรร "ส่วนที่ลงทุน" ที่เหลือตามสัดส่วนทองคำ
 * goldW จึงเป็นสัดส่วนของส่วนที่ลงทุน ไม่ใช่ของเงินทุนทั้งก้อน
 * (ระดับความเสี่ยงเป็นคุณสมบัติของพอร์ตลงทุน จึงไม่ควรเปลี่ยนเพราะกันเงินสดมากขึ้น)
 */
export function weightsFromGold(goldW: number, cashW = 0): Weights {
  const cash = Math.min(Math.max(cashW, 0), MAX_CASH);
  const invested = 1 - cash;
  const ratio = equityShareForGold(goldW);
  const rest = invested * (1 - goldW);
  return { gold: invested * goldW, equity: rest * ratio, bond: rest * (1 - ratio), cash };
}

/** จำนวนเส้นทางจำลองรายรอบที่ส่งไปวาดทับแถบ percentile */
export const SAMPLE_PATHS = 25;

export interface FanPoint {
  year: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  /** ฐานของแถบ percentile — ใช้กับ stacked Area ใน Recharts */
  base5: number;
  range5_95: number;
  base25: number;
  range25_75: number;
  /**
   * มูลค่าของเส้นทางตัวอย่างรายรอบ คีย์ s0…sN
   * เส้น percentile ทั้งสามเรียบเพราะเป็นสถิติของทุกรอบ ไม่ใช่เส้นทางของรอบใดรอบหนึ่ง
   * จึงวาดเส้นทางจริงจาง ๆ ทับไว้ให้เห็นว่าความเรียบนั้นเกิดจากอะไร
   */
  [samplePath: `s${number}`]: number;
}

export interface SimulationResult {
  fan: FanPoint[];
  ending: number[];
  horizon: number;
  /** สัดส่วน simulation ที่มูลค่าปลายทางต่ำกว่าเงินลงทุนตั้งต้น */
  probLoss: number;
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)));
  return sorted[idx];
}

/**
 * Monte Carlo simulation ของมูลค่าเงินทุนทั้งก้อนรายปี
 * ผลตอบแทนรายปีของแต่ละสินทรัพย์สุ่มจากการแจกแจงปกติหลายตัวแปร
 * โดยใช้ mean / volatility / correlation ที่ประมาณจากข้อมูลย้อนหลังจริง
 *
 * สำรองเงินสดถูกแยกออกมาเป็นอีกก้อนที่โตด้วยอัตราปราศจากความเสี่ยงแบบแน่นอน
 * และไม่ถูกโยกกลับเข้าตลาดเลย — ตรงกับความหมายของ "เงินสำรอง" ที่กันไว้ใช้ยามฉุกเฉิน
 * ไม่ใช่สินทรัพย์ที่ปรับสัดส่วนไปมากับพอร์ตลงทุน
 */
export function runMonteCarlo(
  w: Weights,
  horizon: number,
  capital: number,
  model: MarketModel,
  nSims = 1200,
  seed = 20240101,
  nSamplePaths = SAMPLE_PATHS,
): SimulationResult {
  const investedShare = Math.max(1 - w.cash, 0);
  // น้ำหนักภายใน "ส่วนที่ลงทุน" — หารกลับให้รวมกันเป็น 1 เพราะก้อนเงินสดถูกแยกออกไปแล้ว
  const wArr = ASSETS.map((a) => (investedShare > 0 ? w[a] / investedShare : 0));
  const muArr = ASSETS.map((a) => model.mu[a]);
  const l = model.chol;
  const h = Math.max(1, Math.round(horizon));

  const cashCapital = capital * w.cash;
  const investedCapital = capital * investedShare;

  const randn = makeNormal(mulberry32(seed));
  const valuesByYear: number[][] = Array.from({ length: h + 1 }, () => new Array<number>(nSims));
  for (let s = 0; s < nSims; s++) valuesByYear[0][s] = capital;

  for (let s = 0; s < nSims; s++) {
    let invested = investedCapital;
    for (let y = 1; y <= h; y++) {
      const z = [randn(), randn(), randn()];
      let r = 0;
      for (let i = 0; i < 3; i++) {
        let assetReturn = muArr[i];
        for (let k = 0; k <= i; k++) assetReturn += l[i][k] * z[k];
        r += wArr[i] * assetReturn;
      }
      // พอร์ตเสียมูลค่าได้ไม่เกิน 95% ในหนึ่งปี กันค่าติดลบจาก tail ของการแจกแจงปกติ
      invested *= 1 + Math.max(r, -0.95);
      valuesByYear[y][s] = invested + cashCapital * (1 + model.riskFree) ** y;
    }
  }

  const sampleCount = Math.min(Math.max(nSamplePaths, 0), nSims);

  const fan = valuesByYear.map((yearVals, y) => {
    // sort บนสำเนา — yearVals ต้องคงลำดับเดิมไว้ เพราะ index คือหมายเลขรอบที่ใช้ดึงเส้นทางตัวอย่าง
    const sorted = [...yearVals].sort((a, b) => a - b);
    const p5 = percentile(sorted, 0.05);
    const p25 = percentile(sorted, 0.25);
    const p50 = percentile(sorted, 0.5);
    const p75 = percentile(sorted, 0.75);
    const p95 = percentile(sorted, 0.95);
    const point: FanPoint = {
      year: y,
      p5, p25, p50, p75, p95,
      base5: p5,
      range5_95: p95 - p5,
      base25: p25,
      range25_75: p75 - p25,
    };
    for (let s = 0; s < sampleCount; s++) point[`s${s}`] = yearVals[s];
    return point;
  });

  const ending = valuesByYear[h];
  const probLoss = ending.filter((v) => v < capital).length / ending.length;

  return { fan, ending, horizon: h, probLoss };
}

export interface HistogramBin {
  mid: number;
  count: number;
}

export function histogram(values: number[], binsCount = 22): HistogramBin[] {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const binSize = (max - min) / binsCount || 1;
  const bins: HistogramBin[] = Array.from({ length: binsCount }, (_, i) => ({
    mid: min + (i + 0.5) * binSize,
    count: 0,
  }));
  for (const v of values) {
    const idx = Math.min(binsCount - 1, Math.max(0, Math.floor((v - min) / binSize)));
    bins[idx].count++;
  }
  return bins;
}
