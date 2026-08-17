"use client";

import Link from "next/link";

import { toCurrencyMonthly, unitLabel } from "@/lib/currency";
import { useCurrency } from "@/lib/currency-context";
import { dataRange, formatThaiMonthYear, priceHistory } from "@/lib/data";
import { price } from "@/lib/format";

/** แถบบอกว่าหน้า DCA ซื้อที่ราคาไหน — ต้องเปลี่ยนตามสกุลเพราะเป็นระดับราคาจริง */
export function PriceBasis() {
  const { currency } = useCurrency();
  const rows = toCurrencyMonthly(priceHistory.monthly, currency);
  const latestMonth = rows[rows.length - 1];
  const unit = unitLabel(currency);

  return (
    <div className="panel flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
      <span className="label-caps">ราคาที่ใช้ซื้อ</span>
      <span className="font-mono text-[11.5px] tabular text-ink-dim">
        <span className="text-ink">ทองคำ</span> ราคาปิดสิ้นเดือน หน่วย{unit}/ออนซ์
        {currency === "thb" && " (ราคาทองโลก × USDTHB)"}
      </span>
      <span className="font-mono text-[11.5px] tabular text-ink-dim">
        <span className="text-ink">งวดแรก</span> {formatThaiMonthYear(dataRange.start)} ·{" "}
        <span className="text-ink">ล่าสุด</span> {formatThaiMonthYear(latestMonth.date)} ที่{" "}
        {price(latestMonth.goldPerOz, currency)} {unit}/ออนซ์
      </span>
      <Link
        href="/reference/gold"
        className="ml-auto text-[11.5px] text-gold-light underline-offset-2 hover:underline"
      >
        ดูราคารายเดือนทั้งหมด →
      </Link>
    </div>
  );
}
