// Formatting helpers shared across the app.

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

/** Formats an amount as whole Naira: 32450 -> "₦32,450" */
export function formatNaira(amount: number): string {
  return nairaFormatter.format(amount);
}

/** Formats a value between 0 and 100 as a rounded percentage string. */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/** Relative day label for transaction rows: "Today", "Yesterday" or "12 Sep". */
export function formatDayLabel(dateInput: string): string {
  const date = new Date(dateInput);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const differenceDays = Math.round(
    (startOfToday.getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) /
      86_400_000,
  );

  if (differenceDays === 0) return "Today";
  if (differenceDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

/** Greeting based on the current hour. */
export function timeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Current period label, e.g. "September 2026". */
export function currentPeriodLabel(): string {
  return new Date().toLocaleDateString("en-NG", { month: "long", year: "numeric" });
}

/** First name from a full name, falling back to a default. */
export function firstNameOf(fullName: string | undefined): string {
  if (!fullName) return "there";
  return fullName.trim().split(/\s+/)[0] || "there";
}
