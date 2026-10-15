import { RATING_MAX } from "@/lib/roasts";

export function RatingBadge({ rating }: { rating: number | null }) {
  if (rating === null) return null;
  return (
    <span className="shrink-0 rounded-full bg-rose/15 px-2.5 py-0.5 font-mono text-sm font-bold text-rose tabular-nums">
      {rating}/{RATING_MAX}
      <span className="sr-only"> score</span>
    </span>
  );
}

export function RoastTip({ tip, className = "" }: { tip: string | null; className?: string }) {
  if (!tip) return null;
  return (
    <p className={`rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-fg/80 ${className}`}>
      <span aria-hidden="true">💡 </span>
      <span className="font-semibold">Tip:</span> {tip}
    </p>
  );
}
