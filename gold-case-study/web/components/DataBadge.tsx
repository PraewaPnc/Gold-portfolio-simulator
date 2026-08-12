import { Database } from "lucide-react";

import { dataRange, formatDataRangeLabel } from "@/lib/data";

/**
 * Badge ที่ระบุชัดเจนว่าตัวเลขทั้งหมดมาจากข้อมูลย้อนหลังจริง
 * เพื่อแยกจากเวอร์ชันต้นแบบที่ใช้ตัวเลขสมมติฐาน
 */
export function DataBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold/10
                  px-3 py-1 font-mono text-[11px] leading-tight text-gold-light ${className}`}
    >
      <Database size={11} className="shrink-0" aria-hidden />
      คำนวณจากข้อมูลย้อนหลังจริง {formatDataRangeLabel()} ({dataRange.months} เดือน)
    </span>
  );
}
