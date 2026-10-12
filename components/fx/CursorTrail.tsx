"use client";

import dynamic from "next/dynamic";
import { useCursorEffects } from "./hooks";

const SplashCursor = dynamic(() => import("@/components/bits/SplashCursor"), { ssr: false });

// Fluid trail inside the title screen only; never on touch or reduced motion
export default function CursorTrail() {
  const enabled = useCursorEffects();
  if (!enabled) return null;
  return (
    <SplashCursor
      RAINBOW_MODE={false}
      COLOR="#c4ff3d"
      DENSITY_DISSIPATION={4}
      SPLAT_RADIUS={0.15}
      SPLAT_FORCE={5000}
      DYE_RESOLUTION={1024}
    />
  );
}
