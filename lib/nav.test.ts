import { describe, expect, it } from "vitest";
import { activeNavIndex, type NavItem } from "@/lib/nav";

const ITEMS: NavItem[] = [
  { href: "/", label: "Feed", exact: true },
  { href: "/new", label: "New post" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
];

describe("activeNavIndex", () => {
  it("matches the feed only on its exact path", () => {
    expect(activeNavIndex(ITEMS, "/")).toBe(0);
    expect(activeNavIndex(ITEMS, "/images/abc")).toBe(-1);
  });

  it("matches a section and its subpaths", () => {
    expect(activeNavIndex(ITEMS, "/profile")).toBe(3);
    expect(activeNavIndex(ITEMS, "/profile/edit")).toBe(3);
  });

  it("does not match a different path that shares a prefix", () => {
    expect(activeNavIndex(ITEMS, "/newsletter")).toBe(-1);
  });

  it("returns -1 for an empty list", () => {
    expect(activeNavIndex([], "/")).toBe(-1);
  });
});
