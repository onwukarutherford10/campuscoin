import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, CircleHelp, LayoutGrid, Mail, Route, ShieldCheck } from "lucide-react";
import { Reveal } from "./Motion";

interface PageCard {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/** Cross-links to every dedicated page — the site map, surfaced as content. */
const SITE_PAGE_CARDS: PageCard[] = [
  {
    to: "/features",
    label: "Features",
    description: "Expense tracking, budgets, saving goals and plain-language insights.",
    icon: LayoutGrid,
  },
  {
    to: "/how-it-works",
    label: "How It Works",
    description: "From signup to clarity in four guided steps.",
    icon: Route,
  },
  {
    to: "/about",
    label: "About",
    description: "The principles behind how Campus Coin treats your money and data.",
    icon: ShieldCheck,
  },
  {
    to: "/faq",
    label: "FAQ",
    description: "Straight answers on tracking, budgets, exports and privacy.",
    icon: CircleHelp,
  },
  {
    to: "/contact",
    label: "Contact",
    description: "Questions, feedback or a bug report? Send us a message.",
    icon: Mail,
  },
];

interface ExploreHubProps {
  eyebrow?: string;
  title?: ReactNode;
  /** Route to leave out (used when a page links to its neighbours). */
  exclude?: string;
}

/** "Keep exploring" grid of links to the other pages. */
export function ExploreHub({
  eyebrow = "Explore",
  title = "There's more to see.",
  exclude,
}: ExploreHubProps) {
  const cards = SITE_PAGE_CARDS.filter((card) => card.to !== exclude);

  return (
    <section className="bg-canvas px-6 py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-[12px] font-bold text-brand-dark">
              {eyebrow}
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="font-display mt-6 text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl">
              {title}
            </h2>
          </Reveal>
        </div>

        <div className="mt-10 grid gap-5 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => (
            <Reveal key={card.to} delay={index * 0.06} className="h-full">
              <Link
                to={card.to}
                className="lift group flex h-full flex-col rounded-3xl border border-gray-200/70 bg-white p-6 hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.16)] sm:p-7"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-mint shadow-sm">
                  <card.icon size={19} />
                </span>
                <span className="font-display mt-5 flex items-center gap-1.5 text-lg font-bold text-gray-900">
                  {card.label}
                  <ArrowUpRight
                    size={16}
                    className="text-gray-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-dark"
                  />
                </span>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{card.description}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ExploreHub;
