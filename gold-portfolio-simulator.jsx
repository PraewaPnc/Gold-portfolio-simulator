import React, { useState, useMemo } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Scatter, ReferenceLine,
} from "recharts";
import { Coins, TrendingUp, ShieldCheck, Sparkles, Info } from "lucide-react";

// ---------- Asset assumptions (illustrative, for demo purposes) ----------
const ASSETS = ["gold", "equity", "bond"];
const MU = { gold: 0.07, equity: 0.09, bond: 0.03 };
const SIGMA = { gold: 0.15, equity: 0.20, bond: 0.05 };
const CORR = {
  gold: { gold: 1, equity: -0.10, bond: 0.10 },
  equity: { gold: -0.10, equity: 1, bond: -0.20 },
  bond: { gold: 0.10, equity: -0.20, bond: 1 },
};
const RF = 0.015;

const COV = {};
ASSETS.forEach((i) => {
  COV[i] = {};
  ASSETS.forEach((j) => {
    COV[i][j] = SIGMA[i] * SIGMA[j] * CORR[i][j];
  });
});

function cholesky3() {
  const n = 3;
  const A = ASSETS.map((i) => ASSETS.map((j) => COV[i][j]));
  const L = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) L[i][j] = Math.sqrt(Math.max(A[i][i] - sum, 0));
      else L[i][j] = (A[i][j] - sum) / L[j][j];
    }
  }
  return L;
}
const L = cholesky3();

function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function portfolioStats(w) {
  const wArr = [w.gold, w.equity, w.bond];
  let ret = 0;
  ASSETS.forEach((a, i) => (ret += wArr[i] * MU[a]));
  let variance = 0;
  ASSETS.forEach((a, i) =>
    ASSETS.forEach((b, j) => (variance += wArr[i] * wArr[j] * COV[a][b]))
  );
  const vol = Math.sqrt(Math.max(variance, 0));
  const sharpe = vol > 0 ? (ret - RF) / vol : 0;
  return { ret, vol, sharpe };
}

function weightsFromGold(goldW, profile) {
  const base = PROFILES[profile];
  const denom = base.equity + base.bond;
  const ratio = denom > 0 ? base.equity / denom : 0.5;
  const rest = 1 - goldW;
  return { gold: goldW, equity: rest * ratio, bond: rest * (1 - ratio) };
}

const PROFILES = {
  conservative: { gold: 0.20, equity: 0.20, bond: 0.60, label: "อนุรักษ์นิยม" },
  moderate: { gold: 0.15, equity: 0.50, bond: 0.35, label: "ปานกลาง" },
  aggressive: { gold: 0.08, equity: 0.80, bond: 0.12, label: "เชิงรุก" },
};

const PERSONAS = [
  { id: "A", label: "ใกล้เกษียณ", age: 57, horizon: 4, risk: "conservative", gold: 0.20 },
  { id: "B", label: "วัยทำงานกลาง", age: 40, horizon: 12, risk: "moderate", gold: 0.15 },
  { id: "C", label: "วัยเริ่มทำงาน", age: 27, horizon: 25, risk: "aggressive", gold: 0.08 },
  { id: "D", label: "เน้นป้องกันความเสี่ยง", age: 45, horizon: 10, risk: "conservative", gold: 0.28 },
];

function runMonteCarlo(w, horizon, capital, nSims = 1200) {
  const wArr = [w.gold, w.equity, w.bond];
  const H = Math.max(1, Math.round(horizon));
  const valuesByYear = Array.from({ length: H + 1 }, () => new Array(nSims));
  for (let s = 0; s < nSims; s++) valuesByYear[0][s] = capital;
  for (let s = 0; s < nSims; s++) {
    let value = capital;
    for (let y = 1; y <= H; y++) {
      const z = [randn(), randn(), randn()];
      const cr = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
        let val = [MU.gold, MU.equity, MU.bond][i];
        for (let k = 0; k <= i; k++) val += L[i][k] * z[k];
        cr[i] = val;
      }
      let r = wArr[0] * cr[0] + wArr[1] * cr[1] + wArr[2] * cr[2];
      r = Math.max(r, -0.95);
      value = value * (1 + r);
      valuesByYear[y][s] = value;
    }
  }
  const percentile = (arr, p) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)));
    return sorted[idx];
  };
  const fan = valuesByYear.map((yearVals, y) => {
    const p5 = percentile(yearVals, 0.05);
    const p25 = percentile(yearVals, 0.25);
    const p50 = percentile(yearVals, 0.5);
    const p75 = percentile(yearVals, 0.75);
    const p95 = percentile(yearVals, 0.95);
    return {
      year: y, p5, p25, p50, p75, p95,
      base5: p5, range5_95: p95 - p5,
      base25: p25, range25_75: p75 - p25,
    };
  });
  const ending = valuesByYear[H];
  return { fan, ending, horizon: H };
}

function histogram(values, binsCount = 22) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binSize = (max - min) / binsCount || 1;
  const bins = Array.from({ length: binsCount }, (_, i) => ({
    mid: min + (i + 0.5) * binSize,
    count: 0,
  }));
  values.forEach((v) => {
    let idx = Math.floor((v - min) / binSize);
    if (idx >= binsCount) idx = binsCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  });
  return bins;
}

const thb = (n, opts = {}) =>
  new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0, ...opts }).format(Math.round(n));
const thbCompact = (n) =>
  new Intl.NumberFormat("th-TH", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const pct = (n, d = 1) => `${(n * 100).toFixed(d)}%`;

const GOLD = "#C9A227";
const GOLD_LIGHT = "#E8C766";
const EQUITY = "#5B87A6";
const BOND = "#4F8B76";

export default function GoldPortfolioSimulator() {
  const [capital, setCapital] = useState(1000000);
  const [age, setAge] = useState(40);
  const [horizon, setHorizon] = useState(12);
  const [riskProfile, setRiskProfile] = useState("moderate");
  const [goldW, setGoldW] = useState(PROFILES.moderate.gold);
  const [activePersona, setActivePersona] = useState(null);

  const weights = useMemo(() => weightsFromGold(goldW, riskProfile), [goldW, riskProfile]);
  const stats = useMemo(() => portfolioStats(weights), [weights]);

  const sim = useMemo(
    () => runMonteCarlo(weights, horizon, capital, 1200),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weights.gold, weights.equity, weights.bond, horizon, capital]
  );

  const histData = useMemo(() => histogram(sim.ending), [sim.ending]);
  const medianEnd = sim.fan[sim.fan.length - 1]?.p50 ?? capital;
  const p5End = sim.fan[sim.fan.length - 1]?.p5 ?? capital;

  const frontier = useMemo(() => {
    const pts = [];
    for (let g = 0; g <= 0.4; g += 0.02) {
      const w = weightsFromGold(g, riskProfile);
      const s = portfolioStats(w);
      pts.push({ vol: s.vol * 100, ret: s.ret * 100, gold: g });
    }
    return pts;
  }, [riskProfile]);

  const currentPoint = [{ vol: stats.vol * 100, ret: stats.ret * 100 }];

  const var5 = capital * Math.max(0, -(stats.ret - 1.645 * stats.vol));

  const handlePersona = (p) => {
    setActivePersona(p.id);
    setAge(p.age);
    setHorizon(p.horizon);
    setRiskProfile(p.risk);
    setGoldW(p.gold);
  };

  const handleRiskChange = (key) => {
    setRiskProfile(key);
    setGoldW(PROFILES[key].gold);
    setActivePersona(null);
  };

  const personaRows = useMemo(
    () =>
      PERSONAS.map((p) => {
        const w = weightsFromGold(p.gold, p.risk);
        const s = portfolioStats(w);
        const pSim = runMonteCarlo(w, p.horizon, capital, 500);
        const end = pSim.fan[pSim.fan.length - 1];
        return { ...p, w, s, median: end?.p50, p5: end?.p5 };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [capital]
  );

  return (
    <div className="gps-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .gps-root {
          --bg: #1B1815; --panel: #221F19; --panel2: #2A251D;
          --gold: ${GOLD}; --gold-light: ${GOLD_LIGHT};
          --equity: ${EQUITY}; --bond: ${BOND};
          --text: #EDE6D8; --text-dim: #A79E8C; --text-faint: #766F60;
          --border: #3A3427; --danger: #B25A4A;
          font-family: 'IBM Plex Sans', sans-serif;
          background: var(--bg);
          color: var(--text);
          border-radius: 16px;
          padding: 0;
          overflow: hidden;
          width: 100%;
        }
        .gps-root * { box-sizing: border-box; }
        .gps-mono { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
        .gps-display { font-family: 'Fraunces', serif; }
        .gps-header {
          padding: 28px 32px 20px;
          border-bottom: 1px solid var(--border);
          background: linear-gradient(180deg, var(--panel2), var(--panel));
        }
        .gps-eyebrow {
          font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--gold); margin: 0 0 8px; display: flex;
          align-items: center; gap: 6px;
        }
        .gps-title { font-size: 26px; font-weight: 600; margin: 0 0 6px; color: var(--text); }
        .gps-sub { font-size: 13.5px; color: var(--text-dim); margin: 0; max-width: 620px; line-height: 1.55; }
        .gps-layout { display: grid; grid-template-columns: 300px 1fr; gap: 0; }
        @media (max-width: 860px) { .gps-layout { grid-template-columns: 1fr; } }
        .gps-controls {
          padding: 24px; border-right: 1px solid var(--border);
          display: flex; flex-direction: column; gap: 22px;
        }
        @media (max-width: 860px) { .gps-controls { border-right: none; border-bottom: 1px solid var(--border); } }
        .gps-label {
          font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--text-faint); margin: 0 0 10px; font-weight: 500;
        }
        .gps-personas { display: flex; flex-wrap: wrap; gap: 6px; }
        .gps-chip {
          font-size: 12px; padding: 7px 11px; border-radius: 20px; border: 1px solid var(--border);
          background: transparent; color: var(--text-dim); cursor: pointer; transition: all .15s;
          font-family: inherit;
        }
        .gps-chip:hover { border-color: var(--gold); color: var(--text); }
        .gps-chip.active { background: var(--gold); border-color: var(--gold); color: #1B1815; font-weight: 500; }
        .gps-field { display: flex; flex-direction: column; gap: 4px; }
        .gps-row-between { display: flex; justify-content: space-between; align-items: baseline; }
        .gps-value { font-size: 13px; color: var(--gold-light); }
        input[type="range"] {
          -webkit-appearance: none; width: 100%; height: 3px; border-radius: 2px;
          background: var(--border); outline: none; margin: 6px 0;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 15px; height: 15px; border-radius: 50%;
          background: var(--gold); cursor: pointer; border: 2px solid #1B1815;
        }
        input[type="range"]::-moz-range-thumb {
          width: 15px; height: 15px; border-radius: 50%; background: var(--gold);
          cursor: pointer; border: 2px solid #1B1815;
        }
        input[type="number"] {
          background: var(--panel2); border: 1px solid var(--border); color: var(--text);
          border-radius: 6px; padding: 8px 10px; font-family: 'IBM Plex Mono', monospace;
          font-size: 13px; width: 100%;
        }
        .gps-risk-toggle { display: flex; gap: 6px; }
        .gps-risk-btn {
          flex: 1; font-size: 11.5px; padding: 8px 4px; border-radius: 7px; border: 1px solid var(--border);
          background: transparent; color: var(--text-dim); cursor: pointer; font-family: inherit;
          text-align: center; transition: all .15s;
        }
        .gps-risk-btn.active { background: var(--panel2); border-color: var(--gold); color: var(--gold-light); }
        .gps-main { padding: 24px 28px 32px; min-width: 0; }
        .gps-ingot {
          display: flex; height: 42px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border);
          margin-bottom: 8px;
        }
        .gps-ingot-seg { transition: width .35s ease; display: flex; align-items: center; justify-content: center;
          font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; font-weight: 500; overflow: hidden; white-space: nowrap; }
        .gps-legend { display: flex; gap: 18px; font-size: 12px; color: var(--text-dim); margin-bottom: 26px; flex-wrap: wrap; }
        .gps-legend-dot { width: 9px; height: 9px; border-radius: 2px; display: inline-block; margin-right: 6px; }
        .gps-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
        @media (max-width: 700px) { .gps-stats-grid { grid-template-columns: repeat(2, 1fr); } }
        .gps-stat-card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
        .gps-stat-label { font-size: 11px; color: var(--text-faint); margin: 0 0 6px; text-transform: uppercase; letter-spacing: .06em; }
        .gps-stat-value { font-size: 19px; font-weight: 500; margin: 0; font-family: 'IBM Plex Mono', monospace; }
        .gps-section-title { font-size: 14px; font-weight: 500; color: var(--text); margin: 0 0 4px;
          display: flex; align-items: center; gap: 7px; }
        .gps-section-sub { font-size: 12px; color: var(--text-faint); margin: 0 0 14px; }
        .gps-chart-block { margin-bottom: 30px; }
        .gps-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 700px) { .gps-two-col { grid-template-columns: 1fr; } }
        .gps-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .gps-table th { text-align: left; font-weight: 500; color: var(--text-faint); font-size: 10.5px;
          text-transform: uppercase; letter-spacing: .05em; padding: 8px 10px; border-bottom: 1px solid var(--border); }
        .gps-table td { padding: 10px 10px; border-bottom: 1px solid var(--border); color: var(--text-dim); }
        .gps-table td.strong { color: var(--text); font-family: 'IBM Plex Mono', monospace; }
        .gps-table tr:last-child td { border-bottom: none; }
        .gps-disclaimer { display: flex; gap: 8px; font-size: 11.5px; color: var(--text-faint); line-height: 1.6;
          border-top: 1px solid var(--border); padding-top: 16px; margin-top: 8px; }
        .gps-tooltip { background: #221F19; border: 1px solid #3A3427; border-radius: 8px; padding: 10px 12px;
          font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #EDE6D8; }
      `}</style>

      <div className="gps-header">
        <p className="gps-eyebrow"><Sparkles size={13} /> Monte Carlo Portfolio Simulator</p>
        <h1 className="gps-title gps-display">จำลองการจัดสรรเงินลงทุนในทองคำ</h1>
        <p className="gps-sub">
          จำลองผลตอบแทนพอร์ตการลงทุนด้วย Monte Carlo simulation (สมมติฐานผลตอบแทน/ความผันผวนเป็นตัวเลขจำลองเพื่อการนำเสนอ)
          ปรับอายุ ระยะเวลา และระดับความเสี่ยง เพื่อดูสัดส่วนทองคำที่เหมาะสมและผลลัพธ์ที่เป็นไปได้
        </p>
      </div>

      <div className="gps-layout">
        <div className="gps-controls">
          <div>
            <p className="gps-label">Persona ตัวอย่าง</p>
            <div className="gps-personas">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  className={`gps-chip ${activePersona === p.id ? "active" : ""}`}
                  onClick={() => handlePersona(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="gps-field">
            <p className="gps-label">เงินลงทุนทั้งหมด (บาท)</p>
            <input
              type="number" step={10000} min={10000} value={capital}
              onChange={(e) => setCapital(Math.max(10000, Number(e.target.value) || 0))}
            />
          </div>

          <div className="gps-field">
            <div className="gps-row-between">
              <p className="gps-label" style={{ marginBottom: 0 }}>อายุผู้ลงทุน</p>
              <span className="gps-value gps-mono">{age} ปี</span>
            </div>
            <input type="range" min={22} max={75} step={1} value={age}
              onChange={(e) => setAge(Number(e.target.value))} />
          </div>

          <div className="gps-field">
            <div className="gps-row-between">
              <p className="gps-label" style={{ marginBottom: 0 }}>ระยะเวลาการลงทุน</p>
              <span className="gps-value gps-mono">{horizon} ปี</span>
            </div>
            <input type="range" min={1} max={30} step={1} value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))} />
          </div>

          <div className="gps-field">
            <p className="gps-label">ระดับความเสี่ยงที่รับได้</p>
            <div className="gps-risk-toggle">
              {Object.entries(PROFILES).map(([key, p]) => (
                <button
                  key={key}
                  className={`gps-risk-btn ${riskProfile === key ? "active" : ""}`}
                  onClick={() => handleRiskChange(key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="gps-field">
            <div className="gps-row-between">
              <p className="gps-label" style={{ marginBottom: 0 }}>สัดส่วนทองคำ</p>
              <span className="gps-value gps-mono">{pct(goldW, 0)}</span>
            </div>
            <input type="range" min={0} max={0.40} step={0.01} value={goldW}
              onChange={(e) => { setGoldW(Number(e.target.value)); setActivePersona(null); }} />
          </div>

          <div style={{ fontSize: 11.5, color: "var(--text-faint)", lineHeight: 1.6, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            ทอง / หุ้น / ตราสารหนี้ ที่เหลือถูกจัดสรรตามสัดส่วนของโปรไฟล์ความเสี่ยงที่เลือก
          </div>
        </div>

        <div className="gps-main">
          <div className="gps-ingot">
            <div className="gps-ingot-seg" style={{ width: `${weights.gold * 100}%`, background: GOLD, color: "#1B1815" }}>
              {weights.gold > 0.06 ? pct(weights.gold, 0) : ""}
            </div>
            <div className="gps-ingot-seg" style={{ width: `${weights.equity * 100}%`, background: EQUITY, color: "#0E1B24" }}>
              {weights.equity > 0.06 ? pct(weights.equity, 0) : ""}
            </div>
            <div className="gps-ingot-seg" style={{ width: `${weights.bond * 100}%`, background: BOND, color: "#0C201A" }}>
              {weights.bond > 0.06 ? pct(weights.bond, 0) : ""}
            </div>
          </div>
          <div className="gps-legend">
            <span><span className="gps-legend-dot" style={{ background: GOLD }} />ทองคำ · {thb(capital * weights.gold)} บาท</span>
            <span><span className="gps-legend-dot" style={{ background: EQUITY }} />หุ้น · {thb(capital * weights.equity)} บาท</span>
            <span><span className="gps-legend-dot" style={{ background: BOND }} />ตราสารหนี้ · {thb(capital * weights.bond)} บาท</span>
          </div>

          <div className="gps-stats-grid">
            <div className="gps-stat-card">
              <p className="gps-stat-label">เงินลงทุนในทองคำ</p>
              <p className="gps-stat-value" style={{ color: "var(--gold-light)" }}>{thb(capital * weights.gold)}</p>
            </div>
            <div className="gps-stat-card">
              <p className="gps-stat-label">ผลตอบแทนคาดหวัง / ปี</p>
              <p className="gps-stat-value">{pct(stats.ret)}</p>
            </div>
            <div className="gps-stat-card">
              <p className="gps-stat-label">ความผันผวน (S.D.)</p>
              <p className="gps-stat-value">{pct(stats.vol)}</p>
            </div>
            <div className="gps-stat-card">
              <p className="gps-stat-label">Sharpe Ratio</p>
              <p className="gps-stat-value">{stats.sharpe.toFixed(2)}</p>
            </div>
          </div>

          <div className="gps-chart-block">
            <p className="gps-section-title"><TrendingUp size={15} color="var(--gold)" /> การกระจายผลลัพธ์พอร์ตตลอด {sim.horizon} ปี</p>
            <p className="gps-section-sub">
              จาก Monte Carlo simulation 1,200 รอบ — แถบอ่อนคือช่วง 5th–95th percentile, แถบเข้มคือ 25th–75th, เส้นกลางคือค่ามัธยฐาน
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={sim.fan} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#3A3427" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: "#A79E8C", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#3A3427" }}
                  label={{ value: "ปีที่", position: "insideBottom", offset: -2, fill: "#766F60", fontSize: 11 }} />
                <YAxis tickFormatter={(v) => thbCompact(v)} tick={{ fill: "#A79E8C", fontSize: 11 }} tickLine={false} axisLine={false} width={55} />
                <Tooltip
                  contentStyle={{ display: "none" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="gps-tooltip">
                        <div style={{ color: "#766F60", marginBottom: 4 }}>ปีที่ {label}</div>
                        <div>มัธยฐาน: {thb(d.p50)} บาท</div>
                        <div style={{ color: "#766F60" }}>ช่วง 5–95%: {thb(d.p5)} – {thb(d.p95)}</div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={capital} stroke="#766F60" strokeDasharray="3 3" />
                <Area dataKey="base5" stackId="a" stroke="none" fill="transparent" />
                <Area dataKey="range5_95" stackId="a" stroke="none" fill={GOLD} fillOpacity={0.12} />
                <Area dataKey="base25" stackId="b" stroke="none" fill="transparent" />
                <Area dataKey="range25_75" stackId="b" stroke="none" fill={GOLD} fillOpacity={0.28} />
                <Line dataKey="p50" stroke={GOLD_LIGHT} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="gps-two-col">
            <div className="gps-chart-block">
              <p className="gps-section-title"><Coins size={15} color="var(--gold)" /> มูลค่าพอร์ตปลายทาง</p>
              <p className="gps-section-sub">มัธยฐาน {thb(medianEnd)} บาท · กรณีเลวร้าย (5%) {thb(p5End)} บาท</p>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={histData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <XAxis dataKey="mid" tickFormatter={(v) => thbCompact(v)} tick={{ fill: "#A79E8C", fontSize: 10 }}
                    tickLine={false} axisLine={{ stroke: "#3A3427" }} interval={4} />
                  <YAxis hide />
                  <Tooltip content={() => null} cursor={{ fill: "rgba(201,162,39,0.08)" }} />
                  <Bar dataKey="count" fill={GOLD} fillOpacity={0.55} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="gps-chart-block">
              <p className="gps-section-title"><ShieldCheck size={15} color="var(--gold)" /> Efficient Frontier</p>
              <p className="gps-section-sub">ความผันผวน (แกน X) vs ผลตอบแทนคาดหวัง (แกน Y) เมื่อปรับสัดส่วนทองคำ</p>
              <ResponsiveContainer width="100%" height={190}>
                <ComposedChart data={frontier} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#3A3427" strokeDasharray="2 4" />
                  <XAxis dataKey="vol" tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fill: "#A79E8C", fontSize: 10 }}
                    tickLine={false} axisLine={{ stroke: "#3A3427" }} type="number" domain={["dataMin", "dataMax"]} />
                  <YAxis dataKey="ret" tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fill: "#A79E8C", fontSize: 10 }}
                    tickLine={false} axisLine={false} width={38} />
                  <Tooltip content={() => null} />
                  <Line dataKey="ret" stroke={EQUITY} strokeWidth={1.5} dot={false} />
                  <Scatter data={currentPoint} dataKey="ret" fill={GOLD_LIGHT} shape="circle" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="gps-chart-block">
            <p className="gps-section-title">เปรียบเทียบ 4 Persona</p>
            <p className="gps-section-sub">ผลลัพธ์เมื่อแต่ละ persona ลงทุน {thb(capital)} บาทตามเงินลงทุนที่ตั้งไว้ด้านบน</p>
            <table className="gps-table">
              <thead>
                <tr>
                  <th>Persona</th><th>อายุ / ระยะเวลา</th><th>ทองคำ</th>
                  <th>ผลตอบแทน/ปี</th><th>ความผันผวน</th><th>มูลค่ามัธยฐานปลายทาง</th>
                </tr>
              </thead>
              <tbody>
                {personaRows.map((p) => (
                  <tr key={p.id}>
                    <td className="strong">{p.label}</td>
                    <td>{p.age} ปี · {p.horizon} ปี</td>
                    <td className="strong">{pct(p.gold, 0)}</td>
                    <td className="strong">{pct(p.s.ret)}</td>
                    <td className="strong">{pct(p.s.vol)}</td>
                    <td className="strong">{thb(p.median)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="gps-disclaimer">
            <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              ตัวเลขผลตอบแทน/ความผันผวน/สหสัมพันธ์เป็นสมมติฐานประกอบการสาธิตเชิงวิธีการเท่านั้น
              ไม่ใช่ข้อมูลตลาดจริงและไม่ใช่คำแนะนำการลงทุน — ก่อนใช้งานจริงควรแทนที่ด้วยข้อมูลราคาย้อนหลังจริงของทองคำ/หุ้น/ตราสารหนี้
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
