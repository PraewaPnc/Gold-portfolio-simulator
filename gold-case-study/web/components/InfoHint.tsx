import { Info } from "lucide-react";

interface Props {
  /** ข้อความอธิบายที่แสดงเมื่อชี้เมาส์หรือโฟกัสด้วยคีย์บอร์ด */
  text: string;
  /** ป้ายสำหรับ screen reader — ควรบอกว่านี่คือคำอธิบายของอะไร */
  label: string;
  /**
   * ชิดขวาเมื่อไอคอนอยู่ใกล้ขอบขวาของพาเนล
   * พาเนลตั้ง overflow-hidden ไว้ ถ้าปล่อยให้ tooltip ยื่นออกไปทางขวาจะถูกตัดหาย
   */
  align?: "left" | "right";
}

/**
 * ไอคอน (i) เล็ก ๆ พร้อมคำอธิบายสั้น ๆ
 * ใช้ CSS ล้วน ไม่ต้องมี state — แสดงทั้งตอน hover และตอนโฟกัสด้วยคีย์บอร์ด/แตะบนมือถือ
 */
export function InfoHint({ text, label, align = "left" }: Props) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        className="inline-flex cursor-help text-ink-faint transition-colors
                   hover:text-gold-light focus-visible:text-gold-light focus-visible:outline-none"
      >
        <Info size={12} aria-hidden />
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute top-[calc(100%+7px)] z-20 w-[248px] rounded-lg
                    border border-line bg-panel px-3 py-2 text-[11.5px] font-normal normal-case
                    leading-relaxed tracking-normal text-ink-dim opacity-0 shadow-lg
                    transition-opacity duration-150
                    group-hover:opacity-100 group-focus-within:opacity-100
                    ${align === "right" ? "right-0" : "left-0"}`}
      >
        {text}
      </span>
    </span>
  );
}
