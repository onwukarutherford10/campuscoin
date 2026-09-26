// Toast pub/sub: any module can raise a short confirmation or error
// message without threading a hook or context through every call site.
// Normal UI feedback never uses window.alert — it lands here instead.

export type ToastTone = "success" | "error";

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

type Listener = (item: ToastItem) => void;

let listener: Listener | null = null;
let nextId = 1;

function emit(message: string, tone: ToastTone): void {
  listener?.({ id: nextId++, message, tone });
}

/** The ToastHost component subscribes through this; call it once. */
export function subscribeToToasts(fn: Listener): () => void {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

export const toast = {
  success: (message: string) => emit(message, "success"),
  error: (message: string) => emit(message, "error"),
};
