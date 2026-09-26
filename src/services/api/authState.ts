import type { ApiUser } from "./dto.ts";

export type AuthUser = Pick<ApiUser, "id" | "email" | "name" | "role" | "email_verified">;
export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error";
export interface AuthSnapshot {
  user: AuthUser | null;
  status: AuthStatus;
}
type Listener = () => void;

let snapshot: AuthSnapshot = { user: null, status: "loading" };
const listeners = new Set<Listener>();

export function getAuthSnapshot(): AuthSnapshot {
  return snapshot;
}

export function setAuthSnapshot(next: AuthSnapshot): void {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function setCurrentUser(user: AuthUser | null): void {
  setAuthSnapshot({ user, status: user ? "authenticated" : "anonymous" });
}

export function subscribeToAuth(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
