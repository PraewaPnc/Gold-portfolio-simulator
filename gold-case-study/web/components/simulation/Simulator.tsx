"use client";

import { Coins, ShieldCheck, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { assetStats } from "@/lib/data";
import { pct, thb, thbCompact } from "@/lib/format";
import {
  buildFrontier,
  buildMarketModel,
  histogram,
  PERSONAS,
  PROFILES,
  portfolioStats,
  runMonteCarlo,
  weightsFromGold,
  equityShareOfRest,
  type Persona,
} from "@/lib/portfolio";

const GOLD = "#C9A227";
const GOLD_LIGHT = "#E8C766";
const EQUITY = "#5B87A6";
const BOND = "#4F8B76";

const N_SIMS = 1200;
const N_SIMS_PERSONA = 500;

/**
 * market model สร้างครั้งเดียวจาก asset-stats.json (ข้อมูลย้อนหลังจริง)
 * ไม่ขึ้นกับ state ใด ๆ จึงวางไว้นอก component ได้
 */
const MODEL = buildMarketModel(assetStats);

export function Simulator() {
  const [capital, setCapital] = useState(1_000_000);
  const [horizon, setHorizon] = useState(12);
  const [riskProfile, setRiskProfile] = useState("moderate");
  const [goldW, setGoldW] = useState(PROFILES.moderate.gold);
  const [activePersona, setActivePersona] = useState<string | null>(null);

  const weights = useMemo(() => weightsFromGold(goldW, riskProfile), [goldW, riskProfile]);
  const stats = useMemo(() => portfolioStats(weights, MODEL), [weights]);

  const sim = useMemo(
    () => runMonteCarlo(weights, horizon, capital, MODEL, N_SIMS),
    [weights, horizon, capital],
  );

  const histData = useMemo(() => histogram(sim.ending), [sim.ending]);
  const frontier = useMemo(() => buildFrontier(riskProfile, MODEL), [riskProfile]);
  const equityShare = useMemo(() => equityShareOfRest(riskProfile), [riskProfile]);
  const currentPoint = useMemo(
    () => [{ vol: stats.vol * 100, ret: stats.ret * 100 }],
    [stats],
  );

  /**
   * กำหนดขอบเขตแกนของ efficient frontier เองจากข้อมูลเส้น frontier
   * ถ้าปล่อยให้ Recharts คำนวณเอง จุด Scatter จุดเดียว (พอร์ตปัจจุบัน) จะเป็นตัวกำหนด domain
   * ทำให้เส้น frontier ส่วนใหญ่ถูกตัดออกนอกกรอบ
   */
  const frontierDomain = useMemo(() => {
    const pad = (values: number[]): [number, number] => {
      const lo = Math.min(...values);
      const hi = Math.max(...values);
      const margin = (hi - lo) * 0.08 || 0.5;
      return [lo - margin, hi + margin];
    };
    return {
      vol: pad(frontier.map((p) => p.vol)),
      ret: pad(frontier.map((p) => p.ret)),
    };
  }, [frontier]);

  const lastFan = sim.fan[sim.fan.length - 1];
  const medianEnd = lastFan?.p50 ?? capital;
  const p5End = lastFan?.p5 ?? capital;

  const personaRows = useMemo(
    () =>
      PERSONAS.map((p) => {
        const w = weightsFromGold(p.gold, p.risk);
        const s = portfolioStats(w, MODEL);
        const pSim = runMonteCarlo(w, p.horizon, capital, MODEL, N_SIMS_PERSONA);
        const end = pSim.fan[pSim.fan.length - 1];
        return { ...p, w, s, median: end.p50, p5: end.p5, probLoss: pSim.probLoss };
      }),
    [capital],
  );

  const activeP = PERSONAS.find((p) => p.id === activePersona) ?? null;

  function applyPersona(p: Persona) {
    setActivePersona(p.id);
    setHorizon(p.horizon);
    setRiskProfile(p.risk);
    setGoldW(p.gold);
  }

  function changeRisk(key: string) {
    setRiskProfile(key);
    setGoldW(PROFILES[key].gold);
    setActivePersona(null);
  }

  return (
    <div className="panel overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
        {/* ================= Controls ================= */}
        <aside className="flex flex-col gap-5 border-b border-line p-5 lg:border-b-0 lg:border-r">
          <div>
            <p className="label-caps mb-2.5">Persona ตัวอย่าง</p>
            <div className="flex flex-wrap gap-1.5">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="chip"
                  data-active={activePersona === p.id}
                  aria-pressed={activePersona === p.id}
                  onClick={() => applyPersona(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {/*
              อายุเป็นข้อมูลบริบทของ persona ไม่ใช่ตัวแปรของแบบจำลอง
              (สิ่งที่มีผลจริงคือระยะเวลาลงทุน) จึงแสดงเป็นช่วงอายุแบบอ่านอย่างเดียว
            */}
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-faint">
              {activeP ? (
                <>
                  <span className="font-mono text-ink-dim">อายุ {activeP.ageRange}</span> ·{" "}
                  {activeP.blurb}
                </>
              ) : (
                "กำหนดค่าเอง — กดเลือก persona เพื่อโหลดค่าตั้งต้นตามช่วงวัย"
              )}
            </p>
          </div>

          <div>
            <label htmlFor="capital" className="label-caps mb-2 block">
              เงินลงทุนทั้งหมด (บาท)
            </label>
            <input
              id="capital"
              type="number"
              step={10000}
              min={10000}
              value={capital}
              onChange={(e) => setCapital(Math.max(10000, Number(e.target.value) || 0))}
              className="number-input tabular"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="horizon" className="label-caps">
                ระยะเวลาการลงทุน
              </label>
              <span className="font-mono text-[13px] tabular text-gold-light">{horizon} ปี</span>
            </div>
            <input
              id="horizon"
              type="range"
              min={1}
              max={30}
              step={1}
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="slider"
            />
          </div>

          <div>
            <p className="label-caps mb-2">ระดับความเสี่ยงที่รับได้</p>
            <div role="group" aria-label="ระดับความเสี่ยง" className="flex gap-1.5">
              {Object.entries(PROFILES).map(([key, p]) => (
                <button
                  key={key}
                  type="button"
                  className="seg-btn"
                  data-active={riskProfile === key}
                  aria-pressed={riskProfile === key}
                  onClick={() => changeRisk(key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {/* ทำให้เห็นชัดว่าโปรไฟล์ความเสี่ยงเปลี่ยนอะไร — มันกำหนดสัดส่วนหุ้นต่อตราสารหนี้ */}
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-ink-faint">
              แบ่งส่วนที่ไม่ใช่ทองคำเป็น หุ้น {pct(equityShare, 0)} / ตราสารหนี้{" "}
              {pct(1 - equityShare, 0)}
            </p>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="goldw" className="label-caps">
                สัดส่วนทองคำ
              </label>
              <span className="font-mono text-[13px] tabular text-gold-light">{pct(goldW, 0)}</span>
            </div>
            <input
              id="goldw"
              type="range"
              min={0}
              max={0.4}
              step={0.01}
              value={goldW}
              onChange={(e) => {
                setGoldW(Number(e.target.value));
                setActivePersona(null);
              }}
              className="slider"
            />
          </div>

          <p className="border-t border-line pt-3.5 text-[11.5px] leading-relaxed text-ink-faint">
            การเปลี่ยนระดับความเสี่ยงจะรีเซ็ตสัดส่วนทองคำกลับไปที่ค่าตั้งต้นของโปรไฟล์นั้น
            จากนั้นปรับสไลเดอร์ทองคำต่อได้อิสระ
          </p>
        </aside>

        {/* ================= Main ================= */}
        <div className="min-w-0 p-5 sm:p-6">
          {/* ---- Allocation bar ---- */}
          <div className="mb-2 flex h-[42px] overflow-hidden rounded-lg border border-line">
            {(
              [
                { key: "gold", w: weights.gold, bg: GOLD, fg: "#1B1815" },
                { key: "equity", w: weights.equity, bg: EQUITY, fg: "#0E1B24" },
                { key: "bond", w: weights.bond, bg: BOND, fg: "#0C201A" },
              ] as const
            ).map((seg) => (
              <div
                key={seg.key}
                className="flex items-center justify-center overflow-hidden whitespace-nowrap
                           font-mono text-[11.5px] font-medium transition-[width] duration-300"
                style={{ width: `${seg.w * 100}%`, background: seg.bg, color: seg.fg }}
              >
                {seg.w > 0.06 ? pct(seg.w, 0) : ""}
              </div>
            ))}
          </div>

          <div className="mb-6 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-dim">
            {(
              [
                { label: "ทองคำ", w: weights.gold, color: GOLD },
                { label: "หุ้นไทย", w: weights.equity, color: EQUITY },
                { label: "ตราสารหนี้", w: weights.bond, color: BOND },
              ] as const
            ).map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: item.color }}
                  aria-hidden
                />
                {item.label} · <span className="font-mono tabular">{thb(capital * item.w)}</span> บาท
              </span>
            ))}
          </div>

          {/* ---- Stat cards ---- */}
          <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "เงินลงทุนในทองคำ", value: thb(capital * weights.gold), accent: true },
              { label: "ผลตอบแทนคาดหวัง / ปี", value: pct(stats.ret) },
              { label: "ความผันผวน (S.D.)", value: pct(stats.vol) },
              { label: "Sharpe Ratio", value: stats.sharpe.toFixed(2) },
            ].map((card) => (
              <div key={card.label} className="rounded-[10px] border border-line bg-panel2/50 px-4 py-3.5">
                <p className="label-caps">{card.label}</p>
                <p
                  className={`mt-1.5 font-mono text-[19px] font-medium tabular ${
                    card.accent ? "text-gold-light" : "text-ink"
                  }`}
                >
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {/* ---- Fan chart ---- */}
          <section className="mb-8">
            <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
              <TrendingUp size={15} className="text-gold" aria-hidden />
              การกระจายผลลัพธ์พอร์ตตลอด {sim.horizon} ปี
            </h3>
            <p className="mb-3.5 mt-1 text-xs leading-relaxed text-ink-faint">
              จาก Monte Carlo simulation {N_SIMS.toLocaleString("th-TH")} รอบ — แถบอ่อนคือช่วง
              5th–95th percentile, แถบเข้มคือ 25th–75th, เส้นกลางคือค่ามัธยฐาน ·
              โอกาสที่มูลค่าปลายทางต่ำกว่าเงินลงทุนตั้งต้น {pct(sim.probLoss, 0)}
            </p>
            <ResponsiveContainer width="100%" height={270}>
              <ComposedChart data={sim.fan} margin={{ top: 5, right: 10, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#3A3427" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "#A79E8C", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#3A3427" }}
                  label={{ value: "ปีที่", position: "insideBottom", offset: -3, fill: "#766F60", fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={thbCompact}
                  tick={{ fill: "#A79E8C", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={58}
                />
                <Tooltip
                  cursor={{ stroke: "#766F60", strokeDasharray: "3 3" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload as { p5: number; p50: number; p95: number };
                    return (
                      <div className="rounded-lg border border-line bg-panel px-3 py-2.5 font-mono text-xs text-ink shadow-lg">
                        <div className="mb-1 text-ink-faint">ปีที่ {String(label)}</div>
                        <div className="tabular">มัธยฐาน: {thb(d.p50)} บาท</div>
                        <div className="tabular text-ink-faint">
                          ช่วง 5–95%: {thb(d.p5)} – {thb(d.p95)}
                        </div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={capital} stroke="#766F60" strokeDasharray="3 3" />
                <Area dataKey="base5" stackId="a" stroke="none" fill="transparent" isAnimationActive={false} />
                <Area dataKey="range5_95" stackId="a" stroke="none" fill={GOLD} fillOpacity={0.12} isAnimationActive={false} />
                <Area dataKey="base25" stackId="b" stroke="none" fill="transparent" isAnimationActive={false} />
                <Area dataKey="range25_75" stackId="b" stroke="none" fill={GOLD} fillOpacity={0.28} isAnimationActive={false} />
                <Line dataKey="p50" stroke={GOLD_LIGHT} strokeWidth={2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </section>

          {/* ---- Histogram + Frontier ---- */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <section>
              <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
                <Coins size={15} className="text-gold" aria-hidden />
                มูลค่าพอร์ตปลายทาง
              </h3>
              <p className="mb-3 mt-1 text-xs text-ink-faint">
                มัธยฐาน {thb(medianEnd)} บาท · กรณีเลวร้าย (5%) {thb(p5End)} บาท
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={histData} margin={{ top: 5, right: 16, left: 16, bottom: 0 }}>
                  <XAxis
                    dataKey="mid"
                    tickFormatter={thbCompact}
                    tick={{ fill: "#A79E8C", fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: "#3A3427" }}
                    interval={4}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "rgba(201,162,39,0.08)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as { mid: number; count: number };
                      return (
                        <div className="rounded-lg border border-line bg-panel px-3 py-2 font-mono text-xs text-ink shadow-lg">
                          <div className="tabular">~{thb(d.mid)} บาท</div>
                          <div className="tabular text-ink-faint">
                            {d.count} / {N_SIMS.toLocaleString("th-TH")} รอบ
                          </div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine x={capital} stroke="#766F60" strokeDasharray="3 3" />
                  <Bar dataKey="count" fill={GOLD} fillOpacity={0.55} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </section>

            <section>
              <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
                <ShieldCheck size={15} className="text-gold" aria-hidden />
                Efficient Frontier
              </h3>
              <p className="mb-3 mt-1 text-xs text-ink-faint">
                ความผันผวน (แกน X) เทียบผลตอบแทนคาดหวัง (แกน Y) เมื่อไล่สัดส่วนทองคำจาก 0% ถึง 40%
                — จุดสีทองคือพอร์ตปัจจุบัน
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={frontier} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#3A3427" strokeDasharray="2 4" />
                  <XAxis
                    dataKey="vol"
                    type="number"
                    domain={frontierDomain.vol}
                    allowDataOverflow={false}
                    tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                    tick={{ fill: "#A79E8C", fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: "#3A3427" }}
                  />
                  <YAxis
                    dataKey="ret"
                    type="number"
                    domain={frontierDomain.ret}
                    allowDataOverflow={false}
                    tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                    tick={{ fill: "#A79E8C", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip
                    cursor={{ stroke: "#766F60", strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as { vol: number; ret: number; gold?: number };
                      return (
                        <div className="rounded-lg border border-line bg-panel px-3 py-2 font-mono text-xs text-ink shadow-lg">
                          {d.gold !== undefined && (
                            <div className="text-gold-light">ทองคำ {pct(d.gold, 0)}</div>
                          )}
                          <div className="tabular">ผลตอบแทน {d.ret.toFixed(2)}%</div>
                          <div className="tabular text-ink-faint">ผันผวน {d.vol.toFixed(2)}%</div>
                        </div>
                      );
                    }}
                  />
                  <Line dataKey="ret" stroke={EQUITY} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <Scatter data={currentPoint} dataKey="ret" fill={GOLD_LIGHT} shape="circle" isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </section>
          </div>

          {/* ---- Persona table ---- */}
          <section>
            <h3 className="text-sm font-medium text-ink">เปรียบเทียบ 4 Persona</h3>
            <p className="mb-3 mt-1 text-xs text-ink-faint">
              ผลลัพธ์เมื่อแต่ละ persona ลงทุน {thb(capital)} บาท ตามเงินลงทุนที่ตั้งไว้ด้านซ้าย
              (simulation {N_SIMS_PERSONA} รอบต่อ persona)
            </p>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[680px]">
                <thead>
                  <tr>
                    <th>Persona</th>
                    <th>อายุ / ระยะเวลา</th>
                    <th className="text-right">ทองคำ</th>
                    <th className="text-right">ผลตอบแทน/ปี</th>
                    <th className="text-right">ความผันผวน</th>
                    <th className="text-right">มัธยฐานปลายทาง</th>
                    <th className="text-right">กรณีเลวร้าย (5%)</th>
                  </tr>
                </thead>
                <tbody>
                  {personaRows.map((p) => (
                    <tr
                      key={p.id}
                      className={activePersona === p.id ? "bg-gold/[0.07]" : undefined}
                    >
                      <td className="whitespace-nowrap font-medium text-ink">{p.label}</td>
                      <td className="whitespace-nowrap">
                        {p.age} ปี · {p.horizon} ปี
                      </td>
                      <td className="strong text-right">{pct(p.gold, 0)}</td>
                      <td className="strong text-right">{pct(p.s.ret)}</td>
                      <td className="strong text-right">{pct(p.s.vol)}</td>
                      <td className="strong text-right">{thb(p.median)}</td>
                      <td className="strong text-right text-ink-dim">{thb(p.p5)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
