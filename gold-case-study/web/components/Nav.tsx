"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { CurrencyToggle } from "@/components/CurrencyToggle";

const LINKS = [
  { href: "/reference", label: "ข้อมูลย้อนหลัง" },
  { href: "/simulation", label: "จำลองพอร์ต" },
  { href: "/dca", label: "DCA ทองคำ" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-ink transition-colors hover:text-gold-light">
          <Image
            src="/gold-bar-icon.webp"
            alt=""
            width={22}
            height={18}
            className="shrink-0"
            aria-hidden
          />
          <span className="font-display text-[15px] font-semibold">การจัดสรรเงินลงทุนในทองคำ</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <ul className="flex items-center gap-1 text-[13px]">
            {LINKS.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <li key={link.href} className="relative">
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative z-10 inline-block rounded-md px-3 py-1.5 transition-colors duration-200 ${
                      active
                        ? "font-medium text-gold-light"
                        : "text-ink-dim hover:text-ink"
                    }`}
                  >
                    {link.label}
                  </Link>
                  {active && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 rounded-md border border-gold/35 bg-panel2 shadow-[0_2px_12px_rgba(0,0,0,0.4),0_0_14px_rgba(201,162,39,0.18)]"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
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

