"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { updateProfile } from "@/app/profile/actions";
import BioField from "@/components/BioField";
import { TextField } from "@/components/Field";
import SubmitButton from "@/components/SubmitButton";
import { NAME_MAX, initialFormState, type FormState, type ProfileValues } from "@/lib/profile";

type ProfileFormProps = {
  firstName: string;
  lastName: string;
  bio: string;
};

export default function ProfileForm({ firstName, lastName, bio }: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfile, initialFormState);
  // Controlled so React doesn't reset the fields after each submit
  const [values, setValues] = useState<ProfileValues>({
    first_name: firstName,
    last_name: lastName,
    bio,
  });
  // The result the user has typed over since; its message ("Profile saved.") is stale now
  const [editedAfter, setEditedAfter] = useState<FormState | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.errors) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  function update(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setEditedAfter(state);
  }

  return (
    <form ref={formRef} action={formAction} className="mt-4 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="first_name"
          name="first_name"
          label="First name"
          autoComplete="given-name"
          required
          maxLength={NAME_MAX}
          value={values.first_name}
          onChange={update}
          error={state.errors?.first_name}
        />
        <TextField
          id="last_name"
          name="last_name"
          label="Last name"
          autoComplete="family-name"
          required
          maxLength={NAME_MAX}
          value={values.last_name}
          onChange={update}
          error={state.errors?.last_name}
        />
      </div>

      <BioField value={values.bio} onChange={update} error={state.errors?.bio} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
        <p
          role="status"
          className={`text-sm ${
            state.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {state.message && editedAfter !== state ? state.message : null}
        </p>
      </div>
    </form>
  );
}
