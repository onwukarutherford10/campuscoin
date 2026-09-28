import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";

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
      className="relative flex min-h-[82svh] flex-col overflow-hidden bg-night text-white sm:min-h-[100svh]"
    >
      {/* Ambient texture + lighting */}
      <div aria-hidden="true" className="hero-grid absolute inset-0" />
      <div
        aria-hidden="true"
        className="absolute inset-x-[-20%] bottom-0 h-[62%]"
        style={{
          /* Peak sits above the section's bottom edge and the gradient reaches
             transparency before it, so the glow is never sliced by the clip. */
          background:
            "radial-gradient(58% 26% at 50% 70%, rgba(110,231,158,0.58) 0%, rgba(110,231,158,0.20) 46%, transparent 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="glow-blob -right-40 top-1/2 h-96 w-96 -translate-y-1/2"
      />
      <SpiralArc className="absolute -left-20 top-24 hidden h-56 w-56 md:block" />
      <SpiralArc className="absolute -right-20 top-16 hidden h-56 w-56 md:block lg:h-72 lg:w-72" />

      {/* Hero copy — the whole first screen */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-28 text-center sm:pt-36 sm:pb-24">
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
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center">
          <Link
            to="/signup"
            className="btn-press rounded-full bg-mint px-9 py-4 text-center text-[15px] font-bold text-ink hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_0_36px_rgba(110,231,158,0.45)] sm:py-3.5"
          >
            Get Started
          </Link>
          <Link
            to="/features"
            className="btn-press flex items-center justify-center gap-2 rounded-full bg-white px-9 py-4 text-center text-[15px] font-bold text-ink hover:-translate-y-0.5 hover:shadow-[0_0_36px_rgba(255,255,255,0.4)] sm:py-3.5"
          >
            Explore Campus Coin
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Quiet trust line */}
        <p className="mt-7 text-[12px] tracking-wide text-white/40">
          No bank link needed · CSV import · Data stays on your device
        </p>
      </div>

      {/* Scroll cue — deliberately quiet so it never competes with the CTAs */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-5 z-10 flex flex-col items-center gap-0.5 text-white/25"
      >
        <span className="text-[8px] font-semibold uppercase tracking-[0.3em]">Scroll</span>
        <ChevronDown size={13} />
      </div>
    </section>
  );
}

export default HeroSection;
