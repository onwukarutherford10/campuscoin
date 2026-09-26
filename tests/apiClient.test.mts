import assert from "node:assert/strict";
import test from "node:test";
import { ApiClient, ApiError, ApiNetworkError } from "../src/services/api/client.ts";
import { toServiceError } from "../src/services/api/errors.ts";
import { moneyToNumber, numberToMoney } from "../src/services/api/adapters.ts";

function json(value: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

test("credentialed read preserves pagination metadata", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const client = new ApiClient({
    baseUrl: "/api/v1",
    fetch: async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      return json({ data: [{ id: "one" }], meta: { page: 2, per_page: 25, total: 31 } });
    },
  });
  const response = await client.request<Array<{ id: string }>, { page: number; total: number }>(
    "/transactions",
    { query: { page: 2, q: "bus pass", unused: null } },
  );
  assert.equal(response.meta.total, 31);
  assert.equal(response.data[0].id, "one");
  assert.equal(calls[0].url, "/api/v1/transactions?page=2&q=bus+pass");
  assert.equal(calls[0].init.credentials, "include");
});

test("mutation gets CSRF once, sends JSON, and maps field errors", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const client = new ApiClient({
    baseUrl: "/api/v1",
    fetch: async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      if (String(url).endsWith("/auth/csrf")) return json({ data: { csrf_token: "token-1" }, meta: {} });
      return json({ error: { code: "validation_error", message: "Invalid", fields: { amount: ["Required"] } } }, 400);
    },
  });
  await assert.rejects(
    () => client.request("/transactions", { method: "POST", body: { amount: "0.00" } }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 400);
      assert.equal(error.code, "validation_error");
      assert.equal(error.fieldMessages.amount, "Required");
      return true;
    },
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[0].init.credentials, "include");
  assert.equal((calls[1].init.headers as Headers).get("X-CSRF-Token"), "token-1");
  assert.equal((calls[1].init.headers as Headers).get("Content-Type"), "application/json");
  assert.equal(calls[1].init.body, '{"amount":"0.00"}');
});

test("401 refreshes once and retries with the rotated CSRF token", async () => {
  const paths: string[] = [];
  const sentTokens: string[] = [];
  let csrfCount = 0;
  let lost = 0;
  const client = new ApiClient({
    baseUrl: "/api/v1",
    onAuthenticationLost: () => { lost += 1; },
    fetch: async (url, init) => {
      const path = String(url);
      paths.push(path);
      if (path.endsWith("/auth/csrf")) {
        csrfCount += 1;
        return json({ data: { csrf_token: `token-${csrfCount}` }, meta: {} });
      }
      sentTokens.push(new Headers(init?.headers).get("X-CSRF-Token") ?? "");
      if (path.endsWith("/auth/refresh")) return json({ data: { id: "user" }, meta: {} });
      if (paths.filter((item) => item.endsWith("/budgets")).length === 1) {
        return json({ error: { code: "authentication_required", message: "Expired" } }, 401);
      }
      return json({ data: { id: "budget" }, meta: {} });
    },
  });
  const result = await client.request<{ id: string }>("/budgets", { method: "POST", body: { amount: "10.00" } });
  assert.equal(result.data.id, "budget");
  assert.deepEqual(sentTokens, ["token-1", "token-1", "token-2"]);
  assert.equal(lost, 0);
});

test("failed refresh clears auth once and does not endlessly retry", async () => {
  let lost = 0;
  let reads = 0;
  const client = new ApiClient({
    baseUrl: "/api/v1",
    onAuthenticationLost: () => { lost += 1; },
    fetch: async (url) => {
      if (String(url).endsWith("/auth/csrf")) return json({ data: { csrf_token: "token" }, meta: {} });
      if (String(url).endsWith("/users/me")) reads += 1;
      return json({ error: { code: "authentication_required", message: "Sign in" } }, 401);
    },
  });
  await assert.rejects(() => client.request("/users/me"), ApiError);
  assert.equal(reads, 1);
  assert.equal(lost, 1);
});

test("multipart body has no forced content type and binary requests handle file or job", async () => {
  const calls: RequestInit[] = [];
  let step = 0;
  const client = new ApiClient({
    baseUrl: "/api/v1",
    fetch: async (_url, init) => {
      calls.push(init ?? {});
      step += 1;
      if (step === 1) return json({ data: { csrf_token: "token" }, meta: {} });
      if (step === 2) return json({ data: { import_id: "import" }, meta: {} }, 201);
      if (step === 3) return new Response("pdf", { status: 200, headers: { "Content-Disposition": 'attachment; filename="report.pdf"' } });
      return json({ data: { job_id: "job" }, meta: {} }, 202);
    },
  });
  const form = new FormData();
  form.set("file", new Blob(["date,amount"]), "items.csv");
  await client.request("/transactions/imports/preview", { method: "POST", body: form });
  assert.equal((calls[1].headers as Headers).has("Content-Type"), false);
  assert.equal(calls[1].body, form);
  const file = await client.requestBinary("/reports/exports", { method: "POST", body: { format: "pdf" } });
  assert.equal(file.kind, "file");
  if (file.kind === "file") {
    assert.equal(file.filename, "report.pdf");
    assert.equal(await file.blob.text(), "pdf");
  }
  const job = await client.requestBinary<{ job_id: string }>("/reports/exports", { method: "POST", body: { format: "pdf" } });
  assert.equal(job.kind, "job");
  if (job.kind === "job") assert.equal(job.response.data.job_id, "job");
});

test("network failures are reported without repeating a mutation", async () => {
  let calls = 0;
  const client = new ApiClient({
    baseUrl: "/api/v1",
    fetch: async (url) => {
      calls += 1;
      if (String(url).endsWith("/auth/csrf")) return json({ data: { csrf_token: "token" }, meta: {} });
      throw new TypeError("offline");
    },
  });
  await assert.rejects(() => client.request("/budgets", { method: "POST", body: {} }), ApiNetworkError);
  assert.equal(calls, 2);
});

test("API errors map to form messages and explicit retry states", () => {
  const validation = toServiceError(new ApiError(400, "validation_error", "Invalid form", { amount: ["Required"] }));
  assert.deepEqual(validation.errors, { amount: "Required" });
  assert.equal(validation.retryable, false);
  assert.equal(toServiceError(new ApiError(403, "csrf_failed", "Invalid CSRF")).error, "Invalid CSRF");
  assert.equal(toServiceError(new ApiError(404, "not_found", "Missing")).retryable, false);
  assert.equal(toServiceError(new ApiError(409, "conflict", "Already exists")).retryable, false);
  assert.equal(toServiceError(new ApiError(429, "rate_limit_exceeded", "Wait")).retryable, true);
  assert.equal(toServiceError(new ApiNetworkError(new TypeError("offline"))).retryable, true);
});

test("money adapters preserve decimal precision and reject unsafe inputs", () => {
  assert.equal(moneyToNumber("25000.50"), 25000.5);
  assert.equal(numberToMoney(0.29), "0.29");
  assert.throws(() => numberToMoney(1.005));
  assert.throws(() => moneyToNumber("100"));
});
