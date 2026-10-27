// Shared by the auth callback and tests, so nothing here may touch the server,
// Supabase or env.

// The message hook_before_user_created (prompt chains migration) returns when
// it stops a new account. Supabase Auth passes it through unchanged as
// error_description, so the two must match exactly (lib/seed-prompts.test.ts).
export const SIGNUP_BLOCKED_MESSAGE = "Sign-up is limited to approved email addresses.";

// Exact match only: any other provider error keeps the generic message
export function isSignupBlocked(errorDescription: string | null): boolean {
  return errorDescription === SIGNUP_BLOCKED_MESSAGE;
}
