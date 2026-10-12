"use client";
// Adapted from React Bits (reactbits.dev), MIT + Commons Clause.
// Changes: Next <Link> navigation, active item controlled by the caller,
// aria-current and focus ring, styles in globals.css (.gooey-nav), an SVG
// alpha goo filter instead of the black-backdrop blur/contrast trick, no
// particles under reduced motion.

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { usePrefersReducedMotion } from "@/components/fx/hooks";
import { focusRing } from "@/components/ui";

export interface GooeyNavItem {
  label: string;
  href: string;
}

export interface GooeyNavProps {
  items: GooeyNavItem[];
  // -1 when no item matches the current page
  activeIndex: number;
  label: string;
  scroll?: boolean;
  className?: string;
  animationTime?: number;
  particleCount?: number;
  particleDistances?: [number, number];
  particleR?: number;
  timeVariance?: number;
  colors?: number[];
}

export default function GooeyNav({
  items,
  activeIndex,
  label,
  scroll = true,
  className = "",
  animationTime = 600,
  particleCount = 12,
  particleDistances = [70, 8],
  particleR = 80,
  timeVariance = 300,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
}: GooeyNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const filterRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const previousIndex = useRef<number | null>(null);
  const reduce = usePrefersReducedMotion();
  const filterId = `gooey-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const noise = (n = 1) => n / 2 - Math.random() * n;
  const getXY = (distance: number, pointIndex: number, totalPoints: number): [number, number] => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };
  const createParticle = (i: number, t: number, d: [number, number], r: number) => {
    const rotate = noise(r / 10);
    return {
      start: getXY(d[0], particleCount - i, particleCount),
      end: getXY(d[1] + noise(7), particleCount - i, particleCount),
      time: t,
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10,
    };
  };
  const makeParticles = (element: HTMLElement) => {
    const bubbleTime = animationTime * 2 + timeVariance;
    element.style.setProperty("--time", `${bubbleTime}ms`);
    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance * 2);
      const p = createParticle(i, t, particleDistances, particleR);
      element.classList.remove("active");
      setTimeout(() => {
        const particle = document.createElement("span");
        const point = document.createElement("span");
        particle.classList.add("particle");
        particle.style.setProperty("--start-x", `${p.start[0]}px`);
        particle.style.setProperty("--start-y", `${p.start[1]}px`);
        particle.style.setProperty("--end-x", `${p.end[0]}px`);
        particle.style.setProperty("--end-y", `${p.end[1]}px`);
        particle.style.setProperty("--time", `${p.time}ms`);
        particle.style.setProperty("--scale", `${p.scale}`);
        particle.style.setProperty("--color", `var(--color-${p.color}, white)`);
        particle.style.setProperty("--rotate", `${p.rotate}deg`);
        point.classList.add("point");
        particle.appendChild(point);
        element.appendChild(particle);
        requestAnimationFrame(() => element.classList.add("active"));
        setTimeout(() => particle.remove(), t);
      }, 30);
    }
  };

  const place = (li: HTMLElement) => {
    const container = containerRef.current;
    const filter = filterRef.current;
    const text = textRef.current;
    if (!container || !filter || !text) return;
    const box = container.getBoundingClientRect();
    const pos = li.getBoundingClientRect();
    const styles = {
      left: `${pos.x - box.x}px`,
      top: `${pos.y - box.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`,
    };
    Object.assign(filter.style, styles);
    Object.assign(text.style, styles);
    text.innerText = li.innerText;
  };

  useEffect(() => {
    const container = containerRef.current;
    const list = listRef.current;
    const filter = filterRef.current;
    const text = textRef.current;
    if (!container || !list || !filter || !text) return;

    const active =
      activeIndex >= 0 ? (list.children[activeIndex] as HTMLElement | undefined) : undefined;
    container.dataset.empty = active ? "false" : "true";
    if (!active) {
      previousIndex.current = null;
      return;
    }

    place(active);
    const moved = previousIndex.current !== null && previousIndex.current !== activeIndex;
    previousIndex.current = activeIndex;
    text.classList.remove("active");
    void text.offsetWidth;
    text.classList.add("active");
    if (moved && !reduce) {
      filter.querySelectorAll(".particle").forEach((p) => p.remove());
      makeParticles(filter);
    }

    const observer = new ResizeObserver(() => place(active));
    observer.observe(container);
    return () => observer.disconnect();
  }, [activeIndex, reduce]);

  return (
    <div ref={containerRef} className={`gooey-nav relative ${className}`}>
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <filter id={filterId} x="-100%" y="-300%" width="300%" height="700%">
          <feGaussianBlur stdDeviation="7" />
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
        </filter>
      </svg>
      <nav aria-label={label} className="relative flex" style={{ transform: "translate3d(0,0,0.01px)" }}>
        <ul ref={listRef} className="relative z-[3] m-0 flex list-none flex-wrap gap-1 p-0">
          {items.map((item, index) => (
            <li key={item.href} className={`relative rounded-full ${index === activeIndex ? "active" : ""}`}>
              <Link
                href={item.href}
                scroll={scroll}
                aria-current={index === activeIndex ? "page" : undefined}
                className={`inline-block rounded-full px-3.5 py-1.5 text-sm font-medium ${focusRing}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <span
        aria-hidden="true"
        className="effect filter"
        ref={filterRef}
        style={{ filter: `url(#${filterId})` }}
      />
      <span aria-hidden="true" className="effect text" ref={textRef} />
    </div>
  );
}
