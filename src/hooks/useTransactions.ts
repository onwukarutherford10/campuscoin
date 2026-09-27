import { useCallback, useEffect, useState } from "react";
import type { ServiceResult, Transaction, TransactionDraft } from "../types";
import {
  createTransaction,
  deleteTransaction,
  listTransactionsPage,
  updateTransaction,
  type TransactionQuery,
} from "../services/transactionService";

export interface UseTransactions {
  items: Transaction[];
  loading: boolean;
  error: boolean;
  page: number;
  perPage: number;
  total: number;
  reload: () => void;
  create: (draft: TransactionDraft) => Promise<ServiceResult<Transaction>>;
  update: (id: string, draft: TransactionDraft) => Promise<ServiceResult<Transaction>>;
  remove: (id: string) => Promise<ServiceResult>;
}

export function useTransactions(query: TransactionQuery = {}): UseTransactions {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const page = query.page ?? 1;
  const perPage = query.perPage ?? 25;
  const categoryId = query.categoryId;
  const type = query.type;
  const from = query.from;
  const to = query.to;
  const search = query.query;
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) {
        setLoading(true);
        setError(false);
      }
    });
    listTransactionsPage({ page, perPage, categoryId, type, from, to, query: search })
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setTotal(result.meta.total);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });
    return () => { active = false; };
  }, [page, perPage, categoryId, type, from, to, search, reloadKey]);

  const create = useCallback(async (draft: TransactionDraft) => {
    const result = await createTransaction(draft);
    if (result.ok) reload();
    return result;
  }, [reload]);

  const update = useCallback(async (id: string, draft: TransactionDraft) => {
    const result = await updateTransaction(id, draft);
    if (result.ok) reload();
    return result;
  }, [reload]);

  const remove = useCallback(async (id: string) => {
    const result = await deleteTransaction(id);
    if (result.ok) reload();
    return result;
  }, [reload]);

  return { items, loading, error, page, perPage, total, reload, create, update, remove };
}
