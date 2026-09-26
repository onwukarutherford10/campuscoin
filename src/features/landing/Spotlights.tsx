import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, CheckCircle2, FileDown, Sparkles, Wand2 } from "lucide-react";
import { CountUp, Reveal } from "./Motion";
import { RingProgress, TrendChart } from "./WidgetParts";

/** Types "Restaurant" and reveals the category suggestion — mirrors the real form behaviour. */
function TypingSuggestMock() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [text, setText] = useState(reduced ? "Restaurant" : "");
  const [chip, setChip] = useState(reduced);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          io.disconnect();
          const word = "Restaurant";
          let index = 0;
          const interval = window.setInterval(() => {
            index += 1;
            setText(word.slice(0, index));
            if (index >= word.length) {
              window.clearInterval(interval);
              window.setTimeout(() => setChip(true), 450);
            }
          }, 110);
          timers.current.push(interval);
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  const timers = useRef<number[]>([]);
  useEffect(() => {
    const list = timers.current;
    return () => {
      list.forEach((id) => {
        window.clearInterval(id);
        window.clearTimeout(id);
      });
    };
  }, []);

  return (
    <div ref={ref} className="rounded-2xl bg-white p-6 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.18)] ring-1 ring-gray-200/70">
      <p className="text-[12px] font-semibold text-gray-500">New expense</p>

      <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3">
        <span className="text-[11px] text-gray-400">Description</span>
        <p className="mt-0.5 flex items-center text-sm font-medium text-gray-900">
          {text}
          <span className="ml-0.5 h-4 w-0.5 animate-pulse bg-brand" aria-hidden="true" />
        </p>
      </div>

      <div className="mt-3 min-h-[44px]">
        {chip && (
          <span className="pop-in inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-2 text-[12px] font-bold text-brand-dark ring-1 ring-brand/20">
            <Wand2 size={13} />
            Suggested category: Food
            <span className="rounded-full bg-brand px-2.5 py-0.5 text-[11px] text-white">Use</span>
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
        <span className="text-[12px] text-gray-500">Category</span>
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-gray-900">
          <CheckCircle2 size={14} className="text-brand-dark" />
          Food
        </span>
      </div>
      <p className="mt-3 text-[11px] leading-snug text-gray-400">
        Correct it once and Campus Coin learns your wording for next time.
      </p>
    </div>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <li className="flex items-center gap-2.5 text-[14px] font-medium text-gray-700">
      <CheckCircle2 size={16} className="shrink-0 text-brand-dark" />
      {children}
    </li>
  );
}

/** Three alternating spotlights: expense tracking, saving, insights. */
export function Spotlights() {
  return (
    <>
      {/* ── Expense tracking ── */}
      <section className="bg-white px-6 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-[12px] font-bold text-brand-dark">
              Expense tracking
            </span>
            <h2 className="font-display mt-5 text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl">
              Know where every
              <br />
              naira goes.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
              Add an expense and Campus Coin suggests the category while you type. Correct it once
              and it learns, or bulk-import months of records with CSV and review every suggestion.
            </p>
            <ul className="mt-6 space-y-3">
              <Bullet>Category suggested as you type</Bullet>
              <Bullet>Learns from your corrections</Bullet>
              <Bullet>CSV batch import with smart suggestions</Bullet>
            </ul>
          </Reveal>
          <Reveal delay={0.12}>
            <TypingSuggestMock />
          </Reveal>
        </div>
      </section>

      {/* ── Saving ── */}
      <section className="bg-canvas px-6 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal className="lg:order-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-[12px] font-bold text-brand-dark">
              Saving
            </span>
            <h2 className="font-display mt-5 text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl">
              Turn small habits into
              <br />
              meaningful progress.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
              Set a target once and track it against real cash flow. Campus Coin shows exactly how
              far you are from the goal and whether you're on pace for the month.
            </p>
            <ul className="mt-6 space-y-3">
              <Bullet>Goal set during onboarding</Bullet>
              <Bullet>Live progress from your activity</Bullet>
              <Bullet>On-track status at a glance</Bullet>
            </ul>
          </Reveal>
          <Reveal delay={0.12} className="lg:order-1">
            <div className="mx-auto max-w-md rounded-[2rem] bg-white p-8 shadow-[0_32px_64px_-32px_rgba(0,0,0,0.25)] ring-1 ring-gray-200/70">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">Savings goal</p>
                <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand-dark">
                  On track
                </span>
              </div>
              <div className="mt-6 flex flex-col items-center">
                <RingProgress percent={60} label="60% of goal" />
                <p className="font-display mt-4 text-3xl font-bold text-gray-900">
                  <CountUp to={15000} prefix="₦" />
                </p>
                <p className="text-xs text-gray-400">of ₦25,000 target</p>
              </div>
              <div className="mt-6 space-y-2 border-t border-gray-100 pt-4">
                {[
                  { week: "This week", amount: "+₦2,500" },
                  { week: "Last week", amount: "+₦3,000" },
                  { week: "Week 3", amount: "+₦2,000" },
                ].map((row) => (
                  <div key={row.week} className="flex items-center justify-between text-[13px]">
                    <span className="text-gray-500">{row.week}</span>
                    <span className="flex items-center gap-1 font-bold text-brand-dark">
                      <ArrowDownToLine size={13} />
                      {row.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Insights ── */}
      <section className="bg-white px-6 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-[12px] font-bold text-brand-dark">
              Insights &amp; reports
            </span>
            <h2 className="font-display mt-5 text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl">
              Understand your
              <br />
              financial behavior.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
              Weekly insights compare your activity, spot categories that grew, and suggest
              realistic next steps. Export any month as a PDF or image report.
            </p>
            <ul className="mt-6 space-y-3">
              <Bullet>Weekly, plain-language insights</Bullet>
              <Bullet>Saving tips you can act on</Bullet>
              <Bullet>PDF &amp; image report exports</Bullet>
            </ul>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="mx-auto max-w-md space-y-4">
              <div className="rounded-3xl bg-brand-soft p-6 ring-1 ring-brand/15">
                <span className="flex items-center gap-2 text-[12px] font-bold text-brand-dark">
                  <Sparkles size={14} />
                  Monthly insight
                </span>
                <p className="font-display mt-2 text-lg font-bold leading-snug text-gray-900">
                  You spent 18% less on transport this month. That's ₦3,400 kept in your pocket.
                </p>
                <div className="mt-4 rounded-2xl bg-white/80 p-4">
                  <p className="text-[11px] font-semibold text-gray-500">Spending trend</p>
                  <TrendChart className="mt-1" />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-ink p-5 shadow-xl">
                <span className="flex items-center gap-3 text-[13px] font-semibold text-white">
                  <FileDown size={16} className="text-mint" />
                  Export September report
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-mint ring-1 ring-white/15">
                  PDF · Image
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

export default Spotlights;
