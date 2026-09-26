import { useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Bus, PiggyBank, TrendingUp, Utensils, Wallet } from "lucide-react";
import { PhoneDevice } from "./PhoneDevice";
import { usePrefersReducedMotion, useStoryProgress } from "./storyHooks";

const SCREEN_LABELS = ["Balance", "Activity", "Categories", "Savings", "Insights", "Budgets"];

interface FloaterProps {
  className: string;
  /** Parallax depth in px — negative rises, positive drifts down. */
  depth: number;
  slow?: boolean;
  children: ReactNode;
}

function Floater({ className, depth, slow = false, children }: FloaterProps) {
  return (
    <div
      className={`floater absolute z-10 hidden sm:block ${className}`}
      style={{ "--fd": `${depth}px` } as CSSProperties}
    >
      <div className={slow ? "float-soft-slow" : "float-soft"}>{children}</div>
    </div>
  );
}

/** Floating financial widgets that parallax at different speeds. */
function StoryFloaters() {
  const card = "rounded-2xl bg-white/8 px-4 py-3 shadow-2xl ring-1 ring-white/12 backdrop-blur-md";
  return (
    <>
      <Floater className="left-[4%] top-[26%]" depth={-90}>
        <div className={card}>
          <span className="flex items-center gap-1.5 text-[11px] text-white/55">
            <Wallet size={12} className="text-mint" />
            Monthly spending
          </span>
          <p className="font-display mt-1 text-xl font-bold text-white">₦16,800</p>
        </div>
      </Floater>

      <Floater className="right-[4%] top-[22%]" depth={-150} slow>
        <div className={card}>
          <span className="text-[11px] text-white/55">Saved this month</span>
          <p className="font-display mt-1 text-xl font-bold text-white">₦15,000</p>
          <span className="mt-1.5 flex w-fit items-center gap-1 rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-bold text-mint">
            <TrendingUp size={10} />
            12% saved
          </span>
        </div>
      </Floater>

      <Floater className="left-[7%] top-[56%]" depth={70}>
        <span className="flex items-center gap-2 rounded-full bg-white/8 px-4 py-2.5 text-[12px] font-semibold text-white ring-1 ring-white/12 backdrop-blur-md">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mint/20 text-mint">
            <Utensils size={12} />
          </span>
          Food · ₦7,200
        </span>
      </Floater>

      <Floater className="right-[6%] top-[50%]" depth={-60} slow>
        <div className={card}>
          <span className="text-[11px] text-white/55">Budget remaining</span>
          <p className="font-display mt-1 text-xl font-bold text-white">₦7,800</p>
          <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[64%] rounded-full bg-mint" />
          </div>
        </div>
      </Floater>

      <Floater className="left-[12%] bottom-[13%]" depth={110}>
        <span className="flex items-center gap-2 rounded-full bg-white/8 px-4 py-2.5 text-[12px] font-medium text-white/80 ring-1 ring-white/12 backdrop-blur-md">
          <Bus size={13} className="text-mint" />
          8 transactions this week
        </span>
      </Floater>

      <Floater className="right-[11%] bottom-[17%]" depth={-110} slow>
        <span className="flex items-center gap-2 rounded-full bg-mint px-4 py-2.5 text-[12px] font-bold text-ink shadow-[0_12px_30px_-8px_rgba(110,231,158,0.6)]">
          <PiggyBank size={14} />
          On track · 3 budgets healthy
        </span>
      </Floater>
    </>
  );
}

/** Progress dots + current screen label, revealed once the story starts. */
function ScreenDots({ screen }: { screen: number }) {
  return (
    <div className="story-dots absolute inset-x-0 bottom-5 z-20 flex items-center justify-center gap-3">
      <div className="flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 ring-1 ring-white/10 backdrop-blur-md">
        {SCREEN_LABELS.map((label, index) => (
          <span
            key={label}
            aria-hidden="true"
            className={`h-1.5 rounded-full transition-all duration-500 ${
              index === screen ? "w-5 bg-mint" : "w-1.5 bg-white/25"
            }`}
          />
        ))}
      </div>
      <span className="text-[11px] font-semibold text-white/70">{SCREEN_LABELS[screen]}</span>
    </div>
  );
}

/**
 * Level-3 motion: the pinned, scrub-driven product story that follows the
 * hero. The phone rises and rotates into focus, six real Campus Coin
 * screens crossfade as you scroll, widgets parallax at different speeds
 * and the glow shifts — driven by one smoothed `--p` progress value.
 */
export function PhoneStory() {
  const trackRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const screen = useStoryProgress(trackRef, pinRef, !reduced);

  if (reduced) {
    // Static, fully accessible composition — no pinning or scrubbing.
    return (
      <section
        aria-label="Campus Coin product tour"
        className="relative overflow-hidden bg-night text-white"
      >
        <div aria-hidden="true" className="hero-grid absolute inset-0" />
        <div
          aria-hidden="true"
          className="absolute inset-x-[-20%] top-[-16%] h-[46%]"
          style={{
            background:
              "radial-gradient(52% 90% at 50% -4%, rgba(110,231,158,0.80) 0%, rgba(110,231,158,0.28) 46%, transparent 76%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-[-30%] h-[60vh]"
          style={{
            background:
              "radial-gradient(55% 95% at 50% 112%, rgba(110,231,158,0.55) 0%, rgba(110,231,158,0.16) 48%, transparent 78%)",
          }}
        />
        <div className="relative z-10 flex justify-center px-6 py-20">
          <PhoneDevice screen={0} />
        </div>
        <StoryFloaters />
      </section>
    );
  }

  return (
    <section
      ref={trackRef}
      aria-label="Campus Coin product tour"
      className="story-track relative bg-night text-white"
    >
      <div ref={pinRef} className="story-pin sticky top-0 h-[100svh] overflow-hidden">
        {/* Ambient texture + glow */}
        <div aria-hidden="true" className="hero-grid absolute inset-0 z-0" />
        <div
          aria-hidden="true"
          className="absolute inset-x-[-20%] top-[-16%] z-0 h-[46%]"
          style={{
            background:
              "radial-gradient(52% 90% at 50% -4%, rgba(110,231,158,0.80) 0%, rgba(110,231,158,0.28) 46%, transparent 76%)",
          }}
        />
        <div
          aria-hidden="true"
          className="story-glow absolute inset-x-[-12%] bottom-[-38%] z-0 h-[80vh]"
          style={{
            background:
              "radial-gradient(55% 95% at 50% 112%, rgba(110,231,158,0.6) 0%, rgba(110,231,158,0.18) 48%, transparent 78%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -right-40 top-1/3 z-0 h-96 w-96 rounded-full bg-brand/25 blur-3xl"
        />

        {/* Floating financial widgets */}
        <StoryFloaters />

        {/* The product */}
        <div className="absolute inset-0 z-10 flex items-center justify-center pb-6 sm:pb-0">
          <div className="story-phone pointer-events-auto">
            <PhoneDevice screen={screen} />
          </div>
        </div>

        <ScreenDots screen={screen} />
      </div>
    </section>
  );
}

export default PhoneStory;
