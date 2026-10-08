"use client";

import Image from "next/image";
import { unstable_rethrow } from "next/navigation";
import {
  useEffect,
  useOptimistic,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { createImage } from "@/app/new/actions";
import { TextAreaField } from "@/components/Field";
import Spinner from "@/components/Spinner";
import { button, card, focusRing } from "@/components/ui";
import { CONTEXT_MAX, IMAGE_BUCKET } from "@/lib/captions";
import { PhotoError, resizeToJpeg } from "@/lib/resize-image";
import { createClient } from "@/lib/supabase/client";

type Stage = "preparing" | "uploading" | "writing";

const STAGE_COPY: Record<Stage, string> = {
  preparing: "Preparing your photo…",
  uploading: "Uploading…",
  writing: "Writing captions… (about 10 seconds)",
};

const UNREADABLE = "Couldn’t read that photo. Try a JPG or PNG.";
const UPLOAD_FAILED = "Upload failed. Check your connection and try again.";
const CAPTIONS_FAILED = "Something went wrong while writing captions. Please try again.";

export default function NewPostForm({ userId }: { userId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Optimistic so each stage shows right away and clears itself when the submit ends
  const [stage, setStage] = useOptimistic<Stage | null>(null);

  // Free the old blob URL whenever the preview changes or the form goes away
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    setError(null);
    setFile(picked);
    setPreview(picked ? URL.createObjectURL(picked) : null);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || pending) return;
    const picked = file;
    const context = note;

    setError(null);
    startTransition(async () => {
      // State set after an await isn't part of the transition, so it's wrapped again
      const fail = (message: string) => startTransition(() => setError(message));

      setStage("preparing");
      let blob: Blob;
      try {
        blob = await resizeToJpeg(picked);
      } catch (err) {
        fail(err instanceof PhotoError ? err.message : UNREADABLE);
        return;
      }

      startTransition(() => setStage("uploading"));
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      try {
        const { error: uploadError } = await createClient()
          .storage.from(IMAGE_BUCKET)
          .upload(path, blob, {
            contentType: "image/jpeg",
            upsert: false,
            cacheControl: "31536000",
          });
        if (uploadError) {
          fail(UPLOAD_FAILED);
          return;
        }
      } catch {
        fail(UPLOAD_FAILED);
        return;
      }

      // On success the action redirects to the new photo's page. If it fails it
      // deletes the upload itself, so there's nothing to clean up here.
      startTransition(() => setStage("writing"));
      try {
        const result = await createImage(path, context);
        fail(result?.error ?? CAPTIONS_FAILED);
      } catch (err) {
        // The success redirect arrives as a thrown navigation; let Next handle it
        unstable_rethrow(err);
        fail(CAPTIONS_FAILED);
      }
    });
  }

  const remaining = CONTEXT_MAX - note.length;
  const status = error ?? (stage ? STAGE_COPY[stage] : null);

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-6">
      <div>
        <label htmlFor="photo" className="block text-sm font-medium">
          Photo
        </label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          required
          onChange={onPick}
          disabled={pending}
          aria-describedby="photo-hint"
          className={`mt-2 block w-full rounded-md text-sm text-gray-600 file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-gray-300 file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:file:border-gray-700 dark:hover:file:bg-gray-900 ${focusRing}`}
        />
        <p id="photo-hint" className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Campus, the subway, your dorm, a bodega cat. Skip photos of people who didn’t say yes.
        </p>

        {preview && (
          <div
            className={`${card} relative mt-4 aspect-[4/5] w-full max-w-sm overflow-hidden bg-gray-100 dark:bg-gray-900`}
          >
            <Image
              src={preview}
              alt="Preview of the photo you picked"
              fill
              unoptimized
              sizes="384px"
              onError={() => setError(UNREADABLE)}
              className="object-contain"
            />
          </div>
        )}
      </div>

      <TextAreaField
        id="context"
        name="context"
        label="What’s going on here?"
        optional
        rows={2}
        maxLength={CONTEXT_MAX}
        placeholder="Ex: First week, already lost in Butler"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        disabled={pending}
        hint={
          <span className="flex items-baseline justify-between gap-4">
            <span>Helps the captions land. It’s never shown publicly.</span>
            <span
              className={`shrink-0 tabular-nums ${
                remaining <= 20 ? "text-amber-700 dark:text-amber-400" : ""
              }`}
            >
              {note.length}/{CONTEXT_MAX}
              <span className="sr-only"> characters</span>
            </span>
          </span>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" disabled={pending} className={button("primary")}>
          {pending && <Spinner />}
          {pending ? "Working…" : "Write captions"}
        </button>
        <p
          role="status"
          className={`min-h-5 text-sm ${
            error ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"
          }`}
        >
          {status}
        </p>
      </div>
    </form>
  );
}
