import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../auth/liveAuth.ts";

/** Protected holding page until the remaining data screens use the API. */
export function LiveFeaturePending({ title }: { title: string }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    try { await logout(); } catch { /* Local identity is cleared by logout. */ }
    navigate("/login", { replace: true });
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">{title} is being connected</h1>
      <p className="mt-3 text-sm text-gray-600">Your account is active. This screen will be available when its data is connected to the API.</p>
      <button type="button" onClick={() => void signOut()} disabled={busy} className="mt-6 text-sm font-medium text-brand underline">Sign out</button>
    </main>
  );
}
