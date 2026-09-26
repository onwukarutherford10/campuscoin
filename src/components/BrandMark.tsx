interface BrandMarkProps {
  compact?: boolean;
  /** Use on dark surfaces: night diamond with mint ring + mint "C". */
  inverted?: boolean;
}

/**
 * Campus Coin mark — the reference rounded-diamond symbol in near-black,
 * re-treated with the Campus Coin green: a green ring around the symbol
 * and a green "C" cut-out (mint on dark surfaces, brand green on light).
 * Geometry is never distorted; works on both light and dark backgrounds.
 */
function LogoGlyph({ inverted = false }: { inverted?: boolean }) {
  const plate = inverted ? "rgb(10 10 10)" : "rgb(20 22 21)";
  const accent = inverted ? "rgb(110 231 158)" : "rgb(38 153 83)";
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="h-8 w-8 shrink-0">
      <rect
        x="5.5"
        y="5.5"
        width="21"
        height="21"
        rx="6.5"
        transform="rotate(45 16 16)"
        fill={plate}
        stroke={accent}
        strokeWidth="1.6"
      />
      <path
        d="M20 11.4a6.2 6.2 0 1 0 0 9.2"
        fill="none"
        stroke={accent}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Wordmark used by the sidebar, onboarding, landing and every auth screen. */
export function BrandMark({ compact = false, inverted = false }: BrandMarkProps) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoGlyph inverted={inverted} />
      {!compact && (
        <span
          className={`font-display text-[14px] font-bold uppercase tracking-[0.08em] ${
            inverted ? "text-white" : "text-gray-900"
          }`}
        >
          Campus Coin
        </span>
      )}
    </span>
  );
}

export { LogoGlyph };
export default BrandMark;
