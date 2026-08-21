import Image from "next/image";
import Link from "next/link";
import { BarChart2, Dices } from "lucide-react";

import { assetStats, dataRange, dataYears, formatThaiTimestamp } from "@/lib/data";

export function Footer() {
  return (
    <footer className="relative mt-16 overflow-hidden border-t border-line/60 bg-gradient-to-b from-[#161310] via-[#12100D] to-[#0D0B09]">
      {/* Hairline เส้นประกายทองคำไล่ระดับบนขอบบนสุด */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-gold/60 to-transparent shadow-[0_0_14px_rgba(201,162,39,0.3)]"
        aria-hidden
      />
      {/* แสง Ambient Glow ศูนย์กลาง */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_50%_0%,rgba(201,162,39,0.06),transparent_75%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          {/* Logo + Title */}
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 text-ink transition-colors hover:text-gold-light"
          >
            <Image
              src="/gold-bar-icon.webp"
              alt=""
              width={24}
              height={20}
              className="shrink-0 transition-transform duration-300 group-hover:scale-110"
              aria-hidden
            />
            <span className="font-display text-lg font-semibold tracking-[-0.01em]">
              การจัดสรรเงินลงทุนในทองคำ
            </span>
          </Link>

          {/* Subtitle / Case Study Scope */}
          <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-ink-dim">
            Gold Allocation Case Study — เคสศึกษาและแบบจำลองการจัดสรรพอร์ตเชิงสถิติ {dataYears} ปี (2006 – 2026)
            อ้างอิงข้อมูลจริงของราคาทองคำ หุ้นสหรัฐฯ (S&amp;P 500) และพันธบัตรรัฐบาลสหรัฐฯ
          </p>

          {/* Quantitative Methodology Badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line/80 bg-panel2/70 px-3.5 py-1.5 font-mono text-[11.5px] text-ink-dim shadow-[0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-sm">
              <BarChart2 size={13} className="text-gold" aria-hidden />
              ข้อมูลจริง {dataYears} ปี ({dataRange.months} เดือน)
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-line/80 bg-panel2/70 px-3.5 py-1.5 font-mono text-[11.5px] text-ink-dim shadow-[0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-sm">
              <Dices size={13} className="text-gold" aria-hidden />
              Monte Carlo 1,200 รอบ
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-line/80 bg-panel2/70 px-3.5 py-1.5 font-mono text-[11.5px] text-ink-dim shadow-[0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              </span>
              อัปเดต {formatThaiTimestamp(assetStats.meta.generatedAt)}
            </span>
          </div>

          {/* Divider */}
          <div className="mt-8 h-px w-full max-w-lg bg-gradient-to-r from-transparent via-line/80 to-transparent" />

          {/* Legal / Educational Disclaimer */}
          <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
            เคสศึกษานี้จัดทำขึ้นเพื่อการศึกษาและการวิเคราะห์เชิงสถิติเท่านั้น ไม่ถือเป็นคำแนะนำหรือชี้ชวนการลงทุน
          </p>
        </div>
      </div>
    </footer>
  );
}
