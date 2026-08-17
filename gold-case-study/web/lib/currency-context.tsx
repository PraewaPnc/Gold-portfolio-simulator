"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { assetStats } from "./data";
import type { Currency, CurrencyStats } from "./types";

const STORAGE_KEY = "gold-case-study:currency";

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (next: Currency) => void;
  /** สถิติของฐานสกุลที่เลือก — ชุดที่ทุกหน้าใช้แสดงผลและที่ Monte Carlo ใช้เป็น input */
  stats: CurrencyStats;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function isCurrency(value: unknown): value is Currency {
  return value === "usd" || value === "thb";
}

/**
 * สกุลเงินที่เลือกเป็น state ระดับแอป เก็บลง localStorage ให้คงอยู่ข้ามหน้า
 *
 * ค่าเริ่มต้นตอน render ครั้งแรกต้องเป็นค่าคงที่ตัวเดียวกับฝั่ง server เสมอ
 * จึงอ่าน localStorage ใน effect หลัง mount ไม่ใช่ตอนตั้งค่าเริ่มต้นของ useState
 * (ถ้าอ่านตอนนั้น HTML ที่ server สร้างกับที่ client render จะไม่ตรงกัน)
 */
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(assetStats.meta.defaultCurrency);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isCurrency(saved)) setCurrencyState(saved);
  }, []);

  const setCurrency = useCallback((next: Currency) => {
    setCurrencyState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ currency, setCurrency, stats: assetStats.byCurrency[currency] }),
    [currency, setCurrency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency ต้องอยู่ภายใน <CurrencyProvider>");
  return ctx;
}
