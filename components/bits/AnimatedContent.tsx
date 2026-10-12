"use client";
// Adapted from React Bits (reactbits.dev), MIT + Commons Clause.
// Changes: visible in the server HTML (no "invisible" class); skips anything
// already on screen at mount and everything under reduced motion; no snap
// container lookup; trimmed to the props this app uses.

import { useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface AnimatedContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  distance?: number;
  duration?: number;
  ease?: string;
  delay?: number;
  threshold?: number;
}

export default function AnimatedContent({
  children,
  distance = 48,
  duration = 0.7,
  ease = "power3.out",
  delay = 0,
  threshold = 0.1,
  className = "",
  ...props
}: AnimatedContentProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen at load: leave it alone so nothing flickers
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    gsap.set(el, { y: distance, opacity: 0 });
    const tween = gsap.to(el, { y: 0, opacity: 1, duration, ease, delay, paused: true });
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: `top ${(1 - threshold) * 100}%`,
      once: true,
      onEnter: () => tween.play(),
    });

    return () => {
      trigger.kill();
      tween.kill();
      gsap.set(el, { clearProps: "transform,opacity" });
    };
  }, [distance, duration, ease, delay, threshold]);

  return (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  );
}
