import type { User } from "@supabase/supabase-js";

// Shared by server actions and client forms so the limits stay in sync
// with the check constraints in the profiles migration.
export const NAME_MAX = 50;
export const BIO_MAX = 160;

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_MIME_TO_EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;
export type AvatarMime = keyof typeof AVATAR_MIME_TO_EXT;

export function isAvatarMime(type: string): type is AvatarMime {
  return Object.hasOwn(AVATAR_MIME_TO_EXT, type);
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const AVATAR_PATH_RE = new RegExp(`^(${UUID})/${UUID}\\.(?:png|jpg|webp)$`);

// Avatars live at <user id>/<random uuid>.<ext>
export function isOwnAvatarPath(userId: string, path: unknown): path is string {
  if (typeof path !== "string") return false;
  const match = AVATAR_PATH_RE.exec(path);
  return match !== null && match[1] === userId;
}

export function isProfileComplete(
  p: { first_name: string | null; last_name: string | null } | null | undefined,
): boolean {
  return Boolean(p?.first_name?.trim() && p?.last_name?.trim());
}

// Form input names match the profiles column names
export type ProfileField = "first_name" | "last_name" | "bio";
export type ProfileValues = Record<ProfileField, string>;
export type FieldErrors = Partial<Record<ProfileField, string>>;

export type FormState = {
  ok: boolean;
  message: string;
  errors?: FieldErrors;
};

export const initialFormState: FormState = { ok: false, message: "" };

function readText(fd: FormData, key: ProfileField, collapseSpaces: boolean) {
  const raw = fd.get(key);
  if (typeof raw !== "string") return "";
  const text = raw.replace(/\r\n/g, "\n").trim();
  return collapseSpaces ? text.replace(/\s+/g, " ") : text;
}

export function parseProfileForm(
  fd: FormData,
): { ok: true; values: ProfileValues } | { ok: false; errors: FieldErrors } {
  const values: ProfileValues = {
    first_name: readText(fd, "first_name", true),
    last_name: readText(fd, "last_name", true),
    bio: readText(fd, "bio", false),
  };

  const errors: FieldErrors = {};
  if (!values.first_name) errors.first_name = "First name is required.";
  else if (values.first_name.length > NAME_MAX)
    errors.first_name = `Keep it to ${NAME_MAX} characters or fewer.`;

  if (!values.last_name) errors.last_name = "Last name is required.";
  else if (values.last_name.length > NAME_MAX)
    errors.last_name = `Keep it to ${NAME_MAX} characters or fewer.`;

  if (values.bio.length > BIO_MAX) errors.bio = `Bio can be at most ${BIO_MAX} characters.`;

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, values };
}

type Metadata = User["user_metadata"] | undefined;

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// Google usually sends full_name/name; given_name/family_name only sometimes.
// Used to prefill the onboarding form, never written to the DB on its own.
export function suggestNames(meta: Metadata) {
  const given = text(meta?.given_name);
  const family = text(meta?.family_name);
  if (given || family) {
    return { firstName: given.slice(0, NAME_MAX), lastName: family.slice(0, NAME_MAX) };
  }
  const parts = (text(meta?.full_name) || text(meta?.name)).split(/\s+/).filter(Boolean);
  return {
    firstName: (parts[0] ?? "").slice(0, NAME_MAX),
    lastName: parts.slice(1).join(" ").slice(0, NAME_MAX),
  };
}

// Google profile picture, limited to the paths allowed in next.config images
export function providerAvatarUrl(meta: Metadata): string | null {
  const url = text(meta?.avatar_url) || text(meta?.picture);
  if (!url) return null;
  try {
    const { hostname, pathname } = new URL(url);
    const allowed =
      hostname === "lh3.googleusercontent.com" &&
      (pathname.startsWith("/a/") || pathname.startsWith("/a-/"));
    return allowed ? url : null;
  } catch {
    return null;
  }
}

export function displayName(
  first: string | null | undefined,
  last: string | null | undefined,
  email: string | null | undefined,
) {
  return [first, last].filter(Boolean).join(" ") || email || "Member";
}
