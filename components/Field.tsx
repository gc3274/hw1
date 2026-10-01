import type { ComponentPropsWithoutRef, ReactNode } from "react";

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
};

// text-base below sm keeps iOS Safari from zooming in on focus
const controlClass =
  "block w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-base placeholder:text-gray-400 focus:border-emerald-600 focus:outline-2 focus:outline-emerald-600/30 aria-invalid:border-red-500 sm:text-sm dark:border-gray-700 dark:placeholder:text-gray-500 dark:aria-invalid:border-red-400";

function describedBy(id: string, hint: ReactNode, error: string | undefined) {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

function FieldShell({
  id,
  label,
  error,
  hint,
  optional,
  children,
}: FieldProps & { children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {optional && (
          <span className="font-normal text-gray-500 dark:text-gray-400"> (optional)</span>
        )}
      </label>
      <div className="mt-1">{children}</div>
      {hint && (
        <div id={`${id}-hint`} className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {hint}
        </div>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = FieldProps & Omit<ComponentPropsWithoutRef<"input">, "id">;

export function TextField({
  id,
  label,
  error,
  hint,
  optional,
  className = "",
  ...props
}: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional}>
      <input
        type="text"
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${controlClass} ${className}`}
      />
    </FieldShell>
  );
}

type TextAreaFieldProps = FieldProps & Omit<ComponentPropsWithoutRef<"textarea">, "id">;

export function TextAreaField({
  id,
  label,
  error,
  hint,
  optional,
  className = "",
  rows = 3,
  ...props
}: TextAreaFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional}>
      <textarea
        {...props}
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${controlClass} resize-y ${className}`}
      />
    </FieldShell>
  );
}
