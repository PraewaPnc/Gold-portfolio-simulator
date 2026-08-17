"use client";

import { useCurrency } from "@/lib/currency-context";
import { CURRENCIES, type Currency } from "@/lib/types";

const OPTIONS: { key: Currency; label: string; title: string }[] = [
  {
    key: "thb",
    label: "฿",
    title: "ฐานเงินบาท — มุมมองนักลงทุนไทย ผลตอบแทนรวมการเคลื่อนไหวของค่าเงินแล้ว",
  },
  {
    key: "usd",
    label: "$",
    title: "ฐานดอลลาร์ — มุมมองนักลงทุนอเมริกัน ผลตอบแทนของตัวสินทรัพย์เอง ไม่มีความเสี่ยงค่าเงิน",
  },
];

/**
 * สลับฐานสกุลเงินของทั้งเว็บ
 *
 * ไม่ใช่แค่การจัดรูปแบบตัวเลข — สินทรัพย์ทั้งสามเป็นสินทรัพย์สกุลดอลลาร์
 * ฐานบาทจึงมีผลตอบแทน ความผันผวน และสหสัมพันธ์คนละชุดกับฐาน USD
 */
export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();
  const options = OPTIONS.filter((o) => CURRENCIES.includes(o.key));
  const active = options.find((o) => o.key === currency) ?? options[0];
  const other = options.find((o) => o.key !== currency) ?? options[1];
  const isRight = options.indexOf(active) === 1;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isRight}
      aria-label="สลับฐานสกุลเงินที่ใช้แสดงผล"
      title={active.title}
      onClick={() => setCurrency(other.key)}
      className="relative h-7 w-[52px] flex-none rounded-full border border-line bg-panel2
                 transition-colors hover:border-gold/40 focus-visible:outline-none
                 focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2
                 focus-visible:ring-offset-bg"
    >
      {/* สัญลักษณ์ทั้งสองฝั่งอยู่นิ่งอยู่แล้ว ปุ่มกลมจะเลื่อนไปทับฝั่งที่กำลัง active */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-between
                   px-[7px] font-mono text-[11px] text-ink-faint"
      >
        <span>{options[0].label}</span>
        <span>{options[1].label}</span>
      </span>
      <span
        aria-hidden
        className={`absolute left-[2px] top-1/2 flex h-[22px] w-[22px] -translate-y-1/2
                    items-center justify-center rounded-full bg-gold font-mono text-[12px]
                    font-semibold text-bg shadow-[0_1px_4px_rgba(0,0,0,0.4)]
                    transition-transform duration-200 ${isRight ? "translate-x-[26px]" : "translate-x-0"}`}
      >
        {active.label}
      </span>
    </button>
  );
}
