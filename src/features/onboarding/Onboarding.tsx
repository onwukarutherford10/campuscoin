import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AcademicLevel, OnboardingData } from "../../types";
import { emptyOnboardingData, loadOnboardingData, saveOnboardingData } from "../../utils/storage";
import { BrandMark } from "../../components/BrandMark";
import { OnboardingShell } from "./OnboardingShell";
import { StepRail } from "./StepRail";
import { PersonalInfoStep } from "./steps/PersonalInfoStep";
import { IncomeSourcesStep } from "./steps/IncomeSourcesStep";
import { MonthlyIncomeStep } from "./steps/MonthlyIncomeStep";
import { SavingsGoalStep } from "./steps/SavingsGoalStep";
import { SpendingAreasStep } from "./steps/SpendingAreasStep";
import { DATA_MODE } from "../../services/api/config";
import { api } from "../../services/api";
import type { ApiCategory } from "../../services/api/dto";
import { getAuthSnapshot } from "../../services/api/authState";
import { updateLiveProfile } from "../../auth/liveAuth";
import { numberToMoney } from "../../services/api/adapters";
import { toServiceError } from "../../services/api/errors";

const TOTAL_STEPS = 5;

function initialData(): OnboardingData {
  if (DATA_MODE === "mock") return loadOnboardingData();
  const user = getAuthSnapshot().user;
  if (!user) return { ...emptyOnboardingData };
  return {
    fullName: user.name,
    academicLevel: (user.academic_year as AcademicLevel | null) ?? "",
    incomeSources: user.income_source_category_ids,
    monthlyIncome: Number(user.allowance_baseline),
    savingsGoal: Number(user.savings_goal) || null,
    spendingCategories: user.spending_category_ids,
    completed: user.onboarding_completed,
  };
}

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
  const [data, setData] = useState<OnboardingData>(initialData);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(DATA_MODE === "live");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (DATA_MODE !== "live") return;
    api.request<ApiCategory[]>("/categories")
      .then((response) => setCategories(response.data.filter((category) => category.is_active)))
      .catch((requestError) => setError(toServiceError(requestError).error))
      .finally(() => setLoading(false));
  }, []);

  function update(patch: Partial<OnboardingData>) {
    setData((previous) => {
      const next = { ...previous, ...patch };
      if (DATA_MODE === "mock") saveOnboardingData(next);
      return next;
    });
  }

  function toggleInList<T>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
  }

  // Toggle from the latest state so rapid successive toggles never overwrite
  // each other (the patch built from a stale `data` closure would).
  function toggleIncomeSource(source: string) {
    setData((previous) => {
      const next = { ...previous, incomeSources: toggleInList(previous.incomeSources, source) };
      if (DATA_MODE === "mock") saveOnboardingData(next);
      return next;
    });
  }

  function toggleSpendingCategory(category: string) {
    setData((previous) => {
      const next = { ...previous, spendingCategories: toggleInList(previous.spendingCategories, category) };
      if (DATA_MODE === "mock") saveOnboardingData(next);
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

  async function handleContinue() {
    if (DATA_MODE === "live") {
      setSaving(true);
      setError("");
      try {
        const patches = [
          {
            name: data.fullName.trim(),
            academic_year: data.academicLevel || null,
            currency: "NGN",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos",
          },
          { income_source_category_ids: data.incomeSources },
          { allowance_baseline: numberToMoney(data.monthlyIncome ?? 0) },
          { savings_goal: numberToMoney(data.savingsGoal ?? 0) },
          { spending_category_ids: data.spendingCategories, onboarding_completed: true },
        ];
        await updateLiveProfile(patches[step - 1]);
      } catch (requestError) {
        setError(toServiceError(requestError).error);
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    if (step < TOTAL_STEPS) {
      setStep((current) => current + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate("/onboarding/complete");
  }

  if (loading) return <main className="p-8 text-center">Loading your saved setup…</main>;

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
        canContinue={canContinue && !saving}
        onBack={handleBack}
        onContinue={handleContinue}
        continueLabel={saving ? "Saving…" : step === TOTAL_STEPS ? "Finish" : "Continue"}
      >
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
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
            onToggle={toggleIncomeSource}
            options={
              DATA_MODE === "live"
                ? categories.filter((category) => category.type === "income").map(({ id, name }) => ({ id, name }))
                : undefined
            }
          />
        )}

        {step === 3 && <MonthlyIncomeStep value={data.monthlyIncome} onChange={(value) => update({ monthlyIncome: value })} />}

        {step === 4 && <SavingsGoalStep value={data.savingsGoal} onChange={(value) => update({ savingsGoal: value })} />}

        {step === 5 && (
          <SpendingAreasStep
            selected={data.spendingCategories}
            onToggle={toggleSpendingCategory}
            options={
              DATA_MODE === "live"
                ? categories.filter((category) => category.type === "expense").map(({ id, name }) => ({ id, name }))
                : undefined
            }
          />
        )}
      </OnboardingShell>
    </div>
  );
}

export default Onboarding;
