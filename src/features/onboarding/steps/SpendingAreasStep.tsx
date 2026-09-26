import type { SpendingCategory } from "../../../types";
import { getCategoryMeta } from "../../../utils/categoryMeta";
import { OptionCard } from "../OptionCard";
import type { OnboardingOption } from "./IncomeSourcesStep";

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
  selected: string[];
  onToggle: (category: string) => void;
  options?: OnboardingOption[];
}

/** Onboarding page 5: spending categories that matter most (multi-select). */
export function SpendingAreasStep({ selected, onToggle, options }: SpendingAreasStepProps) {
  const choices = options ?? CATEGORIES.map((name) => ({ id: name, name }));
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {choices.map((category) => {
          const meta = getCategoryMeta(category.name);
          return (
            <OptionCard
              key={category.id}
              label={category.name}
              icon={meta.icon}
              selected={selected.includes(category.id)}
              onToggle={() => onToggle(category.id)}
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
