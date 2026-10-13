import { describe, expect, it } from "vitest";
import { shouldShowWelcome } from "@/lib/guest";

const visit = (over: Partial<Parameters<typeof shouldShowWelcome>[0]> = {}) =>
  shouldShowWelcome({ pathname: "/", method: "GET", signedIn: false, hasGuestCookie: false, ...over });

describe("shouldShowWelcome", () => {
  it("sends a first-time signed-out visitor on the feed to the welcome screen", () => {
    expect(visit()).toBe(true);
    expect(visit({ method: "HEAD" })).toBe(true);
  });

  it("lets guests who already chose to look around through", () => {
    expect(visit({ hasGuestCookie: true })).toBe(false);
  });

  it("never redirects signed-in users", () => {
    expect(visit({ signedIn: true })).toBe(false);
  });

  it("only redirects the feed itself, so shared links still open", () => {
    expect(visit({ pathname: "/images/3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f" })).toBe(false);
    expect(visit({ pathname: "/welcome" })).toBe(false);
    expect(visit({ pathname: "/login" })).toBe(false);
  });

  it("lets server actions (POST) through", () => {
    expect(visit({ method: "POST" })).toBe(false);
  });
});
