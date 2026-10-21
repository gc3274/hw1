"use client";

import Image from "next/image";
import CardSwap, { Card } from "@/components/bits/CardSwap";
import { usePrefersReducedMotion } from "@/components/fx/hooks";
import { RatingBadge } from "./RoastBits";

export type PreviewRoast = {
  id: string;
  content: string;
  imageUrl: string;
  critic: string;
  rating: number | null;
};

// Decorative preview of real roasts on /welcome, so it's hidden from screen readers.
// Nudged left on phones so the cards fanned out to the right stay on screen.
export default function HeroPreview({ roasts }: { roasts: PreviewRoast[] }) {
  const reduce = usePrefersReducedMotion();

  return (
    <div aria-hidden="true" className="relative mx-auto h-[380px] w-[280px] max-sm:-translate-x-6 sm:h-[440px] sm:w-[330px]">
      <CardSwap
        key={roasts.map((r) => r.id).join()}
        width="100%"
        height="100%"
        cardDistance={36}
        verticalDistance={40}
        delay={4200}
        pauseOnHover
        skewAmount={4}
        paused={reduce}
      >
        {roasts.map((roast, i) => (
          <Card key={roast.id} className="overflow-hidden rounded-2xl border border-line bg-ink shadow-2xl">
            <div className="relative h-3/5 bg-white/5">
              <Image
                src={roast.imageUrl}
                alt=""
                fill
                sizes="330px"
                preload={i === 0}
                className="object-cover"
              />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-xs font-medium text-lime">{roast.critic}</span>
                <RatingBadge rating={roast.rating} />
              </div>
              <p className="mt-1 line-clamp-3 font-display text-lg leading-snug font-bold text-pretty">
                {roast.content}
              </p>
            </div>
          </Card>
        ))}
      </CardSwap>
    </div>
  );
}
