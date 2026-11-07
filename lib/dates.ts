import type { RECURRENCES } from "./constants";

/** Adds days to a YYYY-MM-DD date. */
export function addDays(ymd: string, days: number) {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Same day next month (Jan 31 → Feb 28). */
export function addMonth(ymd: string) {
  const [y, m, day] = ymd.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

export function nextVisitDate(ymd: string, recurrence: (typeof RECURRENCES)[number]) {
  if (recurrence === "weekly") return addDays(ymd, 7);
  if (recurrence === "biweekly") return addDays(ymd, 14);
  if (recurrence === "monthly") return addMonth(ymd);
  return null;
}
