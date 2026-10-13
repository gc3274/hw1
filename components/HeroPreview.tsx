"use client";

import Image from "next/image";
import CardSwap, { Card } from "@/components/bits/CardSwap";
import { usePrefersReducedMotion } from "@/components/fx/hooks";

export type PreviewCaption = { id: string; content: string; imageUrl: string; flavor: string };

// Decorative preview of real captions on /welcome, so it's hidden from screen readers.
// Nudged left on phones so the cards fanned out to the right stay on screen.
export default function HeroPreview({ captions }: { captions: PreviewCaption[] }) {
  const reduce = usePrefersReducedMotion();

  return (
    <div aria-hidden="true" className="relative mx-auto h-[380px] w-[280px] max-sm:-translate-x-6 sm:h-[440px] sm:w-[330px]">
      <CardSwap
        key={captions.map((c) => c.id).join()}
        width="100%"
        height="100%"
        cardDistance={36}
        verticalDistance={40}
        delay={4200}
        pauseOnHover
        skewAmount={4}
        paused={reduce}
      >
        {captions.map((caption, i) => (
          <Card key={caption.id} className="overflow-hidden rounded-2xl border border-line bg-ink shadow-2xl">
            <div className="relative h-3/5 bg-white/5">
              <Image
                src={caption.imageUrl}
                alt=""
                fill
                sizes="330px"
                preload={i === 0}
                className="object-cover"
              />
            </div>
            <div className="p-4">
              <span className="text-xs font-medium text-lime">{caption.flavor}</span>
              <p className="mt-1 line-clamp-3 font-display text-lg leading-snug font-bold text-pretty">
                {caption.content}
              </p>
            </div>
          </Card>
        ))}
      </CardSwap>
    </div>
  );
}
