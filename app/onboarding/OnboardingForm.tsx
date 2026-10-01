"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { completeOnboarding } from "@/app/onboarding/actions";
import BioField from "@/components/BioField";
import { TextField } from "@/components/Field";
import SubmitButton from "@/components/SubmitButton";
import { NAME_MAX, initialFormState, type ProfileValues } from "@/lib/profile";

type OnboardingFormProps = {
  firstName: string;
  lastName: string;
  bio: string;
};

export default function OnboardingForm({ firstName, lastName, bio }: OnboardingFormProps) {
  const [state, formAction] = useActionState(completeOnboarding, initialFormState);
  // Controlled so React doesn't wipe what was typed when the server sends back errors
  const [values, setValues] = useState<ProfileValues>({
    first_name: firstName,
    last_name: lastName,
    bio,
  });
  const formRef = useRef<HTMLFormElement>(null);

  // Move focus to the first field the server flagged
  useEffect(() => {
    if (!state.errors) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  function update(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <form ref={formRef} action={formAction} className="mt-6 space-y-5">
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

      <div>
        <SubmitButton className="w-full" pendingText="Saving…">
          Continue to your dashboard
        </SubmitButton>
        {/* Stays mounted (just empty) so screen readers pick up new messages */}
        <p role="status" className="mt-3 text-sm text-red-600 empty:mt-0 dark:text-red-400">
          {!state.ok && state.message ? state.message : null}
        </p>
      </div>
    </form>
  );
}
