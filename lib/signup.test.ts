import { describe, expect, it } from "vitest";
import { SIGNUP_BLOCKED_MESSAGE, isSignupBlocked } from "./signup";

describe("isSignupBlocked", () => {
  it("matches the hook's message exactly", () => {
    expect(isSignupBlocked(SIGNUP_BLOCKED_MESSAGE)).toBe(true);
  });

  it.each([
    null,
    "",
    "access_denied",
    "Database error saving new user",
    `${SIGNUP_BLOCKED_MESSAGE} `,
    SIGNUP_BLOCKED_MESSAGE.toLowerCase(),
  ])("ignores %j", (description) => {
    expect(isSignupBlocked(description)).toBe(false);
  });
});
