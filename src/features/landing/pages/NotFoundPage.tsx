import { Link } from "react-router-dom";
import { PageHero } from "../PageHero";
import { ExploreHub } from "../ExploreHub";
import { usePageTitle } from "../usePageTitle";

/** 404 (`*`) — an unknown URL inside the marketing site. */
export function NotFoundPage() {
  usePageTitle("Page not found — Campus Coin");

  return (
    <>
      <PageHero
        eyebrow="Error 404"
        title={
          <>
            This page took an <span className="text-mint">unplanned detour.</span>
          </>
        }
        subtitle="The link you followed doesn't match any page on Campus Coin. Pick a destination below and carry on."
        actions={
          <>
            <Link
              to="/"
              className="btn-press rounded-full bg-mint px-8 py-3.5 text-sm font-bold text-ink hover:-translate-y-0.5 hover:bg-white"
            >
              Back home
            </Link>
            <Link
              to="/contact"
              className="btn-press rounded-full px-8 py-3.5 text-sm font-semibold text-white ring-1 ring-white/25 hover:-translate-y-0.5 hover:bg-white/10"
            >
              Report a broken link
            </Link>
          </>
        }
      />
      <ExploreHub eyebrow="Site map" title="Where would you like to go?" />
    </>
  );
}

export default NotFoundPage;
