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

  return (
    <div
      role="group"
      aria-label="ฐานสกุลเงินที่ใช้แสดงผล"
      className="flex flex-none items-center"
    >
      {OPTIONS.filter((o) => CURRENCIES.includes(o.key)).map((o, i) => (
        <span key={o.key} className="flex items-center">
          {/* เส้นคั่นบาง ๆ แทนกรอบ — บอกว่าสองปุ่มเป็นชุดเดียวกันโดยไม่เพิ่มกล่องอีกใบบนแถบเมนู */}
          {i > 0 && <span className="mx-1 h-3 w-px bg-line" aria-hidden />}
          <button
            type="button"
            onClick={() => setCurrency(o.key)}
            data-active={currency === o.key}
            aria-pressed={currency === o.key}
            title={o.title}
            className="rounded px-1.5 py-1 font-mono text-[13px] leading-none transition-colors
                       text-ink-faint hover:text-ink
                       focus-visible:outline-none focus-visible:text-ink
                       data-[active=true]:text-gold-light"
          >
            {o.label}
          </button>
        </span>
      ))}
    </div>
  );
}
