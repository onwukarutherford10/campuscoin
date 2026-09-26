import { Fragment, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Sparkles, Upload, X } from "lucide-react";
import type { ImportRow, ServiceResult, TransactionType } from "../../types";
import {
  CSV_COLUMNS,
  CSV_EXAMPLE,
  importRows,
  parseCsv,
  suggestImportCategories,
  validateImportRow,
  type ImportOutcome,
} from "../../services/csvImport";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "../../services/categoryService";
import { toast } from "../../services/toast";

interface CsvImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

const cellClass =
  "h-9 w-full min-w-0 rounded-lg border border-line px-2 text-[13px] outline-none transition focus:border-brand";

/**
 * CSV import with preview, per-row validation, batch suggestions and an
 * explicit confirm step — nothing is inserted until Confirm is pressed.
 */
export function CsvImportModal({ onClose, onImported }: CsvImportModalProps) {
  const [stage, setStage] = useState<"upload" | "preview">("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setFileErrors([]);
    setSubmitError("");

    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.fileErrors.length > 0 || parsed.rows.length === 0) {
        setFileErrors(parsed.fileErrors);
        return;
      }
      // Batch categorization: fill blanks with editable suggestions.
      const withSuggestions = await suggestImportCategories(parsed.rows);
      setRows(withSuggestions);
      setStage("preview");
    } catch {
      setFileErrors(["We couldn't read that file. Please export it as CSV and try again."]);
    } finally {
      setParsing(false);
      event.target.value = "";
    }
  }

  function updateRow(id: string, patch: Partial<ImportRow>) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        const merged = { ...row, ...patch };
        // The raw type tracks manual edits so the type check revalidates.
        if (patch.type) merged.rawType = patch.type;
        return validateImportRow(merged);
      }),
    );
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  async function confirmImport() {
    setSubmitting(true);
    setSubmitError("");
    const result: ServiceResult<ImportOutcome> = await importRows(rows);
    setSubmitting(false);

    if (!result.ok || !result.data) {
      setSubmitError(result.error ?? "We couldn't import those rows.");
      return;
    }
    toast.success(
      result.data.skipped > 0
        ? `Imported ${result.data.imported} transactions, ${result.data.skipped} skipped.`
        : `Imported ${result.data.imported} transactions.`,
    );
    onImported();
    onClose();
  }

  const invalidCount = rows.filter((row) => Object.keys(row.errors).length > 0).length;
  const readyCount = rows.length - invalidCount;
  const hasSuggestions = rows.some((row) => row.suggested);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white"
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 id="import-title" className="text-base font-semibold text-gray-900">
              Import transactions
            </h2>
            <p className="mt-0.5 text-[13px] text-gray-500">
              {stage === "upload" ? "Upload a CSV, review the preview, then confirm." : "Review every row before importing."}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </header>

        {stage === "upload" ? (
          <div className="overflow-y-auto px-6 py-5">
            <p className="text-sm text-gray-600">
              Your file needs a header row with these columns:
            </p>
            <code className="mt-2 block rounded-xl bg-gray-50 px-4 py-2.5 text-[13px] text-gray-700">
              {CSV_COLUMNS}
            </code>
            <p className="mt-2 text-[13px] text-gray-500">
              Example: <span className="text-gray-600">{CSV_EXAMPLE}</span>
            </p>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={parsing}
              className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-line bg-gray-50/60 px-6 py-10 text-center transition hover:border-brand hover:bg-brand-soft/40 disabled:opacity-60"
            >
              <Upload size={22} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                {parsing ? "Reading your file…" : "Choose a CSV file"}
              </span>
              <span className="text-[13px] text-gray-500">
                Nothing is imported until you confirm the preview.
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="hidden"
              aria-label="Choose CSV file"
            />

            {fileErrors.map((error) => (
              <p key={error} className="mt-3 text-[13px] text-red-600">
                {error}
              </p>
            ))}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {hasSuggestions && (
              <p className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-brand-soft/60 px-4 py-2.5 text-[13px] text-brand-dark">
                <Sparkles size={14} className="shrink-0" />
                Category suggestions available. Review them below; every suggestion stays editable.
              </p>
            )}

            <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
              <table className="w-full min-w-[680px] border-collapse">
                <thead>
                  <tr className="text-left text-[12px] uppercase tracking-wide text-gray-400">
                    <th className="pb-2 pr-2 font-medium">Date</th>
                    <th className="pb-2 pr-2 font-medium">Description</th>
                    <th className="pb-2 pr-2 font-medium">Amount</th>
                    <th className="pb-2 pr-2 font-medium">Type</th>
                    <th className="pb-2 pr-2 font-medium">Category</th>
                    <th className="pb-2 font-medium" aria-label="Remove" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const errorList = Object.values(row.errors);
                    const options =
                      row.type === "income" ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
                    const selectOptions =
                      row.category && !options.includes(row.category)
                        ? [row.category, ...options]
                        : options;
                    return (
                      <Fragment key={row.id}>
                        <tr className="align-top">
                          <td className="py-1.5 pr-2">
                            <input
                              value={row.date}
                              onChange={(event) => updateRow(row.id, { date: event.target.value })}
                              aria-label="Row date"
                              className={cellClass}
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <input
                              value={row.description}
                              onChange={(event) => updateRow(row.id, { description: event.target.value })}
                              aria-label="Row description"
                              className={cellClass}
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <input
                              value={row.amount}
                              inputMode="decimal"
                              onChange={(event) => updateRow(row.id, { amount: event.target.value })}
                              aria-label="Row amount"
                              className={cellClass}
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <select
                              value={row.type}
                              onChange={(event) =>
                                updateRow(row.id, { type: event.target.value as TransactionType })
                              }
                              aria-label="Row type"
                              className={cellClass}
                            >
                              <option value="expense">expense</option>
                              <option value="income">income</option>
                            </select>
                          </td>
                          <td className="py-1.5 pr-2">
                            <span className="flex items-center gap-1">
                              <select
                                value={row.category}
                                onChange={(event) =>
                                  updateRow(row.id, { category: event.target.value, suggested: false })
                                }
                                aria-label="Row category"
                                className={cellClass}
                              >
                                <option value="">Choose…</option>
                                {selectOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                              {row.suggested && (
                                <Sparkles size={13} className="shrink-0 text-brand" aria-label="Suggested" />
                              )}
                            </span>
                          </td>
                          <td className="py-1.5">
                            <button
                              type="button"
                              aria-label={`Remove row ${row.description || row.date}`}
                              onClick={() => removeRow(row.id)}
                              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <X size={15} />
                            </button>
                          </td>
                        </tr>
                        {errorList.length > 0 && (
                          <tr>
                            <td colSpan={6} className="pb-2 text-[12px] text-red-600">
                              {errorList.join(" ")}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>

              {rows.length === 0 && (
                <p className="rounded-xl border border-line bg-gray-50/50 px-4 py-6 text-center text-[13px] text-gray-500">
                  All rows removed. Close and try another file.
                </p>
              )}
            </div>

            <footer className="border-t border-line px-6 py-4">
              <p className="text-[13px] text-gray-500">
                <span className="font-medium text-brand-dark">{readyCount} ready</span>
                {invalidCount > 0 && (
                  <>
                    {" · "}
                    <span className="font-medium text-red-600">{invalidCount} need attention</span>
                  </>
                )}
                {" · "}imported rows join your existing transactions.
              </p>
              {submitError && <p className="mt-2 text-[13px] text-red-600">{submitError}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-line bg-white py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmImport}
                  disabled={submitting || rows.length === 0 || invalidCount > 0}
                  className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {submitting ? "Importing…" : `Import ${readyCount} transactions`}
                </button>
              </div>
              {invalidCount > 0 && (
                <p className="mt-2 text-center text-[12px] text-gray-400">
                  Fix or remove the rows that need attention to continue.
                </p>
              )}
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}

export default CsvImportModal;
