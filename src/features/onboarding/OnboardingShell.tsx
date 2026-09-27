import type { KeyboardEvent, ReactNode } from "react";

interface OnboardingShellProps {
  stepNumber: number;
  totalSteps: number;
  title: string;
  description: string;
  rail: ReactNode;
  canContinue: boolean;
  onBack: (() => void) | null;
  onContinue: () => void;
  continueLabel?: string;
  children: ReactNode;
}

/**
 * Shared chrome for the five onboarding pages: progress rail on the left,
 * focused content panel on the right, divider and primary action at the bottom.
 */
export function OnboardingShell({
  stepNumber,
  totalSteps,
  title,
  description,
  rail,
  canContinue,
  onBack,
  onContinue,
  continueLabel = "Continue",
  children,
}: OnboardingShellProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" && canContinue) {
      event.preventDefault();
      onContinue();
    }
  }

  return (
    <main className="min-h-screen bg-white px-5 py-8 sm:px-8 md:py-12">
      <div
        onKeyDown={handleKeyDown}
        className="mx-auto flex w-full max-w-4xl flex-col gap-8 md:flex-row md:gap-12"
      >
        <div className="md:w-16 md:pt-2">{rail}</div>

        <div className="flex-1">
          <p className="text-[13px] font-medium text-gray-400">
            Step {stepNumber} of {totalSteps}
          </p>
          <h1 className="mt-2 text-2xl font-semibold leading-snug text-gray-900 sm:text-[26px]">{title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-500">{description}</p>

          <div className="mt-8 min-h-[180px]">{children}</div>

          <div className="mt-10 border-t border-line pt-6">
            <div className="flex items-center justify-between gap-4">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-xl border border-line bg-white px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Back
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={onContinue}
                disabled={!canContinue}
                className={`rounded-xl px-8 py-3 text-sm font-medium transition ${
                  canContinue
                    ? "bg-brand text-white hover:bg-brand-dark"
                    : "cursor-not-allowed bg-gray-200 text-gray-500"
                }`}
              >
                {continueLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
