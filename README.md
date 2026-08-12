# Gold Portfolio Simulator

เคสศึกษา **"การจัดสรรเงินลงทุนในทองคำ"** — เว็บแอปที่ตอบคำถามว่าทองคำควรมีสัดส่วนเท่าไรในพอร์ต
โดยใช้ราคาย้อนหลังจริงของทองคำ หุ้นไทย และตราสารหนี้ ย้อนหลัง 18.5 ปี
มาขับเคลื่อน Monte Carlo simulation แทนการใช้ตัวเลขสมมติฐาน

## โครงสร้าง

| ไฟล์ / โฟลเดอร์ | คำอธิบาย |
| --- | --- |
| [`gold-case-study/`](gold-case-study/) | โปรเจกต์หลัก — **เริ่มอ่านที่ [README ของโปรเจกต์](gold-case-study/README.md)** |
| `gold-case-study/data-pipeline/` | Python: ดึงและประมวลผลราคาย้อนหลังจริง |
| `gold-case-study/web/` | Next.js 14 + TypeScript + Tailwind + Recharts |
| `gold-portfolio-simulator.jsx` | ต้นแบบเวอร์ชันแรก (ตัวเลขสมมติฐาน) เก็บไว้อ้างอิงที่มาของดีไซน์ |

## เริ่มใช้งานเร็ว

```bash
cd gold-case-study/web
npm install
npm run dev          # http://localhost:3000
```

ข้อมูล JSON ถูก commit ไว้แล้ว จึงรันเว็บได้ทันทีโดยไม่ต้องรัน data pipeline
วิธีอัปเดตข้อมูลให้เป็นปัจจุบันอยู่ใน [`data-pipeline/README.md`](gold-case-study/data-pipeline/README.md)

## แหล่งข้อมูล

| สินทรัพย์ | แหล่ง | สถานะ |
| --- | --- | --- |
| ทองคำ | `GC=F` × `USDTHB=X` (Yahoo Finance) | ข้อมูลจริง (futures ใกล้เคียง spot) |
| หุ้นไทย | `TDEX.BK` — ThaiDEX SET50 ETF | **proxy** ของดัชนี SET |
| ตราสารหนี้ | `DGS10` — US 10Y Treasury (FRED) | **proxy** ของพันธบัตรไทย |

เหตุผลที่ต้องใช้ proxy และข้อจำกัดทั้งหมดอธิบายไว้ใน
[README ของโปรเจกต์](gold-case-study/README.md#ทำไมต้องใช้-proxy)

> เคสศึกษานี้จัดทำเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน
> ผลตอบแทนในอดีตไม่ได้รับประกันผลตอบแทนในอนาคต
