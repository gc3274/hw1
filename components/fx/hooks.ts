"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

// One MediaQueryList per query, so snapshots don't call matchMedia on every render
const mediaQueryLists = new Map<string, MediaQueryList>();

function mediaQueryList(query: string) {
  let list = mediaQueryLists.get(query);
  if (!list) {
    list = window.matchMedia(query);
    mediaQueryLists.set(query, list);
  }
  return list;
}

function mediaQueryStore(query: string, serverValue: boolean) {
  return {
    subscribe(onChange: () => void) {
      const list = mediaQueryList(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    getSnapshot: () => mediaQueryList(query).matches,
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
    // Entries are queued in order, so the last one is the current state
    const observer = new IntersectionObserver(
      (entries) => setInView(entries[entries.length - 1].isIntersecting),
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return inView;
}
