// Minimal session helpers so login, onboarding and the dashboard agree on
// who is signed in and whether onboarding has been finished.

const SESSION_KEY = "campuscoin.session";
const ONBOARDING_KEY = "campuscoin.onboarding";

export interface Session {
  name: string;
  email: string;
}

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function isOnboardingComplete(): boolean {
  const raw = localStorage.getItem(ONBOARDING_KEY);
  return raw === "complete";
}

export function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_KEY, "complete");
}

/** A brand-new account always starts onboarding from the top. */
export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY);
}

/** Where a user should land after signing in. */
export function postLoginDestination(): string {
  return isOnboardingComplete() ? "/dashboard" : "/onboarding";
}
