// Shared class strings so buttons, links styled as buttons, and cards match everywhere.

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "sm";

const buttonBase = `inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-medium transition-[background-color,border-color,color,scale] duration-150 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-lime text-ink shadow-[0_0_24px_-6px_rgb(196_255_61/0.6)] hover:bg-lime/85",
  secondary:
    "border border-line bg-surface text-fg backdrop-blur hover:border-white/20 hover:bg-white/8",
  ghost: "text-muted hover:bg-white/5 hover:text-fg",
};

const buttonSizes: Record<ButtonSize, string> = {
  md: "px-5 py-2 text-sm",
  sm: "px-3.5 py-1.5 text-sm",
};

export function button(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return `${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]}`;
}

export const card = "rounded-2xl border border-line bg-surface";

export const errorBox = "rounded-xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-rose";
