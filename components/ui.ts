// Shared class strings so buttons, links styled as buttons, and cards match everywhere.

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "sm";

const buttonBase = `inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-foreground text-background hover:bg-foreground/85",
  secondary:
    "border border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-900",
  ghost: "hover:bg-gray-100 dark:hover:bg-gray-900",
};

const buttonSizes: Record<ButtonSize, string> = {
  md: "px-4 py-2 text-sm",
  sm: "px-3 py-1.5 text-sm",
};

export function button(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return `${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]}`;
}

export const card = "rounded-lg border border-gray-300 dark:border-gray-700";
