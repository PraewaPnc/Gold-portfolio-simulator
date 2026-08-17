"use client";

import { Coins, Maximize2, TrendingUp, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

import { InfoHint } from "@/components/InfoHint";
import { convertAmount, currencySymbol, defaultCapital, unitLabel } from "@/lib/currency";
import { useCurrency } from "@/lib/currency-context";
import { assetStats } from "@/lib/data";
import { money, moneyCompact, pct } from "@/lib/format";
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
  SAMPLE_PATHS,
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

/** สไลเดอร์ทองคำสูงสุด 40% — ใช้เป็นขอบบนของช่วงระดับที่เสี่ยงต่ำสุดตอนแสดงผล */
const MAX_GOLD = 0.4;

/** ปัดขึ้นเป็นตัวเลขกลม ๆ ที่อ่านง่ายบนแกน เช่น 797,500 → 800,000 */
function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8]) {
    if (m * mag >= raw) return m * mag;
  }
  return 10 * mag;
}

/** ข้อความบอกช่วงสัดส่วนทองคำของระดับความเสี่ยงหนึ่ง ๆ เช่น "11.5% – 17.5%" */
function bandRangeText(b: RiskBand): string {
  const hi = Number.isFinite(b.hi) ? b.hi : MAX_GOLD;
  return `${pct(b.lo)} – ${pct(hi)}`;
}

interface PersonaRow {
  id: string;
  label: string;
  age: number;
  horizon: number;
  gold: number;
  cash: number;
  s: { ret: number; vol: number };
  median: number;
  p5: number;
}

/** ตารางเปรียบเทียบ persona — ใช้ทั้งในหน้าปกติและในหน้าต่างขยาย จึงแยกออกมาไม่ให้เขียนซ้ำ */
function PersonaTable({
  rows,
  activePersona,
}: {
  rows: PersonaRow[];
  activePersona: string | null;
}) {
  // มูลค่าปลายทางสองคอลัมน์สุดท้ายเป็นจำนวนเงิน จึงต้องรู้สกุลที่เลือกอยู่
  const { currency } = useCurrency();
  return (
    <table className="data-table min-w-[740px]">
      <thead>
        <tr>
          <th>Persona</th>
          <th>อายุ / ระยะเวลา</th>
          <th className="text-right">ทองคำ</th>
          <th className="text-right">เงินสด</th>
          <th className="text-right">ผลตอบแทน/ปี</th>
          <th className="text-right">ความผันผวน</th>
          <th className="text-right">มัธยฐานปลายทาง ({unitLabel(currency)})</th>
          <th className="text-right">กรณีเลวร้าย 5% ({unitLabel(currency)})</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.id} className={activePersona === p.id ? "bg-gold/[0.07]" : undefined}>
            <td className="whitespace-nowrap font-medium text-ink">{p.label}</td>
            <td className="whitespace-nowrap">
              {p.age} ปี · {p.horizon} ปี
            </td>
            <td className="strong text-right">{pct(p.gold, 0)}</td>
            <td className="strong text-right text-ink-dim">{pct(p.cash, 0)}</td>
            <td className="strong text-right">{pct(p.s.ret)}</td>
            <td className="strong text-right">{pct(p.s.vol)}</td>
            <td className="strong text-right">{money(p.median)}</td>
            <td className="strong text-right text-ink-dim">{money(p.p5)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Simulator() {
  const { currency, stats: marketStats } = useCurrency();
  const [capital, setCapital] = useState(() => defaultCapital(assetStats.meta.defaultCurrency));
  const [horizon, setHorizon] = useState(12);
  const [goldW, setGoldW] = useState(PROFILES.moderate.gold);
  const [cashW, setCashW] = useState(0.1);
  const [activePersona, setActivePersona] = useState<string | null>(null);
  const [tableOpen, setTableOpen] = useState(false);

  /**
   * market model ผูกกับฐานสกุลเงิน — mean, volatility, correlation และอัตราปราศจากความเสี่ยง
   * เป็นคนละชุดระหว่างฐาน USD กับฐานบาท จึงสร้างใหม่ทุกครั้งที่สลับสกุล
   */
  const model = useMemo(() => buildMarketModel(marketStats), [marketStats]);

  /**
   * เงินก้อนที่ผู้ใช้ตั้งไว้ต้องมีมูลค่าเท่าเดิมเมื่อสลับสกุล
   * ถ้าปล่อยตัวเลขค้างไว้ 1,000,000 จะกลายเป็นเงินคนละขนาดกันทันทีที่เปลี่ยนเป็นดอลลาร์
   */
  const prevCurrency = useRef(currency);
  useEffect(() => {
    if (prevCurrency.current === currency) return;
    const from = prevCurrency.current;
    prevCurrency.current = currency;
    setCapital((c) => convertAmount(c, from, currency));
  }, [currency]);

  /** เปิด popup แล้วต้องปิดด้วย Escape ได้ และไม่ให้หน้าด้านหลังเลื่อนตาม */
  useEffect(() => {
    if (!tableOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTableOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [tableOpen]);

  const weights = useMemo(() => weightsFromGold(goldW, cashW), [goldW, cashW]);
  const stats = useMemo(() => portfolioStats(weights, model), [weights, model]);

  /**
   * สถิติของ "ส่วนที่ลงทุน" ล้วน ๆ (ไม่รวมเงินสด)
   * ใช้กับข้อความระดับความเสี่ยง เพราะระดับความเสี่ยงนิยามจากสัดส่วนทองคำในพอร์ตลงทุน
   * ถ้าเอาความผันผวนที่เจือจางด้วยเงินสดมาแสดงตรงนั้น ป้ายกำกับกับตัวเลขจะขัดกันเอง
   */
  const investedStats = useMemo(
    () => portfolioStats(weightsFromGold(goldW), model),
    [goldW, model],
  );

  const sim = useMemo(
    () => runMonteCarlo(weights, horizon, capital, model, N_SIMS),
    [weights, horizon, capital, model],
  );

  const histData = useMemo(() => histogram(sim.ending), [sim.ending]);
  const equityShare = useMemo(() => equityShareForGold(goldW), [goldW]);

  /**
   * ระดับความเสี่ยงอนุมานจากสัดส่วนทองคำโดยตรง จึงไม่มีทางขัดกับสไลเดอร์
   * ลากทองข้ามเส้นแบ่งเมื่อไร ปุ่มที่ไฮไลต์ก็เลื่อนตามทันที
   */
  const activeBand = useMemo(() => riskBandForGold(goldW), [goldW]);

  /**
   * แกน Y ผูกกับแถบ p95 เท่านั้น ไม่ผูกกับเส้นทางตัวอย่าง
   * เพราะเส้นทางที่โชคดีที่สุดในกลุ่มตัวอย่างวิ่งเลย p95 ไปมาก (ราว 40% ที่ 12 ปี
   * และเกือบเท่าตัวที่ 30 ปี) ถ้าปล่อยให้แกนยืดตาม แถบ percentile จะถูกบีบจนอ่านไม่ออก
   * เส้นที่หลุดกรอบจึงถูกตัดที่ขอบบนแทน (allowDataOverflow)
   */
  const yScale = useMemo(() => {
    const step = niceStep(Math.max(...sim.fan.map((f) => f.p95)) / 4);
    return { max: step * 4, ticks: [0, step, step * 2, step * 3, step * 4] };
  }, [sim.fan]);

  const lastFan = sim.fan[sim.fan.length - 1];
  const medianEnd = lastFan?.p50 ?? capital;
  const p5End = lastFan?.p5 ?? capital;

  const personaRows = useMemo(
    () =>
      PERSONAS.map((p) => {
        const w = weightsFromGold(p.gold, p.cash);
        const s = portfolioStats(w, model);
        const pSim = runMonteCarlo(w, p.horizon, capital, model, N_SIMS_PERSONA);
        const end = pSim.fan[pSim.fan.length - 1];
        return { ...p, w, s, median: end.p50, p5: end.p5, probLoss: pSim.probLoss };
      }),
    [capital, model],
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
              เงินลงทุนทั้งหมด ({unitLabel(currency)})
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
              แบ่งส่วนลงทุนที่ไม่ใช่ทองคำเป็น หุ้นสหรัฐฯ {pct(equityShare, 0)} / พันธบัตร{" "}
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
              กันไว้ {money(capital * cashW)} {unitLabel(currency)} · เหลือลงทุน{" "}
              {money(capital * (1 - cashW))} {unitLabel(currency)}
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
            ส่วนที่เหลือยิ่งเอนไปทางพันธบัตร ระดับความเสี่ยงจึงอ่านจากสไลเดอร์ทองโดยตรง
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
                { label: marketStats.assets.equity.label, w: weights.equity, color: EQUITY },
                { label: marketStats.assets.bond.label, w: weights.bond, color: BOND },
                { label: "สำรองเงินสด", w: weights.cash, color: CASH },
              ] as const
            ).map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: item.color }}
                  aria-hidden
                />
                {item.label} ·{" "}
                <span className="font-mono tabular">{money(capital * item.w)}</span>{" "}
                {unitLabel(currency)}
              </span>
            ))}
          </div>

          <p className="mb-6 text-[11.5px] leading-relaxed text-ink-faint">
            สำรองเงินสดไม่ได้ลงทุน แต่คิดผลตอบแทนที่อัตราปราศจากความเสี่ยง{" "}
            {pct(marketStats.riskFreeRate)} ต่อปี โดยไม่มีความผันผวน และไม่ถูกโยกกลับเข้าตลาด
            ตลอดช่วงจำลอง — ตัวเลขสถิติทั้งสี่ช่องด้านล่างเป็นของเงินทุนทั้งก้อนรวมเงินสดแล้ว
          </p>

          {/* ---- Stat cards ---- */}
          <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {/*
              infoAlign กันไม่ให้ tooltip ถูก overflow-hidden ของพาเนลตัด
              การ์ดที่อยู่คอลัมน์ขวา (ทั้งตอน 2 และ 4 คอลัมน์) ต้องชิดขวา
            */}
            {(
              [
                {
                  label: `เงินลงทุนในทองคำ (${unitLabel(currency)})`,
                  value: money(capital * weights.gold),
                  accent: true,
                },
                {
                  label: "ผลตอบแทนคาดหวัง / ปี",
                  value: pct(stats.ret),
                  info:
                    "ค่าเฉลี่ยผลตอบแทนต่อปีของทั้งพอร์ต ถ่วงน้ำหนักตามสัดส่วนที่ถือ · " +
                    `สูตร: Σ (น้ำหนัก × ผลตอบแทนเฉลี่ยของสินทรัพย์) + เงินสด × ${pct(marketStats.riskFreeRate)}`,
                  infoAlign: "right",
                },
                {
                  label: "ความผันผวน (S.D.)",
                  value: pct(stats.vol),
                  info:
                    "ผลตอบแทนจริงแต่ละปีเหวี่ยงห่างจากค่าเฉลี่ยแค่ไหน · " +
                    "สูตร: √( Σ wᵢwⱼ × σᵢσⱼ × ρᵢⱼ ) · คิดสหสัมพันธ์ (ρ) ระหว่างสินทรัพย์ด้วย " +
                    "จึงต่ำกว่าการเฉลี่ยความผันผวนตรง ๆ",
                  infoAlign: "left",
                },
                {
                  label: "Sharpe Ratio",
                  value: stats.sharpe.toFixed(2),
                  info:
                    "วัดผลตอบแทนเทียบกับความเสี่ยงที่รับ — ยิ่งสูงยิ่งคุ้ม · " +
                    `สูตร: (ผลตอบแทน − ${pct(marketStats.riskFreeRate)}) ÷ ความผันผวน · ` +
                    "เทียบระหว่างสัดส่วนการลงทุน",
                  infoAlign: "right",
                },
              ] as {
                label: string;
                value: string;
                accent?: boolean;
                info?: string;
                infoAlign?: "left" | "right";
              }[]
            ).map((card) => (
              <div key={card.label} className="rounded-[10px] border border-line bg-panel2/50 px-4 py-3.5">
                <p className="label-caps flex items-center gap-1.5">
                  {card.label}
                  {card.info ? (
                    <InfoHint
                      label={`คำอธิบาย ${card.label}`}
                      text={card.info}
                      align={card.infoAlign ?? "right"}
                    />
                  ) : null}
                </p>
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
              {/*
                กันคนดูเข้าใจผิดว่าเส้นกลางคือเส้นทางที่จะเกิดขึ้นจริง
                ซึ่งเป็นจุดที่ fan chart หลอกตาได้มากที่สุด
              */}
              <InfoHint
                label="คำอธิบายเส้นทางตัวอย่างและแกนตั้งของกราฟ"
                align="left"
                text={
                  `เส้นจาง ${SAMPLE_PATHS} เส้นคือเส้นทางจริงของ ${SAMPLE_PATHS} รอบแรก · ` +
                  "เส้นกลางที่เรียบไม่ใช่เส้นทางของรอบใดรอบหนึ่ง แต่เป็นค่ามัธยฐานที่คำนวณใหม่ทุกปี " +
                  "ความหยักของแต่ละรอบจึงหักล้างกันหมด · " +
                  "แกนตั้งตรึงไว้กับแถบ 95th percentile เส้นที่วิ่งเกินกรอบจะถูกตัดที่ขอบบน"
                }
              />
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
                  domain={[0, yScale.max]}
                  ticks={yScale.ticks}
                  allowDataOverflow
                  tickFormatter={(v: number) => `${currencySymbol(currency)}${moneyCompact(v)}`}
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
                        <div className="tabular">
                          มัธยฐาน: {money(d.p50)} {unitLabel(currency)}
                        </div>
                        <div className="tabular text-ink-faint">
                          ช่วง 5–95%: {money(d.p5)} – {money(d.p95)}
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
                {/*
                  เส้นทางจริงรายรอบ วาดก่อนเส้นมัธยฐานเพื่อให้เส้นมัธยฐานอยู่บนสุด
                  จางมากโดยตั้งใจ — หน้าที่ของมันคือแสดง "เนื้อ" ของการจำลอง ไม่ใช่ให้อ่านทีละเส้น
                */}
                {Array.from({ length: SAMPLE_PATHS }, (_, i) => (
                  <Line
                    key={`s${i}`}
                    dataKey={`s${i}`}
                    stroke={GOLD_LIGHT}
                    strokeWidth={1}
                    strokeOpacity={0.15}
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                ))}
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
                มัธยฐาน {money(medianEnd)} {unitLabel(currency)} · กรณีเลวร้าย (5%){" "}
                {money(p5End)} {unitLabel(currency)}
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={histData} margin={{ top: 5, right: 16, left: 16, bottom: 0 }}>
                  <XAxis
                    dataKey="mid"
                    tickFormatter={(v: number) => `${currencySymbol(currency)}${moneyCompact(v)}`}
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
                          <div className="tabular">
                            ~{money(d.mid)} {unitLabel(currency)}
                          </div>
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
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-medium text-ink">เปรียบเทียบ 4 Persona</h3>
              <button
                type="button"
                onClick={() => setTableOpen(true)}
                aria-label="ขยายตารางเปรียบเทียบ 4 Persona"
                title="ขยายตาราง"
                className="inline-flex flex-none rounded-md border border-line p-1.5 text-ink-dim
                           transition-colors hover:border-gold/60 hover:text-gold-light"
              >
                <Maximize2 size={13} aria-hidden />
              </button>
            </div>
            <p className="mb-3 mt-1 text-xs text-ink-faint">
              ผลลัพธ์เมื่อแต่ละ persona เริ่มด้วยเงิน {money(capital)} {unitLabel(currency)}{" "}
              ตามที่ตั้งไว้ด้านซ้าย
              (simulation {N_SIMS_PERSONA} รอบต่อ persona) · คอลัมน์ทองคำเป็นสัดส่วนของส่วนที่ลงทุน
              ส่วนเงินสดเป็นสัดส่วนของเงินทั้งก้อน
            </p>
            <div className="overflow-x-auto">
              <PersonaTable rows={personaRows} activePersona={activePersona} />
            </div>
          </section>
        </div>
      </div>

      {/*
        หน้าต่างขยายตาราง — ใช้ fixed จึงไม่ถูก overflow-hidden ของพาเนลตัด
        ปิดได้ด้วยปุ่ม X, กด Escape หรือคลิกพื้นหลัง
      */}
      {tableOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm"
          onClick={() => setTableOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="ตารางเปรียบเทียบ 4 Persona"
            className="panel max-h-[88vh] w-full max-w-5xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line p-5">
              <div>
                <h3 className="text-sm font-medium text-ink">เปรียบเทียบ 4 Persona</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-faint">
                  ผลลัพธ์เมื่อแต่ละ persona เริ่มด้วยเงิน {money(capital)} {unitLabel(currency)}{" "}
                  (simulation{" "}
                  {N_SIMS_PERSONA} รอบต่อ persona) · คอลัมน์ทองคำเป็นสัดส่วนของส่วนที่ลงทุน
                  ส่วนเงินสดเป็นสัดส่วนของเงินทั้งก้อน
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTableOpen(false)}
                aria-label="ปิดหน้าต่าง"
                autoFocus
                className="inline-flex flex-none rounded-md border border-line p-1.5 text-ink-dim
                           transition-colors hover:border-gold/60 hover:text-gold-light"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
            <div className="max-h-[calc(88vh-92px)] overflow-auto p-5">
              <PersonaTable rows={personaRows} activePersona={activePersona} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
