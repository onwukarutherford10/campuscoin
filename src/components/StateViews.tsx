import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Small line icon in the tinted circle; defaults to a generic inbox. */
  icon?: LucideIcon;
}

/** Friendly message shown when a section has no data yet. */
export function EmptyState({ title, description, actionLabel, onAction, icon: Icon = Inbox }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-white px-6 py-10 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
        <Icon size={22} strokeWidth={1.6} />
      </span>
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-gray-500">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  onRetry: () => void;
}

/** Calm, non-technical failure message with a retry action. */
export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-white px-6 py-10 text-center">
      <p className="text-sm font-medium text-gray-900">We couldn't load this section.</p>
      <p className="mt-1 text-[13px] text-gray-500">Check your connection and try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
      >
        Try again
      </button>
    </div>
  );
}

interface CardProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Shared white surface used by every dashboard section. */
export function Card({ title, action, children, className = "" }: CardProps) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(16,24,20,0.05)] ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
