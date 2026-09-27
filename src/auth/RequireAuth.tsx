import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getSession } from "./session";
import { DATA_MODE } from "../services/api/config.ts";
import { useLiveAuth } from "./useLiveAuth.ts";
import { restoreSession } from "./liveAuth.ts";

interface RequireAuthProps {
  children: ReactNode;
  allowUnverified?: boolean;
}

/** Blocks signed-out users from onboarding and dashboard routes. */
export function RequireAuth({ children, allowUnverified = false }: RequireAuthProps) {
  const auth = useLiveAuth();
  if (DATA_MODE === "mock") {
    if (!getSession()) return <Navigate to="/login" replace />;
    return <>{children}</>;
  }
  if (auth.status === "loading") return <main className="p-8 text-center">Checking your session…</main>;
  if (auth.status === "error") {
    return (
      <main className="p-8 text-center">
        <p>We couldn't check your session.</p>
        <button type="button" onClick={() => void restoreSession()} className="mt-3 text-brand underline">Retry</button>
      </main>
    );
  }
  if (!auth.user) return <Navigate to="/login" replace />;
  if (!allowUnverified && !auth.user.email_verified) return <Navigate to="/otp" replace />;
  return <>{children}</>;
}

export default RequireAuth;
