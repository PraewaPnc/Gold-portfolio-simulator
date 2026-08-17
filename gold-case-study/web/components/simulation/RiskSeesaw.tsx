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
      aria-label="ระดับความเสี่ยงของพอร์ต"
      className="relative mx-auto h-[76px] w-full max-w-[248px] select-none"
    >
      {/* คาน + ที่นั่งสองฝั่ง เอียงไปด้วยกันรอบจุดหมุน */}
      <div
        className="absolute left-1/2 top-[26px] flex w-[224px] items-center justify-between"
        style={{
          transform: `translateX(-50%) rotate(${angle}deg)`,
          transformOrigin: "center center",
          transition: "transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* ตัวคาน — สีไม้ พาดหลังที่นั่งทั้งสอง ให้ความรู้สึกเป็นแผ่นไม้กระดานหกจริง ๆ */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 top-1/2 h-[7px] -translate-y-1/2
                     rounded-full shadow-[0_2px_3px_rgba(0,0,0,0.45)]"
          style={{
            background: "linear-gradient(90deg, #7C5B38 0%, #B08D5C 18%, #93714A 50%, #B08D5C 82%, #7C5B38 100%)",
          }}
        />
        <button
          type="button"
          data-active={activeKey === conservative.key}
          aria-pressed={activeKey === conservative.key}
          title={`สัดส่วนทองคำ ${bandRangeText(conservative)} · กดเพื่อไปที่ ${Math.round(
            conservative.gold * 100,
          )}%`}
          onClick={() => onSelect(conservative.key)}
          className="seesaw-seat -translate-y-3"
        >
          {conservative.label}
        </button>
        <button
          type="button"
          data-active={activeKey === aggressive.key}
          aria-pressed={activeKey === aggressive.key}
          title={`สัดส่วนทองคำ ${bandRangeText(aggressive)} · กดเพื่อไปที่ ${Math.round(
            aggressive.gold * 100,
          )}%`}
          onClick={() => onSelect(aggressive.key)}
          className="seesaw-seat -translate-y-3"
        >
          {aggressive.label}
        </button>
      </div>

      {/* ฐานสามเหลี่ยม + จุดหมุน — สีไม้เข้มกว่าคาน อยู่นิ่งเสมอ ไม่เอียงตามคาน */}
      <div
        aria-hidden
        className="absolute left-1/2 top-[30px] -translate-x-1/2 border-x-[10px] border-b-[18px]
                   border-x-transparent"
        style={{ borderBottomColor: "#5A4128" }}
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-[22px] h-2.5 w-2.5 -translate-x-1/2 rounded-full border"
        style={{ background: "#7C5B38", borderColor: "#5A4128" }}
      />
    </div>
  );
}
