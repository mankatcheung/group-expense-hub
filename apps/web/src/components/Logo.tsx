interface LogoMarkProps {
  className?: string;
}

/**
 * SplitTrip mark: a map pin split into three wedges, echoing both
 * "trip" (pin) and "split" (segmented pie) in one shape.
 * Colors are fixed brand tones, not `currentColor` — kept in sync with
 * the mark in brand/logo-mark.svg.
 */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label="SplitTrip">
      <defs>
        <clipPath id="splittrip-pin">
          <path d="M12,2 C8.13,2 5,5.13 5,9 C5,14.25 12,22 12,22 C12,22 19,14.25 19,9 C19,5.13 15.87,2 12,2 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#splittrip-pin)">
        <path d="M12,9 L12,-11 L23.76,25.18 Z" fill="#2C967C" />
        <path d="M12,9 L23.76,25.18 L-8,9 Z" fill="#5EC9AF" />
        <path d="M12,9 L-8,9 L12,-11 Z" fill="#16553B" />
        <g stroke="#FAF8F5" strokeWidth={0.45} strokeLinecap="round">
          <line x1="12" y1="9" x2="12" y2="-11" />
          <line x1="12" y1="9" x2="23.76" y2="25.18" />
          <line x1="12" y1="9" x2="-8" y2="9" />
        </g>
      </g>
      <circle cx="12" cy="9" r="1.7" fill="#FAF8F5" />
    </svg>
  );
}

interface LogoProps {
  markClassName?: string;
  textClassName?: string;
}

/** Horizontal lockup: mark + "SplitTrip" wordmark, using the app's display font. */
export function Logo({ markClassName = 'h-8 w-8', textClassName = 'text-lg' }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark className={markClassName} />
      <span className={`font-display font-bold tracking-tight ${textClassName}`}>
        <span className="text-foreground">Split</span>
        <span className="text-primary">Trip</span>
      </span>
    </span>
  );
}
