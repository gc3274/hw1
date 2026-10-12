"use client";

import Image from "next/image";
import { unstable_rethrow } from "next/navigation";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { createImage } from "@/app/new/actions";
import BorderGlow from "@/components/bits/BorderGlow";
import { TextAreaField } from "@/components/Field";
import Spinner from "@/components/Spinner";
import { button, card } from "@/components/ui";
import { CONTEXT_MAX, IMAGE_BUCKET } from "@/lib/captions";
import { PhotoError, resizeToJpeg } from "@/lib/resize-image";
import { createClient } from "@/lib/supabase/client";
import WritingOverlay from "./WritingOverlay";

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
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  // Optimistic so each stage shows right away and clears itself when the submit ends
  const [stage, setStage] = useOptimistic<Stage | null>(null);

  // Free the old blob URL whenever the preview changes or the form goes away
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function pick(picked: File | null) {
    setError(null);
    setFile(picked);
    setPreview(picked ? URL.createObjectURL(picked) : null);
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    pick(event.target.files?.[0] ?? null);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (pending) return;
    const dropped = event.dataTransfer.files?.[0];
    if (!dropped) return;
    if (!dropped.type.startsWith("image/")) {
      setError(UNREADABLE);
      return;
    }
    // Mirror the drop into the input so `required` and form state agree
    const transfer = new DataTransfer();
    transfer.items.add(dropped);
    if (inputRef.current) inputRef.current.files = transfer.files;
    pick(dropped);
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
        <p className="block text-sm font-medium" id="photo-label">
          Photo
        </p>
        <BorderGlow
          className="mt-2"
          backgroundColor="#0d0d13"
          borderRadius={20}
          colors={["#c4ff3d", "#ff3ea5", "#7c3aed"]}
        >
          <label
            onDragOver={(event) => {
              event.preventDefault();
              if (!pending) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            data-dragging={dragging}
            // Inset focus ring, since BorderGlow clips anything drawn outside it
            className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-line px-6 py-10 text-center transition-colors has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-lime data-[dragging=true]:border-lime data-[dragging=true]:bg-lime/5 motion-reduce:transition-none"
          >
            <input
              ref={inputRef}
              id="photo"
              name="photo"
              type="file"
              accept="image/*"
              required
              onChange={onPick}
              disabled={pending}
              aria-labelledby="photo-label"
              aria-describedby="photo-hint"
              className="sr-only"
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" className="size-8 text-lime">
              <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-medium wrap-anywhere">
              {file ? file.name : (
                <>
                  Drop a photo here or <span className="text-lime underline underline-offset-4">browse</span>
                </>
              )}
            </span>
            <span className="text-sm text-muted">JPG or PNG · big photos are resized for you</span>
          </label>
        </BorderGlow>
        <p id="photo-hint" className="mt-2 text-sm text-muted">
          Campus, the subway, your dorm, a bodega cat. Skip photos of people who didn’t say yes.
        </p>

        {preview && (
          <div className={`${card} relative mt-4 aspect-[4/5] w-full max-w-sm overflow-hidden`}>
            <Image
              src={preview}
              alt="Preview of the photo you picked"
              fill
              unoptimized
              sizes="384px"
              onError={() => setError(UNREADABLE)}
              className="object-contain"
            />
            {stage === "writing" && <WritingOverlay />}
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
                remaining <= 20 ? "text-amber-300" : ""
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
            error ? "text-rose" : "text-fg/80"
          }`}
        >
          {status}
        </p>
      </div>
    </form>
  );
}
