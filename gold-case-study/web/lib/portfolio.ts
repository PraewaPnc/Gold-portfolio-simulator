import { ASSETS, type AssetKey, type AssetStats } from "./types";

export type Weights = Record<AssetKey, number>;

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

/** ผลตอบแทนคาดหวัง ความผันผวน และ Sharpe ratio ของพอร์ตตามน้ำหนักที่กำหนด */
export function portfolioStats(w: Weights, model: MarketModel): PortfolioStats {
  const wArr = ASSETS.map((a) => w[a]);
  let ret = 0;
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

export interface Persona {
  id: string;
  label: string;
  /** อายุตัวแทนของ persona — ใช้บรรยายบริบทเท่านั้น ไม่ได้เข้าสูตรคำนวณ */
  age: number;
  /** ช่วงอายุโดยประมาณของ persona นี้ */
  ageRange: string;
  horizon: number;
  risk: string;
  gold: number;
  blurb: string;
}

export const PERSONAS: Persona[] = [
  {
    id: "A",
    label: "ใกล้เกษียณ",
    age: 57,
    ageRange: "55–60 ปี",
    horizon: 4,
    risk: "conservative",
    gold: 0.2,
    blurb: "เหลือเวลาลงทุนสั้น ต้องการรักษาเงินต้นเป็นหลัก",
  },
  {
    id: "B",
    label: "วัยทำงานกลาง",
    age: 40,
    ageRange: "38–45 ปี",
    horizon: 12,
    risk: "moderate",
    gold: 0.15,
    blurb: "สมดุลระหว่างการเติบโตและการป้องกันความเสี่ยง",
  },
  {
    id: "C",
    label: "วัยเริ่มทำงาน",
    age: 27,
    ageRange: "25–32 ปี",
    horizon: 25,
    risk: "aggressive",
    gold: 0.08,
    blurb: "ระยะเวลายาว รับความผันผวนได้สูง เน้นการเติบโต",
  },
  {
    id: "D",
    label: "เน้นป้องกันความเสี่ยง",
    age: 45,
    ageRange: "40–50 ปี",
    horizon: 10,
    risk: "conservative",
    gold: 0.28,
    blurb: "กังวลเงินเฟ้อและวิกฤต จึงถือทองคำในสัดส่วนสูง",
  },
];

/** สัดส่วนหุ้นในส่วนที่ไม่ใช่ทองคำ ตามโปรไฟล์ความเสี่ยง (ใช้แสดงผลให้เห็นว่าโปรไฟล์มีผลอย่างไร) */
export function equityShareOfRest(profileKey: string): number {
  const base = PROFILES[profileKey] ?? PROFILES.moderate;
  const denom = base.equity + base.bond;
  return denom > 0 ? base.equity / denom : 0.5;
}

/**
 * เมื่อผู้ใช้กำหนดสัดส่วนทองคำเอง ส่วนที่เหลือจะถูกแบ่งระหว่างหุ้นกับตราสารหนี้
 * ตามอัตราส่วนเดิมของโปรไฟล์ความเสี่ยงที่เลือก
 */
export function weightsFromGold(goldW: number, profileKey: string): Weights {
  const base = PROFILES[profileKey] ?? PROFILES.moderate;
  const denom = base.equity + base.bond;
  const ratio = denom > 0 ? base.equity / denom : 0.5;
  const rest = 1 - goldW;
  return { gold: goldW, equity: rest * ratio, bond: rest * (1 - ratio) };
}

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
 * Monte Carlo simulation ของมูลค่าพอร์ตรายปี
 * ผลตอบแทนรายปีของแต่ละสินทรัพย์สุ่มจากการแจกแจงปกติหลายตัวแปร
 * โดยใช้ mean / volatility / correlation ที่ประมาณจากข้อมูลย้อนหลังจริง
 */
export function runMonteCarlo(
  w: Weights,
  horizon: number,
  capital: number,
  model: MarketModel,
  nSims = 1200,
  seed = 20240101,
): SimulationResult {
  const wArr = ASSETS.map((a) => w[a]);
  const muArr = ASSETS.map((a) => model.mu[a]);
  const l = model.chol;
  const h = Math.max(1, Math.round(horizon));

  const randn = makeNormal(mulberry32(seed));
  const valuesByYear: number[][] = Array.from({ length: h + 1 }, () => new Array<number>(nSims));
  for (let s = 0; s < nSims; s++) valuesByYear[0][s] = capital;

  for (let s = 0; s < nSims; s++) {
    let value = capital;
    for (let y = 1; y <= h; y++) {
      const z = [randn(), randn(), randn()];
      let r = 0;
      for (let i = 0; i < 3; i++) {
        let assetReturn = muArr[i];
        for (let k = 0; k <= i; k++) assetReturn += l[i][k] * z[k];
        r += wArr[i] * assetReturn;
      }
      // พอร์ตเสียมูลค่าได้ไม่เกิน 95% ในหนึ่งปี กันค่าติดลบจาก tail ของการแจกแจงปกติ
      value *= 1 + Math.max(r, -0.95);
      valuesByYear[y][s] = value;
    }
  }

  const fan = valuesByYear.map((yearVals, y) => {
    const sorted = [...yearVals].sort((a, b) => a - b);
    const p5 = percentile(sorted, 0.05);
    const p25 = percentile(sorted, 0.25);
    const p50 = percentile(sorted, 0.5);
    const p75 = percentile(sorted, 0.75);
    const p95 = percentile(sorted, 0.95);
    return {
      year: y,
      p5, p25, p50, p75, p95,
      base5: p5,
      range5_95: p95 - p5,
      base25: p25,
      range25_75: p75 - p25,
    };
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

export interface FrontierPoint {
  vol: number;
  ret: number;
  gold: number;
}

/** กวาดสัดส่วนทองคำตั้งแต่ 0% ถึง 40% เพื่อวาดเส้น efficient frontier */
export function buildFrontier(profileKey: string, model: MarketModel): FrontierPoint[] {
  const points: FrontierPoint[] = [];
  for (let g = 0; g <= 0.4001; g += 0.02) {
    const s = portfolioStats(weightsFromGold(g, profileKey), model);
    points.push({ vol: s.vol * 100, ret: s.ret * 100, gold: g });
  }
  return points;
}
