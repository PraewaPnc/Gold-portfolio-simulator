"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { CurrencyToggle } from "@/components/CurrencyToggle";

const LINKS = [
  { href: "/#reference", id: "reference", label: "ข้อมูลย้อนหลัง" },
  { href: "/#simulation", id: "simulation", label: "จำลองพอร์ต" },
  { href: "/#dca", id: "dca", label: "DCA ทองคำ" },
];

export function Nav() {
  const pathname = usePathname();
  const [activeHash, setActiveHash] = useState("");

  useEffect(() => {
    if (pathname !== "/") {
      setActiveHash("");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the most visible section
        const visibleSections = entries.filter((entry) => entry.isIntersecting);
        if (visibleSections.length > 0) {
          // If multiple are visible, pick the one taking up the most space or closest to top
          const mostVisible = visibleSections.reduce((prev, current) => {
            return prev.intersectionRatio > current.intersectionRatio ? prev : current;
          });
          setActiveHash(mostVisible.target.id);
        }
      },
      {
        rootMargin: "-20% 0px -40% 0px", // Trigger when section is in the middle of the screen
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    LINKS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [pathname]);

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
              // Active if we are on the homepage and the hash matches the visible section,
              // or if we are on a subpage that falls under this link (e.g. /reference/gold)
              const isActive =
                (pathname === "/" && activeHash === link.id) ||
                (pathname !== "/" && pathname.startsWith(`/${link.id}`));

              return (
                <li key={link.href} className="relative">
                  <Link
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative z-10 inline-block rounded-md px-3 py-1.5 transition-colors duration-200 ${
                      isActive
                        ? "font-medium text-gold-light"
                        : "text-ink-dim hover:text-ink"
                    }`}
                  >
                    {link.label}
                  </Link>
                  {isActive && (
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

