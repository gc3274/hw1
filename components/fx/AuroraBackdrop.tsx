"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { useInView, usePrefersReducedMotion } from "./hooks";

const Aurora = dynamic(() => import("@/components/bits/Aurora"), { ssr: false });

const STOPS = ["#7c3aed", "#ff3ea5", "#c4ff3d"];

// Animated aurora behind the title screen and login. The still gradient
// underneath shows under reduced motion and while the WebGL code loads.
export default function AuroraBackdrop({
  intensity = 1,
  className = "",
}: {
  intensity?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const reduce = usePrefersReducedMotion();

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{ opacity: intensity }}
      className={`aurora-fallback pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
    >
      {!reduce && <Aurora colorStops={STOPS} amplitude={1.1} blend={0.6} speed={0.6} paused={!inView} />}
    </div>
  );
}
