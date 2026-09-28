import type { ReactNode } from "react";
import { Reveal } from "./Motion";

interface PageHeroProps {
  /** Small pill above the title. */
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
  /** Optional call-to-action row under the subtitle. */
  actions?: ReactNode;
}

/**
 * Shared header for the dedicated marketing pages: a compact dark hero that
 * clears the floating nav, with room for an eyebrow, title, subtitle and CTAs.
 */
export function PageHero({ eyebrow, title, subtitle, actions }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-night px-6 pb-14 pt-32 text-white sm:pb-16 sm:pt-40 lg:pb-20">
      <div aria-hidden="true" className="hero-grid absolute inset-0" />
      {/* Glow covers the whole hero and fades to nothing at its lower edge,
          so the next section starts without a hard horizontal cut. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(72% 92% at 50% -8%, rgba(110,231,158,0.62) 0%, rgba(110,231,158,0.2) 46%, transparent 78%)",
        }}
      />
      <div
        aria-hidden="true"
        className="glow-blob -left-32 top-1/2 h-72 w-72 -translate-y-1/2"
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-[12px] font-bold text-mint ring-1 ring-mint/25">
            {eyebrow}
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="font-display mt-6 text-3xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            {title}
          </h1>
        </Reveal>
        {subtitle && (
          <Reveal delay={0.16}>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
              {subtitle}
            </p>
          </Reveal>
        )}
        {actions && (
          <Reveal delay={0.24}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{actions}</div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

export default PageHero;
