"use client";

import type { ReactNode } from "react";
import GlareHover from "@/components/bits/GlareHover";
import { useCursorEffects } from "./hooks";

// Tile frame that shines on hover; a plain frame on touch screens and under reduced motion
export default function GlareTile({ children }: { children: ReactNode }) {
  const enabled = useCursorEffects();

  if (!enabled) {
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-surface transition-colors group-hover:border-lime/50">
        {children}
      </div>
    );
  }

  return (
    <GlareHover
      width="100%"
      height="auto"
      background="rgb(255 255 255 / 0.04)"
      borderRadius="1rem"
      borderColor="rgb(255 255 255 / 0.08)"
      glareColor="#c4ff3d"
      glareOpacity={0.22}
      className="transition-colors group-hover:border-lime/50!"
    >
      {children}
    </GlareHover>
  );
}
