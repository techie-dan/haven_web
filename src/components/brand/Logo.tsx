import { cn } from "@/lib/cn";

/**
 * The Haven mark: an open triangle (hearth / shelter) with a terracotta ring
 * (the vessel) resting inside it. Drawn on a 40×36 grid so the stroke weight
 * stays optically even at every size.
 */
export function LogoMark({
  className,
  ringColor = "#c1613c",
  strokeColor = "currentColor",
}: {
  className?: string;
  ringColor?: string;
  strokeColor?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 36"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <path
        d="M20 3.5 36.5 32.5H3.5L20 3.5Z"
        stroke={strokeColor}
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="24.4" r="6.1" stroke={ringColor} strokeWidth="3.1" />
    </svg>
  );
}

/**
 * Full lockup: mark + HAVEN in letterspaced serif + the "STUDIO & LIVING"
 * descriptor in small-caps sans.
 */
export function Logo({
  className,
  size = "md",
  showDescriptor = true,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  showDescriptor?: boolean;
}) {
  const scale = {
    sm: { mark: "h-5", name: "text-[15px]", sub: "text-[7px]" },
    md: { mark: "h-7", name: "text-[20px]", sub: "text-[8px]" },
    lg: { mark: "h-10", name: "text-[28px]", sub: "text-[11px]" },
  }[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={cn(scale.mark, "w-auto text-ink")} />
      <span className="flex flex-col justify-center">
        <span className={cn("wordmark", scale.name)}>Haven</span>
        {showDescriptor && (
          <span
            className={cn(
              "eyebrow mt-[3px] text-muted",
              scale.sub,
            )}
            style={{ letterSpacing: "0.3em" }}
          >
            Studio &amp; Living
          </span>
        )}
      </span>
    </span>
  );
}
