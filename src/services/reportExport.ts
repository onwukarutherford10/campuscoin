// Report export (Phase 3, section 17).
//
// PDF export prints a clean, self-contained HTML report through the browser's
// print-to-PDF dialog; image export draws the same summary onto a canvas and
// downloads a PNG. Both work without any external service.

import type { Budget, MonthlyInsight, ReportSummary, CategorySpending } from "../types";
import { formatNaira, formatPercent } from "../utils/format";
import type { Category, ReportFilters } from "../types";
import { DATA_MODE } from "./api/config";
import { api } from "./api";
import type { ApiJob } from "./api/dto";
import { reportApiOptions } from "./reportService";

export interface ExportPayload {
  summary: ReportSummary;
  categories: CategorySpending[];
  budgets: Budget[];
  insight: MonthlyInsight | null;
  generatedAt: string;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function waitForJob(statusUrl: string): Promise<ApiJob> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const job = (await api.request<ApiJob>(statusUrl)).data;
    if (job.status === "succeeded") return job;
    if (job.status === "failed" || job.status === "cancelled") {
      throw new Error(job.error || "Report export failed.");
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1000));
  }
  throw new Error("The report is still being prepared. Please try again shortly.");
}

export async function exportServerReport(
  format: "pdf" | "png",
  filters: ReportFilters,
  categories: Category[],
): Promise<void> {
  const result = await api.requestBinary<ApiJob>("/reports/exports", {
    method: "POST",
    body: { ...reportApiOptions(filters, categories), format },
  });
  if (result.kind === "file") {
    downloadBlob(result.blob, result.filename || `campuscoin-report.${format}`);
    return;
  }
  const job = await waitForJob(result.response.data.status_url);
  const downloadUrl = job.result?.download_url;
  if (!downloadUrl) throw new Error("The completed export has no download link.");
  const download = await api.requestBinary<never>(downloadUrl);
  if (download.kind !== "file") throw new Error("The export download is not ready.");
  downloadBlob(download.blob, download.filename || `campuscoin-report.${format}`);
}

export async function exportReport(
  format: "pdf" | "png",
  filters: ReportFilters,
  categories: Category[],
  payload: ExportPayload,
): Promise<void> {
  if (DATA_MODE === "live") return exportServerReport(format, filters, categories);
  if (format === "pdf") exportReportPdf(payload);
  else exportReportImage(payload);
}

function budgetStatus(budget: Budget): { label: string; value: string } {
  const percentage = budget.limit === 0 ? 0 : (budget.spent / budget.limit) * 100;
  const remaining = budget.limit - budget.spent;
  const label =
    percentage > 100 ? "Exceeded" : percentage >= 80 ? "Near limit" : "On track";
  const value =
    remaining >= 0
      ? `${formatNaira(remaining)} remaining`
      : `${formatNaira(Math.abs(remaining))} over budget`;
  return { label, value };
}

/** Self-contained HTML document for printing or saving as PDF. */
export function buildReportHtml(payload: ExportPayload): string {
  const { summary, categories, budgets, insight } = payload;

  const categoryRows = categories
    .map(
      (entry) => `
        <tr>
          <td>${escapeHtml(entry.category)}</td>
          <td class="num">${formatNaira(entry.amount)}</td>
          <td class="num">${formatPercent(entry.percentage)}</td>
        </tr>`,
    )
    .join("");

  const budgetRows = budgets
    .map((budget) => {
      const status = budgetStatus(budget);
      return `
        <tr>
          <td>${escapeHtml(budget.category)}</td>
          <td class="num">${formatNaira(budget.spent)} / ${formatNaira(budget.limit)}</td>
          <td>${status.label}: ${status.value}</td>
        </tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Campus Coin report: ${escapeHtml(summary.periodLabel)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #151816; margin: 0; }
  .banner { background: #151816; color: #fff; padding: 38px 42px; }
  .brand { color: #a8edbe; font-size: 12px; font-weight: 800; letter-spacing: .09em; margin-bottom: 25px; }
  .content { padding: 30px 42px 45px; }
  h1 { font-size: 28px; margin: 0 0 9px; }
  .meta { color: #d4ded7; font-size: 12px; margin: 0; }
  .stats { display: flex; gap: 24px; margin-bottom: 24px; }
  .stat { background: #f5f7f5; border-radius: 12px; padding: 16px; min-width: 130px; flex: 1; }
  .stat:last-child { background: #eaf7ef; }
  .stat .label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #637168; }
  .stat .value { font-size: 17px; font-weight: 700; margin-top: 7px; }
  h2 { font-size: 15px; margin: 24px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 9px 8px; border-bottom: 1px solid #e3e9e5; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; }
  td.num, th.num { text-align: right; }
  .insight { background: #eaf7ef; border-radius: 12px; padding: 14px 16px; font-size: 13px; line-height: 1.6; }
  .foot { margin-top: 28px; font-size: 11px; color: #9ca3af; }
  @media print { .banner { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .stat, .insight { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="banner"><div class="brand">CAMPUS COIN</div><h1>Your money, clearly.</h1>
  <p class="meta">${escapeHtml(summary.periodLabel)} · Generated ${escapeHtml(payload.generatedAt)}</p></div>
  <div class="content">

  <div class="stats">
    <div class="stat"><div class="label">Income</div><div class="value">${formatNaira(summary.income)}</div></div>
    <div class="stat"><div class="label">Expenses</div><div class="value">${formatNaira(summary.expenses)}</div></div>
    <div class="stat"><div class="label">Net</div><div class="value">${formatNaira(summary.net)}</div></div>
    <div class="stat"><div class="label">Savings</div><div class="value">${formatNaira(summary.savings)}</div></div>
  </div>

  <h2>Spending by category</h2>
  <table>
    <thead><tr><th>Category</th><th class="num">Spent</th><th class="num">Share</th></tr></thead>
    <tbody>${categoryRows || '<tr><td colspan="3">No expenses in this period.</td></tr>'}</tbody>
  </table>

  <h2>Budget status</h2>
  <table>
    <thead><tr><th>Budget</th><th class="num">Spent / limit</th><th>Status</th></tr></thead>
    <tbody>${budgetRows || '<tr><td colspan="3">No budgets set yet.</td></tr>'}</tbody>
  </table>

  ${
    insight
      ? `<h2>Key insight: ${escapeHtml(insight.month)}</h2>
  <div class="insight">
    <p><strong>Review.</strong> ${escapeHtml(insight.summary)}</p>
    <p><strong>What changed.</strong> ${escapeHtml(insight.change)}</p>
    <p><strong>What you could try.</strong> ${escapeHtml(insight.suggestion)}</p>
  </div>`
      : ""
  }

  <p class="foot">Campus Coin: student finance, explained simply. Insights are guidance, not financial advice.</p>
</div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Opens the print dialog on a hidden copy of the report (save as PDF). */
export function exportReportPdf(payload: ExportPayload): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!iframe.contentWindow || !doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(buildReportHtml(payload));
  doc.close();

  // Give the document a beat to lay out, then hand it to the print dialog.
  const printWindow = iframe.contentWindow;
  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
    window.setTimeout(() => iframe.remove(), 1000);
  }, 250);
}

const CANVAS_W = 1000;
const LINE_HEIGHT = 30;

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
): number {
  const words = text.split(" ");
  let line = "";
  let cursor = y;
  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word;
    if (ctx.measureText(attempt).width > maxWidth && line) {
      ctx.fillText(line, x, cursor);
      line = word;
      cursor += LINE_HEIGHT;
    } else {
      line = attempt;
    }
  }
  if (line) {
    ctx.fillText(line, x, cursor);
    cursor += LINE_HEIGHT;
  }
  return cursor;
}

/** Renders the same summary as a PNG and downloads it. */
export function exportReportImage(payload: ExportPayload): void {
  const { summary, categories, budgets, insight } = payload;
  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = CANVAS_W * scale;
  canvas.height = Math.max(1100,
    700 + Math.max(1, Math.min(categories.length, 8)) * 36
      + Math.max(1, Math.min(budgets.length, 5)) * 36 + (insight ? 320 : 0)) * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  // Brand header and quiet white report canvas.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_W, canvas.height / scale);
  ctx.fillStyle = "#151816";
  ctx.fillRect(0, 0, CANVAS_W, 280);
  ctx.fillStyle = "#a8edbe";
  ctx.font = "bold 19px sans-serif";
  ctx.fillText("CAMPUS COIN", 60, 60);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px sans-serif";
  ctx.fillText("Your money, clearly.", 60, 120);
  ctx.fillStyle = "#d4ded7";
  ctx.font = "18px sans-serif";
  ctx.fillText(`${summary.periodLabel} · Generated ${payload.generatedAt}`, 60, 160);

  // Stat blocks.
  const stats: [string, string][] = [
    ["Income", formatNaira(summary.income)],
    ["Expenses", formatNaira(summary.expenses)],
    ["Net", formatNaira(summary.net)],
    ["Savings", formatNaira(summary.savings)],
  ];
  stats.forEach(([label, value], index) => {
    const x = 60 + index * 230;
    ctx.fillStyle = index === 3 ? "#eaf7ef" : "#f5f7f5";
    ctx.beginPath();
    ctx.roundRect(x, 300, 210, 96, 12);
    ctx.fill();
    ctx.fillStyle = "#6b7280";
    ctx.font = "15px sans-serif";
    ctx.fillText(label, x + 18, 334);
    ctx.fillStyle = "#16181d";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(value, x + 18, 370);
  });

  // Category breakdown.
  let y = 450;
  ctx.fillStyle = "#16181d";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("Spending by category", 60, y);
  y += 26;
  const maxCategory = Math.max(...categories.map((entry) => entry.amount), 1);
  for (const entry of categories.slice(0, 8)) {
    y += 34;
    ctx.font = "17px sans-serif";
    ctx.fillStyle = "#16181d";
    ctx.fillText(entry.category, 60, y);
    ctx.fillStyle = "#9ca3af";
    ctx.textAlign = "right";
    ctx.fillText(`${formatNaira(entry.amount)} · ${formatPercent(entry.percentage)}`, 940, y);
    ctx.textAlign = "left";
    ctx.fillStyle = "#eef0f2";
    ctx.fillRect(260, y - 14, 500, 14);
    ctx.fillStyle = "#2f9e62";
    ctx.fillRect(260, y - 14, (entry.amount / maxCategory) * 500, 14);
  }
  if (categories.length === 0) {
    y += 34;
    ctx.fillStyle = "#6b7280";
    ctx.font = "17px sans-serif";
    ctx.fillText("No expenses in this period.", 60, y);
  }

  // Budget status.
  y += 70;
  ctx.fillStyle = "#16181d";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("Budget status", 60, y);
  y += 30;
  if (budgets.length === 0) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "17px sans-serif";
    ctx.fillText("No budgets set yet.", 60, y);
  }
  for (const budget of budgets.slice(0, 5)) {
    const status = budgetStatus(budget);
    y += 34;
    ctx.font = "17px sans-serif";
    ctx.fillStyle = "#16181d";
    ctx.fillText(budget.category, 60, y);
    ctx.fillStyle = "#6b7280";
    ctx.fillText(`${formatNaira(budget.spent)} / ${formatNaira(budget.limit)}`, 300, y);
    ctx.fillStyle =
      status.label === "Exceeded" ? "#dc2626" : status.label === "Near limit" ? "#d97706" : "#2f9e62";
    ctx.fillText(`${status.label}: ${status.value}`, 620, y);
  }

  // Key insight.
  if (insight) {
    y += 80;
    ctx.fillStyle = "#f2fbf5";
    ctx.beginPath();
    ctx.roundRect(50, y - 40, 900, 240, 14);
    ctx.fill();
    ctx.fillStyle = "#16181d";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(`Key insight: ${insight.month}`, 76, y);
    ctx.font = "17px sans-serif";
    let cursor = y + 34;
    cursor = wrapText(ctx, `Review: ${insight.summary}`, 76, cursor, 850);
    cursor = wrapText(ctx, `What changed: ${insight.change}`, 76, cursor + 6, 850);
    wrapText(ctx, `What you could try: ${insight.suggestion}`, 76, cursor + 6, 850);
  }

  ctx.fillStyle = "#9ca3af";
  ctx.font = "14px sans-serif";
  ctx.fillText("Campus Coin: guidance, not financial advice.", 60, canvas.height / scale - 40);

  const link = document.createElement("a");
  link.download = `campuscoin-report-${summary.periodLabel.toLowerCase().replace(/\s+/g, "-")}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
