"use client";

import React from "react";

export interface TooltipItem {
  key?: string;
  label: string;
  value: string | number;
  color?: string;
  subValue?: string;
  isStrong?: boolean;
}

export interface ChartTooltipProps {
  title?: string;
  badge?: {
    label: string;
    color?: string;
    bg?: string;
  } | null;
  items?: TooltipItem[];
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Glassmorphic Custom Tooltip Component
 * กล่อง Tooltip สไตล์กระจกฝ้าดำเงา ขอบทองเรืองแสง (Gold Ambient Glow)
 * พร้อมแสดงแถบสีและไอคอนจุดเรืองแสงของแต่ละสินทรัพย์อย่างชัดเจน
 */
export function ChartTooltip({
  title,
  badge,
  items,
  footer,
  children,
}: ChartTooltipProps) {
  return (
    <div
      className="relative z-50 min-w-[210px] rounded-xl border border-gold/35 bg-[#181512]/92 p-3
                 font-sans text-xs text-ink shadow-[0_8px_32px_rgba(0,0,0,0.75),0_0_20px_rgba(201,162,39,0.22)]
                 backdrop-blur-md transition-all duration-150"
    >
      {/* ประกายแสงสีทองจาง ๆ ที่มุมกล่อง */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-gold/15 blur-xl"
        aria-hidden
      />

      {/* Header: ชื่อวัน/เดือน/ปี หรือหัวข้อ */}
      {(title || badge) && (
        <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-line/70 pb-1.5">
          {title && (
            <span className="font-mono text-[11px] font-medium tracking-wide text-ink-dim">
              {title}
            </span>
          )}
          {badge && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-sans text-[10.5px] font-medium"
              style={{
                color: badge.color || "#C9A227",
                backgroundColor: badge.bg || "rgba(201, 162, 39, 0.12)",
                border: `1px solid ${badge.color || "#C9A227"}40`,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: badge.color || "#C9A227" }}
              />
              {badge.label}
            </span>
          )}
        </div>
      )}

      {/* Items list */}
      {items && items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item, idx) => (
            <div key={item.key || idx} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {item.color && (
                  <span
                    className="inline-block h-2 w-2 rounded-full ring-2 shadow-sm"
                    style={{
                      backgroundColor: item.color,
                      boxShadow: `0 0 6px ${item.color}80`,
                    }}
                  />
                )}
                <span className="text-[11.5px] text-ink-dim">{item.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5 text-right font-mono">
                <span
                  className={`tabular font-medium ${item.isStrong ? "text-ink font-semibold" : "text-ink"}`}
                >
                  {item.value}
                </span>
                {item.subValue && (
                  <span className="text-[10px] text-ink-faint tabular">{item.subValue}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom children or additional rows */}
      {children}

      {/* Footer / Summary row */}
      {footer && (
        <div className="mt-2.5 border-t border-line/70 pt-2 font-mono text-[11.5px]">
          {footer}
        </div>
      )}
    </div>
  );
}

export default ChartTooltip;
