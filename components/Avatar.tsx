"use client";

import Image from "next/image";
import { useState } from "react";

type AvatarProps = {
  src: string | null;
  name: string;
  size?: number;
  alt?: string;
  className?: string;
};

function initials(name: string) {
  // displayName falls back to the email address, so drop the domain
  const base = name.includes("@") ? name.slice(0, name.indexOf("@")) : name;
  const words = base.trim().split(/\s+/).filter(Boolean);
  const first = words[0] ? Array.from(words[0])[0] : "";
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : "";
  return (first + last).toUpperCase() || "?";
}

export default function Avatar({ src, name, size = 40, alt = "", className = "" }: AvatarProps) {
  // Remember which URL failed so a new src gets a fresh attempt
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  // Preflight sets img height to auto, so pin both sides to keep non-square photos round
  const dimensions = { width: size, height: size };

  if (src && src !== brokenSrc) {
    return (
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        onError={() => setBrokenSrc(src)}
        style={dimensions}
        className={`shrink-0 rounded-full bg-gray-100 object-cover dark:bg-gray-800 ${className}`}
      />
    );
  }

  return (
    <span
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      style={{ ...dimensions, fontSize: Math.round(size * 0.4) }}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full bg-emerald-100 font-semibold leading-none text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 ${className}`}
    >
      {initials(name)}
    </span>
  );
}
