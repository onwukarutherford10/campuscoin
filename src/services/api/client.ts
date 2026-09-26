export interface ApiResponse<T, M = Record<string, unknown>> {
  data: T;
  meta: M;
}

export interface ApiFailure {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string | string[]>;
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string | string[]>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields: Record<string, string | string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  get fieldMessages(): Record<string, string> {
    return Object.fromEntries(
      Object.entries(this.fields).map(([field, message]) => [
        field,
        Array.isArray(message) ? message[0] ?? "Invalid value" : message,
      ]),
    );
  }
}

export class ApiNetworkError extends Error {
  constructor(cause: unknown) {
    super("Could not reach CampusCoin. Check your connection and try again.", { cause });
    this.name = "ApiNetworkError";
  }
}

export type BinaryResult<T> =
  | { kind: "file"; blob: Blob; filename: string | null }
  | { kind: "job"; response: ApiResponse<T> };

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
  /** Use false for login, registration, and other anonymous endpoints. */
  authenticated?: boolean;
}

export interface ApiClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
  onAuthenticationLost?: () => void;
}

type RequestBody = BodyInit | undefined;

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly onAuthenticationLost: () => void;
  private csrfToken: string | null = null;
  private csrfPromise: Promise<string> | null = null;
  private refreshPromise: Promise<boolean> | null = null;
  private authEpoch = 0;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    if (!this.baseUrl || !(this.baseUrl.startsWith("/") || /^https?:\/\//.test(this.baseUrl))) {
      throw new Error("API base URL must be an absolute URL or root-relative path");
    }
    this.fetcher = options.fetch ?? fetch.bind(globalThis);
    this.onAuthenticationLost = options.onAuthenticationLost ?? (() => {});
  }

  /** Call after login/register/logout, which replace or remove the CSRF cookie. */
  authCookiesChanged(): void {
    this.csrfToken = null;
    this.authEpoch += 1;
  }

  async request<T, M = Record<string, unknown>>(
    path: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T, M>> {
    const response = await this.send(path, options);
    const payload: unknown = await this.readJson(response);
    if (!isRecord(payload) || !("data" in payload) || !isRecord(payload.meta)) {
      throw new ApiError(response.status, "invalid_response", "Unexpected API response format");
    }
    return payload as unknown as ApiResponse<T, M>;
  }

  async requestBinary<T>(path: string, options: RequestOptions = {}): Promise<BinaryResult<T>> {
    const response = await this.send(path, options);
    if (response.status === 202) {
      const payload: unknown = await this.readJson(response);
      if (!isRecord(payload) || !("data" in payload) || !isRecord(payload.meta)) {
        throw new ApiError(response.status, "invalid_response", "Unexpected API job response");
      }
      return { kind: "job", response: payload as unknown as ApiResponse<T> };
    }
    const disposition = response.headers.get("Content-Disposition");
    const filename = disposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? null;
    return { kind: "file", blob: await response.blob(), filename };
  }

  private async send(path: string, options: RequestOptions, retried = false): Promise<Response> {
    const requestEpoch = this.authEpoch;
    const method = options.method ?? "GET";
    const headers = new Headers();
    headers.set("Accept", "application/json");
    let body: RequestBody;
    if (options.body instanceof FormData) {
      body = options.body;
    } else if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(options.body);
    }
    if (method !== "GET") headers.set("X-CSRF-Token", await this.getCsrfToken());

    let response: Response;
    try {
      response = await this.fetcher(this.url(path, options.query), {
        method,
        headers,
        body,
        signal: options.signal,
        credentials: "include",
      });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw new ApiNetworkError(error);
    }

    if (response.status === 401 && options.authenticated !== false && !retried) {
      if (requestEpoch !== this.authEpoch || await this.refresh()) return this.send(path, options, true);
      this.onAuthenticationLost();
    } else if (response.status === 401 && options.authenticated !== false) {
      this.onAuthenticationLost();
    }
    if (!response.ok) throw await this.toError(response);
    if (/^\/?auth\/(login|register|logout)$/.test(path)) this.authCookiesChanged();
    return response;
  }

  private async getCsrfToken(): Promise<string> {
    if (this.csrfToken) return this.csrfToken;
    if (!this.csrfPromise) {
      this.csrfPromise = (async () => {
        let response: Response;
        try {
          response = await this.fetcher(this.url("/auth/csrf"), {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
          });
        } catch (error) {
          throw new ApiNetworkError(error);
        }
        if (!response.ok) throw await this.toError(response);
        const payload: unknown = await this.readJson(response);
        if (!isRecord(payload) || !isRecord(payload.data) || typeof payload.data.csrf_token !== "string") {
          throw new ApiError(response.status, "invalid_response", "Missing CSRF token");
        }
        this.csrfToken = payload.data.csrf_token;
        return this.csrfToken;
      })().finally(() => { this.csrfPromise = null; });
    }
    return this.csrfPromise;
  }

  private async refresh(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        try {
          const token = await this.getCsrfToken();
          const response = await this.fetcher(this.url("/auth/refresh"), {
            method: "POST",
            credentials: "include",
            headers: { Accept: "application/json", "X-CSRF-Token": token },
          });
          if (!response.ok) return false;
          this.authCookiesChanged();
          return true;
        } catch {
          return false;
        }
      })().finally(() => { this.refreshPromise = null; });
    }
    return this.refreshPromise;
  }

  private url(path: string, query?: RequestOptions["query"]): string {
    if (!path.startsWith("/") || path.startsWith("//") || /^https?:/i.test(path)) {
      throw new Error("API paths must be root-relative within the configured API");
    }
    const suffix = path.startsWith("/api/v1/") ? path.slice("/api/v1".length) : path;
    const url = `${this.baseUrl}${suffix}`;
    if (!query) return url;
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== null && value !== undefined) params.set(key, String(value));
    });
    const encoded = params.toString();
    return encoded ? `${url}${url.includes("?") ? "&" : "?"}${encoded}` : url;
  }

  private async readJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw new ApiError(response.status, "invalid_response", "API returned invalid JSON");
    }
  }

  private async toError(response: Response): Promise<ApiError> {
    let payload: unknown;
    try { payload = await response.json(); } catch { /* Empty or non-JSON error body. */ }
    const detail = isRecord(payload) && isRecord(payload.error) ? payload.error : null;
    const code = typeof detail?.code === "string" ? detail.code : "http_error";
    const message = typeof detail?.message === "string" ? detail.message : `Request failed (${response.status})`;
    const fields = isRecord(detail?.fields) ? detail.fields as ApiFailure["error"]["fields"] : {};
    return new ApiError(response.status, code, message, fields);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
