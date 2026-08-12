import { Info } from "lucide-react";

import { assetStats, formatThaiTimestamp } from "@/lib/data";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-line bg-panel/40">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex gap-2.5">
          <Info size={14} className="mt-0.5 shrink-0 text-ink-faint" aria-hidden />
          <div className="space-y-2 text-[11.5px] leading-relaxed text-ink-faint">
            <p className="font-medium text-ink-dim">ข้อควรทราบเกี่ยวกับข้อมูลและแบบจำลอง</p>
            <ul className="list-disc space-y-1 pl-4">
              {assetStats.disclaimers.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="pt-1">
              ข้อมูลอัปเดตล่าสุด {formatThaiTimestamp(assetStats.meta.generatedAt)} · สร้างโดย
              data-pipeline (yfinance + FRED)
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
