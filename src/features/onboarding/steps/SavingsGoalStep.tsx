import { useState, type ChangeEvent } from "react";
import { Check } from "lucide-react";

interface SavingsGoalStepProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

/**
 * Onboarding page 4: monthly savings target, with a non-blocking opt-out.
 * The amount input always stays usable; "I'll decide later" is a real toggle.
 */
export function SavingsGoalStep({ value, onChange }: SavingsGoalStepProps) {
  const [decideLater, setDecideLater] = useState(false);

  function handleLater() {
    const next = !decideLater;
    setDecideLater(next);
    if (next) onChange(null);
  }

  function handleAmount(event: ChangeEvent<HTMLInputElement>) {
    setDecideLater(false);
    onChange(event.target.value === "" ? null : Number(event.target.value));
  }

  return (
    <div className="max-w-md">
      <label htmlFor="savingsGoal" className="text-sm font-medium text-gray-700">
        Set a monthly amount you would like to save
      </label>
      <div
        className={`mt-2 flex h-12 items-center rounded-xl border bg-white px-4 transition ${
          decideLater ? "border-line opacity-60" : "border-line focus-within:border-brand"
        }`}
      >
        <span className="mr-2 text-sm text-gray-400" aria-hidden="true">
          &#8358;
        </span>
        <input
          id="savingsGoal"
          type="number"
          min={0}
          inputMode="numeric"
          disabled={decideLater}
          value={value ?? ""}
          onChange={handleAmount}
          placeholder="e.g. 10,000"
          className="h-full w-full bg-transparent text-sm outline-none disabled:cursor-not-allowed"
        />
      </div>

      <button
        type="button"
        aria-pressed={decideLater}
        onClick={handleLater}
        className={`mt-4 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
          decideLater ? "border-brand bg-brand-soft font-medium text-brand-dark" : "border-line bg-white text-gray-600"
        }`}
      >
        I'll decide later
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-full ${
            decideLater ? "bg-brand text-white" : "border border-gray-300 text-transparent"
          }`}
          aria-hidden="true"
        >
          <Check size={10} strokeWidth={3} />
        </span>
      </button>
      <p className="mt-3 text-[13px] leading-relaxed text-gray-500">
        Type an amount above, or tap this to skip. You can change it any time.
      </p>
    </div>
  );
}

export default SavingsGoalStep;
