import { useCallback } from "react";
import type { Category, ServiceResult, TransactionType } from "../types";
import { createCategory, deleteCategory, listCategories, updateCategory } from "../services/categoryService";
import { useAsyncList } from "./useAsyncList";

export interface UseCategories {
  items: Category[];
  loading: boolean;
  error: boolean;
  reload: () => void;
  create: (input: { name: string; type: TransactionType; icon?: string | null }) => Promise<ServiceResult<Category>>;
  update: (id: string, input: { name?: string; icon?: string | null }) => Promise<ServiceResult<Category>>;
  remove: (id: string) => Promise<ServiceResult>;
}

/** Category list plus create/update/delete; successful writes reload the list. */
export function useCategories(): UseCategories {
  const list = useAsyncList(listCategories);
  const { reload } = list;

  const create = useCallback(
    async (input: { name: string; type: TransactionType; icon?: string | null }) => {
      const result = await createCategory(input);
      if (result.ok) reload();
      return result;
    },
    [reload],
  );

  const update = useCallback(
    async (id: string, input: { name?: string; icon?: string | null }) => {
      const result = await updateCategory(id, input);
      if (result.ok) reload();
      return result;
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      const result = await deleteCategory(id);
      if (result.ok) reload();
      return result;
    },
    [reload],
  );

  return { ...list, create, update, remove };
}
