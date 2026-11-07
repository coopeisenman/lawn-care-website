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

export const PAYMENT_LABELS: Record<string, string> = {
  stripe: "Card / bank (Stripe)",
  cash: "Cash",
  check: "Check",
  other: "Other",
};

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const CONTACT_LABELS: Record<string, string> = {
  in_person: "In person",
  text: "Text",
  email: "Email",
  phone: "Phone call",
  mail: "Mail",
  other: "Other",
  stripe: "Stripe",
  cash: "Cash",
  check: "Check",
};

/** "today", "yesterday", "3 days ago" */
export function daysAgo(d: Date) {
  const today = todayLocal();
  const then = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(d);
  const n = Math.round((Date.parse(today) - Date.parse(then)) / 86_400_000);
  return n <= 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`;
}

/** The friendly text message for a payment reminder. */
export function reminderMessage(o: { customerName: string; ownerName: string; cents: number; dueDate: string | null; overdue: number }) {
  const first = o.customerName.split(" ")[0];
  const due = o.dueDate ? ` (due ${prettyDate(o.dueDate)})` : "";
  return (
    `Hi ${first}, this is ${o.ownerName.split(" ")[0]} with Westward Property Care. ` +
    `Just a friendly reminder that your invoice for ${money(o.cents)}${due} ` +
    `${o.overdue > 0 ? "is past due" : "is still open"}. ` +
    `If you've already paid, thank you and please ignore this! Any questions, just reply here.`
  );
}

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Estimate given",
  won: "Won",
  lost: "Lost",
};

export const REQUEST_SERVICE_LABELS: Record<string, string> = {
  lawn: "Lawn Service",
  leaf: "Leaf Cleanup",
  snow: "Snow Removal",
  multiple: "Multiple services",
};
