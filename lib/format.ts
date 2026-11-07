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
