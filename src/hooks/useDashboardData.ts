import { useCallback, useEffect, useState } from "react";
import { getDashboardData } from "../services/dashboardApi";
import { loadOnboardingData } from "../utils/storage";
import type { DashboardData } from "../types";

interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
  error: boolean;
  reload: () => void;
}

interface RequestState {
  data: DashboardData | null;
  loading: boolean;
  error: boolean;
}

/**
 * Loads dashboard data and exposes explicit loading / error states so every
 * section can render skeletons, empty states and retry affordances.
 */
export function useDashboardData(): DashboardState {
  const [state, setState] = useState<RequestState>({ data: null, loading: true, error: false });
  const [requestId, setRequestId] = useState(0);

  // Called from event handlers (retry, quick add), never from an effect.
  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, loading: true, error: false }));
    setRequestId((id) => id + 1);
  }, []);

  useEffect(() => {
    let active = true;

    getDashboardData(loadOnboardingData())
      .then((result) => {
        if (!active) return;
        setState({ data: result, loading: false, error: false });
      })
      .catch(() => {
        if (!active) return;
        setState((previous) => ({ ...previous, loading: false, error: true }));
      });

    return () => {
      active = false;
    };
  }, [requestId]);

  return { ...state, reload };
}
