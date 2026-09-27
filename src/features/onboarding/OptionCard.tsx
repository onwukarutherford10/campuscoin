import { Check } from "lucide-react";
import type { ComponentType } from "react";

interface OptionCardProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
  /** Real-world line icon shown above the label. */
  icon?: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

/**
 * Selectable card used across onboarding steps, styled after the design
 * reference: white card, thin real-world line icon, a faint radio circle that
 * turns into an emerald check when selected (never colour alone).
 */
export function OptionCard({ label, selected, onToggle, icon: Icon }: OptionCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`relative flex min-h-[112px] w-full flex-col items-center justify-center gap-3 rounded-xl border px-3 py-5 text-center text-[13px] transition ${
        selected
          ? "border-brand bg-brand-soft/50 font-medium text-brand"
          : "border-line bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className="absolute right-2.5 top-2.5" aria-hidden="true">
        {selected ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check size={12} strokeWidth={3} />
          </span>
        ) : (
          <span className="block h-4 w-4 rounded-full border border-slate-200" />
        )}
      </span>

      {Icon && (
        <Icon size={28} strokeWidth={1.5} className={selected ? "text-brand" : "text-slate-400"} />
      )}

      {label}
    </button>
  );
}

export default OptionCard;
