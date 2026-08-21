import { ArrowRight, Database, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { DataBadge } from "@/components/DataBadge";
import { AssetStatsTable } from "@/components/reference/AssetStatsTable";
import { CorrelationMatrix } from "@/components/reference/CorrelationMatrix";
import { LatestPrices } from "@/components/reference/LatestPrices";
import { PriceChart } from "@/components/reference/PriceChart";
import {
  assetStats,
  dataRange,
  dataYears,
  formatThaiDate,
  formatThaiTimestamp,
  priceHistory,
} from "@/lib/data";
import { ASSETS, type AssetKey } from "@/lib/types";

const ASSET_DOT: Record<AssetKey, string> = {
  gold: "bg-gold",
  equity: "bg-equity",
  bond: "bg-bond",
};

export function ReferenceSection() {
  const { series } = priceHistory;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <header className="max-w-3xl">
        <p className="eyebrow flex items-center gap-1.5">
          <Database size={13} aria-hidden /> Historical Reference
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#F9E596] via-[#D1A723] to-[#B38312]">ข้อมูลราคาย้อนหลัง</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-dim">
          ข้อมูลย้อนหลังของทองคำ หุ้นสหรัฐฯ (S&amp;P 500) และพันธบัตรรัฐบาลสหรัฐฯ ตั้งแต่{" "}
          {formatThaiDate(dataRange.start)} ถึง {formatThaiDate(dataRange.end)} รวม{" "}
          {dataRange.months} เดือน ({dataYears} ปี) — สถิติคำนวณจากข้อมูลรายเดือน
          ส่วนกราฟใช้ข้อมูลรายสัปดาห์เพื่อให้ดูช่วงสั้นได้ละเอียดขึ้น
          ตัวเลขทั้งหมดในหน้านี้คือ input ที่หน้าจำลองพอร์ตนำไปใช้จริง
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-faint">
          {assetStats.meta.currencyNote}
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
      <LatestPrices />

      {/* ---------- ตารางสถิติ ---------- */}
      {/* จำกัดความกว้างให้พอดีตาราง แล้วจัดทั้งบล็อกไว้กลางหน้า ไม่ให้ตัวเลขยืดห่างกันเกินไป */}
      <section className="mx-auto mt-10 max-w-4xl">
        <h2 className="font-display text-xl font-semibold">สรุปสถิติรายสินทรัพย์</h2>
        <AssetStatsTable />
      </section>

      {/* ---------- Correlation matrix ---------- */}
      {/* เมทริกซ์มีแค่ 3 คอลัมน์ตัวเลข จึงบีบแคบกว่าตารางสถิติอีกขั้น */}
      <section className="mx-auto mt-10 max-w-xl">
        <h2 className="font-display text-xl font-semibold">Correlation matrix</h2>
        <CorrelationMatrix />
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
                className="panel panel-interactive group flex flex-col p-4"
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
                      {src.fxSource && ` (× ${src.fxSource.ticker} เมื่อดูฐานบาท)`}
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
                </dl>

                <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-gold-light border-t border-line/60 pt-3">
                  ดูวิธีคำนวณและข้อมูลทั้งหมด
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

        {/* อัตราปราศจากความเสี่ยงไม่ใช่สินทรัพย์ลงทุน แต่เข้าสูตร Sharpe และการโตของเงินสำรอง
            จึงต้องระบุที่มาไว้เหมือนกัน */}
        {assetStats.riskFreeSource && (
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-faint">
            <span className="label-caps">อัตราปราศจากความเสี่ยง</span>{" "}
            {assetStats.meta.riskFreeRateNote} · ฝั่ง USD มาจาก{" "}
            <span className="font-mono text-ink-dim">
              {assetStats.riskFreeSource.ticker}
            </span>{" "}
            ({assetStats.riskFreeSource.provider})
          </p>
        )}
      </section>
    </div>
  );
}
