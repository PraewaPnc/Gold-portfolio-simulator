"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
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

/** สีของแถบวิกฤต ใช้สีเดียวกันทุกช่วงเพื่อไม่ให้แย่งสายตาไปจากเส้นราคา */
const CRISIS_FILL = "#B25A4A";

/**
 * ช่วงวิกฤตเศรษฐกิจโลกครั้งใหญ่ที่อยู่ในกรอบข้อมูล (2551 เป็นต้นมา)
 * ใช้ช่วงที่ตลาดปรับตัวรุนแรงจริง ไม่ใช่ช่วงของวิกฤตเชิงเศรษฐกิจทั้งหมด
 * เพื่อให้แถบตรงกับสิ่งที่เห็นบนกราฟราคา
 */
const CRISES = [
  {
    key: "gfc",
    label: "วิกฤตการเงินโลก (ซับไพรม์)",
    start: "2008-09-01",
    end: "2009-03-31",
  },
  {
    key: "eurozone",
    label: "วิกฤตหนี้สาธารณะยุโรป",
    start: "2011-07-01",
    end: "2011-12-31",
  },
  {
    key: "covid",
    label: "โควิด-19",
    start: "2020-02-01",
    end: "2020-04-30",
  },
  {
    key: "inflation",
    label: "เงินเฟ้อสูงและดอกเบี้ยขาขึ้น",
    start: "2022-01-01",
    end: "2022-10-31",
  },
] as const;

/** หาว่าวันที่หนึ่ง ๆ ตกอยู่ในช่วงวิกฤตใดหรือไม่ — ใช้กับ tooltip */
function crisisAt(date: string) {
  return CRISES.find((c) => date >= c.start && date <= c.end);
}

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

  /**
   * แกน X เป็นแบบ category ค่า x1/x2 ของ ReferenceArea จึงต้องเป็นวันที่ที่มีอยู่จริงในชุดข้อมูล
   * ไม่ใช่วันเริ่ม/จบของวิกฤตตรง ๆ — จึงต้อง snap ไปยังจุดข้อมูลที่ใกล้ที่สุดในกรอบ
   * และตัดช่วงที่ไม่ทับกับช่วงเวลาที่ผู้ใช้เลือกออกไป
   */
  const crisisBands = useMemo(() => {
    if (data.length === 0) return [];
    const first = data[0].date;
    const last = data[data.length - 1].date;

    return CRISES.flatMap((c) => {
      if (c.end < first || c.start > last) return [];
      const x1 = data.find((d) => d.date >= c.start)?.date ?? first;
      let x2 = last;
      for (const d of data) if (d.date <= c.end) x2 = d.date;
      // ช่วงที่เหลือแคบจนเหลือจุดเดียว วาดออกมาก็ไม่เห็นอะไร
      if (x1 >= x2) return [];
      return [{ ...c, x1, x2 }];
    });
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
          {/*
            วางไว้ก่อนเส้นราคา เพื่อให้แถบอยู่หลังเส้นเสมอ
            ไม่ใส่เส้นขอบและป้ายกำกับ ให้เป็นพื้นหลังจาง ๆ — ชื่อวิกฤตไปอยู่ใน tooltip แทน
          */}
          {crisisBands.map((c) => (
            <ReferenceArea
              key={c.key}
              x1={c.x1}
              x2={c.x2}
              fill={CRISIS_FILL}
              fillOpacity={0.09}
              stroke="none"
            />
          ))}
          <ReferenceLine y={100} stroke="#766F60" strokeDasharray="3 3" />
          <Tooltip
            cursor={{ stroke: "#766F60", strokeDasharray: "3 3" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-lg border border-line bg-panel px-3 py-2.5 font-mono text-xs text-ink shadow-lg">
                  <div className="mb-1.5 text-ink-faint">{formatAxisDate(String(label))}</div>
                  {(() => {
                    const c = crisisAt(String(label));
                    return c ? (
                      <div className="mb-1.5" style={{ color: CRISIS_FILL }}>
                        ● {c.label}
                      </div>
                    ) : null;
                  })()}
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
