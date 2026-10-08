type CaptionIconProps = {
  className?: string;
};

export default function CaptionIcon({ className = "size-6" }: CaptionIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 18H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-6l-5 3.5Z" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  );
}
