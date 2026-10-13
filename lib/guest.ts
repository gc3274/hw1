// Shared by the proxy and the welcome page's action, so nothing here may touch
// the server, Supabase or env.
export const GUEST_COOKIE = "cc_guest";
export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// First-time signed-out visitors to the feed get the welcome screen instead.
// Only page loads of "/" redirect, so shared photo links still open directly.
export function shouldShowWelcome(req: {
  pathname: string;
  method: string;
  signedIn: boolean;
  hasGuestCookie: boolean;
}): boolean {
  const isNavigation = req.method === "GET" || req.method === "HEAD";
  return isNavigation && req.pathname === "/" && !req.signedIn && !req.hasGuestCookie;
}
