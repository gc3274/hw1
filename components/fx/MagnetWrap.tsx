"use client";

import type { ReactNode } from "react";
import Magnet from "@/components/bits/Magnet";
import { useCursorEffects } from "./hooks";

export default function MagnetWrap({ children }: { children: ReactNode }) {
  const enabled = useCursorEffects();
  return (
    <Magnet padding={50} magnetStrength={5} disabled={!enabled} wrapperClassName="inline-block">
      {children}
    </Magnet>
  );
}
