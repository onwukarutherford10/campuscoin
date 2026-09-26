import { Link } from "react-router-dom";
import { BrandMark } from "../../components/BrandMark";
import { Reveal } from "./Motion";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How It Works" },
  { href: "#about", label: "About" },
  { href: "#faq", label: "FAQ" },
];

/** Closing dark CTA band + site footer. */
export function CtaFooter() {
  return (
    <>
      <section className="relative overflow-hidden bg-night px-6 py-24 text-center text-white sm:py-32">
        <div
          aria-hidden="true"
          className="absolute inset-x-[-20%] bottom-[-55%] h-[85%]"
          style={{
            background:
              "radial-gradient(50% 95% at 50% 112%, rgba(110,231,158,0.55) 0%, rgba(110,231,158,0.15) 48%, transparent 78%)",
          }}
        />
        <div aria-hidden="true" className="hero-grid absolute inset-0 opacity-70" />

        <div className="relative mx-auto max-w-3xl">
          <Reveal>
            <span className="mx-auto flex w-fit">
              <BrandMark inverted />
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="font-display mt-8 text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Your money deserves
              <br />
              <span className="text-mint">a better system.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
              Join Campus Coin and turn everyday campus spending into a habit you can see, measure
              and improve.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/signup"
                className="btn-press rounded-full bg-mint px-9 py-4 text-sm font-bold text-ink hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_0_36px_rgba(110,231,158,0.4)] sm:py-3.5"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="btn-press rounded-full px-9 py-4 text-sm font-semibold text-white ring-1 ring-white/25 hover:-translate-y-0.5 hover:bg-white/10 sm:py-3.5"
              >
                Log in
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-night px-6 py-12 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <BrandMark inverted />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
              The student money tracker for budgets, spending insights and saving tips. Your money,
              organized.
            </p>
          </div>
          <nav aria-label="Footer">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/40">
              Explore
            </p>
            <ul className="mt-4 space-y-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-white/60 transition hover:text-mint"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/40">
              Account
            </p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link to="/login" className="text-sm text-white/60 transition hover:text-mint">
                  Log in
                </Link>
              </li>
              <li>
                <Link to="/signup" className="text-sm text-white/60 transition hover:text-mint">
                  Get Started
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="text-sm text-white/60 transition hover:text-mint">
                  Reset password
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-[12px] text-white/40 sm:flex-row">
          <p>© 2026 Campus Coin. All rights reserved.</p>
          <p>Smart spending, student style.</p>
        </div>
      </footer>
    </>
  );
}

export default CtaFooter;
