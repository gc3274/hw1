import type { ChangeEvent } from "react";
import { BIO_MAX } from "@/lib/profile";
import { TextAreaField } from "./Field";

type BioFieldProps = {
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
};

export default function BioField({ value, onChange, error }: BioFieldProps) {
  const remaining = BIO_MAX - value.length;

  return (
    <TextAreaField
      id="bio"
      name="bio"
      label="Short bio"
      optional
      maxLength={BIO_MAX}
      placeholder="Ex: favorite football team!"
      value={value}
      onChange={onChange}
      error={error}
      hint={
        <span className="flex items-baseline justify-between gap-4">
          <span>Shows up on your dashboard.</span>
          <span
            className={`shrink-0 tabular-nums ${
              remaining <= 20 ? "text-amber-700 dark:text-amber-400" : ""
            }`}
          >
            {value.length}/{BIO_MAX}
            <span className="sr-only"> characters</span>
          </span>
        </span>
      }
    />
  );
}
