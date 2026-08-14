import type { Metadata } from "next";
import { Info, Sparkles } from "lucide-react";
import Link from "next/link";

import { DataBadge } from "@/components/DataBadge";
import { Simulator } from "@/components/simulation/Simulator";
import { assetStats, dataRange, dataYears } from "@/lib/data";
import { pct } from "@/lib/format";
import { ASSETS } from "@/lib/types";

export const metadata: Metadata = { title: "จำลองพอร์ต" };

export default function SimulationPage() {
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
          โดยกันสำรองเงินสดออกก่อน แล้วจึงจัดสรรส่วนที่เหลือเป็นทองคำ หุ้นไทย และตราสารหนี้
        </p>
        <div className="mt-4">
          <DataBadge />
        </div>
      </header>

      {/* ---- Input ที่ใช้ขับเคลื่อน simulation ---- */}
      <section className="mt-6">
        <div className="panel flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="label-caps">Input จากข้อมูลจริง</span>
          {ASSETS.map((key) => {
            const a = assetStats.assets[key];
            return (
              <span key={key} className="font-mono text-[11.5px] tabular text-ink-dim">
                <span className="text-ink">{a.label}</span> μ {pct(a.annualReturn)} · σ{" "}
                {pct(a.annualVolatility)}
              </span>
            );
          })}
          <span className="font-mono text-[11.5px] tabular text-ink-dim">
            <span className="text-ink">ρ</span> ทอง–หุ้น{" "}
            {assetStats.correlation.gold.equity.toFixed(2)} · ทอง–ตราสารหนี้{" "}
            {assetStats.correlation.gold.bond.toFixed(2)}
          </span>
          <Link
            href="/reference"
            className="ml-auto text-[11.5px] text-gold-light underline-offset-2 hover:underline"
          >
            ดูที่มาของตัวเลข →
          </Link>
        </div>
      </section>

      <div className="mt-4">
        <Simulator />
      </div>

      {/* ---- ข้อจำกัดของแบบจำลอง ---- */}
      <section className="panel mt-6 p-5">
        <h2 className="flex items-center gap-2 text-sm font-medium text-ink">
          <Info size={15} className="text-gold" aria-hidden />
          ข้อจำกัดของแบบจำลองที่ควรรู้ก่อนตีความผล
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[12.5px] leading-relaxed text-ink-dim">
          <li>
            แบบจำลองสมมติว่าผลตอบแทนรายปีมีการแจกแจงแบบปกติและค่าสถิติคงที่ตลอดช่วงเวลา
            ในความเป็นจริงตลาดมีช่วงวิกฤตที่ผลตอบแทนติดลบรุนแรงกว่าและสหสัมพันธ์เปลี่ยนไป
          </li>
          <li>
            ค่าสถิติประมาณจากข้อมูลย้อนหลัง {dataYears} ปี ({dataRange.months} เดือน)
            ซึ่งเป็นช่วงที่ทองคำให้ผลตอบแทนสูงเป็นพิเศษ ผลในอนาคตอาจต่างไปอย่างมีนัยสำคัญ
          </li>
          <li>
            การจำลองไม่ได้รวมค่าธรรมเนียมการซื้อขาย ค่าบริหารจัดการกองทุน ภาษี
            การปรับสัดส่วนพอร์ต (rebalancing) และเงินลงทุนเพิ่มระหว่างทาง
          </li>
          <li>
            สำรองเงินสดคิดผลตอบแทนคงที่ที่อัตราปราศจากความเสี่ยง{" "}
            {pct(assetStats.meta.riskFreeRate)} ต่อปีตลอดช่วงจำลอง
            ซึ่งเป็นค่าสมมติฐานที่ไม่ได้ดึงจาก API และไม่ได้หักเงินเฟ้อ
            ในความเป็นจริงอัตราดอกเบี้ยเงินฝากเปลี่ยนตามเวลาและมักต่ำกว่าเงินเฟ้อ
            อำนาจซื้อของเงินก้อนนี้จึงลดลงได้แม้ตัวเลขจะไม่ติดลบ
          </li>
          <li>
            ข้อมูลหุ้นไทยและตราสารหนี้บางส่วนเป็นข้อมูล proxy — ดูรายละเอียดที่หน้า{" "}
            <Link href="/reference" className="text-gold-light underline-offset-2 hover:underline">
              ข้อมูลย้อนหลัง
            </Link>
          </li>
          <li>
            ผลลัพธ์ใช้ตัวเลขสุ่มที่กำหนด seed ไว้ จึงทำซ้ำได้เหมือนเดิมทุกครั้ง
            แต่ก็หมายความว่าตัวเลขที่เห็นเป็นเพียงหนึ่งชุดตัวอย่างจากความเป็นไปได้ทั้งหมด
          </li>
        </ul>
        <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-ink-faint">
          เคสศึกษานี้จัดทำเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน
          ผู้ลงทุนควรศึกษาข้อมูลและปรึกษาผู้แนะนำการลงทุนที่ได้รับใบอนุญาตก่อนตัดสินใจ
        </p>
      </section>
    </div>
  );
}
