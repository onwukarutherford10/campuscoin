export type DataMode = "mock" | "live";

function dataMode(value: string | undefined): DataMode {
  if (value === undefined || value === "mock") return "mock";
  if (value === "live") return "live";
  throw new Error(`Invalid VITE_DATA_MODE: ${value}`);
}

export const DATA_MODE = dataMode(import.meta.env.VITE_DATA_MODE);
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
