// Profile store (Phase 3 addition): account details, avatar and account
// closure. Name/email writes flow back into the session and onboarding data
// so the greeting, sidebar and reports all agree.

import type { ServiceResult, UserProfile } from "../types";
import { getSession, saveSession } from "../auth/session";
import { loadOnboardingData, saveOnboardingData } from "../utils/storage";
import { delay } from "./store";

const PROFILE_KEY = "campuscoin.profile";

interface ProfileRecord {
  avatar: string | null;
}

function readRecord(): ProfileRecord {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { avatar: null };
    const parsed = JSON.parse(raw) as Partial<ProfileRecord>;
    return { avatar: parsed.avatar ?? null };
  } catch {
    return { avatar: null };
  }
}

function writeRecord(record: ProfileRecord): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(record));
}

/** Profile merged from the session, onboarding answers and the avatar store. */
export function getProfileSync(): UserProfile {
  const session = getSession();
  const onboarding = loadOnboardingData();
  return {
    fullName: onboarding.fullName || session?.name || "",
    email: session?.email || "",
    avatar: readRecord().avatar,
  };
}

export function getProfile(): Promise<UserProfile> {
  return delay(getProfileSync());
}

export function updateProfile(input: {
  fullName: string;
  email: string;
}): Promise<ServiceResult<UserProfile>> {
  const fullName = input.fullName.trim();
  const email = input.email.trim();
  const errors: Record<string, string> = {};

  if (!fullName) errors.fullName = "Enter your name.";
  if (!email) {
    errors.email = "Enter your email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (Object.keys(errors).length > 0) return Promise.resolve({ ok: false, errors });

  saveSession({ name: fullName, email });
  localStorage.setItem("userName", fullName);

  const onboarding = loadOnboardingData();
  onboarding.fullName = fullName;
  saveOnboardingData(onboarding);

  return delay({
    ok: true,
    data: { fullName, email, avatar: readRecord().avatar },
  });
}

/** Saves an avatar data URL (validation happens in the UI before this). */
export function setAvatar(dataUrl: string): Promise<ServiceResult<UserProfile>> {
  try {
    writeRecord({ avatar: dataUrl });
  } catch {
    // Storage quota — a friendly message, never the raw browser error.
    return Promise.resolve({ ok: false, error: "That image is too large to store. Try a smaller photo." });
  }
  return delay({ ok: true, data: getProfileSync() });
}

export function removeAvatar(): Promise<ServiceResult<UserProfile>> {
  writeRecord({ avatar: null });
  return delay({ ok: true, data: getProfileSync() });
}

/**
 * Closes the account: every Campus Coin key on this device is removed —
 * profile, session, onboarding answers, transactions, budgets, categories,
 * insights and tips. There is no undo and no server copy in this phase.
 */
export function closeAccount(): Promise<ServiceResult> {
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
  return delay({ ok: true }, 600);
}
