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
          <GlitchText
            speed={0.6}
            // Still before hydration too, when the hook can't know about reduced motion yet
            className="text-[clamp(2.5rem,9vw,4.25rem)]! motion-reduce:before:animate-none motion-reduce:after:animate-none"
          >
            {text}
          </GlitchText>
        )}
      </span>
    </h1>
  );
}
