import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { LandingNav } from "../features/landing/LandingNav";
import { SiteFooter } from "../features/landing/SiteFooter";

/**
 * Shell for every public marketing route: floating nav, the routed page body
 * and the shared footer. Route changes reset scroll position and replay the
 * page-enter animation, so each URL behaves like its own page.
 */
export function MarketingLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <div className="min-h-screen bg-white">
      <a
        href="#page-content"
        className="sr-only rounded-full bg-mint px-5 py-2.5 text-sm font-bold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60]"
      >
        Skip to content
      </a>
      <LandingNav />
      <main id="page-content" key={pathname} className="page-enter">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

export default MarketingLayout;
