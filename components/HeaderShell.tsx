"use client";

import { useSyncExternalStore, type ReactNode } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

// Glass header that turns more solid once the page scrolls. The fixed
// view-transition name keeps it still while page content transitions.
export default function HeaderShell({ children }: { children: ReactNode }) {
  const scrolled = useSyncExternalStore(
    subscribe,
    () => window.scrollY > 8,
    () => false,
  );

  return (
    <header
      style={{ viewTransitionName: "site-header" }}
      data-scrolled={scrolled}
      className="sticky top-0 z-40 border-b border-transparent bg-ink/40 backdrop-blur-md transition-colors duration-300 motion-reduce:transition-none data-[scrolled=true]:border-line data-[scrolled=true]:bg-ink/80"
    >
      {children}
    </header>
  );
}
