import type { Metadata } from "next";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MonthlyTable } from "@/components/reference/MonthlyTable";
import { assetStats, formatThaiDate, formatThaiTimestamp, priceHistory } from "@/lib/data";
import { pct, pctSigned } from "@/lib/format";
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
  return { title: `ข้อมูล${assetStats.assets[params.asset].label}` };
}

const ACCENT: Record<AssetKey, { text: string; dot: string; border: string }> = {
  gold: { text: "text-gold-light", dot: "bg-gold", border: "border-gold/40" },
  equity: { text: "text-equity", dot: "bg-equity", border: "border-equity/40" },
  bond: { text: "text-bond", dot: "bg-bond", border: "border-bond/40" },
};

export default function AssetDetailPage({ params }: Props) {
  if (!isAssetKey(params.asset)) notFound();
  const key: AssetKey = params.asset;

  const asset = assetStats.assets[key];
  const source = assetStats.sources[key];
  const accent = ACCENT[key];
  const trailing = assetStats.trailingReturns;

  const years = Object.entries(asset.calendarYearReturns).sort(
    (a, b) => Number(b[0]) - Number(a[0]),
  );
  // ใช้ค่าสัมบูรณ์สูงสุดเป็นสเกลของแท่งเปรียบเทียบรายปี
  const maxAbs = Math.max(...years.map(([, v]) => Math.abs(v)), 0.01);

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
          <span className={`h-3 w-3 rounded-sm ${accent.dot}`} aria-hidden />
          <h1 className="font-display text-3xl font-semibold">{asset.label}</h1>
          <span className="font-mono text-[12px] text-ink-faint">{asset.labelEn}</span>
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

      {/* ---------- สรุปสถิติ ---------- */}
      <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "ผลตอบแทนทบต้น (CAGR)", value: pct(asset.cagr), accent: true },
          { label: "ความผันผวน (S.D.)", value: pct(asset.annualVolatility) },
          { label: "Sharpe ratio", value: asset.sharpe.toFixed(2) },
          { label: "ขาดทุนสูงสุด", value: pct(asset.maxDrawdown), danger: true },
        ].map((card) => (
          <div key={card.label} className="panel px-4 py-3.5">
            <p className="label-caps">{card.label}</p>
            <p
              className={`mt-1.5 font-mono text-[19px] font-medium tabular ${
                card.danger ? "text-danger" : card.accent ? accent.text : "text-ink"
              }`}
            >
              {card.value}
            </p>
          </div>
        ))}
      </section>

      {/* ---------- ผลตอบแทนตามช่วงเวลา ---------- */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">ผลตอบแทนตามช่วงเวลา</h2>
        <div className="panel mt-3 overflow-x-auto">
          <table className="data-table min-w-[560px]">
            <thead>
              <tr>
                <th>ช่วงเวลา</th>
                <th className="text-right">ผลตอบแทนต่อปี</th>
                <th className="text-right">ผลตอบแทนสะสม</th>
                <th className="text-right">ความผันผวน</th>
                <th className="text-right">ขาดทุนสูงสุด</th>
              </tr>
            </thead>
            <tbody>
              {trailing.map((w) => {
                const s = w.assets[key];
                return (
                  <tr key={w.key}>
                    <td className="whitespace-nowrap text-ink">
                      {w.label}
                      <span className="ml-1.5 font-mono text-[10.5px] text-ink-faint">
                        {w.start} → {w.end}
                      </span>
                    </td>
                    <td
                      className={`strong text-right ${s.cagr < 0 ? "text-danger" : accent.text}`}
                    >
                      {pctSigned(s.cagr)}
                    </td>
                    <td className="strong text-right">{pctSigned(s.totalReturn)}</td>
                    <td className="strong text-right">{pct(s.annualVolatility)}</td>
                    <td className="strong text-right text-danger">{pct(s.maxDrawdown)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- ผลตอบแทนรายปีปฏิทิน ---------- */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">ผลตอบแทนรายปีปฏิทิน</h2>
        <p className="mt-1 text-[13px] text-ink-faint">
          ปีที่ดีที่สุด {pctSigned(asset.bestYear.return, 0)} (
          {Number(asset.bestYear.year) + 543}) · ปีที่แย่ที่สุด{" "}
          {pctSigned(asset.worstYear.return, 0)} ({Number(asset.worstYear.year) + 543})
        </p>

        <div className="panel mt-3 overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-[90px]">ปี (พ.ศ.)</th>
                <th className="w-[90px] text-right">ผลตอบแทน</th>
                <th>เปรียบเทียบ</th>
              </tr>
            </thead>
            <tbody>
              {years.map(([year, value]) => {
                const width = (Math.abs(value) / maxAbs) * 50;
                return (
                  <tr key={year}>
                    <td className="strong">{Number(year) + 543}</td>
                    <td
                      className={`strong text-right ${value < 0 ? "text-danger" : accent.text}`}
                    >
                      {pctSigned(value)}
                    </td>
                    <td>
                      {/* แท่งเทียบซ้าย/ขวาจากเส้นศูนย์กลาง */}
                      <div className="relative h-3 w-full min-w-[140px]">
                        <span
                          className="absolute inset-y-0 left-1/2 w-px bg-line"
                          aria-hidden
                        />
                        <span
                          aria-hidden
                          className={`absolute inset-y-0 rounded-sm ${
                            value < 0 ? "bg-danger/55" : accent.dot
                          }`}
                          style={
                            value < 0
                              ? { right: "50%", width: `${width}%`, opacity: 0.75 }
                              : { left: "50%", width: `${width}%`, opacity: 0.75 }
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

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
                {source.fxSource && ` × ${source.fxSource.ticker}`}
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
              {assetStats.assets[k].label}
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
