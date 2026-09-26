interface MonthlyIncomeStepProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

/** Onboarding page 3: approximate monthly income baseline. */
export function MonthlyIncomeStep({ value, onChange }: MonthlyIncomeStepProps) {
  return (
    <div className="max-w-md">
      <label htmlFor="monthlyIncome" className="text-sm font-medium text-gray-700">
        About how much do you usually receive in a month?
      </label>
      <div className="mt-2 flex h-12 items-center rounded-xl border border-line px-4 transition focus-within:border-brand">
        <span className="mr-2 text-sm text-gray-400" aria-hidden="true">
          &#8358;
        </span>
        <input
          id="monthlyIncome"
          type="number"
          min={0}
          inputMode="numeric"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
          placeholder="e.g. 45,000"
          className="h-full w-full bg-transparent text-sm outline-none"
        />
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-gray-500">
        An estimate is fine. Student income varies month to month, and you can change this later.
      </p>
    </div>
  );
}

export default MonthlyIncomeStep;
