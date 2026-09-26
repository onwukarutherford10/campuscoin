import { useLocation, useNavigate } from "react-router-dom";

const COPY: Record<string, { title: string; description: string }> = {
  "/transactions": {
    title: "Transactions",
    description: "The full transaction list, filters and editing arrive in Phase 2.",
  },
  "/budgets": {
    title: "Budgets",
    description: "Budget creation and management arrive in a later phase.",
  },
  "/reports": {
    title: "Reports",
    description: "Detailed reports and exports arrive in a later phase.",
  },
  "/settings": {
    title: "Settings",
    description: "Profile and preference settings arrive in a later phase.",
  },
};

/** Honest placeholder for routes that belong to later phases. */
export function ComingSoon() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const copy = COPY[pathname] ?? { title: "Coming soon", description: "This section is not part of Phase 1." };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <h1 className="text-xl font-semibold text-gray-900">{copy.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{copy.description}</p>
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        className="mt-6 rounded-xl bg-brand px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark"
      >
        Back to dashboard
      </button>
    </div>
  );
}

export default ComingSoon;
