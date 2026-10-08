"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { focusRing } from "./ui";

type NavLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  // Only highlight on this exact path, e.g. "/" would otherwise match every page
  exact?: boolean;
};

export default function NavLink({ href, exact = false, className = "", ...props }: NavLinkProps) {
  const pathname = usePathname();
  const active = pathname === href || (!exact && pathname.startsWith(`${href}/`));

  return (
    <Link
      {...props}
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-foreground motion-reduce:transition-none aria-[current=page]:bg-emerald-50 aria-[current=page]:text-emerald-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:aria-[current=page]:bg-emerald-950/60 dark:aria-[current=page]:text-emerald-300 ${focusRing} ${className}`}
    />
  );
}
