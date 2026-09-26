import { ArrowUpFromLine, Bus, MonitorPlay, Utensils, Wallet } from "lucide-react";
import type { CSSProperties } from "react";
import { Reveal, CountUp } from "./Motion";
import { BudgetBar } from "./WidgetParts";

const WEEK_SPEND = [
  { day: "Mon", height: 44 },
  { day: "Tue", height: 70 },
  { day: "Wed", height: 38 },
  { day: "Thu", height: 86 },
  { day: "Fri", height: 62 },
  { day: "Sat", height: 96 },
  { day: "Sun", height: 30 },
];

const ACTIVITY = [
  { name: "Restaurant", cat: "Food", icon: Utensils, amount: "-₦1,500", expense: true },
  { name: "Uber trip", cat: "Transport", icon: Bus, amount: "-₦800", expense: true },
  { name: "Netflix", cat: "Subscriptions", icon: MonitorPlay, amount: "-₦1,200", expense: true },
  { name: "Allowance", cat: "Income", icon: Wallet, amount: "+₦50,000", expense: false },
];

/** Illustrative dashboard preview in a browser frame, animated on reveal. */
export function DashboardPreview() {
  return (
    <section className="bg-canvas px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-[12px] font-bold text-brand-dark">
            Product preview
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="font-display mt-6 text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl">
            Your money, organized,
            <br />
            at a glance.
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-gray-500 sm:text-base">
            One dashboard brings together your balance, weekly spending, budgets and recent
            activity, with no spreadsheet gymnastics required.
          </p>
        </Reveal>
      </div>

      <Reveal delay={0.1}>
        <div className="mx-auto mt-14 max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-[0_48px_96px_-48px_rgba(0,0,0,0.4)] ring-1 ring-gray-200">
          {/* Browser chrome */}
          <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3.5">
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
            </span>
            <span className="mx-auto flex items-center gap-1.5 rounded-full bg-white px-4 py-1 text-[11px] font-medium text-gray-400 ring-1 ring-gray-200">
              campuscoin.app/dashboard
            </span>
          </div>

          <div className="grid gap-5 bg-white p-5 sm:p-7 lg:grid-cols-3">
            {/* Balance card (the app's signature black + mint surface) */}
            <div className="rounded-3xl bg-ink p-6 text-white">
              <p className="text-xs text-ink-muted">Total balance</p>
              <p className="font-display mt-1.5 text-3xl font-bold tracking-tight">
                <CountUp to={128500} prefix="₦" />
              </p>
              <span className="mt-2 inline-flex rounded-full bg-mint/15 px-2.5 py-1 text-[11px] font-bold text-mint">
                +₦50,000 income · +2.5%
              </span>
              <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="bar-grow h-full w-[64%] rounded-full bg-mint" />
              </div>
              <p className="mt-2 text-[11px] text-ink-muted">64% of savings goal</p>
              <span className="mt-5 flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-[12px] font-bold text-ink">
                <ArrowUpFromLine size={13} />
                Add expense
              </span>
            </div>

            {/* Weekly spending chart */}
            <div className="rounded-3xl border border-gray-100 bg-white p-6">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-bold text-gray-900">Spending this week</p>
                <span className="text-[11px] font-semibold text-brand-dark">-18%</span>
              </div>
              <p className="font-display mt-1 text-2xl font-bold text-gray-900">
                <CountUp to={6400} prefix="₦" />
              </p>
              <div className="mt-5 flex h-32 items-end gap-2.5">
                {WEEK_SPEND.map((bar, index) => (
                  <div key={bar.day} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className="bar-grow w-full rounded-t-md bg-brand/85"
                      style={
                        {
                          height: `${bar.height}%`,
                          "--bar-delay": `${index * 0.08}s`,
                        } as CSSProperties
                      }
                    />
                    <span className="text-[9px] font-medium text-gray-400">{bar.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Budgets + activity column */}
            <div className="space-y-5">
              <div className="rounded-3xl border border-gray-100 bg-white p-6">
                <p className="text-sm font-bold text-gray-900">Budgets</p>
                <div className="mt-4 space-y-4">
                  <BudgetBar label="Food" spent="₦11,900" limit="₦14,000" width={85} warn />
                  <BudgetBar label="Transport" spent="₦2,300" limit="₦5,000" width={46} delay="0.12s" />
                </div>
              </div>
              <div className="rounded-3xl border border-gray-100 bg-white p-6">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-bold text-gray-900">Recent activity</p>
                  <span className="text-[11px] font-semibold text-brand-dark">See all</span>
                </div>
                <div className="mt-3 space-y-2.5">
                  {ACTIVITY.map((row) => (
                    <div key={row.name} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                        <row.icon size={14} className="text-gray-500" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-gray-900">
                          {row.name}
                        </span>
                        <span className="block text-[11px] text-gray-400">{row.cat}</span>
                      </span>
                      <span
                        className={`text-[13px] font-bold tabular-nums ${
                          row.expense ? "text-gray-900" : "text-brand-dark"
                        }`}
                      >
                        {row.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <p className="mt-5 text-center text-[12px] text-gray-400">
          Illustrative preview: the real dashboard is built from your own data.
        </p>
      </Reveal>
    </section>
  );
}

export default DashboardPreview;
