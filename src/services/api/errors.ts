import { ApiError, ApiNetworkError } from "./client.ts";

/** Shape accepted by the existing form services. No retry is performed here. */
export function toServiceError(error: unknown): {
  ok: false;
  error: string;
  errors: Record<string, string>;
  retryable: boolean;
} {
  if (error instanceof ApiError) {
    return {
      ok: false,
      error: error.message,
      errors: error.fieldMessages,
      retryable: error.status === 429 || error.status >= 500,
    };
  }
  if (error instanceof ApiNetworkError) {
    return { ok: false, error: error.message, errors: {}, retryable: true };
  }
  return { ok: false, error: "Something went wrong. Please try again.", errors: {}, retryable: false };
}
