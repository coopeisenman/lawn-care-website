export const SERVICE_LABELS: Record<string, string> = {
  lawn: "Lawn Service",
  leaf: "Leaf Cleanup",
  snow: "Snow Removal",
  other: "Other",
};

export function money(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** "2026-11-14" → "Sat, Nov 14" */
export function prettyDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Today's date in Nebraska as YYYY-MM-DD. */
export function todayLocal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
}

export const RECURRENCE_LABELS: Record<string, string> = {
  none: "One time",
  weekly: "Every week",
  biweekly: "Every 2 weeks",
  monthly: "Every month",
};

/** Cents → "45.00" for a form input. */
export function centsToInput(cents: number | null | undefined) {
  return cents == null ? "" : (cents / 100).toFixed(2);
}

export function prettyTimestamp(d: Date | null | undefined) {
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
}
