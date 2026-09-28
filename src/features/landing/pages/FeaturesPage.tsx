import { Link } from "react-router-dom";
import { PageHero } from "../PageHero";
import { Benefits } from "../Benefits";
import { Spotlights } from "../Spotlights";
import { CtaBand } from "../CtaBand";
import { usePageTitle } from "../usePageTitle";

/** Features (`/features`) — every capability, card by card and spotlight by spotlight. */
export function FeaturesPage() {
  usePageTitle("Features — Campus Coin");

  return (
    <>
      <PageHero
        eyebrow="Features"
        title={
          <>
            Four tools, <span className="text-mint">one clear picture.</span>
          </>
        }
        subtitle="Track spending, set budgets, watch savings grow and read insights that actually say something. This is the full tour."
        actions={
          <>
            <Link
              to="/signup"
              className="btn-press rounded-full bg-mint px-8 py-3.5 text-sm font-bold text-ink hover:-translate-y-0.5 hover:bg-white"
            >
              Get Started
            </Link>
            <Link
              to="/how-it-works"
              className="btn-press rounded-full px-8 py-3.5 text-sm font-semibold text-white ring-1 ring-white/25 hover:-translate-y-0.5 hover:bg-white/10"
            >
              See how it works
            </Link>
          </>
        }
      />
      <Benefits />
      <Spotlights />
      <CtaBand />
    </>
  );
}

export default FeaturesPage;
