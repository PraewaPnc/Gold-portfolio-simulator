"use client";

import { Coins, TrendingUp } from "lucide-react";
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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { assetStats } from "@/lib/data";
import { pct, thb, thbCompact } from "@/lib/format";
import {
  buildMarketModel,
  equityShareForGold,
  histogram,
  MAX_CASH,
  PERSONAS,
  PROFILES,
  portfolioStats,
  riskBandForGold,
  RISK_BANDS,
  runMonteCarlo,
  weightsFromGold,
  type Persona,
  type RiskBand,
} from "@/lib/portfolio";

const GOLD = "#C9A227";
const GOLD_LIGHT = "#E8C766";
const EQUITY = "#5B87A6";
const BOND = "#4F8B76";
const CASH = "#8E8778";

const N_SIMS = 1200;
const N_SIMS_PERSONA = 500;

/**
 * market model สร้างครั้งเดียวจาก asset-stats.json (ข้อมูลย้อนหลังจริง)
 * ไม่ขึ้นกับ state ใด ๆ จึงวางไว้นอก component ได้
 */
const MODEL = buildMarketModel(assetStats);

/** สไลเดอร์ทองคำสูงสุด 40% — ใช้เป็นขอบบนของช่วงระดับที่เสี่ยงต่ำสุดตอนแสดงผล */
const MAX_GOLD = 0.4;

/** ข้อความบอกช่วงสัดส่วนทองคำของระดับความเสี่ยงหนึ่ง ๆ เช่น "11.5% – 17.5%" */
function bandRangeText(b: RiskBand): string {
  const hi = Number.isFinite(b.hi) ? b.hi : MAX_GOLD;
  return `${pct(b.lo)} – ${pct(hi)}`;
}

export function Simulator() {
  const [capital, setCapital] = useState(1_000_000);
  const [horizon, setHorizon] = useState(12);
  const [goldW, setGoldW] = useState(PROFILES.moderate.gold);
  const [cashW, setCashW] = useState(0.1);
  const [activePersona, setActivePersona] = useState<string | null>(null);

  const weights = useMemo(() => weightsFromGold(goldW, cashW), [goldW, cashW]);
  const stats = useMemo(() => portfolioStats(weights, MODEL), [weights]);

  /**
   * สถิติของ "ส่วนที่ลงทุน" ล้วน ๆ (ไม่รวมเงินสด)
   * ใช้กับข้อความระดับความเสี่ยง เพราะระดับความเสี่ยงนิยามจากสัดส่วนทองคำในพอร์ตลงทุน
   * ถ้าเอาความผันผวนที่เจือจางด้วยเงินสดมาแสดงตรงนั้น ป้ายกำกับกับตัวเลขจะขัดกันเอง
   */
  const investedStats = useMemo(() => portfolioStats(weightsFromGold(goldW), MODEL), [goldW]);

  const sim = useMemo(
    () => runMonteCarlo(weights, horizon, capital, MODEL, N_SIMS),
    [weights, horizon, capital],
  );

  const histData = useMemo(() => histogram(sim.ending), [sim.ending]);
  const equityShare = useMemo(() => equityShareForGold(goldW), [goldW]);

  /**
   * ระดับความเสี่ยงอนุมานจากสัดส่วนทองคำโดยตรง จึงไม่มีทางขัดกับสไลเดอร์
   * ลากทองข้ามเส้นแบ่งเมื่อไร ปุ่มที่ไฮไลต์ก็เลื่อนตามทันที
   */
  const activeBand = useMemo(() => riskBandForGold(goldW), [goldW]);

  const lastFan = sim.fan[sim.fan.length - 1];
  const medianEnd = lastFan?.p50 ?? capital;
  const p5End = lastFan?.p5 ?? capital;

  const personaRows = useMemo(
    () =>
      PERSONAS.map((p) => {
        const w = weightsFromGold(p.gold, p.cash);
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
    setGoldW(p.gold);
    setCashW(p.cash);
  }

  /** ปุ่มระดับความเสี่ยงเป็นทางลัดไปยังสัดส่วนทองคำหมุดของระดับนั้น */
  function changeRisk(key: string) {
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
            <p className="label-caps mb-2">ระดับความเสี่ยงของพอร์ต</p>
            {/* เรียงจากเสี่ยงต่ำไปสูงให้ตรงกับสายตา — RISK_BANDS เรียงตามทองน้อยไปมาก จึงต้องกลับด้าน */}
            <div role="group" aria-label="ระดับความเสี่ยงของพอร์ต" className="flex gap-1.5">
              {[...RISK_BANDS].reverse().map((b) => (
                <button
                  key={b.key}
                  type="button"
                  className="seg-btn"
                  data-active={activeBand.key === b.key}
                  aria-pressed={activeBand.key === b.key}
                  title={`สัดส่วนทองคำ ${bandRangeText(b)} · กดเพื่อไปที่ ${pct(b.gold, 0)}`}
                  onClick={() => changeRisk(b.key)}
                >
                  {b.label}
                </button>
              ))}
            </div>
            {/*
              ปุ่มที่ไฮไลต์เป็น "ผลลัพธ์" ที่อ่านจากสัดส่วนทองคำ ไม่ใช่ค่าที่เก็บเป็น state แยก
              จึงบอกช่วงของระดับนั้นไว้ด้วย เพื่อให้ตรวจสอบได้ว่าทำไมสไลเดอร์ตำแหน่งนี้ถึงตกช่วงนี้
            */}
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-ink-faint">
              ช่วง &ldquo;{activeBand.label}&rdquo; คือ ทองคำ {bandRangeText(activeBand)} ·
              ความผันผวนเฉพาะส่วนที่ลงทุน {pct(investedStats.vol)}
            </p>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-faint">
              แบ่งส่วนลงทุนที่ไม่ใช่ทองคำเป็น หุ้น {pct(equityShare, 0)} / ตราสารหนี้{" "}
              {pct(1 - equityShare, 0)}
            </p>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="cashw" className="label-caps">
                สำรองเงินสด
              </label>
              <span className="font-mono text-[13px] tabular text-ink-dim">{pct(cashW, 0)}</span>
            </div>
            <input
              id="cashw"
              type="range"
              min={0}
              max={MAX_CASH}
              step={0.01}
              value={cashW}
              onChange={(e) => {
                setCashW(Number(e.target.value));
                setActivePersona(null);
              }}
              className="slider"
            />
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-faint">
              กันไว้ {thb(capital * cashW)} บาท · เหลือลงทุน {thb(capital * (1 - cashW))} บาท
            </p>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="goldw" className="label-caps">
                สัดส่วนทองคำ (ของส่วนที่ลงทุน)
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
            {/* ปิดลูปอีกทาง — บอกว่าตำแหน่งที่ลากอยู่ตกในระดับไหน ตรงกับปุ่มที่ไฮไลต์ด้านบน */}
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-faint">
              ตกในระดับ &ldquo;{activeBand.label}&rdquo; · หมุดของระดับนี้คือ {pct(activeBand.gold, 0)}
            </p>
            {/*
              สไลเดอร์คิดเป็นสัดส่วนของส่วนที่ลงทุน แต่แถบด้านขวาแสดงสัดส่วนของเงินทุนทั้งก้อน
              ถ้ากันเงินสดไว้ ตัวเลขสองที่จะไม่ตรงกัน จึงแปลงให้ดูตรงนี้เลย
            */}
            {cashW > 0 && (
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-faint">
                = {pct(weights.gold, 1)} ของเงินทุนทั้งก้อน
              </p>
            )}
          </div>

          <p className="border-t border-line pt-3.5 text-[11.5px] leading-relaxed text-ink-faint">
            ลำดับการคิดเหมือนการวางแผนจริง — กันสำรองเงินสดออกก่อน แล้วค่อยจัดสรรส่วนที่เหลือ
            ในส่วนที่ลงทุน สัดส่วนทองคำเป็นตัวควบคุมเพียงตัวเดียว ทองยิ่งมาก
            ส่วนที่เหลือยิ่งเอนไปทางตราสารหนี้ ระดับความเสี่ยงจึงอ่านจากสไลเดอร์ทองโดยตรง
            ลากข้ามเส้นแบ่งเมื่อไร ปุ่มด้านบนเลื่อนตามทันที และการกดปุ่มก็คือทางลัด
            ไปยังหมุดของระดับนั้น
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
                { key: "cash", w: weights.cash, bg: CASH, fg: "#1B1815" },
              ] as const
            ).map((seg) => (
              <div
                key={seg.key}
                className="flex items-center justify-center overflow-hidden whitespace-nowrap
                           font-mono text-[11.5px] font-medium transition-[width] duration-300"
                style={{ width: `${seg.w * 100}%`, background: seg.bg, color: seg.fg }}
              >
                {seg.w > 0.045 ? pct(seg.w, 0) : ""}
              </div>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-dim">
            {(
              [
                { label: "ทองคำ", w: weights.gold, color: GOLD },
                { label: "หุ้นไทย", w: weights.equity, color: EQUITY },
                { label: "ตราสารหนี้", w: weights.bond, color: BOND },
                { label: "สำรองเงินสด", w: weights.cash, color: CASH },
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

          <p className="mb-6 text-[11.5px] leading-relaxed text-ink-faint">
            สำรองเงินสดไม่ได้ลงทุน แต่คิดผลตอบแทนที่อัตราปราศจากความเสี่ยง{" "}
            {pct(assetStats.meta.riskFreeRate)} ต่อปี โดยไม่มีความผันผวน และไม่ถูกโยกกลับเข้าตลาด
            ตลอดช่วงจำลอง — ตัวเลขสถิติทั้งสี่ช่องด้านล่างเป็นของเงินทุนทั้งก้อนรวมเงินสดแล้ว
          </p>

          {/* ---- Stat cards ---- */}
          <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "เงินลงทุนในทองคำ (บาท)", value: thb(capital * weights.gold), accent: true },
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

          {/* ---- Histogram ---- */}
          <div className="mb-8">
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
          </div>

          {/* ---- Persona table ---- */}
          <section>
            <h3 className="text-sm font-medium text-ink">เปรียบเทียบ 4 Persona</h3>
            <p className="mb-3 mt-1 text-xs text-ink-faint">
              ผลลัพธ์เมื่อแต่ละ persona เริ่มด้วยเงิน {thb(capital)} บาท ตามที่ตั้งไว้ด้านซ้าย
              (simulation {N_SIMS_PERSONA} รอบต่อ persona) · คอลัมน์ทองคำเป็นสัดส่วนของส่วนที่ลงทุน
              ส่วนเงินสดเป็นสัดส่วนของเงินทั้งก้อน
            </p>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[740px]">
                <thead>
                  <tr>
                    <th>Persona</th>
                    <th>อายุ / ระยะเวลา</th>
                    <th className="text-right">ทองคำ</th>
                    <th className="text-right">เงินสด</th>
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
                      <td className="strong text-right text-ink-dim">{pct(p.cash, 0)}</td>
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
