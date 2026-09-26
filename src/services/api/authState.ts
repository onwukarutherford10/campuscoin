import type { ApiUser } from "./dto.ts";

type Listener = (user: ApiUser | null) => void;

let currentUser: ApiUser | null = null;
const listeners = new Set<Listener>();

export function getCurrentUser(): ApiUser | null {
  return currentUser;
}

export function setCurrentUser(user: ApiUser | null): void {
  currentUser = user;
  listeners.forEach((listener) => listener(user));
}

export function subscribeToCurrentUser(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
