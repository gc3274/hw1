type BrandMarkProps = {
  className?: string;
};

// Crop marks framing a flame: the critics judge the thing you made, not you
export default function BrandMark({ className = "size-6" }: BrandMarkProps) {
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
      <path d="M4 8.5V5a1 1 0 0 1 1-1h3.5M15.5 4H19a1 1 0 0 1 1 1v3.5M20 15.5V19a1 1 0 0 1-1 1h-3.5M8.5 20H5a1 1 0 0 1-1-1v-3.5" />
      <path d="M12.9 6.7c.5 2.3 2.7 3.7 2.7 6.8a3.6 3.6 0 0 1-7.2 0c0-2.2 1.4-3.3 2.2-4.5.3 1.2.5 2.1.3 3 1.3-1.1 2.2-3 2-5.3Z" />
    </svg>
  );
}
