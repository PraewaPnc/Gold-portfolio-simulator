"use client";

import { latestIn, unitLabel } from "@/lib/currency";
import { useCurrency } from "@/lib/currency-context";
import { assetStats, dataRange, formatThaiDate } from "@/lib/data";
import { price } from "@/lib/format";

/**
 * ระดับราคาล่าสุดของแต่ละสินทรัพย์ในสกุลที่เลือก
 *
 * อัตราผลตอบแทนพันธบัตรเป็นเปอร์เซ็นต์ จึงไม่ขึ้นกับสกุลเงิน — เป็นตัวเลขเดียวในหน้านี้ที่ไม่เปลี่ยน
 * ส่วนราคาทองกับ ETF แปลงด้วยอัตราแลกเปลี่ยนล่าสุด
 */
export function LatestPrices() {
  const { currency } = useCurrency();
  const latest = latestIn(currency);
  const unit = unitLabel(currency);

  return (
    <>
      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="label-caps">ราคาทองคำ (spot)</p>
          <p className="mt-1.5 font-mono text-lg tabular text-gold-light">
            {price(latest.goldPerOz, currency)}{" "}
            <span className="text-xs text-ink-faint">
              {unit} / ทรอยออนซ์
            </span>
          </p>
          <p className="mt-1 font-mono text-[11.5px] tabular text-ink-faint">
            {currency === "thb"
              ? `= $${price(latest.goldUsdPerOz, "usd")} @ ${latest.usdthb.toFixed(2)} THB/USD`
              : "ราคาตลาดโลก ยังไม่แปลงเป็นเงินบาท"}
          </p>
        </div>
        <div className="panel p-4">
          <p className="label-caps">ราคาปิด ETF อ้างอิง S&amp;P 500</p>
          <p className="mt-1.5 font-mono text-lg tabular text-equity">
            {price(latest.equityClose, currency)}{" "}
            <span className="text-xs text-ink-faint">{unit}</span>
          </p>
          <p className="mt-1 font-mono text-[11.5px] tabular text-ink-faint">
            {assetStats.sources.equity.priceSource.ticker} · ปรับเงินปันผลแล้ว
          </p>
        </div>
        <div className="panel p-4">
          <p className="label-caps">อัตราผลตอบแทนพันธบัตรสหรัฐฯ 10 ปี</p>
          <p className="mt-1.5 font-mono text-lg tabular text-bond">
            {latest.bondYieldPct.toFixed(2)}
            <span className="text-xs text-ink-faint"> %</span>
          </p>
          <p className="mt-1 font-mono text-[11.5px] tabular text-ink-faint">
            เป็นอัตราผลตอบแทน จึงเท่ากันทั้งสองสกุลเงิน
          </p>
        </div>
      </section>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
        ณ วันที่ {formatThaiDate(latest.date)} · ราคาทองคำอ้างอิงสัญญาล่วงหน้า COMEX เดือนใกล้
        ({assetStats.sources.gold.priceSource.ticker}) ซึ่งเคลื่อนไหวใกล้เคียงราคา spot
        โดยทั่วไปต่างกันไม่ถึง 1% — ไม่มีแหล่งราคา spot (XAU/USD) ที่ดึงอัตโนมัติได้ฟรี
        {dataRange.excludedPartialFinalMonth &&
          " · เดือนสุดท้ายยังไม่ครบเดือน จึงแสดงในกราฟแต่ไม่นำไปคำนวณสถิติด้านล่าง"}
      </p>
    </>
  );
}
