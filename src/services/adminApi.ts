import { api } from "./api";
import type { ApiCategory, ApiUser } from "./api/dto";

export interface AdminUsage {
  users: number;
  active_users: number;
  transactions: number;
  total_transactions_logged: number;
  budgets: number;
  notifications: number;
  jobs: number;
  most_used_categories: { id: string; name: string; type: "income" | "expense"; transactions: number }[];
}

export interface AdminContent {
  id: string;
  kind: "announcement" | "tip_template";
  title: string;
  body: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export const adminApi = {
  usage: async () => (await api.request<AdminUsage>("/admin/usage")).data,
  users: async () => (await api.request<ApiUser[]>("/admin/users")).data,
  categories: async () => (await api.request<ApiCategory[]>("/categories")).data.filter((item) => item.is_system),
  content: async () => (await api.request<AdminContent[]>("/admin/content")).data,
  createContent: async (values: Pick<AdminContent, "kind" | "title" | "body">) =>
    api.request<AdminContent>("/admin/content", { method: "POST", body: values }),
  updateContent: async (id: string, values: Partial<Pick<AdminContent, "title" | "body" | "is_active">>) =>
    api.request<AdminContent>(`/admin/content/${id}`, { method: "PATCH", body: values }),
  removeContent: async (id: string) => api.request(`/admin/content/${id}`, { method: "DELETE" }),
  disableUser: async (id: string) => api.request(`/admin/users/${id}/disable`, { method: "POST" }),
  revokeSessions: async (id: string) => api.request(`/admin/users/${id}/sessions/revoke`, { method: "POST" }),
  sendResetCode: async (id: string) => api.request<{ initiated: boolean }>(`/admin/users/${id}/password-reset`, { method: "POST" }),
  createCategory: async (name: string, category_type: "income" | "expense") =>
    api.request<ApiCategory>("/admin/categories", { method: "POST", body: { name, category_type } }),
  renameCategory: async (id: string, name: string) =>
    api.request<ApiCategory>(`/admin/categories/${id}`, { method: "PATCH", body: { name } }),
  removeCategory: async (id: string) =>
    api.request(`/admin/categories/${id}`, { method: "DELETE" }),
};
