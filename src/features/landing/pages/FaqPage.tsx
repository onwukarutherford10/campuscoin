import { Link } from "react-router-dom";
import { MessageCircleQuestion } from "lucide-react";
import { PageHero } from "../PageHero";
import { Faq } from "../Faq";
import { CtaBand } from "../CtaBand";
import { Reveal } from "../Motion";
import { usePageTitle } from "../usePageTitle";

/** FAQ (`/faq`) — the full question list on its own page. */
export function FaqPage() {
  usePageTitle("FAQ — Campus Coin");

  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title={
          <>
            Before you <span className="text-mint">ask.</span>
          </>
        }
        subtitle="The questions students ask most, answered plainly — no marketing language."
      />
      <Faq />

      {/* Anything the list misses goes straight to the contact page. */}
      <section className="border-t border-gray-200/70 bg-white px-6 py-16 sm:py-20">
        <Reveal>
          <div className="mx-auto flex max-w-3xl flex-col items-center rounded-[2rem] bg-ink px-6 py-12 text-center text-white sm:px-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-mint ring-1 ring-white/15">
              <MessageCircleQuestion size={22} />
            </span>
            <h2 className="font-display mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
              Still have a question?
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">
              If it isn't in the list above, send it over. We answer feature ideas, bug reports and
              data questions personally.
            </p>
            <Link
              to="/contact"
              className="btn-press mt-7 rounded-full bg-mint px-8 py-3.5 text-sm font-bold text-ink hover:-translate-y-0.5 hover:bg-white"
            >
              Contact us
            </Link>
          </div>
        </Reveal>
      </section>

      <CtaBand />
    </>
  );
}

export default FaqPage;
