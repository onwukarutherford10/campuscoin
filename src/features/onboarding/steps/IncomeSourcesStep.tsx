import type { IncomeSource } from "../../../types";
import { getCategoryMeta } from "../../../utils/categoryMeta";
import { OptionCard } from "../OptionCard";

const SOURCES: IncomeSource[] = [
  "Allowance",
  "Part-time job",
  "Scholarship",
  "Gig or freelance work",
  "Gifts",
  "Other income",
];

export interface OnboardingOption {
  id: string;
  name: string;
}

interface IncomeSourcesStepProps {
  selected: string[];
  onToggle: (source: string) => void;
  options?: OnboardingOption[];
}

/** Onboarding page 2: how the student usually receives money (multi-select). */
export function IncomeSourcesStep({ selected, onToggle, options }: IncomeSourcesStepProps) {
  const choices = options ?? SOURCES.map((name) => ({ id: name, name }));
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {choices.map((option) => {
        const meta = getCategoryMeta(option.name);
        return (
          <OptionCard
            key={option.id}
            label={option.name}
            icon={meta.icon}
            selected={selected.includes(option.id)}
            onToggle={() => onToggle(option.id)}
          />
        );
      })}
    </div>
  );
}

export default IncomeSourcesStep;
