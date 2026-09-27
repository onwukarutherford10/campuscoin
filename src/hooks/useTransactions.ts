import { useCallback } from "react";
import type { ServiceResult, Transaction, TransactionDraft } from "../types";
import { createTransaction, deleteTransaction, listTransactions, updateTransaction } from "../services/transactionService";
import { useAsyncList } from "./useAsyncList";

export interface UseTransactions {
  items: Transaction[];
  loading: boolean;
  error: boolean;
  reload: () => void;
  create: (draft: TransactionDraft) => Promise<ServiceResult<Transaction>>;
  update: (id: string, draft: TransactionDraft) => Promise<ServiceResult<Transaction>>;
  remove: (id: string) => Promise<ServiceResult>;
}

/** Transaction list plus mutations; every successful write reloads the list. */
export function useTransactions(): UseTransactions {
  const list = useAsyncList(listTransactions);
  const { reload } = list;

  const create = useCallback(
    async (draft: TransactionDraft) => {
      const result = await createTransaction(draft);
      if (result.ok) reload();
      return result;
    },
    [reload],
  );

  const update = useCallback(
    async (id: string, draft: TransactionDraft) => {
      const result = await updateTransaction(id, draft);
      if (result.ok) reload();
      return result;
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      const result = await deleteTransaction(id);
      if (result.ok) reload();
      return result;
    },
    [reload],
  );

  return { ...list, create, update, remove };
}
