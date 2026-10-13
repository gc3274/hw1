"use client";

import CountUp from "@/components/bits/CountUp";
import { usePrefersReducedMotion } from "./hooks";

// CountUp writes its digits after hydration, so the real value is always there for screen readers
export default function StatNumber({ value }: { value: number }) {
  const reduce = usePrefersReducedMotion();
  return (
    <>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true">{reduce ? value : <CountUp to={value} duration={1.2} />}</span>
    </>
  );
}
