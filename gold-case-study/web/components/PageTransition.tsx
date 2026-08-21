"use client";

import { motion, useReducedMotion } from "framer-motion";
import React from "react";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageTransition Component
 * มอบประสบการณ์การเปลี่ยนหน้านุ่มนวลระดับพรีเมียม (Smooth Fade & Slide Up)
 * - ใช้ cubic-bezier [0.22, 1, 0.36, 1] (smooth luxury ease-out)
 * - รองรับ prefers-reduced-motion เพื่อความถูกต้องตามหลักการเข้าถึง (A11y)
 */
export function PageTransition({ children, className = "" }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion();

  const variants = {
    initial: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={variants}
      transition={{
        duration: 0.38,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`w-full flex-1 ${className}`.trim()}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
