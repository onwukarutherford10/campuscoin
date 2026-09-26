// Thin localStorage persistence shared by every mock service.
// Services only touch storage through these helpers, so replacing the mock
// bodies with fetch() calls later stays confined to the service layer.

export const LATENCY_MS = 400;

/** Simulated network latency so loading states stay honest. */
export function delay<T>(value: T, ms: number = LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Reads a JSON value, falling back when the key is absent or corrupt. */
export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function hasKey(key: string): boolean {
  return localStorage.getItem(key) !== null;
}

/** Short unique id, prefixed so records are recognisable in storage. */
export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Today's date in the local timezone as yyyy-mm-dd. */
export function todayISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
