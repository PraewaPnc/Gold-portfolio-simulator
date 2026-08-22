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
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-12 md:gap-8">
          
          {/* Left Section: Info & Badges */}
          <div className="flex max-w-2xl flex-col items-center md:items-start text-center md:text-left">
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
            <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-2.5">
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
          </div>

          {/* Right Section: Reference Paper */}
          <div className="flex shrink-0 flex-col items-center md:items-end justify-center space-y-3">
            <span className="text-[11px] font-medium tracking-widest text-ink-faint uppercase mr-1">Reference Document</span>
            <Link 
              href="https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4876703" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group relative block overflow-hidden rounded-md border border-line/40 bg-panel/50 shadow-md transition-all hover:border-gold/40 hover:shadow-[0_4px_20px_rgba(201,162,39,0.15)]"
            >
              <Image 
                src="/ssrn-paper.jpg" 
                alt="The Role of Gold in Investment Portfolios" 
                width={600} 
                height={800} 
                className="w-48 sm:w-56 object-cover opacity-90 transition-all duration-700 group-hover:scale-[1.02] group-hover:opacity-100"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                 <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-xs font-medium text-gold-light">
                   Read Paper ↗
                 </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Divider & Legal */}
        <div className="mt-12 flex flex-col items-center text-center">
          <div className="h-px w-full max-w-2xl bg-gradient-to-r from-transparent via-line/80 to-transparent" />
          <p className="mt-5 text-[11px] leading-relaxed text-ink-faint max-w-lg">
            เคสศึกษานี้จัดทำขึ้นเพื่อการศึกษาและการวิเคราะห์เชิงสถิติเท่านั้น ไม่ถือเป็นคำแนะนำหรือชี้ชวนการลงทุน
          </p>
        </div>
      </div>
    </footer>
  );
}
