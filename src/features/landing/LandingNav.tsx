import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { BrandMark } from "../../components/BrandMark";
import { getSession } from "../../auth/session";
import { useScrolled } from "./storyHooks";
import { DATA_MODE } from "../../services/api/config.ts";
import { useLiveAuth } from "../../auth/useLiveAuth.ts";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/features", label: "Features", end: false },
  { to: "/how-it-works", label: "How It Works", end: false },
  { to: "/about", label: "About", end: false },
  { to: "/faq", label: "FAQ", end: false },
  { to: "/contact", label: "Contact", end: false },
];

function navItemClass(isActive: boolean): string {
  return isActive ? "text-mint" : "text-white/70";
}

/**
 * Floating sticky navbar: transparent over the home hero, then shrinks into a
 * blurred dark pill on scroll. Highlights the active route and collapses into
 * an animated panel on mobile.
 */
export function LandingNav() {
  const scrolled = useScrolled(24);
  const [open, setOpen] = useState(false);
  const liveAuth = useLiveAuth();
  const session = DATA_MODE === "live" ? liveAuth.user : getSession();

  const close = () => setOpen(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:pt-5">
      <nav
        aria-label="Main"
        className={`mx-auto flex max-w-6xl items-center justify-between rounded-full px-5 transition-all duration-300 sm:px-7 ${
          scrolled
            ? "bg-night/85 py-2.5 shadow-xl ring-1 ring-white/10 backdrop-blur-xl"
            : "bg-transparent py-4"
        }`}
      >
        <Link to="/" aria-label="Campus Coin home" onClick={close}>
          <BrandMark inverted />
        </Link>

        <div className="hidden items-center gap-5 lg:flex xl:gap-7">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                [
                  "text-[13px] font-medium transition hover:text-mint",
                  navItemClass(isActive),
                ].join(" ")
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {session ? (
            <Link
              to="/dashboard"
              className="btn-press hidden rounded-full bg-mint px-5 py-2 text-[13px] font-bold text-ink hover:bg-white lg:inline-flex"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded-full px-4 py-2 text-[13px] font-semibold text-white/75 transition hover:text-white lg:inline-flex"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="btn-press hidden rounded-full bg-mint px-5 py-2 text-[13px] font-bold text-ink hover:bg-white lg:inline-flex"
              >
                Get Started
              </Link>
            </>
          )}
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full text-white ring-1 ring-white/20 transition hover:bg-white/10 lg:hidden"
            aria-expanded={open}
            aria-controls="landing-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {open && (
        <div
          id="landing-menu"
          className="pop-in mx-auto mt-3 max-w-6xl rounded-3xl border border-white/10 bg-night/95 p-5 shadow-2xl backdrop-blur-xl lg:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link, index) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={close}
                className={({ isActive }) =>
                  [
                    "rounded-xl px-3 py-3 text-[15px] font-medium transition hover:bg-white/10",
                    isActive
                      ? "bg-white/10 text-mint hover:text-mint"
                      : "text-white/80 hover:text-white",
                  ].join(" ")
                }
                style={{ animation: `fade-up 0.4s var(--cc-ease) ${index * 0.04}s both` }}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
            <Link
              to={session ? "/" : "/login"}
              onClick={close}
              className="min-h-[44px] rounded-full px-5 py-3 text-center text-[13px] font-semibold text-white/80 ring-1 ring-white/20 transition hover:bg-white/10"
            >
              {session ? "Home" : "Log in"}
            </Link>
            <Link
              to={session ? "/dashboard" : "/signup"}
              onClick={close}
              className="min-h-[44px] rounded-full bg-mint px-5 py-3 text-center text-[13px] font-bold text-ink"
            >
              {session ? "Dashboard" : "Get Started"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default LandingNav;
