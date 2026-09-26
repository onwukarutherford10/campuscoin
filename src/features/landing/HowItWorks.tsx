import { Reveal } from "./Motion";

const STEPS = [
  {
    number: "01",
    title: "Create your account",
    body: "Sign up with your email, verify the 6-digit code and tell us about your student life.",
  },
  {
    number: "02",
    title: "Track your spending",
    body: "Add expenses in seconds. Categories are suggested as you type and learned from your corrections.",
  },
  {
    number: "03",
    title: "Set budgets & goals",
    body: "Give every category a monthly limit and pick a savings target worth showing up for.",
  },
  {
    number: "04",
    title: "Understand your progress",
    body: "Watch budgets update live and read plain-language insights built from your own activity.",
  },
];

/** Dark, cinematic four-step process with a connecting progress line. */
export function HowItWorks() {
  return (
    <section id="how" className="relative overflow-hidden bg-night px-6 py-24 text-white sm:py-28">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-72 w-[70vw] -translate-x-1/2 rounded-full bg-brand/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-[12px] font-bold text-mint ring-1 ring-mint/25">
              How it works
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="font-display mt-6 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              From signup to clarity
              <br />
              in four steps.
            </h2>
          </Reveal>
        </div>

        {/* Connecting line (draws in on reveal) */}
        <div className="relative mt-16 hidden h-px w-full md:block">
          <div className="bar-grow h-px w-full bg-gradient-to-r from-transparent via-mint/50 to-transparent" />
        </div>

        <ol className="mt-10 grid gap-10 md:grid-cols-4 md:gap-6">
          {STEPS.map((step, index) => (
            <li key={step.number}>
              <Reveal delay={index * 0.1} className="h-full">
                <span className="font-display inline-block text-5xl font-bold leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(110,231,158,0.7)] sm:text-6xl">
                  {step.number}
                </span>
                <span
                  aria-hidden="true"
                  className="mt-5 block h-2.5 w-2.5 rounded-full bg-mint shadow-[0_0_18px_rgba(110,231,158,0.9)]"
                />
                <h3 className="font-display mt-4 text-lg font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{step.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default HowItWorks;
