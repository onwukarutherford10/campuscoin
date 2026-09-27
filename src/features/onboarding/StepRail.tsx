interface StepRailProps {
  currentStep: number;
  totalSteps: number;
}

/**
 * Five-step progress indicator.
 * Vertical rail on desktop, horizontal rail on mobile so the phone layout
 * stays a deliberate single-column experience.
 */
export function StepRail({ currentStep, totalSteps }: StepRailProps) {
  return (
    <>
      {/* Desktop: vertical rail */}
      <ol className="hidden flex-col items-center gap-6 md:flex" aria-label={`Step ${currentStep} of ${totalSteps}`}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isComplete = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <li key={stepNumber} className="flex flex-col items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold transition ${
                  isCurrent
                    ? "bg-brand-dark text-white ring-4 ring-brand-soft"
                    : isComplete
                      ? "bg-brand text-white"
                      : "border border-line bg-white text-gray-400"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {stepNumber}
              </span>
              {stepNumber < totalSteps && <span className="h-8 w-px bg-line" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      {/* Mobile: horizontal rail */}
      <div className="md:hidden" aria-hidden="true">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-brand-dark">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-[13px] text-gray-500">{Math.round((currentStep / totalSteps) * 100)}%</span>
        </div>
        <div className="mt-2 flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full transition ${index < currentStep ? "bg-brand" : "bg-line"}`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
