"use client";

import { Coins } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { CurrencyToggle } from "@/components/CurrencyToggle";

const LINKS = [
  { href: "/", label: "ภาพรวม" },
  { href: "/reference", label: "ข้อมูลย้อนหลัง" },
  { href: "/simulation", label: "จำลองพอร์ต" },
  { href: "/dca", label: "DCA ทองคำ" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-ink transition-colors hover:text-gold-light">
          <Coins size={17} className="shrink-0 text-gold" aria-hidden />
          <span className="font-display text-[15px] font-semibold">การจัดสรรเงินลงทุนในทองคำ</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
        <ul className="flex items-center gap-1 text-[13px]">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-block rounded-md px-3 py-1.5 transition-colors ${
                    active
                      ? "bg-panel2 font-medium text-gold-light"
                      : "text-ink-dim hover:bg-panel hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
          <CurrencyToggle />
        </div>
      </nav>
    </header>
  );
}
