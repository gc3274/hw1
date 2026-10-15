"use client";

import TextType from "@/components/bits/TextType";
import { usePrefersReducedMotion } from "@/components/fx/hooks";

const LINES = [
  "Workshopping puns…",
  "Consulting the bodega cat…",
  "Asking the Butler night shift…",
  "Rejecting a joke about the 1 train…",
  "Running it past a jaded New Yorker…",
];

const ROAST_LINES = [
  "Chef Scorch is tasting it…",
  "Vivienne Vex is sighing loudly…",
  "Midwest Mom is finding something nice to say…",
  "Checking the seasoning…",
  "Sharpening the knives…",
];

// Decorative only: the real progress text lives in the form's role="status" line
export default function WritingOverlay({ roast = false }: { roast?: boolean }) {
  const reduce = usePrefersReducedMotion();
  const lines = roast ? ROAST_LINES : LINES;

  return (
    <div aria-hidden="true" className="absolute inset-0 flex items-end bg-gradient-to-t from-ink/90 via-ink/30 to-transparent">
      {!reduce && <div className="scan-line absolute inset-x-0 h-24" />}
      <p className="relative w-full p-4 font-mono text-sm text-lime">
        {reduce ? (
          lines[0]
        ) : (
          <TextType
            as="span"
            text={lines}
            typingSpeed={45}
            deletingSpeed={25}
            pauseDuration={1400}
            loop
            cursorCharacter="▌"
          />
        )}
      </p>
    </div>
  );
}
