"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatThaiDate, formatThaiMonthYear } from "@/lib/data";
import type { PricePoint } from "@/lib/types";

const SERIES = [
  { key: "gold", label: "ทองคำ (บาท)", color: "#C9A227" },
  { key: "equity", label: "หุ้นไทย (SET50 TR)", color: "#5B87A6" },
  { key: "bond", label: "ตราสารหนี้ (TR)", color: "#4F8B76" },
] as const;

const RANGES = [
  { key: "6m", label: "6 เดือน", months: 6 },
  { key: "1y", label: "1 ปี", months: 12 },
  { key: "5y", label: "5 ปี", months: 60 },
  { key: "10y", label: "10 ปี", months: 120 },
  { key: "all", label: "ทั้งหมด", months: null },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

interface Props {
  series: PricePoint[];
}

export function PriceChart({ series }: Props) {
  const [range, setRange] = useState<RangeKey>("all");

  /**
   * ตัดช่วงเวลาแล้ว normalize ใหม่ให้จุดแรกของช่วงที่เลือกเป็น 100
   * เพื่อให้เปรียบเทียบ "ทิศทางในช่วงนั้น" ได้ตรง ไม่ใช่แค่ซูมกราฟเดิม
   */
  const data = useMemo(() => {
    const cfg = RANGES.find((r) => r.key === range)!;
    let sliced = series;

    if (cfg.months !== null) {
      const cutoff = new Date(series[series.length - 1].date);
      cutoff.setMonth(cutoff.getMonth() - cfg.months);
      const filtered = series.filter((p) => new Date(p.date) >= cutoff);
      if (filtered.length > 1) sliced = filtered;
    }

    const base = sliced[0];
    return sliced.map((p) => ({
      date: p.date,
      gold: (p.gold / base.gold) * 100,
      equity: (p.equity / base.equity) * 100,
      bond: (p.bond / base.bond) * 100,
    }));
  }, [series, range]);

  // ช่วงสั้นแสดงวันที่ระดับวัน ส่วนช่วงยาวแสดงแค่เดือน/ปี ไม่ให้แกนแน่นเกินไป
  const formatAxisDate = range === "6m" || range === "1y" ? formatThaiDate : formatThaiMonthYear;

  /**
   * กำหนดขอบเขตแกน Y ตามข้อมูลที่แสดงจริง แทนที่จะยึด 0 เป็นฐาน
   * ในช่วงสั้นค่าทุกเส้นจะอยู่ใกล้ 100 ถ้าเริ่มแกนที่ 0 กราฟจะแบนจนดูทิศทางไม่ออก
   * (กราฟดัชนีฐาน 100 โดยทั่วไปไม่ยึดศูนย์ และมีเส้นอ้างอิงที่ 100 กำกับอยู่แล้ว)
   */
  const yDomain = useMemo((): [number, number] => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const d of data) {
      lo = Math.min(lo, d.gold, d.equity, d.bond);
      hi = Math.max(hi, d.gold, d.equity, d.bond);
    }
    const padding = (hi - lo) * 0.08 || 5;
    return [Math.max(0, lo - padding), hi + padding];
  }, [data]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-ink">ราคาย้อนหลังเปรียบเทียบ (ฐาน 100)</h3>
          <p className="mt-0.5 text-xs text-ink-faint">
            ข้อมูลรายสัปดาห์ · ปรับฐานให้จุดเริ่มต้นของช่วงที่เลือกเท่ากับ 100
            เพื่อเทียบทิศทางในกราฟเดียว ({data.length} จุดข้อมูล)
          </p>
        </div>
        <div
          role="group"
          aria-label="เลือกช่วงเวลาที่แสดง"
          className="flex flex-wrap gap-1.5"
        >
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              data-active={range === r.key}
              aria-pressed={range === r.key}
              className="seg-btn min-w-[62px] flex-none px-2.5 whitespace-nowrap"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={330}>
        <LineChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#3A3427" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatAxisDate}
            tick={{ fill: "#A79E8C", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#3A3427" }}
            minTickGap={48}
          />
          <YAxis
            type="number"
            domain={yDomain}
            tick={{ fill: "#A79E8C", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={46}
            tickFormatter={(v: number) => v.toFixed(0)}
          />
          <ReferenceLine y={100} stroke="#766F60" strokeDasharray="3 3" />
          <Tooltip
            cursor={{ stroke: "#766F60", strokeDasharray: "3 3" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-lg border border-line bg-panel px-3 py-2.5 font-mono text-xs text-ink shadow-lg">
                  <div className="mb-1.5 text-ink-faint">{formatAxisDate(String(label))}</div>
                  {SERIES.map((s) => {
                    const entry = payload.find((p) => p.dataKey === s.key);
                    if (!entry) return null;
                    return (
                      <div key={s.key} className="flex justify-between gap-4">
                        <span style={{ color: s.color }}>{s.label}</span>
                        <span className="tabular">{Number(entry.value).toFixed(1)}</span>
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={30}
            wrapperStyle={{ fontSize: 12, color: "#A79E8C", paddingTop: 8 }}
          />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={1.8}
              dot={false}
              activeDot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
