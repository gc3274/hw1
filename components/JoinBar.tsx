"use client";

import { useEffect, useState } from "react";
import GoogleSignInButton from "@/app/login/GoogleSignInButton";
import { focusRing } from "./ui";

const DISMISSED_KEY = "cc_joinbar_dismissed";

// Storage can throw in private windows or with site data blocked
function wasDismissed() {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

// Slides up once a guest reaches the target post. Closing it keeps it hidden
// for the rest of the browser session.
export default function JoinBar({ targetId }: { targetId: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      // In view now, or already scrolled past (e.g. a restored scroll position)
      if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
        observer.disconnect();
        if (!wasDismissed()) setVisible(true);
      }
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Hidden for this page view either way
    }
  }

  return (
    <aside
      aria-label="Sign in prompt"
      data-visible={visible}
      inert={!visible}
      className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex translate-y-6 justify-center px-4 opacity-0 transition-[opacity,translate] duration-500 motion-reduce:transition-none data-[visible=true]:pointer-events-auto data-[visible=true]:translate-y-0 data-[visible=true]:opacity-100"
    >
      <div className="flex w-full max-w-xl flex-wrap items-center gap-3 rounded-2xl border border-line bg-ink/85 p-3 pl-5 shadow-2xl backdrop-blur-md">
        <p className="mr-auto text-sm font-medium">
          Like what you see? <span className="text-muted">Sign in to vote.</span>
        </p>
        <div className="w-56">
          <GoogleSignInButton />
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className={`rounded-full p-2 text-muted hover:bg-white/5 hover:text-fg ${focusRing}`}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="size-4">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
