import type { AcademicLevel } from "../../../types";
import { getCategoryMeta } from "../../../utils/categoryMeta";
import { OptionCard } from "../OptionCard";

const LEVELS: AcademicLevel[] = [
  "100 Level",
  "200 Level",
  "300 Level",
  "400 Level",
  "Postgraduate",
  "Other",
];

interface PersonalInfoStepProps {
  fullName: string;
  academicLevel: AcademicLevel | "";
  onChange: (update: { fullName?: string; academicLevel?: AcademicLevel | "" }) => void;
}

/** Onboarding page 1: name and academic level. */
export function PersonalInfoStep({ fullName, academicLevel, onChange }: PersonalInfoStepProps) {
  return (
    <div>
      <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
        Full name
      </label>
      <input
        id="fullName"
        type="text"
        value={fullName}
        onChange={(event) => onChange({ fullName: event.target.value })}
        placeholder="Your name"
        className="mt-2 h-12 w-full max-w-md rounded-xl border border-line bg-white px-4 text-sm outline-none transition focus:border-brand"
      />

      <p className="mt-6 text-sm font-medium text-slate-700">Academic level</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {LEVELS.map((level) => {
          const meta = getCategoryMeta(level);
          return (
            <OptionCard
              key={level}
              label={level}
              icon={meta.icon}
              selected={academicLevel === level}
              onToggle={() => onChange({ academicLevel: academicLevel === level ? "" : level })}
            />
          );
        })}
      </div>
    </div>
  );
}

export default PersonalInfoStep;
