import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { markOnboardingComplete } from "../../auth/session";
import { loadOnboardingData, saveOnboardingData } from "../../utils/storage";
import { DATA_MODE } from "../../services/api/config";

/**
 * Dedicated completion state after onboarding page five.
 * Not another information page: check circle draws in, supporting text fades
 * in, then the continue button becomes available.
 */
export function OnboardingComplete() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  function handleContinue() {
    if (DATA_MODE === "mock") {
      saveOnboardingData({ ...loadOnboardingData(), completed: true });
      markOnboardingComplete();
    }
    navigate("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <div className="pop-in flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft">
        <svg viewBox="0 0 52 52" className="h-12 w-12" aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="none" stroke="var(--color-brand)" strokeWidth="3" />
          <path
            className="check-draw"
            d="M15 27 l8 8 l15 -16"
            fill="none"
            stroke="var(--color-brand-dark)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <p className="fade-up mt-6 max-w-sm text-lg font-medium text-gray-900">
        Thank you. We're setting up your Campus Coin dashboard.
      </p>
      <p className="fade-up mt-2 max-w-sm text-sm text-gray-500">
        Your answers are saved so your spending views start out personal to you.
      </p>

      <button
        type="button"
        onClick={handleContinue}
        disabled={!ready}
        className={`fade-up mt-8 rounded-xl px-8 py-3 text-sm font-medium transition ${
          ready ? "bg-brand text-white hover:bg-brand-dark" : "cursor-not-allowed bg-gray-200 text-gray-500"
        }`}
      >
        {ready ? "Continue to Dashboard" : "Setting up..."}
      </button>
    </main>
  );
}

export default OnboardingComplete;
