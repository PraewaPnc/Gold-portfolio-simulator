import { ArrowRight, BarChart3, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";

import { CagrFormula } from "@/components/CagrFormula";
import { DataBadge } from "@/components/DataBadge";
import { assetStats, dataRange, dataYears, formatThaiDate } from "@/lib/data";
import { pct, pctSigned } from "@/lib/format";
import { ASSETS } from "@/lib/types";

const ASSET_COLOR: Record<string, string> = {
  gold: "text-gold-light",
  equity: "text-equity",
  bond: "text-bond",
};

const ASSET_DOT: Record<string, string> = {
  gold: "bg-gold",
  equity: "bg-equity",
  bond: "bg-bond",
};

const TRAILING = assetStats.trailingReturns;

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      {/* ---------- Hero ---------- */}
      <section className="max-w-3xl">
        <p className="eyebrow flex items-center gap-1.5">
          <Sparkles size={13} aria-hidden /> Gold Allocation Case Study
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-[40px]">
          ทองคำควรมีสัดส่วนเท่าไรในพอร์ตการลงทุน
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-dim">
          เคสศึกษานี้ตอบคำถามด้วยข้อมูล ไม่ใช่ความรู้สึก — เราดึงราคาย้อนหลังจริงของทองคำ (สกุลบาท)
          หุ้นไทย และตราสารหนี้ ย้อนหลัง {dataYears} ปี มาคำนวณผลตอบแทน ความผันผวน
          และสหสัมพันธ์ระหว่างสินทรัพย์ แล้วนำตัวเลขชุดเดียวกันนี้ไปขับเคลื่อน Monte Carlo simulation
          เพื่อดูว่าสัดส่วนทองคำแต่ละระดับให้ผลลัพธ์อย่างไรกับผู้ลงทุนต่างวัย
        </p>
        <div className="mt-5">
          <DataBadge />
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/simulation"
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-medium
                       text-bg transition-colors hover:bg-gold-light"
          >
            เริ่มจำลองพอร์ต <ArrowRight size={15} aria-hidden />
          </Link>
          <Link
            href="/reference"
            className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm
                       text-ink-dim transition-colors hover:border-gold hover:text-ink"
          >
            ดูข้อมูลย้อนหลัง <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      </section>

      {/* ---------- ตารางเปรียบเทียบผลตอบแทนตามช่วงเวลา ---------- */}
      {/* จำกัดความกว้างให้พอดีตาราง (กว้างจริงราว 460px) แล้วจัดทั้งบล็อกไว้กลางหน้า */}
      <section className="mx-auto mt-12 max-w-xl text-center">
        <h2 className="label-caps">ผลตอบแทนทบต้นต่อปี (CAGR) แยกตามช่วงเวลา</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-dim">
          ช่วงเวลาที่เลือกเปลี่ยนข้อสรุปได้ทั้งหมด — ตัวเลขย้อนหลัง 1 ปี
          ไม่ได้บอกอะไรเกี่ยวกับผลตอบแทนระยะยาว
        </p>

        <div className="mt-4">
          <CagrFormula />
        </div>

        <div className="panel mt-3 overflow-x-auto">
          <table className="data-table mx-auto w-auto">
            <thead>
              <tr>
                <th className="!text-center">สินทรัพย์</th>
                {TRAILING.map((w) => (
                  <th key={w.key} className="w-[92px] !text-center">
                    {w.label}
                    {w.key === "all" && (
                      <span className="mt-0.5 block font-mono text-[9.5px] normal-case tracking-normal text-ink-faint">
                        {w.years} ปี
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ASSETS.map((key) => (
                <tr key={key}>
                  <td className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-2 text-ink">
                      <span className={`h-2.5 w-2.5 rounded-sm ${ASSET_DOT[key]}`} aria-hidden />
                      {assetStats.assets[key].label}
                    </span>
                  </td>
                  {TRAILING.map((w) => {
                    const s = w.assets[key];
                    return (
                      <td key={w.key} className="text-center align-top">
                        <span
                          className={`block font-mono text-[15px] tabular ${
                            s.cagr >= 0 ? ASSET_COLOR[key] : "text-danger"
                          }`}
                        >
                          {pctSigned(s.cagr)}
                        </span>
                        <span className="mt-0.5 block font-mono text-[10.5px] tabular text-ink-faint">
                          ผันผวน {pct(s.annualVolatility, 0)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-faint">
          คำนวณจากข้อมูลรายเดือนถึง {formatThaiDate(dataRange.end)}  · ช่วง &ldquo;ทั้งหมด&rdquo; คือ {formatThaiDate(dataRange.start)} – {formatThaiDate(dataRange.end)} ({dataYears} ปี) ·
          ความผันผวนของช่วง 1 ปีคำนวณจากผลตอบแทนเพียง 12 เดือน จึงมีความคลาดเคลื่อนสูง
        </p>
      </section>

      {/* ---------- โครงสร้างเคสศึกษา ---------- */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold">เคสศึกษาแบ่งเป็น 2 ส่วน</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Link href="/reference" className="panel group p-5 transition-colors hover:border-gold/50">
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

          <Link href="/simulation" className="panel group p-5 transition-colors hover:border-gold/50">
            <TrendingUp size={18} className="text-gold" aria-hidden />
            <h3 className="mt-3 font-display text-lg font-semibold">จำลองพอร์ต</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-dim">
              เลือก persona ปรับระยะเวลาลงทุน ระดับความเสี่ยง และสัดส่วนทองคำ
              แล้วดูผลลัพธ์ผ่าน Monte Carlo simulation 1,200 รอบ — fan chart รายปี
              การกระจายมูลค่าปลายทาง efficient frontier และตารางเปรียบเทียบ 4 persona
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-gold-light">
              เริ่มจำลอง <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        </div>
      </section>

      {/* ---------- วิธีการ ---------- */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold">วิธีการ</h2>
        <ol className="mt-4 space-y-3">
          {[
            {
              title: "ดึงข้อมูลราคาย้อนหลังจริง",
              body: "data-pipeline ดึงราคาทองคำตลาดโลกคูณอัตราแลกเปลี่ยน USDTHB, ETF อ้างอิงดัชนี SET50 และอัตราผลตอบแทนพันธบัตร 10 ปี รันซ้ำได้ทุกเมื่อเพื่ออัปเดตข้อมูล",
            },
            {
              title: "คำนวณสถิติของสินทรัพย์",
              body: "แปลงเป็นผลตอบแทนรายเดือน คำนวณ annualized return, volatility และ correlation matrix แล้วเขียนออกเป็นไฟล์ JSON",
            },
            {
              title: "ขับเคลื่อน simulation ด้วยตัวเลขชุดเดียวกัน",
              body: "เว็บแอปอ่านค่า mean / volatility / correlation จริงไปสร้าง covariance matrix แล้วสุ่มผลตอบแทนที่มีสหสัมพันธ์กันด้วย Cholesky decomposition",
            },
          ].map((step, i) => (
            <li key={step.title} className="flex gap-3.5">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border
                           border-gold/40 font-mono text-[11px] text-gold-light"
              >
                {i + 1}
              </span>
              <div>
                <p className="text-[14px] font-medium text-ink">{step.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-dim">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
