import { Link } from "react-router-dom";
import { PageHero } from "../PageHero";
import { HowItWorks } from "../HowItWorks";
import { ExploreHub } from "../ExploreHub";
import { CtaBand } from "../CtaBand";
import { usePageTitle } from "../usePageTitle";

/** How it works (`/how-it-works`) — the four-step journey, start to finish. */
export function HowItWorksPage() {
  usePageTitle("How It Works — Campus Coin");

  return (
    <>
      <PageHero
        eyebrow="How it works"
        title={
          <>
            From first login to <span className="text-mint">first insight.</span>
          </>
        }
        subtitle="Four short steps, no bank connection and no spreadsheet setup — Campus Coin is useful on day one."
        actions={
          <Link
            to="/signup"
            className="btn-press rounded-full bg-mint px-8 py-3.5 text-sm font-bold text-ink hover:-translate-y-0.5 hover:bg-white"
          >
            Start step one
          </Link>
        }
      />
      <HowItWorks />
      <ExploreHub eyebrow="Keep exploring" title="See what the steps produce." exclude="/how-it-works" />
      <CtaBand />
    </>
  );
}

export default HowItWorksPage;
