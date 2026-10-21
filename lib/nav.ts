export type NavItem = { href: string; label: string; exact?: boolean };

// "/" only lights up on itself; other sections also cover their subpaths
export function activeNavIndex(items: NavItem[], pathname: string): number {
  return items.findIndex(
    ({ href, exact }) => pathname === href || (!exact && pathname.startsWith(`${href}/`)),
  );
}

// Where a "post something" button goes for this visitor
export function postHref(signedIn: boolean, canPost: boolean): "/new" | "/onboarding" | "/login" {
  if (!signedIn) return "/login";
  return canPost ? "/new" : "/onboarding";
}
