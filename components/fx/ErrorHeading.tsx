"use client";

import GlitchText from "@/components/bits/GlitchText";
import { usePrefersReducedMotion } from "./hooks";

export default function ErrorHeading({ text }: { text: string }) {
  const reduce = usePrefersReducedMotion();
  return (
    <h1 className="font-display">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {reduce ? (
          <span className="text-5xl font-black">{text}</span>
        ) : (
          <GlitchText speed={0.6} className="text-[clamp(2.5rem,9vw,5rem)]!">
            {text}
          </GlitchText>
        )}
      </span>
    </h1>
  );
}
