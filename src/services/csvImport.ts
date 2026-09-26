// CSV transaction import (Phase 3, sections 8–9).
//
// Parsing and validation happen before anything is written: the preview
// shows every row with its errors, category suggestions fill the blanks and
// only a confirmed import creates transactions.

import type { ImportRow, ServiceResult } from "../types";
import { delay, newId } from "./store";
import { suggestCategory } from "./categorySuggest";
import { createTransaction } from "./transactionService";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "./categoryService";

export const CSV_COLUMNS = "date, description, amount, type, category";
export const CSV_EXAMPLE = "2026-09-21,Campus Cafe,2500,expense,Food";

const REQUIRED_COLUMNS = ["date", "description", "amount", "type"] as const;

/** Splits one CSV line, honouring quoted fields and doubled quotes. */
function splitLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

/** Field-level validation; run on parse and again after every preview edit. */
export function validateImportRow(row: ImportRow): ImportRow {
  const errors: Record<string, string> = {};
  const rawType = row.rawType ?? row.type;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || Number.isNaN(Date.parse(row.date))) {
    errors.date = "Use the date format yyyy-mm-dd.";
  }
  if (!row.description.trim()) errors.description = "Add a description.";
  const amount = Number(row.amount.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Enter an amount greater than zero.";
  }
  if (rawType !== "income" && rawType !== "expense") {
    errors.type = "Type must be income or expense.";
  }
  if (!row.category.trim()) {
    errors.category = "Choose a category.";
  } else {
    const known = row.type === "income" ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
    if (!known.includes(row.category)) errors.category = "Pick a category from your list.";
  }

  return { ...row, errors };
}

/**
 * Parses CSV text into preview rows. Expects a header row containing the
 * required columns; rows are validated immediately so the preview flags
 * exactly what needs resolving before import.
 */
export function parseCsv(text: string): { rows: ImportRow[]; fileErrors: string[] } {
  const fileErrors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return { rows: [], fileErrors: ["That file looks empty."] };

  const header = splitLine(lines[0]).map((cell) => cell.toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((column) => !header.includes(column));
  if (missing.length > 0) {
    return {
      rows: [],
      fileErrors: [
        `Your header is missing: ${missing.join(", ")}. Expected columns: ${CSV_COLUMNS}.`,
      ],
    };
  }

  const indexOf = (column: string) => header.indexOf(column);
  const rows: ImportRow[] = [];

  for (const line of lines.slice(1)) {
    const cells = splitLine(line);
    const rawType = (cells[indexOf("type")] ?? "").toLowerCase();
    const row: ImportRow = {
      id: newId("row"),
      date: cells[indexOf("date")] ?? "",
      description: cells[indexOf("description")] ?? "",
      amount: cells[indexOf("amount")] ?? "",
      type: rawType === "income" ? "income" : "expense",
      rawType,
      category: cells[indexOf("category")] ?? "",
      errors: {},
    };
    rows.push(validateImportRow(row));
  }

  if (rows.length === 0) fileErrors.push("No data rows found under the header.");
  return { rows, fileErrors };
}

/**
 * Fills empty categories with advisory suggestions (batch categorization).
 * Suggestions are applied as editable values — the user reviews them in the
 * preview before anything is imported.
 */
export async function suggestImportCategories(rows: ImportRow[]): Promise<ImportRow[]> {
  const filled = await Promise.all(
    rows.map(async (row) => {
      if (row.category.trim() || row.errors.date || row.errors.amount || row.errors.type) {
        return row;
      }
      const suggestion = await suggestCategory(row.description, row.type);
      if (!suggestion) return row;
      return { ...row, category: suggestion.category, suggested: true };
    }),
  );
  return delay(filled.map(validateImportRow), 250);
}

export interface ImportOutcome {
  imported: number;
  skipped: number;
}

/**
 * Confirmed import: creates every valid row, skips invalid ones.
 * Never inserts anything on its own — the preview must be confirmed first.
 */
export async function importRows(rows: ImportRow[]): Promise<ServiceResult<ImportOutcome>> {
  const validated = rows.map(validateImportRow);
  const valid = validated.filter((row) => Object.keys(row.errors).length === 0);
  if (valid.length === 0) {
    return { ok: false, error: "There are no valid rows to import yet." };
  }

  let imported = 0;
  for (const row of valid) {
    const result = await createTransaction({
      type: row.type,
      description: row.description.trim(),
      amount: Number(row.amount.replace(/,/g, "")),
      category: row.category.trim(),
      date: row.date,
    });
    if (result.ok) imported += 1;
  }

  return delay(
    { ok: true, data: { imported, skipped: validated.length - imported } },
    500,
  );
}
