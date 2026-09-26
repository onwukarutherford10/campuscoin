import { Lightbulb, PiggyBank, Receipt, Wallet } from "lucide-react";
import { Reveal, CountUp } from "./Motion";
import { BudgetBar, RingProgress, TrendChart } from "./WidgetParts";

const CARDS = [
  {
    icon: Receipt,
    title: "Expense Tracking",
    headline: "Know where your money goes.",
    body: "Log expenses in seconds and watch them land in the right category, suggested automatically and always yours to change.",
  },
  {
    icon: PiggyBank,
    title: "Saving",
    headline: "Turn small habits into meaningful progress.",
    body: "Set a savings goal once and watch real contributions move you toward it, week after week.",
  },
  {
    icon: Wallet,
    title: "Budgeting",
    headline: "Plan your money before you spend it.",
    body: "Give every category a monthly limit and track live progress with alerts before you overspend.",
  },
  {
    icon: Lightbulb,
    title: "Financial Insights",
    headline: "Understand your financial behavior.",
    body: "Plain-language insights and saving tips generated from your own spending activity.",
  },
];

/** The four core benefits, each with a live product widget. */
export function Benefits() {
  return (
    <section id="features" className="relative bg-white px-6 py-24 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-[12px] font-bold text-brand-dark">
            Why Campus Coin
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="font-display mt-6 text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl">
            Everything you need to
            <br />
            understand your money.
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-gray-500 sm:text-base">
            Four core tools that turn everyday campus spending into clear, confident decisions.
          </p>
        </Reveal>
      </div>

      <div className="mx-auto mt-14 grid max-w-6xl gap-6 md:grid-cols-2">
        {CARDS.map((card, index) => (
          <Reveal key={card.title} delay={index * 0.08}>
            <div className="lift h-full rounded-[2rem] border border-gray-200/70 bg-gray-100/70 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.16)] sm:p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-dark shadow-sm ring-1 ring-gray-200/80">
                <card.icon size={20} />
              </span>
              <p className="mt-5 text-[12px] font-bold uppercase tracking-[0.14em] text-brand-dark">
                {card.title}
              </p>
              <h3 className="font-display mt-2 text-xl font-bold leading-snug text-gray-900 sm:text-2xl">
                {card.headline}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">{card.body}</p>

              {/* Mini product widget */}
              <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200/70">
                <WidgetFor index={index} />
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/** One widget per card — kept separate so each reveal animates its own chart. */
function WidgetFor({ index }: { index: number }) {
  if (index === 0) {
    return (
      <>
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold text-gray-500">Spent this month</p>
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand-dark">
            8 transactions
          </span>
        </div>
        <p className="font-display mt-1 text-2xl font-bold text-gray-900">
          <CountUp to={16800} prefix="₦" />
        </p>
        <TrendChart className="mt-2" />
      </>
    );
  }
  if (index === 1) {
    return (
      <div className="flex items-center gap-5">
        <RingProgress percent={60} size={116} />
        <div>
          <p className="text-xs font-semibold text-gray-500">Savings goal</p>
          <p className="font-display mt-1 text-xl font-bold text-gray-900">
            <CountUp to={15000} prefix="₦" />
          </p>
          <p className="text-[11px] text-gray-400">of ₦25,000 target</p>
          <span className="mt-2 inline-flex rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand-dark">
            On track
          </span>
        </div>
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="space-y-4">
        <p className="text-xs font-semibold text-gray-500">September budgets</p>
        <BudgetBar label="Food" spent="₦11,900" limit="₦14,000" width={85} warn />
        <BudgetBar label="Transport" spent="₦2,300" limit="₦5,000" width={46} delay="0.12s" />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-brand-soft p-3.5">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-brand-dark">
          <Lightbulb size={12} />
          This week
        </span>
        <p className="mt-1 text-[13px] font-semibold leading-snug text-gray-900">
          You spent 18% less on transport than last week.
        </p>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-2.5">
        <span className="text-[11px] text-gray-500">Top category</span>
        <span className="text-[12px] font-bold text-gray-900">Food · 45%</span>
      </div>
    </div>
  );
}

export default Benefits;
