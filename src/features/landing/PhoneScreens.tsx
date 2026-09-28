import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  Bus,
  Lightbulb,
  MonitorPlay,
  PiggyBank,
  Search,
  Sparkles,
  TrendingUp,
  Utensils,
  Wallet,
} from "lucide-react";
import { LogoGlyph } from "../../components/BrandMark";
import type { CSSProperties } from "react";

/** Shared app header used at the top of every screen. */
function ScreenHeader({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2">
        <LogoGlyph />
        <span className="text-[13px] font-bold text-gray-900">{title}</span>
      </span>
      <span className="flex items-center gap-2">
        {action ? (
          <span className="text-[10px] font-semibold text-brand-dark">{action}</span>
        ) : null}
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-500">
          <Search size={11} />
        </span>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-500">
          <Bell size={11} />
        </span>
      </span>
    </div>
  );
}

/** Screen 1 — balance overview. */
export function BalanceScreen() {
  return (
    <div className="flex h-full flex-col gap-4 px-5 py-4">
      <ScreenHeader title="Campus Coin" />
      <div className="text-center">
        <p className="text-[11px] text-gray-500">Current balance</p>
        <p className="font-display text-[34px] font-bold leading-tight tracking-tight text-gray-900">
          ₦128,500
        </p>
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand-dark">
          <TrendingUp size={11} />
          ₦50,000 income · +2.5%
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <span className="flex items-center justify-center gap-1.5 rounded-xl bg-ink py-2.5 text-[12px] font-semibold text-white">
          <ArrowDownToLine size={13} />
          Add income
        </span>
        <span className="flex items-center justify-center gap-1.5 rounded-xl bg-ink py-2.5 text-[12px] font-semibold text-white">
          <ArrowUpFromLine size={13} />
          Add expense
        </span>
      </div>
      <div className="mt-auto">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold text-gray-900">My budgets</p>
          <span className="text-[11px] font-medium text-brand-dark">See all</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2.5">
          {[
            { label: "Food", icon: Utensils, spent: "₦11,900", width: 85 },
            { label: "Transport", icon: Bus, spent: "₦2,300", width: 46 },
          ].map(({ label, icon: Icon, spent, width }) => (
            <div key={label} className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                <Icon size={12} className="text-brand-dark" />
                {label}
              </span>
              <p className="mt-0.5 text-sm font-bold text-gray-900">{spent}</p>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-brand" style={{ width: `${width}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Screen 2 — expense tracking / recent transactions. */
export function TransactionsScreen() {
  const rows = [
    { name: "Restaurant", cat: "Food", icon: Utensils, date: "Today", amount: "-₦1,500", expense: true },
    { name: "Uber trip", cat: "Transport", icon: Bus, date: "Today", amount: "-₦800", expense: true },
    { name: "Netflix", cat: "Subscriptions", icon: MonitorPlay, date: "Yesterday", amount: "-₦1,200", expense: true },
    { name: "Campus cafe", cat: "Food", icon: Utensils, date: "Mon", amount: "-₦900", expense: true },
    { name: "Allowance", cat: "Income", icon: Wallet, date: "Mon", amount: "+₦50,000", expense: false },
  ];
  return (
    <div className="flex h-full flex-col px-5 py-4">
      <ScreenHeader title="Recent transactions" action="See all" />
      <div className="mt-3 space-y-1">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center gap-2.5 rounded-xl px-1 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <row.icon size={13} className="text-gray-500" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-semibold text-gray-900">{row.name}</span>
              <span className="block text-[10px] text-gray-400">
                {row.cat} · {row.date}
              </span>
            </span>
            <span
              className={`text-[12px] font-bold tabular-nums ${
                row.expense ? "text-gray-900" : "text-brand-dark"
              }`}
            >
              {row.amount}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-auto border-t border-gray-100 pt-3 text-center text-[11px] text-gray-400">
        8 transactions this week
      </p>
    </div>
  );
}

/** Screen 3 — spending by category. */
export function CategoriesScreen() {
  const bars = [
    { label: "Food", value: "₦7,200", width: 45, color: "bg-brand", delay: "0s" },
    { label: "Transport", value: "₦3,500", width: 22, color: "bg-brand/70", delay: "0.1s" },
    { label: "Subscriptions", value: "₦2,900", width: 17, color: "bg-mint", delay: "0.2s" },
    { label: "Hostel", value: "₦3,200", width: 16, color: "bg-ink", delay: "0.3s" },
  ];
  return (
    <div className="flex h-full flex-col px-5 py-4">
      <ScreenHeader title="Spending by category" />
      <span className="mt-1 inline-block w-fit rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
        September
      </span>
      <div className="mt-4 space-y-3.5">
        {bars.map((bar) => (
          <div key={bar.label}>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-semibold text-gray-900">{bar.label}</span>
              <span className="text-[11px] font-bold tabular-nums text-gray-500">{bar.value}</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`bar-grow h-full rounded-full ${bar.color}`}
                style={{ width: `${bar.width}%`, "--bar-delay": bar.delay } as CSSProperties}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto rounded-2xl bg-brand-soft p-3.5">
        <p className="text-[11px] font-semibold text-brand-dark">Food takes 45% of your spending</p>
        <p className="mt-0.5 text-[11px] leading-snug text-brand-dark/70">
          Cooking twice a week at home could free up about ₦2,000.
        </p>
      </div>
    </div>
  );
}

/** Screen 4 — savings progress. */
export function SavingsScreen() {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * 0.4; /* 60% filled */
  return (
    <div className="flex h-full flex-col px-5 py-4">
      <ScreenHeader title="Savings goal" />
      <div className="mt-2 flex flex-col items-center">
        <div className="relative h-32 w-32">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="rgb(38 153 83)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              className="ring-progress"
              style={
                {
                  "--ring-full": circumference,
                  "--ring-off": offset,
                } as CSSProperties
              }
            />
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-bold text-gray-900">60%</span>
            <span className="text-[10px] text-gray-400">of goal</span>
          </span>
        </div>
        <p className="mt-3 font-display text-xl font-bold text-gray-900">₦15,000</p>
        <p className="text-[11px] text-gray-400">of ₦25,000 goal</p>
        <span className="mt-2 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand-dark">
          On track · ₦2,500 added this week
        </span>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100">
          <p className="text-[10px] text-gray-400">To go</p>
          <p className="text-sm font-bold text-gray-900">₦10,000</p>
        </div>
        <div className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100">
          <p className="text-[10px] text-gray-400">Weekly avg.</p>
          <p className="text-sm font-bold text-gray-900">₦2,500</p>
        </div>
      </div>
    </div>
  );
}

/** Screen 5 — financial insights. */
export function InsightsScreen() {
  return (
    <div className="flex h-full flex-col gap-3 px-5 py-4">
      <ScreenHeader title="Insights" />
      <div className="rounded-2xl bg-brand-soft p-3.5">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-brand-dark">
          <Sparkles size={12} />
          This week
        </span>
        <p className="mt-1.5 text-[13px] font-semibold leading-snug text-gray-900">
          You spent 18% less on transport than last week.
        </p>
        <p className="mt-1 text-[11px] leading-snug text-gray-500">
          That's ₦1,200 back in your pocket. Keep it going.
        </p>
      </div>
      <div className="rounded-2xl bg-white p-3.5 ring-1 ring-gray-100">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-900">
          <Lightbulb size={12} className="text-brand-dark" />
          Saving tip
        </span>
        <p className="mt-1.5 text-[11px] leading-snug text-gray-500">
          Move ₦500 to your savings goal before Friday to stay on track for the month.
        </p>
      </div>
      <div className="mt-auto flex items-center justify-between rounded-2xl bg-gray-50 px-3.5 py-3 ring-1 ring-gray-100">
        <span className="text-[11px] text-gray-500">Top category</span>
        <span className="flex items-center gap-1.5 text-[12px] font-bold text-gray-900">
          <Utensils size={12} className="text-brand-dark" />
          Food · 45%
        </span>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-3.5 py-3 ring-1 ring-gray-100">
        <span className="text-[11px] text-gray-500">Budget status</span>
        <span className="flex items-center gap-1.5 text-[12px] font-bold text-gray-900">
          <PiggyBank size={12} className="text-brand-dark" />
          On track
        </span>
      </div>
    </div>
  );
}

/** Screen 6 — budgets / progress view. */
export function BudgetsScreen() {
  const budgets = [
    { label: "Food", spent: "₦11,900", limit: "₦14,000", width: 85, status: "85%", warn: true },
    { label: "Transport", spent: "₦2,300", limit: "₦5,000", width: 46, status: "46%", warn: false },
    { label: "Entertainment", spent: "₦2,000", limit: "₦5,000", width: 40, status: "40%", warn: false },
  ];
  return (
    <div className="flex h-full flex-col px-5 py-4">
      <ScreenHeader title="Monthly budgets" action="See all" />
      <span className="mt-1 inline-block w-fit rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
        September
      </span>
      <div className="mt-4 space-y-4">
        {budgets.map((budget) => (
          <div key={budget.label}>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-semibold text-gray-900">{budget.label}</span>
              <span className="text-[11px] font-bold tabular-nums text-gray-500">
                {budget.spent}
                <span className="font-normal text-gray-400"> / {budget.limit}</span>
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`bar-grow h-full rounded-full ${budget.warn ? "bg-warning" : "bg-brand"}`}
                  style={{ width: `${budget.width}%` }}
                />
              </div>
              <span
                className={`w-9 text-right text-[10px] font-bold ${
                  budget.warn ? "text-warning" : "text-brand-dark"
                }`}
              >
                {budget.status}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto rounded-2xl bg-ink p-3.5">
        <p className="text-[11px] text-white/60">Left this month</p>
        <p className="font-display text-lg font-bold text-white">₦7,800</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[64%] rounded-full bg-mint" />
        </div>
      </div>
    </div>
  );
}
