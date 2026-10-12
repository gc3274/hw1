"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

function mediaQueryStore(query: string, serverValue: boolean) {
  return {
    subscribe(onChange: () => void) {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    getSnapshot: () => window.matchMedia(query).matches,
    getServerSnapshot: () => serverValue,
  };
}

const reducedMotion = mediaQueryStore("(prefers-reduced-motion: reduce)", false);
const finePointer = mediaQueryStore("(hover: hover) and (pointer: fine)", false);

// The server can't know, so it renders the animated version. CSS keeps that
// version still for reduced-motion users until hydration swaps in the static one.
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    reducedMotion.subscribe,
    reducedMotion.getSnapshot,
    reducedMotion.getServerSnapshot,
  );
}

// Mouse or trackpad. False on the server and on touch screens.
export function useFinePointer() {
  return useSyncExternalStore(
    finePointer.subscribe,
    finePointer.getSnapshot,
    finePointer.getServerSnapshot,
  );
}

// Cursor-following effects need a fine pointer and motion allowed
export function useCursorEffects() {
  const reduce = usePrefersReducedMotion();
  const fine = useFinePointer();
  return fine && !reduce;
}

export function useInView(ref: RefObject<Element | null>, rootMargin = "0px") {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return inView;
}
