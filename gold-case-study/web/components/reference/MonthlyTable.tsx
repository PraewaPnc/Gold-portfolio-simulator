"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { toCurrencyMonthly, unitLabel } from "@/lib/currency";
import { useCurrency } from "@/lib/currency-context";
import { dataRange, formatThaiDate, formatThaiMonthYear } from "@/lib/data";
import { pctSigned, price } from "@/lib/format";
import type { AssetKey, Currency, MonthlyPoint, MonthlyRow } from "@/lib/types";

interface Column {
  header: string;
  render: (row: MonthlyRow) => string;
}

/**
 * คอลัมน์ระดับราคาจริงต่างกันไปตามชนิดสินทรัพย์ และตามสกุลที่เลือก
 *
 * ฐานบาทแสดงราคา USD ควบไปด้วย เพราะราคาสินทรัพย์ทุกตัวเกิดในตลาดสกุลดอลลาร์
 * การเห็นทั้งสองคอลัมน์ทำให้ตรวจได้ว่าเดือนที่ราคาบาทขึ้นนั้นมาจากตัวสินทรัพย์หรือจากค่าเงิน
 * ส่วน Yield ของพันธบัตรเป็นอัตราผลตอบแทน จึงเป็นตัวเลขเดียวกันทั้งสองสกุล
 */
function levelColumnsFor(assetKey: AssetKey, currency: Currency): Column[] {
  const unit = unitLabel(currency);
  const columns: Record<AssetKey, Column[]> = {
    gold: [
      { header: `ราคา (${unit}/ออนซ์)`, render: (r) => price(r.goldPerOz, currency) },
      ...(currency === "thb"
        ? [{ header: "ราคา (USD/ออนซ์)", render: (r: MonthlyRow) => price(r.goldUsdPerOz, "usd") }]
        : []),
    ],
    equity: [
      { header: `ราคาปิด ETF (${unit})`, render: (r) => price(r.equityClose, currency) },
      ...(currency === "thb"
        ? [{ header: "ราคาปิด ETF (USD)", render: (r: MonthlyRow) => price(r.equityCloseUsd, "usd") }]
        : []),
    ],
    bond: [{ header: "Yield 10 ปี (%)", render: (r) => r.bondYieldPct.toFixed(2) }],
  };
  return columns[assetKey];
}

const ACCENT: Record<AssetKey, string> = {
  gold: "text-gold-light",
  equity: "text-equity",
  bond: "text-bond",
};

interface Props {
  assetKey: AssetKey;
  rows: MonthlyPoint[];
}

export function MonthlyTable({ assetKey, rows }: Props) {
  const [query, setQuery] = useState("");
  const { currency } = useCurrency();

  /**
   * เรียงจากใหม่ไปเก่า พร้อมคำนวณผลตอบแทนของเดือนนั้นจากดัชนีผลตอบแทนรวม
   * (คำนวณจากลำดับเดิมที่เรียงเก่าไปใหม่ ก่อนจะกลับด้าน)
   *
   * แปลงเป็นสกุลที่เลือกก่อนคำนวณ ผลตอบแทนรายเดือนที่แสดงจึงเป็นของสกุลนั้นจริง ๆ
   * ไม่ใช่ผลตอบแทน USD ที่เอามาแปะข้างราคาบาท
   */
  const enriched = useMemo(() => {
    const converted = toCurrencyMonthly(rows, currency);
    const withChange = converted.map((row, i) => {
      const prev = i > 0 ? converted[i - 1][assetKey] : null;
      return {
        row,
        index: row[assetKey],
        change: prev === null ? null : row[assetKey] / prev - 1,
      };
    });
    return withChange.reverse();
  }, [rows, assetKey, currency]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return enriched;
    return enriched.filter(({ row }) => {
      const year = Number(row.date.slice(0, 4));
      // รองรับทั้ง ค.ศ. และ พ.ศ.
      return row.date.includes(q) || String(year + 543).includes(q);
    });
  }, [enriched, query]);

  const levelColumns = useMemo(
    () => levelColumnsFor(assetKey, currency),
    [assetKey, currency],
  );

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <label className="relative block">
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="กรองตามปี เช่น 2565"
            aria-label="กรองข้อมูลรายเดือนตามปี"
            className="w-[210px] rounded-md border border-line bg-panel2 py-1.5 pl-7 pr-2.5
                       font-mono text-[12px] text-ink outline-none placeholder:text-ink-faint
                       focus:border-gold/70"
          />
        </label>
        <span className="font-mono text-[11.5px] text-ink-faint">
          แสดง {filtered.length} จาก {enriched.length} แถว
        </span>
      </div>

      <div className="panel max-h-[520px] overflow-auto">
        <table className="data-table">
          <thead className="sticky top-0 z-10 bg-panel">
            <tr>
              <th>เดือน</th>
              {levelColumns.map((c) => (
                <th key={c.header} className="text-right">
                  {c.header}
                </th>
              ))}
              <th className="text-right">ดัชนี (ฐาน 100)</th>
              <th className="text-right">เปลี่ยนแปลง</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ row, index, change }) => (
              <tr key={row.date}>
                <td className="whitespace-nowrap text-ink">
                  {/*
                    แถวสุดท้ายอาจเป็นเดือนที่ยังไม่จบ ซึ่งค่า "เปลี่ยนแปลง" จะไม่ใช่ผลตอบแทนเต็มเดือน
                    จึงแสดงวันที่จริงพร้อมป้ายกำกับ ไม่ให้เข้าใจผิดว่าเทียบเดือนต่อเดือน
                  */}
                  {row.date > dataRange.end ? (
                    <>
                      {formatThaiDate(row.date)}
                      <span className="ml-1.5 rounded border border-line px-1 py-px font-mono text-[9.5px] text-ink-faint">
                        ยังไม่จบเดือน
                      </span>
                    </>
                  ) : (
                    formatThaiMonthYear(row.date)
                  )}
                </td>
                {levelColumns.map((c) => (
                  <td key={c.header} className="strong text-right">
                    {c.render(row)}
                  </td>
                ))}
                <td className="strong text-right">{index.toFixed(2)}</td>
                <td
                  className={`strong text-right ${
                    change === null
                      ? "text-ink-faint"
                      : change < 0
                        ? "text-danger"
                        : ACCENT[assetKey]
                  }`}
                >
                  {change === null ? "—" : pctSigned(change, 2)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={levelColumns.length + 3} className="py-8 text-center text-ink-faint">
                  ไม่พบข้อมูลของปี &ldquo;{query}&rdquo;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
