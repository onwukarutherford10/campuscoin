import { useEffect, useState } from "react";

/** Tracks the user's reduced-motion preference (live). */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** True once the page has scrolled past `threshold` (sticky nav treatment). */
export function useScrolled(threshold = 16): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        setScrolled(window.scrollY > threshold);
        frame = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return scrolled;
}

const SCREEN_START = 0.15;
const SCREEN_END = 0.85;
const SCREEN_COUNT = 6;

function screenFor(progress: number): number {
  if (progress < SCREEN_START) return 0;
  const span = (SCREEN_END - SCREEN_START) / SCREEN_COUNT;
  return Math.min(SCREEN_COUNT - 1, Math.floor((progress - SCREEN_START) / span));
}

/**
 * Scroll-driven story progress for the pinned phone section.
 * Writes a smoothed 0..1 value to `--p` on the pin element every frame
 * (CSS does the transform math — no per-frame React renders) and returns
 * the discrete phone screen index, only re-rendering when it changes.
 */
export function useStoryProgress(
  trackRef: React.RefObject<HTMLElement | null>,
  pinRef: React.RefObject<HTMLElement | null>,
  enabled: boolean,
): number {
  const [screen, setScreen] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    const pin = pinRef.current;
    if (!track || !pin) return;

    if (!enabled) {
      pin.style.setProperty("--p", "0");
      return;
    }

    let target = 0;
    let current = 0;
    let frame = 0;
    let lastScreen = -1;
    const copy = pin.querySelector<HTMLElement>(".story-copy");

    const tick = () => {
      current += (target - current) * 0.11;
      if (Math.abs(target - current) < 0.0004) current = target;
      pin.style.setProperty("--p", current.toFixed(4));
      if (copy) copy.style.pointerEvents = current > 0.1 ? "none" : "";
      const next = screenFor(current);
      if (next !== lastScreen) {
        lastScreen = next;
        setScreen(next);
      }
      frame = current === target ? 0 : requestAnimationFrame(tick);
    };

    const compute = () => {
      const rect = track.getBoundingClientRect();
      const distance = rect.height - window.innerHeight;
      target = distance <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / distance));
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onScroll = () => compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    compute();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [trackRef, pinRef, enabled]);

  return screen;
}
