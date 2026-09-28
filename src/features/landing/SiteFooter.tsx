import { Link } from "react-router-dom";
import { BrandMark } from "../../components/BrandMark";

interface FooterLink {
  to: string;
  label: string;
}

const FOOTER_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { to: "/features", label: "Features" },
      { to: "/how-it-works", label: "How It Works" },
      { to: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/", label: "Home" },
      { to: "/about", label: "About" },
      { to: "/contact", label: "Contact" },
    ],
  },
];

/** Site-wide footer for every marketing route — all entries are real pages. */
export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-night px-6 py-12 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link to="/" aria-label="Campus Coin home">
            <BrandMark inverted />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
            The student money tracker for budgets, spending insights and saving tips. Your money,
            organized.
          </p>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/40">
              {column.title}
            </p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-white/60 transition hover:text-mint"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

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
              <Link
                to="/forgetpassword"
                className="text-sm text-white/60 transition hover:text-mint"
              >
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
  );
}

export default SiteFooter;
