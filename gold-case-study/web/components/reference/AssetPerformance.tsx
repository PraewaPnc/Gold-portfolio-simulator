"use client";

import { unitLabel } from "@/lib/currency";
import { useCurrency } from "@/lib/currency-context";
import { pct, pctSigned } from "@/lib/format";
import type { AssetKey } from "@/lib/types";

const ACCENT: Record<AssetKey, { text: string; dot: string }> = {
  gold: { text: "text-gold-light", dot: "bg-gold" },
  equity: { text: "text-equity", dot: "bg-equity" },
  bond: { text: "text-bond", dot: "bg-bond" },
};

/**
 * ทุกส่วนของหน้ารายละเอียดสินทรัพย์ที่ตัวเลขขึ้นกับฐานสกุลเงิน
 * — การ์ดสรุป, ผลตอบแทนตามช่วงเวลา และผลตอบแทนรายปีปฏิทิน
 *
 * รวมไว้เป็นคอมโพเนนต์เดียวเพราะทั้งสามส่วนอ่านจากสถิติชุดเดียวกัน
 * แยกเป็นสามไฟล์จะได้แค่ import ซ้ำสามรอบโดยไม่ได้อะไรเพิ่ม
 */
export function AssetPerformance({ assetKey }: { assetKey: AssetKey }) {
  const { currency, stats } = useCurrency();
  const asset = stats.assets[assetKey];
  const accent = ACCENT[assetKey];

  const years = Object.entries(asset.calendarYearReturns).sort(
    (a, b) => Number(b[0]) - Number(a[0]),
  );
  // ใช้ค่าสัมบูรณ์สูงสุดเป็นสเกลของแท่งเปรียบเทียบรายปี
  const maxAbs = Math.max(...years.map(([, v]) => Math.abs(v)), 0.01);

  return (
    <>
      {/* ---------- สรุปสถิติ ---------- */}
      <section className="mt-7">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "ผลตอบแทนทบต้น (CAGR)", value: pct(asset.cagr), accent: true },
            { label: "ความผันผวน (S.D.)", value: pct(asset.annualVolatility) },
            { label: "Sharpe ratio", value: asset.sharpe.toFixed(2) },
            { label: "ขาดทุนสูงสุด", value: pct(asset.maxDrawdown), danger: true },
          ].map((card) => (
            <div key={card.label} className="panel px-4 py-3.5">
              <p className="label-caps">{card.label}</p>
              <p
                className={`mt-1.5 font-mono text-[19px] font-medium tabular ${
                  card.danger ? "text-danger" : card.accent ? accent.text : "text-ink"
                }`}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 font-mono text-[11px] text-ink-faint">
          วัดผลตอบแทนในสกุล{unitLabel(currency)} · อัตราปราศจากความเสี่ยงที่ใช้กับ Sharpe{" "}
          {pct(stats.riskFreeRate)} ต่อปี
        </p>
      </section>

      {/* ---------- ผลตอบแทนตามช่วงเวลา ---------- */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">ผลตอบแทนตามช่วงเวลา</h2>
        <div className="panel mt-3 overflow-x-auto">
          <table className="data-table min-w-[560px]">
            <thead>
              <tr>
                <th>ช่วงเวลา</th>
                <th className="text-right">ผลตอบแทนต่อปี</th>
                <th className="text-right">ผลตอบแทนสะสม</th>
                <th className="text-right">ความผันผวน</th>
                <th className="text-right">ขาดทุนสูงสุด</th>
              </tr>
            </thead>
            <tbody>
              {stats.trailingReturns.map((w) => {
                const s = w.assets[assetKey];
                return (
                  <tr key={w.key}>
                    <td className="whitespace-nowrap text-ink">
                      {w.label}
                      <span className="ml-1.5 font-mono text-[10.5px] text-ink-faint">
                        {w.start} → {w.end}
                      </span>
                    </td>
                    <td className={`strong text-right ${s.cagr < 0 ? "text-danger" : accent.text}`}>
                      {pctSigned(s.cagr)}
                    </td>
                    <td className="strong text-right">{pctSigned(s.totalReturn)}</td>
                    <td className="strong text-right">{pct(s.annualVolatility)}</td>
                    <td className="strong text-right text-danger">{pct(s.maxDrawdown)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- ผลตอบแทนรายปีปฏิทิน ---------- */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">ผลตอบแทนรายปีปฏิทิน</h2>
        <p className="mt-1 text-[13px] text-ink-faint">
          ปีที่ดีที่สุด {pctSigned(asset.bestYear.return, 0)} (
          {Number(asset.bestYear.year) + 543}) · ปีที่แย่ที่สุด{" "}
          {pctSigned(asset.worstYear.return, 0)} ({Number(asset.worstYear.year) + 543})
        </p>

        <div className="panel mt-3 overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-[90px]">ปี (พ.ศ.)</th>
                <th className="w-[90px] text-right">ผลตอบแทน</th>
                <th>เปรียบเทียบ</th>
              </tr>
            </thead>
            <tbody>
              {years.map(([year, value]) => {
                const width = (Math.abs(value) / maxAbs) * 50;
                return (
                  <tr key={year}>
                    <td className="strong">{Number(year) + 543}</td>
                    <td className={`strong text-right ${value < 0 ? "text-danger" : accent.text}`}>
                      {pctSigned(value)}
                    </td>
                    <td>
                      {/* แท่งเทียบซ้าย/ขวาจากเส้นศูนย์กลาง */}
                      <div className="relative h-3 w-full min-w-[140px]">
                        <span className="absolute inset-y-0 left-1/2 w-px bg-line" aria-hidden />
                        <span
                          aria-hidden
                          className={`absolute inset-y-0 rounded-sm ${
                            value < 0 ? "bg-danger/55" : accent.dot
                          }`}
                          style={
                            value < 0
                              ? { right: "50%", width: `${width}%`, opacity: 0.75 }
                              : { left: "50%", width: `${width}%`, opacity: 0.75 }
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
