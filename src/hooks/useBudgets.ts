import { useCallback } from "react";
import type { Budget, ServiceResult } from "../types";
import { listBudgets, removeBudget, saveBudget } from "../services/budgetService";
import { useAsyncList } from "./useAsyncList";

export interface UseBudgets {
  items: Budget[];
  loading: boolean;
  error: boolean;
  reload: () => void;
  save: (input: { id?: string; category: string; limit: number }) => Promise<ServiceResult<Budget>>;
  remove: (id: string) => Promise<ServiceResult>;
}

/** Budget list plus create/update/delete; successful writes reload the list. */
export function useBudgets(): UseBudgets {
  const list = useAsyncList(listBudgets);
  const { reload } = list;

  const save = useCallback(
    async (input: { id?: string; category: string; limit: number }) => {
      const result = await saveBudget(input);
      if (result.ok) reload();
      return result;
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      const result = await removeBudget(id);
      if (result.ok) reload();
      return result;
    },
    [reload],
  );

  return { ...list, save, remove };
}
