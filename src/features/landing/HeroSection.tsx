import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";

/** Thin concentric fingerprint arcs (reference-style corner decoration). */
function SpiralArc({ className }: { className?: string }) {
  const rings = [34, 54, 74, 94, 114];
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      {rings.map((r, index) => (
        <circle
          key={r}
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="1.25"
          transform={`rotate(${index * 34} 100 100)`}
        />
      ))}
    </svg>
  );
}

/**
 * Standalone flagship hero (spec §7) — sharp, centered, reference-aligned:
 * nav space, large headline, supporting copy, primary + secondary CTA,
 * ambient glow and fingerprint arcs. The phone experience follows AFTER
 * this section as its own scroll story.
 */
export function HeroSection() {
  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-night text-white"
    >
      {/* Ambient texture + lighting */}
      <div aria-hidden="true" className="hero-grid absolute inset-0" />
      <div
        aria-hidden="true"
        className="absolute inset-x-[-20%] bottom-[-30%] h-[78%]"
        style={{
          background:
            "radial-gradient(52% 88% at 50% 106%, rgba(110,231,158,0.95) 0%, rgba(110,231,158,0.35) 46%, transparent 76%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -right-40 top-1/4 h-96 w-96 rounded-full bg-brand/20 blur-3xl"
      />
      <SpiralArc className="absolute -left-20 top-24 hidden h-56 w-56 md:block" />
      <SpiralArc className="absolute -right-20 top-16 hidden h-56 w-56 md:block lg:h-72 lg:w-72" />

      {/* Hero copy — the whole first screen */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-28 pt-32 text-center sm:pt-36">
        <h1 className="font-display text-[34px] font-bold leading-[1.06] tracking-tight text-white sm:text-6xl lg:text-[68px]">
          Take Control of Your
          <br className="hidden sm:block" />{" "}
          <span className="text-mint">Campus Finances.</span>
        </h1>
        <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/60 sm:text-lg">
          Track spending, set budgets and build better money habits. Every insight is written in
          plain language, not bank jargon.
        </p>

        {/* Primary + secondary CTA (stacked full-width on mobile for thumb reach) */}
        <div className="mt-9 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center">
          <Link
            to="/signup"
            className="btn-press rounded-full bg-mint px-9 py-4 text-center text-[15px] font-bold text-ink hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_0_36px_rgba(110,231,158,0.45)] sm:py-3.5"
          >
            Get Started
          </Link>
          <a
            href="#features"
            className="btn-press flex items-center justify-center gap-2 rounded-full bg-white/8 px-9 py-4 text-center text-[15px] font-semibold text-white ring-1 ring-white/20 hover:-translate-y-0.5 hover:bg-white/15 sm:py-3.5"
          >
            Explore Campus Coin
            <ChevronDown size={16} />
          </a>
        </div>

        {/* Quiet trust line */}
        <p className="mt-8 text-[12px] tracking-wide text-white/40">
          No bank link needed · CSV import · Data stays on your device
        </p>
      </div>

      {/* Scroll cue */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-1 text-white/45"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em]">Scroll</span>
        <ChevronDown size={16} className="animate-bounce" />
      </div>
    </section>
  );
}

export default HeroSection;
