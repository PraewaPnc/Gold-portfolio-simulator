import { Info, Sparkles } from "lucide-react";
import Link from "next/link";

import { DataBadge } from "@/components/DataBadge";
import { ModelInputs } from "@/components/simulation/ModelInputs";
import { Simulator } from "@/components/simulation/Simulator";
import { assetStats, dataRange, dataYears } from "@/lib/data";

export function SimulationSection() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <header className="max-w-3xl">
        <p className="eyebrow flex items-center gap-1.5">
          <Sparkles size={13} aria-hidden /> Monte Carlo Portfolio Simulator
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold">จำลองการจัดสรรเงินลงทุนในทองคำ</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-dim">
          เลือก persona ปรับระยะเวลาลงทุน ระดับความเสี่ยง สำรองเงินสด และสัดส่วนทองคำ
          เพื่อดูผลลัพธ์ที่เป็นไปได้ของเงินทั้งก้อน — ผลตอบแทนคาดหวัง ความผันผวน
          และสหสัมพันธ์ที่ใช้ในการจำลองทั้งหมดประมาณจากข้อมูลราคาย้อนหลังจริง ไม่ใช่ตัวเลขสมมติฐาน
          โดยกันสำรองเงินสดออกก่อน แล้วจึงจัดสรรส่วนที่เหลือเป็นทองคำ หุ้นสหรัฐฯ (S&amp;P 500)
          และพันธบัตรรัฐบาลสหรัฐฯ
        </p>
        <div className="mt-4">
          <DataBadge />
        </div>
      </header>

      {/* ---- Input ที่ใช้ขับเคลื่อน simulation ---- */}
      <section className="mt-6">
        <ModelInputs />
      </section>

      <div className="mt-4">
        <Simulator />
      </div>

      {/* ---- ข้อจำกัดของแบบจำลอง ---- */}
      <section className="panel mt-8 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
            <Info size={16} className="text-gold" aria-hidden />
            ข้อจำกัดและสมมติฐานของแบบจำลอง
          </h2>
          <span className="font-mono text-[11px] text-ink-faint">
            ข้อมูลอ้างอิง {dataYears} ปี ({dataRange.months} เดือน)
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex gap-2.5 rounded-lg border border-line/60 bg-panel2/40 p-3 text-[12px] leading-relaxed text-ink-dim">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold/70" aria-hidden />
            <div>
              <strong className="font-medium text-ink">สมมติฐานสถิติ (Normal Distribution):</strong>{" "}
              แบบจำลองสมมติว่าผลตอบแทนรายปีมีการแจกแจงแบบปกติและค่าสถิติคงที่ ในความเป็นจริงช่วงวิกฤตอาจมีผลตอบแทนติดลบรุนแรงกว่า
            </div>
          </div>

          <div className="flex gap-2.5 rounded-lg border border-line/60 bg-panel2/40 p-3 text-[12px] leading-relaxed text-ink-dim">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold/70" aria-hidden />
            <div>
              <strong className="font-medium text-ink">ช่วงเวลาอ้างอิง:</strong>{" "}
              ประมาณการจากสถิติ {dataYears} ปีที่ผ่านมา ซึ่งเป็นช่วงที่ทองคำและหุ้นสหรัฐฯ ให้ผลตอบแทนสูงเป็นพิเศษ ผลในอนาคตอาจต่างไปอย่างมีนัยสำคัญ
            </div>
          </div>

          <div className="flex gap-2.5 rounded-lg border border-line/60 bg-panel2/40 p-3 text-[12px] leading-relaxed text-ink-dim">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold/70" aria-hidden />
            <div>
              <strong className="font-medium text-ink">ค่าธรรมเนียมและภาษี:</strong>{" "}
              ไม่ได้รวมค่าธรรมเนียมซื้อขาย, ค่าบริหารกองทุน, ภาษี, การปรับสัดส่วนพอร์ต (Rebalancing) และเงินลงทุนเพิ่มระหว่างทาง
            </div>
          </div>

          <div className="flex gap-2.5 rounded-lg border border-line/60 bg-panel2/40 p-3 text-[12px] leading-relaxed text-ink-dim">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold/70" aria-hidden />
            <div>
              <strong className="font-medium text-ink">สำรองเงินสด:</strong>{" "}
              คิดผลตอบแทนคงที่ที่อัตราดอกเบี้ยปราศจากความเสี่ยง ({assetStats.meta.riskFreeRateNote}) และไม่ได้หักผลกระทบจากเงินเฟ้อ
            </div>
          </div>

          <div className="flex gap-2.5 rounded-lg border border-line/60 bg-panel2/40 p-3 text-[12px] leading-relaxed text-ink-dim">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold/70" aria-hidden />
            <div>
              <strong className="font-medium text-ink">ดัชนีพันธบัตร:</strong>{" "}
              สร้างจากอัตราผลตอบแทน 10 ปี (duration/convexity) ไม่ใช่มูลค่าหน่วยลงทุนจริง — ดูที่{" "}
              <Link href="/#reference" className="text-gold-light underline-offset-2 hover:underline">
                หน้าข้อมูลย้อนหลัง
              </Link>
            </div>
          </div>

          <div className="flex gap-2.5 rounded-lg border border-line/60 bg-panel2/40 p-3 text-[12px] leading-relaxed text-ink-dim">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold/70" aria-hidden />
            <div>
              <strong className="font-medium text-ink">ความเสี่ยงค่าเงิน &amp; Hedging:</strong>{" "}
              ฐานเงินบาทจำลองจากสถิติอัตราแลกเปลี่ยนในอดีต ไม่ได้รวมต้นทุนแปลงสกุลเงินหรือการป้องกันความเสี่ยง (FX Hedging)
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-line/50 bg-bg/40 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-ink-faint">
          <span className="font-medium text-ink-dim">⚠️ คำเตือนความเสี่ยง:</span> เคสศึกษานี้จัดทำขึ้นเพื่อการศึกษาและการวิเคราะห์เชิงสถิติเท่านั้น ไม่ถือเป็นคำแนะนำการลงทุน ผู้ลงทุนควรศึกษาข้อมูลและทำความเข้าใจความเสี่ยงก่อนตัดสินใจ
        </div>
      </section>
    </div>
  );
}
