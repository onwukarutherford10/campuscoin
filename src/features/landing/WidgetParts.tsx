import type { CSSProperties } from "react";

interface TrendChartProps {
  className?: string;
}

/** Green line chart that draws itself in when its `.reveal` parent enters view. */
export function TrendChart({ className = "" }: TrendChartProps) {
  return (
    <svg
      viewBox="0 0 260 84"
      className={`w-full ${className}`}
      role="img"
      aria-label="Weekly spending trend"
    >
      <line x1="0" y1="28" x2="260" y2="28" stroke="#e5e7eb" strokeWidth="1" />
      <line x1="0" y1="56" x2="260" y2="56" stroke="#e5e7eb" strokeWidth="1" />
      <path
        className="chart-line"
        d="M6 70 C 40 68, 54 34, 82 38 S 124 74, 154 60 S 204 24, 254 50"
        fill="none"
        stroke="rgb(38 153 83)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="82" cy="38" r="5" fill="rgb(38 153 83)" stroke="white" strokeWidth="2.5" />
    </svg>
  );
}

interface BudgetBarProps {
  label: string;
  spent: string;
  limit: string;
  width: number;
  warn?: boolean;
  delay?: string;
}

/** Labelled budget progress bar (animated when revealed). */
export function BudgetBar({ label, spent, limit, width, warn = false, delay = "0s" }: BudgetBarProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold text-gray-900">{label}</span>
        <span className="text-[12px] font-bold tabular-nums text-gray-500">
          {spent}
          <span className="font-normal text-gray-400"> / {limit}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`bar-grow h-full rounded-full ${warn ? "bg-warning" : "bg-brand"}`}
          style={{ width: `${width}%`, "--bar-delay": delay } as CSSProperties}
        />
      </div>
    </div>
  );
}

interface RingProgressProps {
  percent: number;
  size?: number;
  label?: string;
  sublabel?: string;
}

/** Animated circular progress ring (60% savings goal by default). */
export function RingProgress({ percent, size = 132, label, sublabel }: RingProgressProps) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
        <circle cx="66" cy="66" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="11" />
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke="rgb(38 153 83)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circumference}
          className="ring-progress"
          style={{ "--ring-full": circumference, "--ring-off": offset } as CSSProperties}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold text-gray-900">{percent}%</span>
        {sublabel ? <span className="text-[11px] text-gray-400">{sublabel}</span> : null}
        {label ? <span className="mt-0.5 text-[11px] font-semibold text-brand-dark">{label}</span> : null}
      </span>
    </div>
  );
}
