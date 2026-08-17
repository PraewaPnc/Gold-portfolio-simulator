"use client";

import { unitLabel } from "@/lib/currency";
import { useCurrency } from "@/lib/currency-context";
import { ASSETS, type AssetKey } from "@/lib/types";

const ASSET_DOT: Record<AssetKey, string> = {
  gold: "bg-gold",
  equity: "bg-equity",
  bond: "bg-bond",
};

/** ไล่สีพื้นหลังของช่องใน correlation matrix ตามค่าบวก/ลบ */
function corrStyle(v: number): React.CSSProperties {
  if (v >= 0.999) return { background: "rgba(201,162,39,0.22)" };
  const alpha = Math.min(Math.abs(v), 1) * 0.3;
  return v >= 0
    ? { background: `rgba(201,162,39,${alpha})` }
    : { background: `rgba(91,135,166,${alpha})` };
}

/**
 * สหสัมพันธ์ของผลตอบแทนรายเดือน
 *
 * ค่าต่างกันระหว่างสองฐานสกุลเงินอย่างมีนัย เพราะเมื่อคูณอัตราแลกเปลี่ยนเดียวกัน
 * เข้าไปในทุกสินทรัพย์ ค่าเงินจะกลายเป็นปัจจัยร่วมที่ดันให้ทุกคู่เคลื่อนไหวไปด้วยกันมากขึ้น
 */
export function CorrelationMatrix() {
  const { currency, stats } = useCurrency();
  const goldEquity = stats.correlation.gold.equity;

  return (
    <>
      <p className="mt-1 text-[13px] text-ink-faint">
        สหสัมพันธ์ของผลตอบแทนรายเดือนในสกุล{unitLabel(currency)} — ค่ายิ่งต่ำ
        ยิ่งช่วยกระจายความเสี่ยงได้ดี
      </p>

      <div className="panel mt-3 overflow-x-auto p-4 sm:p-5">
        <table className="data-table min-w-[420px]">
          <thead>
            <tr>
              <th />
              {ASSETS.map((key) => (
                <th key={key} className="text-center">
                  {stats.assets[key].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ASSETS.map((row) => (
              <tr key={row}>
                <td className="whitespace-nowrap text-ink">
                  <span className="inline-flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-sm ${ASSET_DOT[row]}`} aria-hidden />
                    {stats.assets[row].label}
                  </span>
                </td>
                {ASSETS.map((col) => {
                  const v = stats.correlation[row][col];
                  return (
                    <td key={col} className="strong text-center" style={corrStyle(v)}>
                      {v.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
        ทองคำกับหุ้นสหรัฐฯ มีสหสัมพันธ์เพียง {goldEquity.toFixed(2)} —{" "}
        {goldEquity < 0 ? "เคลื่อนไหวสวนทางกันเล็กน้อยด้วยซ้ำ" : "เกือบไม่เคลื่อนไหวไปด้วยกัน"}{" "}
        จึงเป็นเหตุผลเชิงปริมาณที่ทองคำช่วยลดความผันผวนรวมของพอร์ตได้ ·
        ลองสลับสกุลเงินดู ตัวเลขในเมทริกซ์เปลี่ยนทั้งชุด เพราะค่าเงินเป็นปัจจัยร่วมของทุกสินทรัพย์
      </p>
    </>
  );
}
