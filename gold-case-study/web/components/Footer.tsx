import { Info } from "lucide-react";

import { assetStats, formatThaiTimestamp } from "@/lib/data";

export function Footer() {
  return (
    <footer className="relative mt-12 overflow-hidden bg-gradient-to-b from-panel2 via-panel to-bg">
      {/* เส้นไฮไลต์บาง ๆ ไล่สีทองตรงขอบบน แทนเส้นคั่นตรง ๆ ให้กลืนกับพื้นหลังไล่สี */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent"
        aria-hidden
      />
      {/* แสงจาง ๆ ไล่จากกึ่งกลางด้านบนลงมา ให้พื้นหลังมีมิติแทนที่จะแบนราบ */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(201,162,39,0.07),transparent_65%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="eyebrow flex items-center gap-1.5">
          <Info size={13} aria-hidden /> ข้อควรทราบเกี่ยวกับข้อมูลและแบบจำลอง
        </p>

        <ul className="mt-4 grid gap-x-8 gap-y-2 text-[11.5px] leading-relaxed text-ink-faint sm:grid-cols-2">
          {assetStats.disclaimers.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full bg-ink-faint" aria-hidden />
              {line}
            </li>
          ))}
        </ul>

        <p className="mt-5 border-t border-line pt-3 text-[11px] text-ink-faint">
          ข้อมูลอัปเดตล่าสุด {formatThaiTimestamp(assetStats.meta.generatedAt)}
        </p>
      </div>
    </footer>
  );
}
