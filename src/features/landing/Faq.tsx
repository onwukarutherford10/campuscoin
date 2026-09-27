import { Plus } from "lucide-react";
import { Reveal } from "./Motion";

const ITEMS = [
  {
    q: "What is Campus Coin?",
    a: "Campus Coin is a money tracker built for students. It helps you log expenses, set monthly budgets, work toward savings goals and read plain-language insights about your spending, all from one dashboard.",
  },
  {
    q: "Do I need to link my bank account?",
    a: "No. You add income and expenses yourself in a few taps, or bulk-import your records with CSV. Nothing connects to a bank, so nothing can move money without you.",
  },
  {
    q: "How does category suggestion work?",
    a: "As you type a description, Campus Coin suggests the most likely category based on what it has learned. High-confidence matches are selected for you; uncertain ones come as a one-tap chip. You can always override a suggestion, and every correction teaches it.",
  },
  {
    q: "Can I set budgets and track progress?",
    a: "Yes. Give any category a monthly limit and watch live progress bars, percentages and alerts as the month goes on, before you overspend, not after.",
  },
  {
    q: "Can I export my data?",
    a: "You can import transactions in CSV and export monthly reports as PDF or images from the Reports page, so your records travel with you.",
  },
  {
    q: "Where is my data stored?",
    a: "In this build, your data is stored locally in your browser on your own device. Nothing is uploaded to a server.",
  },
];

/** FAQ accordion using native <details> for free keyboard + screen-reader support. */
export function Faq() {
  return (
    <section id="faq" className="bg-canvas px-6 py-24 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-[12px] font-bold text-brand-dark">
              FAQ
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="font-display mt-6 text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl">
              Questions, answered.
            </h2>
          </Reveal>
        </div>

        <div className="mt-12 space-y-4">
          {ITEMS.map((item, index) => (
            <Reveal key={item.q} delay={index * 0.06}>
              <details className="group rounded-2xl border border-gray-200/80 bg-white p-5 transition hover:border-brand/40 open:shadow-[0_16px_32px_-20px_rgba(0,0,0,0.18)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-[15px] font-bold text-gray-900 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-dark transition duration-300 group-open:rotate-45">
                    <Plus size={15} />
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Faq;
