import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Thai } from "next/font/google";

import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { CurrencyProvider } from "@/lib/currency-context";

import "./globals.css";

/**
 * Fraunces ใช้กับหัวข้อ (รองรับเฉพาะอักษรละติน)
 * IBM Plex Sans Thai ทำหน้าที่เป็น fallback ให้ข้อความภาษาไทยทั้งหมด
 * IBM Plex Mono ใช้กับตัวเลขและข้อมูล
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-fraunces",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex-sans",
});

const plexSansThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex-thai",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: {
    default: "เคสศึกษา: การจัดสรรเงินลงทุนในทองคำ",
    template: "%s · เคสศึกษาการจัดสรรเงินลงทุนในทองคำ",
  },
  description:
    "เคสศึกษาการจัดสรรเงินลงทุนในทองคำ ขับเคลื่อนด้วยข้อมูลราคาย้อนหลังจริงของทองคำ หุ้นสหรัฐฯ (S&P 500) และพันธบัตรรัฐบาลสหรัฐฯ พร้อม Monte Carlo simulation ดูได้ทั้งฐานเงินบาทและดอลลาร์",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="th"
      className={`${fraunces.variable} ${plexSans.variable} ${plexSansThai.variable} ${plexMono.variable}`}
      style={
        {
          "--font-display": `${fraunces.style.fontFamily}, ${plexSansThai.style.fontFamily}`,
          "--font-sans": `${plexSans.style.fontFamily}, ${plexSansThai.style.fontFamily}`,
          "--font-mono": `${plexMono.style.fontFamily}, ${plexSansThai.style.fontFamily}`,
        } as React.CSSProperties
      }
    >
      <body className="flex min-h-screen flex-col">
        <CurrencyProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </CurrencyProvider>
      </body>
    </html>
  );
}
