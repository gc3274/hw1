"use client";

import type { ReactNode } from "react";
import { usePrefersReducedMotion } from "./hooks";

// Shows `still` instead of an animated child when the user asked for less motion
export default function MotionSwap({ still, children }: { still: ReactNode; children: ReactNode }) {
  return usePrefersReducedMotion() ? still : children;
}
