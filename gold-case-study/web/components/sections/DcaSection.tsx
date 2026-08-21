import { Info, Repeat } from "lucide-react";
import Link from "next/link";

import { DataBadge } from "@/components/DataBadge";
import { DcaSimulator } from "@/components/dca/DcaSimulator";
import { PriceBasis } from "@/components/dca/PriceBasis";

export function DcaSection() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <header className="max-w-3xl">
        <p className="eyebrow flex items-center gap-1.5">
          <Repeat size={13} aria-hidden /> Dollar-Cost Averaging Backtest
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#F9E596] via-[#D1A723] to-[#B38312]">ถ้าทยอยซื้อทองทุกเดือน</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-dim">
          กำหนดแผนการลงทุนแบบถัวเฉลี่ยต้นทุน (DCA)
          เพื่อดูการเติบโตของมูลค่าพอร์ตเทียบกับเงินต้นสะสมรายเดือน
          โดยประมวลผลจากชุดข้อมูลราคาที่เกิดขึ้นจริงในอดีต
        </p>
        <div className="mt-4">
          <DataBadge />
        </div>
      </header>

      {/* ---- ราคาที่ใช้เป็นฐานของการคำนวณ ---- */}
      <section className="mt-6">
        <PriceBasis />
      </section>

      <div className="mt-4">
        <DcaSimulator />
      </div>

      {/* ---- ข้อจำกัด ---- */}
      <section className="panel mt-6 p-5">
        <h2 className="flex items-center gap-2 text-sm font-medium text-ink">
          <Info size={15} className="text-gold" aria-hidden />
          ข้อจำกัดของการย้อนทดสอบแบบนี้
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[12.5px] leading-relaxed text-ink-dim">
          <li>
            นี่คือผลของ<strong className="font-medium text-ink">อดีตชุดเดียว</strong>ที่เกิดขึ้นจริง
            ไม่ใช่การแจกแจงความน่าจะเป็น การเลือกช่วงเวลาต่างกันเปลี่ยนข้อสรุปได้ทั้งหมด
            โดยเฉพาะช่วงข้อมูลนี้ที่ทองคำให้ผลตอบแทนสูงเป็นพิเศษ
          </li>
          <li>
            ใช้ราคาทองคำตลาดโลก จึงยังไม่รวมส่วนต่างราคาซื้อ–ขายของร้านทอง
            ค่าธรรมเนียมกองทุนทองคำ ค่าเก็บรักษา และภาษี ผลจริงจะต่ำกว่าตัวเลขนี้ ·
            เมื่อดูฐานเงินบาท ตัวเลขยังไม่รวมต้นทุนการแปลงสกุลเงินซึ่งเกิดขึ้นจริงทุกงวดที่ซื้อ
          </li>
          <li>
            สมมติว่าซื้อได้ที่ราคาปิดสิ้นเดือนพอดีทุกงวด และซื้อเป็นเศษหน่วยได้
            ซึ่งใกล้เคียงกองทุนทองคำมากกว่าการซื้อทองแท่งจริง
          </li>
          <li>
            IRR คือผลตอบแทนต่อปีแบบถ่วงน้ำหนักด้วยเงินและเวลา
            ต่างจาก &ldquo;กำไรรวมหารเงินที่ใส่&rdquo; ซึ่งมองต่ำเกินจริงเสมอเมื่อทยอยลงเงิน
            เพราะเงินงวดท้าย ๆ เพิ่งอยู่ในตลาดไม่กี่เดือน
          </li>
          <li>
            ตัวเลขทั้งหมดยังไม่หักเงินเฟ้อ — เป็นผลตอบแทนที่เป็นตัวเงิน ไม่ใช่อำนาจซื้อ
          </li>
          <li>
            ทองคำซื้อขายในตลาดโลกเป็นสกุลดอลลาร์ ผลลัพธ์ฐานเงินบาทจึงรวมผลของค่าเงินไว้แล้ว —
            สลับสกุลเงินที่มุมขวาบนเพื่อดูว่าส่วนไหนของกำไรมาจากราคาทอง และส่วนไหนมาจากค่าเงิน
          </li>
        </ul>
        <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-ink-faint">
          อยากดูภาพความน่าจะเป็นในอนาคตแทนการย้อนอดีต ให้ไปที่หน้า{" "}
          <Link href="/#simulation" className="text-gold-light underline-offset-2 hover:underline">
            จำลองพอร์ต
          </Link>{" "}
          ซึ่งใช้ Monte Carlo · เคสศึกษานี้จัดทำเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน
        </p>
      </section>
    </div>
  );
}
