import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getSession } from "./session";

interface RequireAuthProps {
  children: ReactNode;
}

/** Blocks signed-out users from onboarding and dashboard routes. */
export function RequireAuth({ children }: RequireAuthProps) {
  if (!getSession()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default RequireAuth;
