"use client";

import FuzzyText from "@/components/bits/FuzzyText";
import { usePrefersReducedMotion } from "./hooks";

export default function FourOhFour() {
  const reduce = usePrefersReducedMotion();
  return (
    <div aria-hidden="true" className="font-display">
      {reduce ? (
        <p className="text-8xl font-black text-lime">404</p>
      ) : (
        <FuzzyText fontSize="clamp(5rem, 18vw, 10rem)" color="#c4ff3d" baseIntensity={0.15} hoverIntensity={0.4}>
          404
        </FuzzyText>
      )}
    </div>
  );
}
