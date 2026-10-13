import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { GUEST_COOKIE, shouldShowWelcome } from "@/lib/guest";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/onboarding", "/new"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const noCacheHeaders: Record<string, string> = {};

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // Responses that carry auth cookies must never be cached by a CDN
        Object.assign(noCacheHeaders, headers);
        Object.entries(noCacheHeaders).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Nothing should run between createServerClient and getClaims()
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims.sub);

  const { pathname } = request.nextUrl;
  const isNavigation = request.method === "GET" || request.method === "HEAD";

  // Redirects keep any refreshed auth cookies and the no-cache headers
  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";

    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    Object.entries(noCacheHeaders).forEach(([k, v]) => redirect.headers.set(k, v));
    return redirect;
  };

  // Optimistic check only; pages and every server action re-check through lib/dal.ts.
  // POSTs (server actions) pass through so the action can answer for itself.
  if (!signedIn && isNavigation && isProtected(pathname)) return redirectTo("/login");

  if (
    shouldShowWelcome({
      pathname,
      method: request.method,
      signedIn,
      hasGuestCookie: request.cookies.has(GUEST_COOKIE),
    })
  ) {
    return redirectTo("/welcome");
  }

  // Signed-in users on /login are bounced by the login page itself (via the DAL), not here,
  // so getClaims() and getUser() disagreeing can never cause a redirect loop.
  return response;
}
