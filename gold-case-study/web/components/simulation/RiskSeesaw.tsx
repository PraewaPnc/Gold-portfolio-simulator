"use client";

import type { RiskBand } from "@/lib/portfolio";

interface Props {
  /** เรียงจากอนุรักษ์นิยมไปเชิงรุก (ซ้ายไปขวา) — ตรงกับฝั่งของกระดานหก */
  bands: [RiskBand, RiskBand, RiskBand];
  activeKey: string;
  /** สัดส่วนทองคำจริงบนสไลเดอร์ (0 ถึง maxGold) — ใช้คำนวณมุมเอียงแบบต่อเนื่อง */
  goldW: number;
  /** ค่าสูงสุดที่สไลเดอร์ทองคำลากไปถึงได้ (ตรงกับ max ของ input range) */
  maxGold: number;
  bandRangeText: (b: RiskBand) => string;
  onSelect: (key: string) => void;
}

/**
 * มุมเอียงสูงสุดของแต่ละฝั่ง — ฝั่งอนุรักษ์นิยมอนุญาตให้เอียงได้มากกว่า
 * เพราะช่วงทองคำฝั่งนั้นกว้างกว่า (หมุดปานกลางถึงสไลเดอร์สุด กว้างกว่าฝั่งเชิงรุกที่มีแค่ 0–หมุด)
 * ให้ความชันของมุมต่อ 1% ทองคำใกล้เคียงกันทั้งสองฝั่ง แทนที่จะบีบมุมสูงสุดให้เท่ากันดื้อ ๆ
 */
const TILT_AGGRESSIVE_MAX = 9;
const TILT_CONSERVATIVE_MAX = 13;

/**
 * แปลงสัดส่วนทองคำเป็นมุมเอียงแบบต่อเนื่อง — ไม่ใช่แค่ 3 ค่าคงที่ตามโซนที่สังกัด
 * จุดหมุน (มุม 0 องศา) อยู่ที่หมุดของโปรไฟล์ปานกลาง ยิ่งถือทองห่างจากหมุดนี้เท่าไร คานยิ่งเอียงมาก
 *
 * ทำให้สองพอร์ตที่อยู่โซนเดียวกันแต่ถือทองไม่เท่ากัน — เช่น "ใกล้เกษียณ" (20%)
 * กับ "เน้นป้องกันความเสี่ยง" (28%) ซึ่งทั้งคู่อยู่โซนอนุรักษ์นิยม — เอียงไม่เท่ากันด้วย
 * ตรงกับน้ำหนักทองคำจริงที่ถือ ไม่ใช่แค่ "อยู่โซนไหน"
 */
function tiltAngle(goldW: number, moderatePivot: number, maxGold: number): number {
  const g = Math.min(Math.max(goldW, 0), maxGold);
  if (g <= moderatePivot) {
    return moderatePivot > 0 ? TILT_AGGRESSIVE_MAX * ((moderatePivot - g) / moderatePivot) : 0;
  }
  const span = maxGold - moderatePivot;
  return span > 0 ? -TILT_CONSERVATIVE_MAX * ((g - moderatePivot) / span) : 0;
}

/**
 * ระดับความเสี่ยงแสดงเป็นกระดานหก — อนุรักษ์นิยมกับเชิงรุกอยู่คนละฝั่งของคาน
 * ฝั่งที่ทองคำเยอะกว่าจะ "หนัก" กว่าและกดลงมากกว่าตามสัดส่วนจริง ไม่ใช่แค่ตามโซนที่สังกัด
 * ส่วนปานกลาง (หมุดกลางของ bands) ไม่มีที่นั่งของตัวเอง เลือกได้จากสไลเดอร์ทองคำด้านล่างแทน
 * — คานจะกลับมาแนวราบพอดีตอนสัดส่วนทองคำเท่ากับหมุดปานกลาง
 *
 * ยังทำงานเหมือนปุ่มแบ่งกลุ่มเดิมทุกอย่าง (aria-pressed, title บอกช่วงสัดส่วนทอง)
 * เปลี่ยนแค่หน้าตา ไม่เปลี่ยนพฤติกรรม
 */
export function RiskSeesaw({ bands, activeKey, goldW, maxGold, bandRangeText, onSelect }: Props) {
  const [conservative, moderate, aggressive] = bands;
  const angle = tiltAngle(goldW, moderate.gold, maxGold);

  return (
    <div
      role="group"
      aria-label="ระดับความเสี่ยงของพอร์ต (คานสมดุลความเสี่ยง)"
      className="relative mx-auto h-[80px] w-full max-w-[256px] select-none"
    >
      {/* คานโลหะสมดุล + ที่นั่งสองฝั่ง เอียงไปด้วยกันรอบจุดหมุน */}
      <div
        className="absolute left-1/2 top-[28px] flex w-[232px] items-center justify-between"
        style={{
          transform: `translateX(-50%) rotate(${angle}deg)`,
          transformOrigin: "center center",
          transition: "transform 550ms cubic-bezier(0.34, 1.4, 0.64, 1)",
        }}
      >
        {/* ตัวคานโลหะเรียบหรู — Brushed Gold & Dark Titanium บางเฉียบ */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-2 right-2 top-1/2 h-[2.5px] -translate-y-1/2
                     rounded-full shadow-[0_0_8px_rgba(201,162,39,0.35)]"
          style={{
            background:
              "linear-gradient(90deg, rgba(201,162,39,0.35) 0%, #E8C766 50%, rgba(201,162,39,0.35) 100%)",
          }}
        />

        {/* ขีดสเกลบอกตำแหน่งกึ่งกลางบนคาน (Tick marker) */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-[1.5px] -translate-x-1/2 -translate-y-1/2 bg-gold-light/80"
        />

        {/* ฝั่งอนุรักษ์นิยม */}
        <div className="relative flex flex-col items-center">
          <button
            type="button"
            data-active={activeKey === conservative.key}
            aria-pressed={activeKey === conservative.key}
            title={`สัดส่วนทองคำ ${bandRangeText(conservative)} · กดเพื่อไปที่ ${Math.round(
              conservative.gold * 100,
            )}%`}
            onClick={() => onSelect(conservative.key)}
            className="seesaw-seat -translate-y-3.5"
          >
            {conservative.label}
          </button>
          {/* ก้านยึดแขวนโลหะบางเฉียบ */}
          <span
            aria-hidden
            className="pointer-events-none -mt-3.5 h-3 w-[1.5px] bg-gradient-to-b from-line to-gold/70"
          />
        </div>

        {/* ฝั่งเชิงรุก */}
        <div className="relative flex flex-col items-center">
          <button
            type="button"
            data-active={activeKey === aggressive.key}
            aria-pressed={activeKey === aggressive.key}
            title={`สัดส่วนทองคำ ${bandRangeText(aggressive)} · กดเพื่อไปที่ ${Math.round(
              aggressive.gold * 100,
            )}%`}
            onClick={() => onSelect(aggressive.key)}
            className="seesaw-seat -translate-y-3.5"
          >
            {aggressive.label}
          </button>
          {/* ก้านยึดแขวนโลหะบางเฉียบ */}
          <span
            aria-hidden
            className="pointer-events-none -mt-3.5 h-3 w-[1.5px] bg-gradient-to-b from-line to-gold/70"
          />
        </div>
      </div>

      {/* ฐานรองรับ Fulcrum สไตล์ Obsidian & Gold Minimalist */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[32px] -translate-x-1/2 flex flex-col items-center"
      >
        {/* เสาฐานปิรามิด Obsidian มินิมอล */}
        <div
          className="border-x-[8px] border-b-[18px] border-x-transparent"
          style={{ borderBottomColor: "#2A251D" }}
        />
        {/* ฐานแผ่นโลหะทองรองรับด้านล่างสุด */}
        <div className="-mt-[1px] h-[2px] w-7 rounded-full bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      </div>

      {/* หมุดตลับลูกปืนศูนย์กลาง (Precision Jewel Bearing) */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[24px] flex h-3.5 w-3.5 -translate-x-1/2 items-center justify-center rounded-full border border-gold/70 bg-[#1B1815] shadow-[0_0_10px_rgba(201,162,39,0.4)]"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-gold-light to-gold shadow-[0_0_4px_#E8C766]" />
      </div>
    </div>
  );
}
