type FootballIconProps = {
  className?: string;
};

export default function FootballIcon({ className = "size-6" }: FootballIconProps) {
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
      <path d="M4 20C4 11 11 4 20 4c0 9-7 16-16 16Z" />
      <path d="m9.5 14.5 5-5" />
      <path d="m9.75 12.75 1.5 1.5M11.25 11.25l1.5 1.5M12.75 9.75l1.5 1.5" />
    </svg>
  );
}
