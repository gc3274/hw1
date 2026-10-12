"use client";

import { usePathname } from "next/navigation";
import GooeyNav from "@/components/bits/GooeyNav";
import { activeNavIndex, type NavItem } from "@/lib/nav";

export default function MainNav({ items, className = "" }: { items: NavItem[]; className?: string }) {
  const pathname = usePathname();
  return (
    <GooeyNav
      label="Main"
      items={items}
      activeIndex={activeNavIndex(items, pathname)}
      className={className}
    />
  );
}
