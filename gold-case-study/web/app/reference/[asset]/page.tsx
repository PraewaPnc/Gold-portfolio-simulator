import type { Metadata } from "next";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AssetPerformance } from "@/components/reference/AssetPerformance";
import { MonthlyTable } from "@/components/reference/MonthlyTable";
import {
  assetLabel,
  assetLabelEn,
  assetStats,
  formatThaiDate,
  formatThaiTimestamp,
  priceHistory,
} from "@/lib/data";
import { ASSETS, type AssetKey } from "@/lib/types";

interface Props {
  params: { asset: string };
}

/** สร้างหน้าไว้ล่วงหน้าทั้ง 3 สินทรัพย์ ทำให้ทุกหน้าเป็น static เหมือนเดิม */
export function generateStaticParams() {
  return ASSETS.map((asset) => ({ asset }));
}

function isAssetKey(value: string): value is AssetKey {
  return (ASSETS as string[]).includes(value);
}

export function generateMetadata({ params }: Props): Metadata {
  if (!isAssetKey(params.asset)) return { title: "ไม่พบสินทรัพย์" };
  return { title: `ข้อมูล${assetLabel(params.asset)}` };
}

const ACCENT: Record<AssetKey, { dot: string }> = {
  gold: { dot: "bg-gold" },
  equity: { dot: "bg-equity" },
  bond: { dot: "bg-bond" },
};

export default function AssetDetailPage({ params }: Props) {
  if (!isAssetKey(params.asset)) notFound();
  const key: AssetKey = params.asset;

  const source = assetStats.sources[key];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <Link
        href="/reference"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-dim transition-colors hover:text-gold-light"
      >
        <ArrowLeft size={14} aria-hidden /> กลับไปหน้าข้อมูลย้อนหลัง
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`h-3 w-3 rounded-sm ${ACCENT[key].dot}`} aria-hidden />
          <h1 className="font-display text-3xl font-semibold">{assetLabel(key)}</h1>
          <span className="font-mono text-[12px] text-ink-faint">{assetLabelEn(key)}</span>
          {source.isProxy && (
            <span className="inline-flex items-center gap-1 rounded border border-danger/40 bg-danger/10 px-1.5 py-0.5 font-mono text-[10px] text-danger">
              <TriangleAlert size={10} aria-hidden /> PROXY
            </span>
          )}
        </div>
        <p className="mt-2.5 max-w-3xl text-[13.5px] leading-relaxed text-ink-dim">
          {source.method}
        </p>
      </header>

      {/* การ์ดสรุป ผลตอบแทนตามช่วงเวลา และผลตอบแทนรายปี — ทั้งหมดขึ้นกับฐานสกุลเงินที่เลือก */}
      <AssetPerformance assetKey={key} />

      {/* ---------- ตารางข้อมูลรายเดือน ---------- */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">ข้อมูลรายเดือน</h2>
        <p className="mt-1 text-[13px] text-ink-faint">
          {priceHistory.monthly.length} แถว เรียงจากใหม่ไปเก่า · ค้นหาด้วยปี พ.ศ. หรือ ค.ศ. ได้
        </p>
        <div className="mt-3">
          <MonthlyTable assetKey={key} rows={priceHistory.monthly} />
        </div>
      </section>

      {/* ---------- แหล่งข้อมูล ---------- */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">แหล่งข้อมูล</h2>
        <div className="panel mt-3 p-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="label-caps">Ticker / ชุดข้อมูล</dt>
              <dd className="mt-1 font-mono text-[13px] text-ink">
                {source.priceSource.ticker}
                {source.fxSource && ` (× ${source.fxSource.ticker} เมื่อดูฐานบาท)`}
              </dd>
            </div>
            <div>
              <dt className="label-caps">ผู้ให้บริการข้อมูล</dt>
              <dd className="mt-1 text-[13px] text-ink-dim">
                {source.priceSource.provider}
                {source.fxSource && source.fxSource.provider !== source.priceSource.provider
                  ? ` / ${source.fxSource.provider}`
                  : ""}
              </dd>
            </div>
            <div>
              <dt className="label-caps">ช่วงข้อมูลดิบ</dt>
              <dd className="mt-1 font-mono text-[13px] tabular text-ink-dim">
                {source.priceSource.start} → {source.priceSource.end} (
                {source.priceSource.rows.toLocaleString("th-TH")} แถว)
              </dd>
            </div>
            <div>
              <dt className="label-caps">อัปเดตล่าสุด</dt>
              <dd className="mt-1 text-[13px] text-ink-dim">
                ดึงข้อมูล {formatThaiTimestamp(assetStats.meta.fetchedAt)} · ประมวลผล{" "}
                {formatThaiTimestamp(assetStats.meta.generatedAt)}
              </dd>
            </div>
          </dl>

          <p className="mt-4 border-t border-line pt-3.5 text-[12px] leading-relaxed text-ink-faint">
            {source.notes}
          </p>
        </div>
      </section>

      {/* ---------- ลิงก์ไปสินทรัพย์อื่น ---------- */}
      <section className="mt-10 border-t border-line pt-6">
        <p className="label-caps mb-3">ดูสินทรัพย์อื่น</p>
        <div className="flex flex-wrap gap-2.5">
          {ASSETS.filter((k) => k !== key).map((k) => (
            <Link
              key={k}
              href={`/reference/${k}`}
              className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-[13px]
                         text-ink-dim transition-colors hover:border-gold hover:text-ink"
            >
              <span className={`h-2.5 w-2.5 rounded-sm ${ACCENT[k].dot}`} aria-hidden />
              {assetLabel(k)}
            </Link>
          ))}
        </div>
        <p className="mt-4 text-[11.5px] text-ink-faint">
          ข้อมูลถึง {formatThaiDate(priceHistory.monthly[priceHistory.monthly.length - 1].date)}
        </p>
      </section>
    </div>
  );
}
