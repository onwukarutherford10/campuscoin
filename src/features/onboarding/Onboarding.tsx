import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { IncomeSource, OnboardingData, SpendingCategory } from "../../types";
import { loadOnboardingData, saveOnboardingData } from "../../utils/storage";
import { BrandMark } from "../../components/BrandMark";
import { OnboardingShell } from "./OnboardingShell";
import { StepRail } from "./StepRail";
import { PersonalInfoStep } from "./steps/PersonalInfoStep";
import { IncomeSourcesStep } from "./steps/IncomeSourcesStep";
import { MonthlyIncomeStep } from "./steps/MonthlyIncomeStep";
import { SavingsGoalStep } from "./steps/SavingsGoalStep";
import { SpendingAreasStep } from "./steps/SpendingAreasStep";

const TOTAL_STEPS = 5;

interface StepContent {
  title: string;
  description: string;
}

const STEPS: StepContent[] = [
  {
    title: "Tell us about yourself",
    description: "Your name and level, so we can address you properly and tailor your study-term views.",
  },
  {
    title: "How do you usually receive money?",
    description: "Select every source that applies. Most students mix a few different ones.",
  },
  {
    title: "What does a typical month look like?",
    description: "A rough figure for what usually comes in. It does not have to be exact.",
  },
  {
    title: "What would you like to save?",
    description: "A target keeps you honest, but you can always set this later.",
  },
  {
    title: "Where does your money usually go?",
    description: "Choose the categories you want to track most closely.",
  },
];

/** Five-page onboarding flow plus its completion state. */
export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(() => loadOnboardingData());

  function update(patch: Partial<OnboardingData>) {
    setData((previous) => {
      const next = { ...previous, ...patch };
      saveOnboardingData(next);
      return next;
    });
  }

  function toggleInList<T>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
  }

  // Toggle from the latest state so rapid successive toggles never overwrite
  // each other (the patch built from a stale `data` closure would).
  function toggleIncomeSource(source: IncomeSource) {
    setData((previous) => {
      const next = { ...previous, incomeSources: toggleInList(previous.incomeSources, source) };
      saveOnboardingData(next);
      return next;
    });
  }

  function toggleSpendingCategory(category: SpendingCategory) {
    setData((previous) => {
      const next = { ...previous, spendingCategories: toggleInList(previous.spendingCategories, category) };
      saveOnboardingData(next);
      return next;
    });
  }

  const canContinue = [
    data.fullName.trim().length > 0 && data.academicLevel !== "",
    data.incomeSources.length > 0,
    (data.monthlyIncome ?? 0) > 0,
    true,
    data.spendingCategories.length > 0,
  ][step - 1];

  function handleBack() {
    if (step === 1) {
      navigate("/login");
      return;
    }
    setStep((current) => current - 1);
  }

  function handleContinue() {
    if (step < TOTAL_STEPS) {
      setStep((current) => current + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate("/onboarding/complete");
  }

  const content = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-5 pt-6 sm:px-8">
        <BrandMark />
      </div>

      <OnboardingShell
        stepNumber={step}
        totalSteps={TOTAL_STEPS}
        title={content.title}
        description={content.description}
        rail={<StepRail currentStep={step} totalSteps={TOTAL_STEPS} />}
        canContinue={canContinue}
        onBack={handleBack}
        onContinue={handleContinue}
        continueLabel={step === TOTAL_STEPS ? "Finish" : "Continue"}
      >
        {step === 1 && (
          <PersonalInfoStep
            fullName={data.fullName}
            academicLevel={data.academicLevel}
            onChange={(patch) => update(patch)}
          />
        )}

        {step === 2 && (
          <IncomeSourcesStep
            selected={data.incomeSources}
            onToggle={(source: IncomeSource) => toggleIncomeSource(source)}
          />
        )}

        {step === 3 && <MonthlyIncomeStep value={data.monthlyIncome} onChange={(value) => update({ monthlyIncome: value })} />}

        {step === 4 && <SavingsGoalStep value={data.savingsGoal} onChange={(value) => update({ savingsGoal: value })} />}

        {step === 5 && (
          <SpendingAreasStep
            selected={data.spendingCategories}
            onToggle={(category: SpendingCategory) => toggleSpendingCategory(category)}
          />
        )}
      </OnboardingShell>
    </div>
  );
}

export default Onboarding;
