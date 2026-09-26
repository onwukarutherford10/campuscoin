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

interface IncomeSourcesStepProps {
  selected: IncomeSource[];
  onToggle: (source: IncomeSource) => void;
}

/** Onboarding page 2: how the student usually receives money (multi-select). */
export function IncomeSourcesStep({ selected, onToggle }: IncomeSourcesStepProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {SOURCES.map((value) => {
        const meta = getCategoryMeta(value);
        return (
          <OptionCard
            key={value}
            label={value}
            icon={meta.icon}
            selected={selected.includes(value)}
            onToggle={() => onToggle(value)}
          />
        );
      })}
    </div>
  );
}

export default IncomeSourcesStep;
