/**
 * Petra brand mark: a minimal Treasury facade (pediment, columns, arched doorway)
 * with a small paw in the doorway. Single colour, drawn in `currentColor`.
 * The same geometry is in src/app/icon.svg (the favicon); keep them in step.
 */
export const PETRA_MARK_FACADE =
  "M3 11 L16 3.5 L29 11 Z M5 12.5 H27 V28.5 H5 Z M7.5 15 V26.5 H9 V15 Z M23 15 V26.5 H24.5 V15 Z M11 28.5 V19 A5 5 0 0 1 21 19 V28.5 Z";

export function PetraMark({ size = 24, className = "", title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="currentColor"
      className={`shrink-0 ${className}`}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
    >
      <path fillRule="evenodd" d={PETRA_MARK_FACADE} />
      {/* paw in the doorway */}
      <ellipse cx="16" cy="25.2" rx="2.5" ry="1.9" />
      <circle cx="13.3" cy="22.4" r="0.95" />
      <circle cx="15.05" cy="21.2" r="0.95" />
      <circle cx="16.95" cy="21.2" r="0.95" />
      <circle cx="18.7" cy="22.4" r="0.95" />
    </svg>
  );
}

/** Mark plus the "Petra" wordmark. Inherits colour and font size from its parent. */
export function PetraLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <PetraMark size={size} />
      <span>Petra</span>
    </span>
  );
}

export const PETRA_TAGLINE = "Petra. The rock your pet can rely on.";
