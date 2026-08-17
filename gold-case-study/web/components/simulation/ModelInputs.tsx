"use client";

import Link from "next/link";

import { unitLabel } from "@/lib/currency";
import { useCurrency } from "@/lib/currency-context";
import { pct } from "@/lib/format";
import { ASSETS } from "@/lib/types";

/**
 * แถบสรุป input ที่ขับเคลื่อน Monte Carlo
 *
 * ทั้ง μ, σ, ρ และอัตราปราศจากความเสี่ยงเป็นคนละชุดระหว่างสองฐานสกุลเงิน
 * แถบนี้จึงเป็นจุดที่เห็นความต่างชัดที่สุดเมื่อกดสลับสกุล
 */
export function ModelInputs() {
  const { currency, stats } = useCurrency();

  return (
    <div className="panel flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
      <span className="label-caps">Input จากข้อมูลจริง ({unitLabel(currency)})</span>
      {ASSETS.map((key) => {
        const a = stats.assets[key];
        return (
          <span key={key} className="font-mono text-[11.5px] tabular text-ink-dim">
            <span className="text-ink">{a.label}</span> μ {pct(a.annualReturn)} · σ{" "}
            {pct(a.annualVolatility)}
          </span>
        );
      })}
      <span className="font-mono text-[11.5px] tabular text-ink-dim">
        <span className="text-ink">ρ</span> ทอง–หุ้น {stats.correlation.gold.equity.toFixed(2)} ·
        ทอง–พันธบัตร {stats.correlation.gold.bond.toFixed(2)}
      </span>
      <span className="font-mono text-[11.5px] tabular text-ink-dim">
        <span className="text-ink">rf</span> {pct(stats.riskFreeRate)}
      </span>
      <Link
        href="/reference"
        className="ml-auto text-[11.5px] text-gold-light underline-offset-2 hover:underline"
      >
        ดูที่มาของตัวเลข →
      </Link>
    </div>
  );
}
