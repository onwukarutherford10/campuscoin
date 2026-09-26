import { Accessibility, FileSpreadsheet, ShieldCheck, Sparkles } from "lucide-react";
import { Reveal } from "./Motion";

const PRINCIPLES = [
  {
    icon: ShieldCheck,
    title: "Your data stays on your device",
    body: "Campus Coin keeps everything in your own browser: no bank connection and no hidden data sharing.",
  },
  {
    icon: FileSpreadsheet,
    title: "No bank account needed",
    body: "Add money manually or bulk-import with CSV. Track real spending without linking anything.",
  },
  {
    icon: Sparkles,
    title: "Insights you can act on",
    body: "Every insight is generated from your activity and written in plain language: no jargon, no hype.",
  },
  {
    icon: Accessibility,
    title: "Accessible on every screen",
    body: "Keyboard-friendly, screen-reader labelled and fully responsive, from phone to desktop.",
  },
];

/** About / trust section — honest product principles instead of invented stats. */
export function TrustAbout() {
  return (
    <section id="about" className="bg-white px-6 py-24 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-[12px] font-bold text-brand-dark">
              About Campus Coin
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="font-display mt-6 text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl">
              Built like a real
              <br />
              financial product.
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-gray-500 sm:text-base">
              Campus Coin pairs a fintech-grade design system with student-scale money: honest,
              private and easy to audit.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {PRINCIPLES.map((principle, index) => (
            <Reveal key={principle.title} delay={index * 0.08}>
              <div className="lift h-full rounded-3xl border border-gray-200/70 bg-gray-100/60 p-7 hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.16)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-mint shadow-sm">
                  <principle.icon size={19} />
                </span>
                <h3 className="font-display mt-5 text-lg font-bold text-gray-900">
                  {principle.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{principle.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrustAbout;
