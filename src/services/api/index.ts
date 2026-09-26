import { API_BASE_URL } from "./config.ts";
import { setCurrentUser } from "./authState.ts";
import { ApiClient } from "./client.ts";

export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  onAuthenticationLost: () => {
    setCurrentUser(null);
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  },
});
