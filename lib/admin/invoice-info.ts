import "server-only";
import { and, desc, eq, inArray, max } from "drizzle-orm";
import { getDb } from "../db";
import { invoiceEvents } from "../db/schema";

/** Days an open invoice is past its due date (0 if not overdue). */
export function daysOverdue(inv: { status: string; dueDate: string | null }, today: string) {
  if (inv.status !== "open" || !inv.dueDate || inv.dueDate >= today) return 0;
  return Math.round((Date.parse(today) - Date.parse(inv.dueDate)) / 86_400_000);
}

/** Most recent reminder for each invoice. */
export async function lastReminders(invoiceIds: string[]) {
  if (!invoiceIds.length) return new Map<string, Date>();
  const db = await getDb();
  const rows = await db
    .select({ invoiceId: invoiceEvents.invoiceId, at: max(invoiceEvents.at) })
    .from(invoiceEvents)
    .where(and(inArray(invoiceEvents.invoiceId, invoiceIds), eq(invoiceEvents.type, "reminder")))
    .groupBy(invoiceEvents.invoiceId);
  // max() may come back as a Date or a raw number depending on the driver
  const toDate = (v: unknown) => new Date(v instanceof Date ? v.getTime() : Number(v));
  return new Map(rows.filter((r) => r.at != null).map((r) => [r.invoiceId, toDate(r.at)]));
}

export async function invoiceHistory(invoiceId: string) {
  const db = await getDb();
  return db.select().from(invoiceEvents).where(eq(invoiceEvents.invoiceId, invoiceId)).orderBy(desc(invoiceEvents.at));
}
