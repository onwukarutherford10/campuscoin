import { ApiError } from "../services/api/client.ts";
import { api } from "../services/api/index.ts";
import { getAuthSnapshot, setAuthSnapshot, setCurrentUser, type AuthUser } from "../services/api/authState.ts";

const LOGOUT_PENDING_KEY = "campuscoin.logoutPending";
let restorePromise: Promise<void> | null = null;

function clearLegacyUserData(): void {
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("campuscoin.") || key === "userName") keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}

export function restoreSession(): Promise<void> {
  if (getAuthSnapshot().status !== "loading" && getAuthSnapshot().status !== "error") return Promise.resolve();
  if (restorePromise) return restorePromise;
  if (sessionStorage.getItem(LOGOUT_PENDING_KEY)) {
    setCurrentUser(null);
    return Promise.resolve();
  }
  setAuthSnapshot({ user: null, status: "loading" });
  restorePromise = (async () => {
    try {
      const response = await api.request<AuthUser>("/users/me");
      setCurrentUser(response.data);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setCurrentUser(null);
      } else {
        setAuthSnapshot({ user: null, status: "error" });
      }
    }
  })().finally(() => { restorePromise = null; });
  return restorePromise;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await api.request<AuthUser>("/auth/login", {
    method: "POST", body: { email, password }, authenticated: false,
  });
  clearLegacyUserData();
  sessionStorage.removeItem(LOGOUT_PENDING_KEY);
  setCurrentUser(response.data);
  return response.data;
}

export async function register(name: string, email: string, password: string): Promise<AuthUser & { verification_sent: boolean }> {
  const response = await api.request<AuthUser & { verification_sent: boolean }>("/auth/register", {
    method: "POST", body: { name, email, password }, authenticated: false,
  });
  clearLegacyUserData();
  sessionStorage.removeItem(LOGOUT_PENDING_KEY);
  setCurrentUser(response.data);
  return response.data;
}

export async function logout(): Promise<void> {
  sessionStorage.setItem(LOGOUT_PENDING_KEY, "1");
  try {
    await api.request("/auth/logout", { method: "POST" });
  } finally {
    clearLegacyUserData();
    setCurrentUser(null);
    api.authCookiesChanged();
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.request("/auth/password/forgot", {
    method: "POST", body: { email }, authenticated: false,
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await api.request("/auth/password/reset", {
    method: "POST", body: { token, password }, authenticated: false,
  });
  setCurrentUser(null);
}

export async function resendEmailCode(): Promise<void> {
  await api.request("/auth/email/resend", { method: "POST" });
}

export async function verifyEmail(code: string): Promise<void> {
  const response = await api.request<AuthUser>("/auth/email/verify", {
    method: "POST", body: { code },
  });
  setCurrentUser(response.data);
}

export async function updateLiveProfile(changes: Partial<{
  name: string;
  academic_year: string | null;
  allowance_baseline: string;
  savings_goal: string;
  currency: string;
  timezone: string;
  income_source_category_ids: string[];
  spending_category_ids: string[];
  onboarding_completed: boolean;
}>): Promise<AuthUser> {
  const response = await api.request<AuthUser>("/users/me", { method: "PATCH", body: changes });
  setCurrentUser(response.data);
  return response.data;
}
