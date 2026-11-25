import type { ComponentProps } from "react";

function Spinner({ className, ...props }: ComponentProps<"svg">) {
  return (
    <svg
      aria-label="Loading"
      className={`size-4 animate-spin ${className ?? ""}`}
      fill="none"
      role="status"
      viewBox="0 0 24 24"
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeDasharray="45 54"
        strokeLinecap="round"
        strokeWidth="2.2"
        transform="rotate(-45 12 12)"
      />
    </svg>
  );
}

export { Spinner };
