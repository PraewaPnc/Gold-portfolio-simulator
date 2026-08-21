import type { ReactNode } from "react";
import { Info } from "lucide-react";

interface Props {
  /** ข้อความอธิบายที่แสดงเมื่อชี้เมาส์หรือโฟกัสด้วยคีย์บอร์ด */
  text?: string;
  /** เนื้อหาที่ต้องการ layout เอง (เช่นสูตรคำนวณ) — ใช้แทน text เมื่อคำอธิบายไม่ใช่แค่ข้อความล้วน */
  children?: ReactNode;
  /** ป้ายสำหรับ screen reader — ควรบอกว่านี่คือคำอธิบายของอะไร */
  label: string;
  /**
   * ชิดขวาเมื่อไอคอนอยู่ใกล้ขอบขวาของพาเนล (กันไม่ให้ tooltip ยื่นออกนอกกรอบที่ overflow-hidden)
   * กึ่งกลางเมื่อไอคอนอยู่กลางบรรทัดและเนื้อหากว้างกว่าปกติ เช่นสูตรคำนวณ
   */
  align?: "left" | "right" | "center";
  /** ด้านที่กล่องโผล่ออกจากไอคอน — ค่าเริ่มต้นคือด้านล่าง */
  side?: "top" | "bottom";
  /** แทนที่สไตล์กล่อง tooltip เริ่มต้นทั้งหมด — ใช้ตอน children มีสไตล์กล่องของตัวเองอยู่แล้ว */
  panelClassName?: string;
}

const DEFAULT_PANEL_CLASS =
  "w-[248px] rounded-lg border border-line bg-panel px-3 py-2 text-[11.5px] font-normal " +
  "normal-case leading-relaxed tracking-normal text-ink-dim shadow-lg";

/**
 * ไอคอน (i) เล็ก ๆ พร้อมคำอธิบาย
 * ใช้ CSS ล้วน ไม่ต้องมี state — แสดงทั้งตอน hover และตอนโฟกัสด้วยคีย์บอร์ด/แตะบนมือถือ
 */
export function InfoHint({
  text,
  children,
  label,
  align = "left",
  side = "bottom",
  panelClassName,
}: Props) {
  const alignClass =
    align === "right" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0";
  const sideClass = side === "top" ? "bottom-[calc(100%+7px)]" : "top-[calc(100%+7px)]";

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
        className={`pointer-events-none absolute z-20 opacity-0
                    transition-opacity duration-150
                    group-hover:opacity-100 group-focus-within:opacity-100
                    ${sideClass} ${alignClass} ${panelClassName ?? DEFAULT_PANEL_CLASS}`}
      >
        {children ?? text}
      </span>
    </span>
  );
}
