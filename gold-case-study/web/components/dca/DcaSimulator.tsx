"use client";

import { motion } from "framer-motion";
import { CalendarClock, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/ChartTooltip";
import { InfoHint } from "@/components/InfoHint";
import {
  convertAmount,
  currencySymbol,
  toCurrencyMonthly,
  unitLabel,
} from "@/lib/currency";
import { useCurrency } from "@/lib/currency-context";
import { assetStats, dataRange, formatThaiMonthYear, priceHistory } from "@/lib/data";
import { dcaWindow, maxDcaYears, PRICE_OF, runDca, type DcaAssetKey } from "@/lib/dca";
import { dec2, money, moneyCompact, pct, pctSigned, price } from "@/lib/format";

const GOLD = "#C9A227";
const GOLD_LIGHT = "#E8C766";
const INVESTED = "#8E8778";
const DANGER = "#B25A4A";

const MONTHLY = priceHistory.monthly;

const MAX_YEARS = maxDcaYears(MONTHLY, dataRange.end);

const COMPARE: { key: DcaAssetKey; label: string; color: string }[] = [
  { key: "gold", label: "ทองคำ", color: GOLD },
  { key: "equity", label: "หุ้นสหรัฐฯ", color: "#5B87A6" },
  { key: "bond", label: "พันธบัตรสหรัฐฯ", color: "#4F8B76" },
];

/** เงินตั้งต้นของหน้านี้กำหนดเป็นเงินบาท แล้วแปลงตามสกุลที่เลือก */
const DEFAULT_INITIAL_THB = 100_000;
const DEFAULT_MONTHLY_THB = 5_000;

export function DcaSimulator() {
  const { currency } = useCurrency();
  // ค่าตั้งต้นต้องอยู่ในสกุลที่ render ครั้งแรกใช้ ไม่งั้นตัวเลขบาทจะไปโผล่ในหน้าที่คิดเป็นดอลลาร์
  const [initial, setInitial] = useState(() =>
    convertAmount(DEFAULT_INITIAL_THB, "thb", assetStats.meta.defaultCurrency),
  );
  const [monthly, setMonthly] = useState(() =>
    convertAmount(DEFAULT_MONTHLY_THB, "thb", assetStats.meta.defaultCurrency),
  );
  const [years, setYears] = useState(10);

  /**
   * แผนการลงทุนที่ผู้ใช้ตั้งไว้ต้องมีมูลค่าเท่าเดิมเมื่อสลับสกุล
   * ไม่งั้น "5,000 ต่อเดือน" จะกลายเป็นแผนคนละขนาดกันทันทีที่เปลี่ยนเป็นดอลลาร์
   */
  const prevCurrency = useRef(currency);
  useEffect(() => {
    if (prevCurrency.current === currency) return;
    const from = prevCurrency.current;
    prevCurrency.current = currency;
    setInitial((v) => convertAmount(v, from, currency));
    setMonthly((v) => convertAmount(v, from, currency));
  }, [currency]);

  /** แปลงราคาทุกงวดเป็นสกุลที่เลือกก่อน การคำนวณ DCA ที่เหลือจึงไม่ต้องรู้เรื่องสกุลเงิน */
  const rows = useMemo(() => toCurrencyMonthly(MONTHLY, currency), [currency]);

  const win = useMemo(() => dcaWindow(rows, years, dataRange.end), [rows, years]);
  const input = useMemo(() => ({ initial, monthly }), [initial, monthly]);

  const result = useMemo(() => runDca(win, PRICE_OF.gold, input), [win, input]);

  /** DCA ตารางเดียวกันแต่เปลี่ยนสินทรัพย์ — ตอบคำถามว่าทำแบบเดียวกันกับตัวอื่นจะเป็นอย่างไร */
  const comparison = useMemo(
    () => COMPARE.map((c) => ({ ...c, r: runDca(win, PRICE_OF[c.key], input) })),
    [win, input],
  );

  const chartData = useMemo(
    () => result.points.map((p) => ({ date: p.date, invested: p.invested, value: p.value })),
    [result.points],
  );

  const positive = result.gain >= 0;

  return (
    <div className="panel overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
        {/* ================= Controls ================= */}
        <aside className="flex flex-col gap-5 border-b border-line p-5 lg:border-b-0 lg:border-r">
          <div>
            <label htmlFor="dca-initial" className="label-caps mb-2 block">
              เงินเริ่มต้น ({unitLabel(currency)})
            </label>
            <input
              id="dca-initial"
              type="number"
              step={currency === "thb" ? 10_000 : 500}
              min={0}
              value={initial}
              onChange={(e) => setInitial(Math.max(0, Number(e.target.value) || 0))}
              className="number-input tabular"
            />
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-faint">
              ลงพร้อมเงินงวดแรกในเดือนแรกของช่วง · ตั้งเป็น 0 ได้ถ้าอยากดู DCA ล้วน ๆ
            </p>
          </div>

          <div>
            <label htmlFor="dca-monthly" className="label-caps mb-2 block">
              เงิน DCA ต่อเดือน ({unitLabel(currency)})
            </label>
            <input
              id="dca-monthly"
              type="number"
              step={currency === "thb" ? 1_000 : 50}
              min={0}
              value={monthly}
              onChange={(e) => setMonthly(Math.max(0, Number(e.target.value) || 0))}
              className="number-input tabular"
            />
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-faint">
              ซื้อที่ราคาปิดสิ้นเดือนทุกงวด · ตั้งเป็น 0 ได้ถ้าอยากเทียบกับการลงเงินก้อนเดียว
            </p>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="dca-years" className="label-caps">
                ระยะเวลาลงทุน
              </label>
              <span className="font-mono text-[13px] tabular text-gold-light">{years} ปี</span>
            </div>
            <input
              id="dca-years"
              type="range"
              min={1}
              max={MAX_YEARS}
              step={1}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="slider"
            />
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-faint">
              {result.start ? formatThaiMonthYear(result.start) : ""} –{" "}
              {result.end ? formatThaiMonthYear(result.end) : ""} · {result.periods} งวด
            </p>
          </div>

          <div className="rounded-[10px] border border-line bg-panel2/50 px-4 py-3.5">
            <p className="label-caps">ทองคำที่สะสมได้</p>
            <p className="mt-1.5 font-mono text-[19px] font-medium tabular text-gold-light">
              {dec2(result.units)} ออนซ์
            </p>
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-ink-faint">
              ต้นทุนเฉลี่ย {price(result.avgCost, currency)} {unitLabel(currency)}/ออนซ์
              <br />
              ราคาล่าสุด {price(result.finalPrice, currency)} {unitLabel(currency)}/ออนซ์
            </p>
          </div>

          <p className="border-t border-line pt-3.5 text-[11.5px] leading-relaxed text-ink-faint">
            หน้านี้ไม่ได้สุ่มตัวเลข — เป็นการย้อนดูราคาทองคำจริงรายเดือนที่เกิดขึ้นแล้ว
            แล้วคำนวณว่าถ้าลงเงินตามตารางนี้ทุกงวดจะได้ทองกี่ออนซ์และมูลค่าเท่าไร
            ผลในอดีตไม่รับประกันผลในอนาคต
          </p>
        </aside>

        {/* ================= Main ================= */}
        <div className="relative min-w-0 p-5 sm:p-6 ambient-glow-center overflow-hidden">
          {/* แสง Ambient Gold Glow */}
          <div
            className="pointer-events-none absolute right-6 top-10 h-[360px] w-[360px] rounded-full bg-gold/12 blur-[110px]"
            aria-hidden
          />
          {/* ---- Stat cards ---- */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: `เงินทุนสะสม (${unitLabel(currency)})`,
                value: money(result.invested),
                tone: "ink",
              },
              {
                label: `มูลค่าปัจจุบัน (${unitLabel(currency)})`,
                value: money(result.value),
                tone: "gold",
              },
              {
                label: `${positive ? "กำไร" : "ขาดทุน"} (${unitLabel(currency)})`,
                value: money(Math.abs(result.gain)),
                sub: pctSigned(result.gainPct),
                tone: positive ? "gold" : "danger",
              },
              {
                label: "ผลตอบแทน (IRR)",
                value: pct(result.irr),
                sub: "ถ่วงน้ำหนักด้วยเงินและเวลา",
                tone: result.irr >= 0 ? "ink" : "danger",
                info:
                  "Internal Rate of Return — อัตราผลตอบแทนที่ทำให้เงินทุกงวดที่ลงไป " +
                  "คิดลดกลับมาแล้วเท่ากับมูลค่าพอร์ตวันนี้พอดี · " +
                  "สูตร: หา r ที่ทำให้ Σ (เงินงวดที่ i ÷ (1+r)ⁱ) = 0 " +
                  "แล้วแปลงเป็นรายปีด้วย (1+r)¹² − 1",
              },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}
                className="rounded-[10px] border border-line bg-panel2/50 px-4 py-3.5"
              >
                <p className="label-caps flex items-center gap-1.5">
                  {card.label}
                  {"info" in card && card.info ? (
                    <InfoHint label={`คำอธิบาย ${card.label}`} text={card.info} align="right" />
                  ) : null}
                </p>
                <p
                  className={`mt-1.5 font-mono text-[19px] font-medium tabular ${
                    card.tone === "gold"
                      ? "text-gold-light"
                      : card.tone === "danger"
                        ? "text-danger"
                        : "text-ink"
                  }`}
                >
                  {card.value}
                </p>
                {card.sub ? (
                  <p className="mt-1 font-mono text-[11px] tabular text-ink-faint">{card.sub}</p>
                ) : null}
              </motion.div>
            ))}
          </div>

          {/* ---- Equity curve ---- */}
          <section className="mb-8">
            <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
              <TrendingUp size={15} className="text-gold" aria-hidden />
              เงินที่ลงทุนสะสม เทียบกับ มูลค่ารวมของพอร์ต
            </h3>
            <p className="mb-3.5 mt-1 text-xs leading-relaxed text-ink-faint">
              พื้นที่สีเทาคือเงินที่ใส่เข้าไปแล้ว เส้นสีทองคือมูลค่าทองที่ถืออยู่ ณ ราคาของเดือนนั้น
              — ระยะห่างระหว่างสองเส้นคือกำไรหรือขาดทุนที่ยังไม่ได้ขาย
            </p>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#3A3427" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatThaiMonthYear}
                  tick={{ fill: "#A79E8C", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#3A3427" }}
                  minTickGap={48}
                />
                <YAxis
                  tickFormatter={(v: number) => `${currencySymbol(currency)}${moneyCompact(v)}`}
                  tick={{ fill: "#A79E8C", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={58}
                />
                <Tooltip
                  cursor={{ stroke: "#C9A227", strokeWidth: 1, strokeDasharray: "3 3", strokeOpacity: 0.6 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload as { invested: number; value: number };
                    const gain = d.value - d.invested;
                    const gainPct = d.invested > 0 ? gain / d.invested : 0;
                    return (
                      <ChartTooltip
                        title={formatThaiMonthYear(String(label))}
                        badge={{
                          label: gain >= 0 ? "กำไร" : "ขาดทุน",
                          color: gain >= 0 ? GOLD_LIGHT : DANGER,
                          bg: gain >= 0 ? "rgba(232, 199, 102, 0.12)" : "rgba(178, 90, 74, 0.15)",
                        }}
                        items={[
                          {
                            key: "invested",
                            label: "เงินที่ลงทุน",
                            value: `${money(d.invested)} ${unitLabel(currency)}`,
                            color: INVESTED,
                          },
                          {
                            key: "value",
                            label: "มูลค่ารวม",
                            value: `${money(d.value)} ${unitLabel(currency)}`,
                            color: GOLD_LIGHT,
                            isStrong: true,
                          },
                        ]}
                        footer={
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-ink-dim">
                              {gain >= 0 ? "กำไรสะสม" : "ขาดทุนสะสม"}
                            </span>
                            <span
                              className="font-semibold tabular"
                              style={{ color: gain >= 0 ? GOLD_LIGHT : DANGER }}
                            >
                              {gain >= 0 ? "+" : ""}{money(gain)} ({pctSigned(gainPct)})
                            </span>
                          </div>
                        }
                      />
                    );
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={30}
                  wrapperStyle={{ fontSize: 12, color: "#A79E8C", paddingTop: 8 }}
                />
                <Area
                  dataKey="invested"
                  name="เงินที่ลงทุนสะสม"
                  stroke={INVESTED}
                  strokeWidth={1.2}
                  fill={INVESTED}
                  fillOpacity={0.16}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="value"
                  name="มูลค่ารวม"
                  stroke={GOLD_LIGHT}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </section>

          {/* ---- ช่วงที่เจ็บระหว่างทาง ---- */}
          <section className="mb-8 rounded-[10px] border border-line bg-panel2/40 px-4 py-3.5">
            <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
              <CalendarClock size={15} className="text-gold" aria-hidden />
              ระหว่างทางเป็นอย่างไร
            </h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-dim">
              จาก {result.periods} งวด มี{" "}
              <span className="font-mono tabular text-ink">{result.monthsUnderwater}</span> งวด
              ที่มูลค่าพอร์ตต่ำกว่าเงินที่ใส่ไปแล้ว
              {result.worstShortfall < 0 ? (
                <>
                  {" "}
                  จุดที่แย่ที่สุดคือมูลค่าต่ำกว่าเงินที่ใส่{" "}
                  <span className="font-mono tabular text-danger">
                    {pct(Math.abs(result.worstShortfall))}
                  </span>
                </>
              ) : (
                " และไม่เคยมีงวดไหนที่ขาดทุนเลยในช่วงนี้"
              )}
              . ตัวเลขนี้สำคัญพอ ๆ กับผลลัพธ์ปลายทาง เพราะ DCA จะได้ผลก็ต่อเมื่อทำต่อได้ในช่วงที่ราคาลง
            </p>
          </section>

          {/* ---- เทียบกับสินทรัพย์อื่น ---- */}
          <section>
            <h3 className="text-sm font-medium text-ink">ถ้าเอาเงินตารางเดียวกันไปลงสินทรัพย์อื่น</h3>
            <p className="mb-3 mt-1 text-xs leading-relaxed text-ink-faint">
              เงินที่ใส่เท่ากันทุกงวด ต่างกันแค่ซื้ออะไร · หุ้นสหรัฐฯ และพันธบัตรใช้ดัชนีผลตอบแทนรวม
              ฐาน 100 จากชุดข้อมูลเดียวกัน
            </p>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[560px]">
                <thead>
                  <tr>
                    <th>สินทรัพย์</th>
                    <th className="text-right">เงินที่ลงทุน</th>
                    <th className="text-right">มูลค่ารวม</th>
                    <th className="text-right">กำไร/ขาดทุน</th>
                    <th className="text-right">ผลตอบแทน/ปี (IRR)</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((c) => (
                    <tr key={c.key} className={c.key === "gold" ? "bg-gold/[0.07]" : undefined}>
                      <td className="whitespace-nowrap font-medium text-ink">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-sm"
                            style={{ background: c.color }}
                            aria-hidden
                          />
                          {c.label}
                        </span>
                      </td>
                      <td className="strong text-right">{money(c.r.invested)}</td>
                      <td className="strong text-right">{money(c.r.value)}</td>
                      <td
                        className="strong text-right"
                        style={{ color: c.r.gain >= 0 ? undefined : DANGER }}
                      >
                        {pctSigned(c.r.gainPct)}
                      </td>
                      <td className="strong text-right">{pct(c.r.irr)}</td>
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
