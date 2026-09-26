// Report export (Phase 3, section 17).
//
// PDF export prints a clean, self-contained HTML report through the browser's
// print-to-PDF dialog; image export draws the same summary onto a canvas and
// downloads a PNG. Both work without any external service.

import type { Budget, MonthlyInsight, ReportSummary, CategorySpending } from "../types";
import { formatNaira, formatPercent } from "../utils/format";

export interface ExportPayload {
  summary: ReportSummary;
  categories: CategorySpending[];
  budgets: Budget[];
  insight: MonthlyInsight | null;
  generatedAt: string;
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
  body { font-family: Georgia, "Times New Roman", serif; color: #16181d; margin: 40px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
  .stats { display: flex; gap: 24px; margin-bottom: 24px; }
  .stat { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 16px; min-width: 130px; }
  .stat .label { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; }
  .stat .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
  h2 { font-size: 15px; margin: 24px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid #eceef1; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; }
  td.num, th.num { text-align: right; }
  .insight { background: #f2fbf5; border: 1px solid #d3efe0; border-radius: 10px; padding: 14px 16px; font-size: 13px; line-height: 1.6; }
  .foot { margin-top: 28px; font-size: 11px; color: #9ca3af; }
</style>
</head>
<body>
  <h1>Campus Coin: ${escapeHtml(summary.periodLabel)}</h1>
  <p class="meta">Generated ${escapeHtml(payload.generatedAt)}</p>

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
  canvas.height = (insight ? 1180 : 1040) * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  // Background + header.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_W, canvas.height / scale);
  ctx.fillStyle = "#16181d";
  ctx.font = "bold 34px sans-serif";
  ctx.fillText(`Campus Coin: ${summary.periodLabel}`, 60, 80);
  ctx.fillStyle = "#6b7280";
  ctx.font = "18px sans-serif";
  ctx.fillText(`Generated ${payload.generatedAt}`, 60, 116);

  // Stat blocks.
  const stats: [string, string][] = [
    ["Income", formatNaira(summary.income)],
    ["Expenses", formatNaira(summary.expenses)],
    ["Net", formatNaira(summary.net)],
    ["Savings", formatNaira(summary.savings)],
  ];
  stats.forEach(([label, value], index) => {
    const x = 60 + index * 230;
    ctx.fillStyle = "#f6f7f9";
    ctx.beginPath();
    ctx.roundRect(x, 150, 210, 96, 12);
    ctx.fill();
    ctx.fillStyle = "#6b7280";
    ctx.font = "15px sans-serif";
    ctx.fillText(label, x + 18, 184);
    ctx.fillStyle = "#16181d";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(value, x + 18, 220);
  });

  // Category breakdown.
  let y = 310;
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
