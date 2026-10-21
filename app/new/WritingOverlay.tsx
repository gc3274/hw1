"use client";

import { useMemo } from "react";
import TextType from "@/components/bits/TextType";
import { usePrefersReducedMotion } from "@/components/fx/hooks";
import { writingLines, type Topic } from "@/lib/roasts";

// Decorative only: the real progress text lives in the form's role="status" line
export default function WritingOverlay({ topic }: { topic: Topic }) {
  const reduce = usePrefersReducedMotion();
  // Stable per topic, so TextType doesn't restart on every render
  const lines = useMemo(() => writingLines(topic), [topic]);

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
