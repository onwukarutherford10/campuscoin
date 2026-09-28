import { Link } from "react-router-dom";
import { BrandMark } from "../../components/BrandMark";
import { Reveal } from "./Motion";

/** Closing dark CTA band — the final call to action on the main pages. */
export function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-night px-6 py-20 text-center text-white sm:py-24 lg:py-32">
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
  );
}

export default CtaBand;
