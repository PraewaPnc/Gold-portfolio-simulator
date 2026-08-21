"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Target } from "lucide-react";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export function PresentationPointer() {
  const [enabled, setEnabled] = useState(false);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [showToast, setShowToast] = useState(false);

  const posRef = useRef({ x: -1000, y: -1000 });
  const rafRef = useRef<number | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    posRef.current = { x: e.clientX, y: e.clientY };
    setIsVisible(true);
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        setMousePos(posRef.current);
        rafRef.current = null;
      });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsVisible(true);
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    setIsClicking(true);
    const newRipple: Ripple = {
      id: Date.now() + Math.random(),
      x: e.clientX,
      y: e.clientY,
    };
    setRipples((prev) => [...prev.slice(-3), newRipple]);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsClicking(false);
  }, []);

  // คีย์ลัดกด [P]
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setEnabled((prev) => {
          const next = !prev;
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2200);
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("mouseenter", handleMouseEnter);
    window.addEventListener("mousedown", handleMouseDown, { passive: true });
    window.addEventListener("mouseup", handleMouseUp, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("mouseenter", handleMouseEnter);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, handleMouseMove, handleMouseLeave, handleMouseEnter, handleMouseDown, handleMouseUp]);

  const removeRipple = (id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  };

  const togglePointer = () => {
    setEnabled((prev) => {
      const next = !prev;
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2200);
      return next;
    });
  };

  return (
    <>
      {/* ---- Laser Spotlight Pointer Overlay (Clean GPU Radial Shaders, 0 Backdrop Filters) ---- */}
      {enabled && isVisible && (
        <div
          className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden select-none"
          aria-hidden
        >
          {/* Main Pointer Cursor Assembly */}
          <div
            className="absolute left-0 top-0 will-change-transform"
            style={{
              transform: `translate3d(${mousePos.x}px, ${mousePos.y}px, 0)`,
            }}
          >
            {/* Ambient Radial Soft Glow (Softer, smaller ambient glow) */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
              style={{
                width: isClicking ? 90 : 70,
                height: isClicking ? 90 : 70,
                background:
                  "radial-gradient(circle, rgba(232, 199, 102, 0.12) 0%, rgba(201, 162, 39, 0.03) 50%, transparent 75%)",
              }}
            />

            {/* Precision Laser Ring (Compact 20px) */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/50 shadow-[0_0_6px_rgba(201,162,39,0.25)] transition-all duration-150"
              style={{
                width: isClicking ? 26 : 20,
                height: isClicking ? 26 : 20,
                background:
                  "radial-gradient(circle, rgba(232, 199, 102, 0.08) 0%, transparent 80%)",
              }}
            />

            {/* Central Laser Point Core (Compact 6px) */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFFDF5] shadow-[0_0_3px_#FFF,0_0_6px_#E8C766,0_0_10px_#C9A227] transition-all duration-150"
              style={{
                width: isClicking ? 8 : 6,
                height: isClicking ? 8 : 6,
              }}
            />
          </div>

          {/* Click Shockwave Expansion (Compact) */}
          {ripples.map((ripple) => (
            <motion.div
              key={ripple.id}
              initial={{ scale: 0.4, opacity: 0.75 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              onAnimationComplete={() => removeRipple(ripple.id)}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/70"
              style={{
                left: ripple.x,
                top: ripple.y,
                width: 24,
                height: 24,
                boxShadow: "0 0 8px rgba(232, 199, 102, 0.35)",
              }}
            />
          ))}
        </div>
      )}

      {/* ---- Notification Toast ---- */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-5 z-50 flex items-center gap-2 rounded-xl border border-gold/40 bg-panel/95 px-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.6),0_0_20px_rgba(201,162,39,0.2)] backdrop-blur-md"
          >
            <Target size={15} className={enabled ? "text-gold-light" : "text-ink-dim"} />
            <span className="text-[12.5px] font-medium text-ink">
              {enabled
                ? "เปิดโหมด Presentation Pointer (กด P เพื่อปิด)"
                : "ปิดโหมด Presentation Pointer"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Floating Luxury Toggle Button ---- */}
      <div className="fixed bottom-5 right-5 z-40 select-none">
        <button
          type="button"
          onClick={togglePointer}
          aria-label={enabled ? "ปิดโหมด Presentation Pointer" : "เปิดโหมด Presentation Pointer (คีย์ลัด P)"}
          title={enabled ? "ปิด Laser Pointer (กด P)" : "เปิด Laser Pointer สำหรับพรีเซนต์ (กด P)"}
          className={`group flex items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-medium shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-200 active:scale-95 ${
            enabled
              ? "border border-gold bg-gradient-to-r from-gold-light via-gold to-[#B38D1B] font-semibold text-[#14120F] shadow-[0_0_20px_rgba(201,162,39,0.45)]"
              : "border border-line/80 bg-panel/90 text-ink-dim hover:border-gold/60 hover:bg-panel2 hover:text-ink"
          }`}
        >
          {enabled ? (
            <Target size={14} className="animate-spin text-[#14120F] [animation-duration:8s]" aria-hidden />
          ) : (
            <Sparkles size={14} className="text-gold transition-transform duration-200 group-hover:scale-110" aria-hidden />
          )}
          <span>{enabled ? "Pointer ON" : "Pointer"}</span>
          <span
            className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
              enabled
                ? "bg-[#14120F]/20 text-[#14120F]"
                : "border border-line/60 bg-bg/50 text-ink-faint"
            }`}
          >
            P
          </span>
        </button>
      </div>
    </>
  );
}
