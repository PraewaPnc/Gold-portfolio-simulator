"use client";

import { useCurrency } from "@/lib/currency-context";
import { unitLabel } from "@/lib/currency";
import { pct, pctSigned } from "@/lib/format";
import { ASSETS } from "@/lib/types";

const ASSET_COLOR: Record<string, string> = {
  gold: "text-gold-light",
  equity: "text-equity",
  bond: "text-bond",
};

const ASSET_DOT: Record<string, string> = {
  gold: "bg-gold",
  equity: "bg-equity",
  bond: "bg-bond",
};

/**
 * ตาราง CAGR แยกตามช่วงเวลา
 *
 * ตัวเลขทั้งตารางเปลี่ยนตามฐานสกุลเงิน เพราะสินทรัพย์ทั้งสามเป็นสินทรัพย์สกุลดอลลาร์
 * ฐานบาทจึงรวมผลของค่าเงินเข้าไปด้วย
 */
export function TrailingTable() {
  const { currency, stats } = useCurrency();
  const trailing = stats.trailingReturns;

  return (
    <>
      <div className="panel mt-3 overflow-x-auto">
        <table className="data-table mx-auto w-auto text-[13.5px]">
          <thead>
            <tr>
              <th className="!text-center text-[11.5px]">สินทรัพย์</th>
              {trailing.map((w) => (
                <th key={w.key} className="w-[112px] !text-center text-[11.5px]">
                  {w.label}
                  {w.key === "all" && (
                    <span className="mt-0.5 block font-mono text-[10.5px] normal-case tracking-normal text-ink-faint">
                      {w.years} ปี
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ASSETS.map((key) => (
              <tr key={key}>
                <td className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-2 text-[13.5px] text-ink">
                    <span className={`h-2.5 w-2.5 rounded-sm ${ASSET_DOT[key]}`} aria-hidden />
                    {stats.assets[key].label}
                  </span>
                </td>
                {trailing.map((w) => {
                  const s = w.assets[key];
                  return (
                    <td key={w.key} className="text-center align-top">
                      <span
                        className={`block font-mono text-[16.5px] tabular ${
                          s.cagr >= 0 ? ASSET_COLOR[key] : "text-danger"
                        }`}
                      >
                        {pctSigned(s.cagr)}
                      </span>
                      <span className="mt-0.5 block font-mono text-[11.5px] tabular text-ink-faint">
                        ผันผวน {pct(s.annualVolatility, 0)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 font-mono text-[12px] text-ink-faint">
        ตัวเลขทั้งตารางเป็นผลตอบแทนในสกุล{unitLabel(currency)} · สลับสกุลเงินได้ที่มุมขวาบน
      </p>
    </>
  );
}
