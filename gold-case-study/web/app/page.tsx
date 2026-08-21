import {
  ArrowRight,
  BarChart3,
  Coins,
  Landmark,
  Link2,
  Repeat,
  Shield,
  Sparkle,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { CagrFormula } from "@/components/CagrFormula";
import { DataBadge } from "@/components/DataBadge";
import { TrailingTable } from "@/components/home/TrailingTable";
import { InfoHint } from "@/components/InfoHint";
import { dataRange, dataYears, formatThaiDate } from "@/lib/data";

const GOLD_ROLES = [
  { icon: Coins, title: "Zero Yield", body: "ไม่สร้างดอกเบี้ยหรือเงินปันผล" },
  { icon: Shield, title: "Risk Cushion", body: "ช่วยรองรับพอร์ตในช่วงวิกฤต" },
  { icon: Link2, title: "Diversification", body: "Correlation ต่ำ ช่วยกระจายความเสี่ยง" },
  { icon: Landmark, title: "Capital Preservation", body: "รักษาความมั่งคั่งและลด Max Drawdown" },
];

export default function HomePage() {
  return (
    <div>
      {/* ---------- Hero ---------- */}
      {/* ภาพเป็นพื้นหลังเต็ม section (หลุดจากกรอบ max-w-6xl ของหน้าที่เหลือไปเต็มความกว้างจอ)
          ข้อความลอยทับด้านบน จึงต้องมี scrim ไล่สีเข้มด้านซ้ายให้อ่านออกชัดเจนตลอดที่ข้อความอยู่ */}
      <section className="relative flex min-h-[480px] items-center overflow-hidden sm:min-h-[640px]">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/gold-bars.jpg"
            alt="แท่งทองคำเรียงตัวเป็นกราฟแท่งพุ่งขึ้น พร้อมเส้นกราฟราคาทองคำด้านหลัง"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[62%_38%]"
          />
          {/*
            จอเล็ก: ข้อความกว้างเกือบเต็มจอ ไม่มี "ฝั่งขวาที่ว่าง" ให้ภาพโผล่แบบจอใหญ่
            จึงคลุมทึบเกือบเต็มเพื่อให้อ่านออก ภาพเหลือแค่เป็นพื้นผิว/บรรยากาศจาง ๆ
            จอ sm ขึ้นไป: ค่อยไล่สีซ้าย→ขวา เปิดให้เห็นภาพเต็ม ๆ ฝั่งขวาที่แท่งทองอยู่
          */}
          <div className="absolute inset-0 bg-bg/85 sm:hidden" />
          <div className="absolute inset-0 hidden bg-gradient-to-r from-bg via-bg/85 to-bg/25 sm:block" />
          {/* จางลงเข้ากับพื้นหลังของหน้าตรงรอยต่อบน-ล่าง ไม่ให้ภาพตัดขอบแข็ง */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-bg to-transparent sm:h-24" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-bg to-transparent sm:h-28" />
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          {/* แสงเรืองรองสีทองพื้นหลัง (Ambient Gold Light) */}
          <div
            className="pointer-events-none absolute -left-20 top-1/4 h-[380px] w-[380px] rounded-full bg-gold/15 blur-[120px]"
            aria-hidden
          />
          <div className="relative max-w-2xl">
            <p className="eyebrow flex items-center gap-1.5 text-[12.5px]">
              <Sparkles size={14} aria-hidden /> Gold Allocation Case Study
            </p>
            <h1 className="mt-3.5 font-display text-4xl font-semibold tracking-[-0.015em] leading-[1.22] sm:text-[46px]">
              ถ้ามีเงิน 1 ล้านบาท ควรลงทุนทองคำเท่าไร?
            </h1>
            <p className="mt-4 text-[15px] font-normal leading-[1.8] text-ink-dim/90">
              เราใช้ข้อมูลจริงย้อนหลัง 20 ปีของทองคำ หุ้นสหรัฐฯ (S&amp;P 500)
              และพันธบัตรรัฐบาลสหรัฐฯ เพื่อวิเคราะห์ผลตอบแทน ความผันผวน และความสัมพันธ์ระหว่างสินทรัพย์
              จากนั้นจำลองพอร์ตด้วย Monte Carlo Simulation
              เพื่อประเมินว่าสัดส่วนทองคำที่แตกต่างกันส่งผลต่อความเสี่ยงและผลลัพธ์ของพอร์ตอย่างไร
              ภายใต้ลักษณะของผู้ลงทุนแต่ละแบบ
            </p>
            <div className="mt-5">
              <DataBadge />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link href="/simulation" className="btn-luxury-primary">
                เริ่มจำลองพอร์ต <ArrowRight size={15} aria-hidden />
              </Link>
              <Link href="/reference" className="btn-luxury-secondary">
                ดูข้อมูลย้อนหลัง <ArrowRight size={15} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- บทบาทของทองคำในพอร์ต ---------- */}
      <section className="relative overflow-hidden bg-panel/30 ambient-glow-gold">
        {/* แสง Ambient Glow ศูนย์กลาง */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[300px] w-[500px] rounded-full bg-gold/10 blur-[100px]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-6 sm:pb-10 sm:pt-16">
          <div className="text-center">
            <p className="eyebrow">The Role of Gold</p>
            <h2 className="mx-auto mt-2 max-w-xl font-display text-2xl font-semibold leading-snug sm:text-[26px]">
              ไม่ใช่ตัวเร่งผลตอบแทน แต่เป็นตัวช่วยปกป้องพอร์ต
            </h2>

            {/* Minimalist Divider */}
            <div className="mx-auto mt-6 h-[1px] max-w-[200px] bg-gradient-to-r from-transparent via-gold/40 to-transparent" aria-hidden />
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GOLD_ROLES.map((role) => (
              <div
                key={role.title}
                className="panel group relative flex flex-col items-center px-5 py-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.6),0_0_24px_rgba(201,162,39,0.16)]"
              >
                {/* แท่นวางไอคอนเรืองแสง (Glassmorphic Icon Pod) */}
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-gold/25 bg-gold/5 shadow-[0_0_16px_rgba(201,162,39,0.12)] transition-all duration-300 group-hover:scale-110 group-hover:border-gold/50 group-hover:bg-gold/15 group-hover:shadow-[0_0_24px_rgba(201,162,39,0.3)]">
                  <role.icon size={24} className="text-gold transition-colors duration-300 group-hover:text-gold-light" aria-hidden />
                </div>

                <h3 className="mt-4 font-display text-[15px] font-semibold text-ink transition-colors duration-300 group-hover:text-gold-light">
                  {role.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-dim transition-colors duration-300 group-hover:text-ink/90">
                  {role.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 sm:pb-14 sm:pt-8">
        {/* ---------- ตารางเปรียบเทียบผลตอบแทนตามช่วงเวลา ---------- */}
        {/* จำกัดความกว้างให้พอดีตาราง (กว้างจริงราว 460px) แล้วจัดทั้งบล็อกไว้กลางหน้า */}
        <section className="mx-auto mt-4 max-w-2xl text-center sm:mt-6">
          <h2 className="font-medium uppercase tracking-[0.08em] text-ink text-[19px]">
            ผลตอบแทนทบต้นต่อปี (CAGR) แยกตามช่วงเวลา{" "}
            <InfoHint
              label="สูตรการคำนวณ CAGR"
              align="center"
              side="top"
              panelClassName="w-[min(92vw,440px)] rounded-xl bg-bg shadow-2xl"
            >
              <CagrFormula />
            </InfoHint>
          </h2>
          <TrailingTable />

          <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-faint">
            คำนวณจากข้อมูลรายเดือนถึง {formatThaiDate(dataRange.end)}  · ช่วง &ldquo;ทั้งหมด&rdquo; คือ {formatThaiDate(dataRange.start)} – {formatThaiDate(dataRange.end)} ({dataYears} ปี) ·
            ความผันผวนของช่วง 1 ปีคำนวณจากผลตอบแทนเพียง 12 เดือน จึงมีความคลาดเคลื่อนสูง
          </p>
        </section>

        {/* ---------- โครงสร้างเคสศึกษา ---------- */}
        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold">เคสศึกษาแบ่งเป็น 3 ส่วน</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/reference" className="panel panel-interactive group p-5">
              <BarChart3 size={18} className="text-gold" aria-hidden />
              <h3 className="mt-3 font-display text-lg font-semibold">ข้อมูลย้อนหลัง</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-dim">
                กราฟราคาย้อนหลังของทั้ง 3 สินทรัพย์ปรับฐานเป็น index 100 เพื่อเทียบทิศทางได้ในกราฟเดียว
                พร้อมตารางผลตอบแทน ความผันผวน และ correlation matrix
                รวมถึงระบุแหล่งข้อมูลของแต่ละสินทรัพย์อย่างชัดเจน
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-gold-light">
                ดูข้อมูล <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>

            <Link href="/simulation" className="panel panel-interactive group p-5">
              <TrendingUp size={18} className="text-gold" aria-hidden />
              <h3 className="mt-3 font-display text-lg font-semibold">จำลองพอร์ต</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-dim">
                เลือก persona ปรับระยะเวลาลงทุน ระดับความเสี่ยง สำรองเงินสด และสัดส่วนทองคำ
                แล้วดูผลลัพธ์ผ่าน Monte Carlo simulation 1,200 รอบ — fan chart รายปี
                การกระจายมูลค่าปลายทาง และตารางเปรียบเทียบ 4 persona
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-gold-light">
                เริ่มจำลอง <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>

            <Link href="/dca" className="panel panel-interactive group p-5">
              <Repeat size={18} className="text-gold" aria-hidden />
              <h3 className="mt-3 font-display text-lg font-semibold">DCA ทองคำ</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-dim">
                กำหนดเงินเริ่มต้น เงินที่ลงเพิ่มทุกเดือน และระยะเวลาลงทุน
                แล้วย้อนดูบนราคาทองจริงรายเดือนว่าเงินที่ใส่ไปสะสมเท่าไร
                มูลค่ารวมเป็นเท่าไร และต้นทุนเฉลี่ยต่อออนซ์อยู่ตรงไหน
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-gold-light">
                ลองคำนวณ <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
