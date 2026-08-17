"use client";

import { unitLabel } from "@/lib/currency";
import { useCurrency } from "@/lib/currency-context";
import { dataRange } from "@/lib/data";
import { pct, pctSigned } from "@/lib/format";
import { ASSETS, type AssetKey } from "@/lib/types";

const ASSET_DOT: Record<AssetKey, string> = {
  gold: "bg-gold",
  equity: "bg-equity",
  bond: "bg-bond",
};

/** ตารางสรุปสถิติรายสินทรัพย์ — ทุกช่องคำนวณจากผลตอบแทนในสกุลที่เลือก */
export function AssetStatsTable() {
  const { currency, stats } = useCurrency();

  return (
    <>
      <p className="mt-1 text-[13px] text-ink-faint">
        คำนวณจากผลตอบแทนรายเดือน {dataRange.months} เดือน แปลงเป็นรายปี · ฐานสกุล
        {unitLabel(currency)}
      </p>

      <div className="panel mt-3 overflow-x-auto">
        <table className="data-table min-w-[720px]">
          <thead>
            <tr>
              <th>สินทรัพย์</th>
              <th className="text-right">ผลตอบแทนทบต้น (CAGR)</th>
              <th className="text-right">ผลตอบแทนคาดหวัง*</th>
              <th className="text-right">ความผันผวน (S.D.)</th>
              <th className="text-right">Sharpe</th>
              <th className="text-right">ขาดทุนสูงสุด</th>
              <th className="text-right">ปีที่ดีที่สุด</th>
              <th className="text-right">ปีที่แย่ที่สุด</th>
            </tr>
          </thead>
          <tbody>
            {ASSETS.map((key) => {
              const a = stats.assets[key];
              return (
                <tr key={key}>
                  <td className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-2 text-ink">
                      <span className={`h-2.5 w-2.5 rounded-sm ${ASSET_DOT[key]}`} aria-hidden />
                      {a.label}
                    </span>
                  </td>
                  <td className="strong text-right">{pct(a.cagr)}</td>
                  <td className="strong text-right">{pct(a.annualReturn)}</td>
                  <td className="strong text-right">{pct(a.annualVolatility)}</td>
                  <td className="strong text-right">{a.sharpe.toFixed(2)}</td>
                  <td className="strong text-right text-danger">{pct(a.maxDrawdown)}</td>
                  <td className="strong whitespace-nowrap text-right">
                    {pctSigned(a.bestYear.return, 0)}{" "}
                    <span className="text-ink-faint">({Number(a.bestYear.year) + 543})</span>
                  </td>
                  <td className="strong whitespace-nowrap text-right">
                    {pctSigned(a.worstYear.return, 0)}{" "}
                    <span className="text-ink-faint">({Number(a.worstYear.year) + 543})</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
        * ผลตอบแทนคาดหวังเป็น arithmetic mean ของผลตอบแทนรายเดือนคูณ 12
        ซึ่งเป็นค่าที่ต้องใช้เป็น input ของ Monte Carlo simulation จึงสูงกว่า CAGR เล็กน้อยตามปกติ ·
        Sharpe ratio คำนวณด้วยอัตราปราศจากความเสี่ยงของสกุลนั้น {pct(stats.riskFreeRate)} ต่อปี
      </p>
    </>
  );
}
