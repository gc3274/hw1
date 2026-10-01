"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ChangeEvent } from "react";
import { saveAvatar } from "@/app/profile/actions";
import Avatar from "@/components/Avatar";
import Spinner from "@/components/Spinner";
import { button, focusRing } from "@/components/ui";
import {
  AVATAR_BUCKET,
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TO_EXT,
  isAvatarMime,
} from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";

type AvatarUploaderProps = {
  userId: string;
  currentUrl: string | null;
  name: string;
  usingGooglePhoto: boolean;
};

const MB = 1024 * 1024;
const UPLOAD_FAILED = "Upload failed. Check your connection and try again.";

export default function AvatarUploader({
  userId,
  currentUrl,
  name,
  usingGooglePhoto,
}: AvatarUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Free the old blob URL whenever the preview changes or the component goes away
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function clearSelection() {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    setError(null);
    setNotice(null);

    if (!picked) {
      clearSelection();
      return;
    }
    if (!isAvatarMime(picked.type)) {
      clearSelection();
      setError("Please choose a PNG, JPG, or WebP image.");
      return;
    }
    if (picked.size > AVATAR_MAX_BYTES) {
      clearSelection();
      // Round up so a file just over the limit never reads as "5.0 MB"
      const size = Math.ceil((picked.size / MB) * 10) / 10;
      setError(`That image is ${size} MB. Please choose one under ${AVATAR_MAX_BYTES / MB} MB.`);
      return;
    }

    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  }

  function cancel() {
    clearSelection();
    setError(null);
  }

  function upload() {
    if (!file) return;
    const mime = file.type;
    if (!isAvatarMime(mime)) return;
    const picked = file;

    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const path = `${userId}/${crypto.randomUUID()}.${AVATAR_MIME_TO_EXT[mime]}`;
        const bucket = createClient().storage.from(AVATAR_BUCKET);

        const { error: uploadError } = await bucket.upload(path, picked, {
          contentType: mime,
          upsert: false,
          cacheControl: "31536000",
        });
        if (uploadError) {
          setError(UPLOAD_FAILED);
          return;
        }

        const result = await saveAvatar(path);
        if (!result.ok) {
          // Best effort: don't leave an orphaned file behind
          await bucket.remove([path]).catch(() => null);
          setError(result.error);
          return;
        }

        // Keep showing the preview (it's the same image) so the photo doesn't
        // flicker back to the old one while the page refreshes.
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        setNotice("Photo updated.");
        router.refresh();
      } catch {
        setError(UPLOAD_FAILED);
      }
    });
  }

  const shownSrc = preview ?? currentUrl;
  const avatarAlt = file
    ? "Preview of your new photo"
    : shownSrc
      ? "Your current photo"
      : "Your initials, shown until you add a photo";

  return (
    <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start">
      <Avatar src={shownSrc} name={name} size={96} alt={avatarAlt} />

      <div className="min-w-0 flex-1">
        <label htmlFor="avatar" className="block text-sm font-medium">
          Choose a new photo
        </label>
        <input
          ref={inputRef}
          id="avatar"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onPick}
          disabled={pending}
          aria-describedby="avatar-hint"
          className={`mt-2 block w-full rounded-md text-sm text-gray-600 file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-gray-300 file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:file:border-gray-700 dark:hover:file:bg-gray-900 ${focusRing}`}
        />
        <p id="avatar-hint" className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          PNG, JPG, or WebP, up to {AVATAR_MAX_BYTES / MB} MB.
          {usingGooglePhoto && currentUrl && !preview
            ? " Right now we’re showing your Google photo."
            : null}
        </p>

        {file && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={upload}
              disabled={pending}
              className={button("primary", "sm")}
            >
              {pending && <Spinner />}
              {pending ? "Saving…" : "Save photo"}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className={button("secondary", "sm")}
            >
              Cancel
            </button>
          </div>
        )}

        <p
          role="status"
          className={`mt-3 min-h-5 text-sm ${
            error ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {error ?? notice}
        </p>
      </div>
    </div>
  );
}
