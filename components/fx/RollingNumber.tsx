"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";
import { usePrefersReducedMotion } from "./hooks";

// Rolls from the last number shown to the new one. aria-hidden: callers keep
// their own live region with the real value.
export default function RollingNumber({ value, className = "" }: { value: number; className?: string }) {
  const count = useMotionValue(value);
  const rounded = useTransform(count, (v) => Math.round(v));
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    if (reduce) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, { duration: 0.35, ease: "easeOut" });
    return () => controls.stop();
  }, [count, value, reduce]);

  return (
    <motion.span aria-hidden="true" className={className}>
      {rounded}
    </motion.span>
  );
}
