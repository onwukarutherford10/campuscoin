import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "../../components/BrandMark";

interface AuthShellProps {
  title: string;
  subtitle: string;
  /** Optional back link rendered above the heading. */
  backTo?: string;
  /** Alternative back action (e.g. return to a previous form step). */
  onBack?: () => void;
  backLabel?: string;
  children: ReactNode;
  /** Trailing line under the form (e.g. "New here? Create account"). */
  footer?: ReactNode;
  /** Photo filling the whole desktop visual panel (signup/login/OTP/reset). */
  art: { src: string; alt: string };
}

/**
 * Shared auth canvas (spec §18): desktop 50/50 split, the photo
 * fills the ENTIRE left half edge-to-edge with a brand gradient overlay
 * for legibility; the form occupies the right half and always offers a
 * way back to the homepage.
 * On mobile the photo disappears entirely (spec §23) and the
 * experience becomes 100% form.
 */
export function AuthShell({
  title,
  subtitle,
  backTo,
  onBack,
  backLabel,
  children,
  footer,
  art,
}: AuthShellProps) {
  return (
    <main className="page-enter flex min-h-screen bg-white">
      {/* Visual panel: full-bleed 50% (desktop only) */}
      <aside className="relative hidden w-1/2 overflow-hidden bg-ink lg:block">
        <img
          src={art.src}
          alt={art.alt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        {/* Legibility gradient (top for logo, bottom for copy) */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(10,10,10,0.62) 0%, rgba(10,10,10,0.18) 34%, rgba(10,10,10,0.34) 62%, rgba(10,10,10,0.88) 100%)",
          }}
        />
        {/* Brand lighting */}
        <div
          aria-hidden="true"
          className="absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-mint/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-brand/30 blur-3xl"
        />

        <div className="relative z-10 flex h-full flex-col p-12">
          <div>
            <BrandMark inverted />
          </div>

          <div className="mt-auto">
            <h2 className="font-display max-w-md text-3xl leading-tight text-white drop-shadow-sm">
              Smart spending,
              <br />
              <span className="text-mint">student style.</span>
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
              Track every naira, set budgets that actually stick, and get plain-language tips built
              from your own spending.
            </p>
            <p className="mt-5 text-xs text-white/55">
              Budgets, insights and saving tips in one place.
            </p>
          </div>

          <p className="mt-9 text-[11px] text-white/45">
            Campus Coin · Smart Spending, Student Style
          </p>
        </div>
      </aside>

      {/* Form panel (100% on mobile, right half on desktop) */}
      <section className="page-enter flex min-h-screen w-full flex-col px-6 py-8 sm:px-10 lg:w-1/2">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" aria-label="Campus Coin home" className="inline-block lg:hidden">
            <BrandMark />
          </Link>
          <Link
            to="/"
            className="flex min-h-[44px] items-center gap-1.5 text-[13px] font-medium text-gray-500 transition hover:text-gray-900"
          >
            <ArrowLeft size={14} />
            Back to homepage
          </Link>
        </header>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          {onBack || backTo ? (
            onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="mb-5 flex w-fit items-center gap-1.5 text-[13px] font-medium text-gray-500 transition hover:text-gray-900"
              >
                <ArrowLeft size={14} />
                {backLabel ?? "Back"}
              </button>
            ) : (
              <Link
                to={backTo as string}
                className="mb-5 flex w-fit items-center gap-1.5 text-[13px] font-medium text-gray-500 transition hover:text-gray-900"
              >
                <ArrowLeft size={14} />
                {backLabel ?? "Back"}
              </Link>
            )
          ) : null}
          <h1 className="font-display text-[28px] font-bold tracking-tight text-gray-900">
            {title}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{subtitle}</p>
          {children}
        </div>

        {footer && (
          <footer className="text-center text-[13px] text-gray-500 lg:text-left">{footer}</footer>
        )}
      </section>
    </main>
  );
}

export default AuthShell;
