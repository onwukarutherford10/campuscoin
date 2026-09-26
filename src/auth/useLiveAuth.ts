import { useSyncExternalStore } from "react";
import { getAuthSnapshot, subscribeToAuth } from "../services/api/authState.ts";

export function useLiveAuth() {
  return useSyncExternalStore(subscribeToAuth, getAuthSnapshot);
}
