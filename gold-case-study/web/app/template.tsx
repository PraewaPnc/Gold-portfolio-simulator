import { PageTransition } from "@/components/PageTransition";

/**
 * template.tsx ถูก remount ใหม่ทุกครั้งที่เปลี่ยนหน้า (ต่างจาก layout.tsx ที่คงอยู่ตลอด)
 * ทำให้ PageTransition ด้วย Framer Motion เล่นอนิเมชัน Fade & Slide Up สวยงามในทุกการนำทาง
 * ครอบเฉพาะ children เท่านั้น Nav กับ Footer อยู่ใน layout.tsx จึงไม่กระตุกหรือกระพริบ
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}

