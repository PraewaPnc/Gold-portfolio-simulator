import type { Metadata } from "next";
import { ArrowRight, Database, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { DataBadge } from "@/components/DataBadge";
import { PriceChart } from "@/components/reference/PriceChart";
import {
  assetStats,
  dataRange,
  dataYears,
  formatThaiDate,
  formatThaiTimestamp,
  priceHistory,
} from "@/lib/data";
import { pct, pctSigned, thb, usd } from "@/lib/format";
import { ASSETS, type AssetKey } from "@/lib/types";

export const metadata: Metadata = { title: "ข้อมูลย้อนหลัง" };

const ASSET_DOT: Record<AssetKey, string> = {
  gold: "bg-gold",
  equity: "bg-equity",
  bond: "bg-bond",
};

/** ไล่สีพื้นหลังของช่องใน correlation matrix ตามค่าบวก/ลบ */
function corrStyle(v: number): React.CSSProperties {
  if (v >= 0.999) return { background: "rgba(201,162,39,0.22)" };
  const alpha = Math.min(Math.abs(v), 1) * 0.3;
  return v >= 0
    ? { background: `rgba(201,162,39,${alpha})` }
    : { background: `rgba(91,135,166,${alpha})` };
}

export default function ReferencePage() {
  const { series, latest } = priceHistory;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <header className="max-w-3xl">
        <p className="eyebrow flex items-center gap-1.5">
          <Database size={13} aria-hidden /> Historical Reference
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold">ข้อมูลราคาย้อนหลัง</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-dim">
          ข้อมูลย้อนหลังของทองคำ (สกุลบาท) หุ้นไทย และตราสารหนี้ ตั้งแต่{" "}
          {formatThaiDate(dataRange.start)} ถึง {formatThaiDate(dataRange.end)} รวม{" "}
          {dataRange.months} เดือน ({dataYears} ปี) — สถิติคำนวณจากข้อมูลรายเดือน
          ส่วนกราฟใช้ข้อมูลรายสัปดาห์เพื่อให้ดูช่วงสั้นได้ละเอียดขึ้น
          ตัวเลขทั้งหมดในหน้านี้คือ input ที่หน้าจำลองพอร์ตนำไปใช้จริง
        </p>
        <div className="mt-4">
          <DataBadge />
        </div>
      </header>

      {/* ---------- กราฟราคา ---------- */}
      <section className="panel mt-8 p-4 sm:p-6">
        <PriceChart series={series} />
      </section>

      {/* ---------- ระดับราคาล่าสุด ---------- */}
      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="label-caps">ราคาทองคำ (spot)</p>
          <p className="mt-1.5 font-mono text-lg tabular text-gold-light">
            ${usd(latest.goldUsdPerOz)}{" "}
            <span className="text-xs text-ink-faint">/ ทรอยออนซ์</span>
          </p>
          <p className="mt-1 font-mono text-[11.5px] tabular text-ink-faint">
            ≈ {thb(latest.goldThbPerOz)} บาท @ {latest.usdthb.toFixed(2)} THB/USD
          </p>
        </div>
        <div className="panel p-4">
          <p className="label-caps">ราคาปิด ETF SET50</p>
          <p className="mt-1.5 font-mono text-lg tabular text-equity">
            {latest.equityClose.toFixed(2)} <span className="text-xs text-ink-faint">บาท</span>
          </p>
        </div>
        <div className="panel p-4">
          <p className="label-caps">อัตราผลตอบแทนพันธบัตร 10 ปี</p>
          <p className="mt-1.5 font-mono text-lg tabular text-bond">
            {latest.bondYieldPct.toFixed(2)}
            <span className="text-xs text-ink-faint"> % (proxy สหรัฐฯ)</span>
          </p>
        </div>
      </section>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
        ณ วันที่ {formatThaiDate(latest.date)} · ราคาทองคำอ้างอิงสัญญาล่วงหน้า COMEX เดือนใกล้
        ({assetStats.sources.gold.priceSource.ticker}) ซึ่งเคลื่อนไหวใกล้เคียงราคา spot
        โดยทั่วไปต่างกันไม่ถึง 1% — ไม่มีแหล่งราคา spot (XAU/USD) ที่ดึงอัตโนมัติได้ฟรี
        {dataRange.excludedPartialFinalMonth &&
          " · เดือนสุดท้ายยังไม่ครบเดือน จึงแสดงในกราฟแต่ไม่นำไปคำนวณสถิติด้านล่าง"}
      </p>

      {/* ---------- ตารางสถิติ ---------- */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">สรุปสถิติรายสินทรัพย์</h2>
        <p className="mt-1 text-[13px] text-ink-faint">
          คำนวณจากผลตอบแทนรายเดือน {dataRange.months} เดือน แปลงเป็นรายปี
        </p>

        <div className="panel mt-3 overflow-x-auto">
          <table className="data-table min-w-[720px]">
            <thead>
              <tr>
                <th>สินทรัพย์</th>
                <th className="text-right">ผลตอบแทนทบต้น (CAGR)</th>
                <th className="text-right">ผลตอบแทนคาดหวัง*</th>
                <th className="text-right">ความผันผวน (S.D.)</th>
                <th className="text-right">Sharpe</th>
                <th className="text-right">ขาดทุนสูงสุด</th>
                <th className="text-right">ปีที่ดีที่สุด</th>
                <th className="text-right">ปีที่แย่ที่สุด</th>
              </tr>
            </thead>
            <tbody>
              {ASSETS.map((key) => {
                const a = assetStats.assets[key];
                return (
                  <tr key={key}>
                    <td className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-2 text-ink">
                        <span className={`h-2.5 w-2.5 rounded-sm ${ASSET_DOT[key]}`} aria-hidden />
                        {a.label}
                      </span>
                    </td>
                    <td className="strong text-right">{pct(a.cagr)}</td>
                    <td className="strong text-right">{pct(a.annualReturn)}</td>
                    <td className="strong text-right">{pct(a.annualVolatility)}</td>
                    <td className="strong text-right">{a.sharpe.toFixed(2)}</td>
                    <td className="strong text-right text-danger">{pct(a.maxDrawdown)}</td>
                    <td className="strong whitespace-nowrap text-right">
                      {pctSigned(a.bestYear.return, 0)}{" "}
                      <span className="text-ink-faint">({Number(a.bestYear.year) + 543})</span>
                    </td>
                    <td className="strong whitespace-nowrap text-right">
                      {pctSigned(a.worstYear.return, 0)}{" "}
                      <span className="text-ink-faint">({Number(a.worstYear.year) + 543})</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
          * ผลตอบแทนคาดหวังเป็น arithmetic mean ของผลตอบแทนรายเดือนคูณ 12
          ซึ่งเป็นค่าที่ต้องใช้เป็น input ของ Monte Carlo simulation จึงสูงกว่า CAGR เล็กน้อยตามปกติ ·
          Sharpe ratio คำนวณด้วยอัตราปราศจากความเสี่ยง {pct(assetStats.meta.riskFreeRate)} ต่อปี
        </p>
      </section>

      {/* ---------- Correlation matrix ---------- */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Correlation matrix</h2>
        <p className="mt-1 text-[13px] text-ink-faint">
          สหสัมพันธ์ของผลตอบแทนรายเดือน — ค่ายิ่งต่ำ ยิ่งช่วยกระจายความเสี่ยงได้ดี
        </p>

        <div className="panel mt-3 overflow-x-auto p-4 sm:p-5">
          <table className="data-table min-w-[420px]">
            <thead>
              <tr>
                <th />
                {ASSETS.map((key) => (
                  <th key={key} className="text-center">
                    {assetStats.assets[key].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ASSETS.map((row) => (
                <tr key={row}>
                  <td className="whitespace-nowrap text-ink">
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-sm ${ASSET_DOT[row]}`} aria-hidden />
                      {assetStats.assets[row].label}
                    </span>
                  </td>
                  {ASSETS.map((col) => {
                    const v = assetStats.correlation[row][col];
                    return (
                      <td
                        key={col}
                        className="strong text-center"
                        style={corrStyle(v)}
                      >
                        {v.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
          ทองคำกับหุ้นไทยมีสหสัมพันธ์เพียง{" "}
          {assetStats.correlation.gold.equity.toFixed(2)} — เกือบไม่เคลื่อนไหวไปด้วยกัน
          จึงเป็นเหตุผลเชิงปริมาณที่ทองคำช่วยลดความผันผวนรวมของพอร์ตได้
        </p>
      </section>

      {/* ---------- แหล่งข้อมูล ---------- */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">แหล่งข้อมูลและข้อจำกัด</h2>
        <p className="mt-1 text-[13px] text-ink-faint">
          ดึงข้อมูลเมื่อ {formatThaiTimestamp(assetStats.meta.fetchedAt)} · ประมวลผลเมื่อ{" "}
          {formatThaiTimestamp(assetStats.meta.generatedAt)}
        </p>

        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {ASSETS.map((key) => {
            const src = assetStats.sources[key];
            return (
              <Link
                key={key}
                href={`/reference/${key}`}
                className="panel group flex flex-col p-4 transition-colors hover:border-gold/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-[14px] font-medium text-ink">
                    <span className={`h-2.5 w-2.5 rounded-sm ${ASSET_DOT[key]}`} aria-hidden />
                    {src.label}
                  </span>
                  {src.isProxy && (
                    <span className="inline-flex items-center gap-1 rounded border border-danger/40 bg-danger/10 px-1.5 py-0.5 font-mono text-[10px] text-danger">
                      <TriangleAlert size={10} aria-hidden /> PROXY
                    </span>
                  )}
                </div>

                <dl className="mt-3 space-y-2 text-[12px]">
                  <div>
                    <dt className="label-caps">Ticker / ชุดข้อมูล</dt>
                    <dd className="mt-0.5 font-mono text-ink">
                      {src.priceSource.ticker}
                      {src.fxSource && ` × ${src.fxSource.ticker}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="label-caps">ผู้ให้บริการข้อมูล</dt>
                    <dd className="mt-0.5 text-ink-dim">
                      {src.priceSource.provider}
                      {src.fxSource && src.fxSource.provider !== src.priceSource.provider
                        ? ` / ${src.fxSource.provider}`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="label-caps">ช่วงข้อมูลดิบ</dt>
                    <dd className="mt-0.5 font-mono text-ink-dim tabular">
                      {src.priceSource.start} → {src.priceSource.end} (
                      {src.priceSource.rows.toLocaleString("th-TH")} แถว)
                    </dd>
                  </div>
                  <div>
                    <dt className="label-caps">วิธีคำนวณ</dt>
                    <dd className="mt-0.5 leading-relaxed text-ink-dim">{src.method}</dd>
                  </div>
                </dl>

                <p className="mt-3 border-t border-line pt-2.5 text-[11.5px] leading-relaxed text-ink-faint">
                  {src.notes}
                </p>

                <span className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-gold-light">
                  ดูตารางข้อมูลทั้งหมด
                  <ArrowRight
                    size={13}
                    className="transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
