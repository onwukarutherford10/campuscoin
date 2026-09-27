import type { SpendingCategory } from "../../../types";
import { getCategoryMeta } from "../../../utils/categoryMeta";
import { OptionCard } from "../OptionCard";

const CATEGORIES: SpendingCategory[] = [
  "Food",
  "Transport",
  "Hostel/Rent",
  "Academics",
  "Subscriptions",
  "Entertainment",
  "Miscellaneous",
];

interface SpendingAreasStepProps {
  selected: SpendingCategory[];
  onToggle: (category: SpendingCategory) => void;
}

/** Onboarding page 5: spending categories that matter most (multi-select). */
export function SpendingAreasStep({ selected, onToggle }: SpendingAreasStepProps) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CATEGORIES.map((category) => {
          const meta = getCategoryMeta(category);
          return (
            <OptionCard
              key={category}
              label={category}
              icon={meta.icon}
              selected={selected.includes(category)}
              onToggle={() => onToggle(category)}
            />
          );
        })}
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-slate-500">
        Pick the areas you want more visibility into. No amounts needed here.
      </p>
    </div>
  );
}

export default SpendingAreasStep;
