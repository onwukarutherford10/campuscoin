import type { OnboardingData } from "../types";

const ONBOARDING_DATA_KEY = "campuscoin.onboardingData";

export const emptyOnboardingData: OnboardingData = {
  fullName: "",
  academicLevel: "",
  incomeSources: [],
  monthlyIncome: null,
  savingsGoal: null,
  spendingCategories: [],
  completed: false,
};

/** Reads saved onboarding answers, or the empty default when absent/corrupt. */
export function loadOnboardingData(): OnboardingData {
  const raw = localStorage.getItem(ONBOARDING_DATA_KEY);
  if (!raw) return { ...emptyOnboardingData };
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingData>;
    return { ...emptyOnboardingData, ...parsed };
  } catch {
    return { ...emptyOnboardingData };
  }
}

export function saveOnboardingData(data: OnboardingData): void {
  localStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(data));
}
