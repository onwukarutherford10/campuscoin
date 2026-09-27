import { api } from "./api";
import type { ApiCategory, ApiUser } from "./api/dto";

export interface AdminUsage {
  users: number;
  active_users: number;
  transactions: number;
  budgets: number;
  notifications: number;
  jobs: number;
}

export const adminApi = {
  usage: async () => (await api.request<AdminUsage>("/admin/usage")).data,
  users: async () => (await api.request<ApiUser[]>("/admin/users")).data,
  categories: async () => (await api.request<ApiCategory[]>("/categories")).data.filter((item) => item.is_system),
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
