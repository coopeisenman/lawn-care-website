import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lt, lte, ne, or } from "drizzle-orm";
import { nextVisitDate } from "../dates";
import { getDb } from "../db";
import { customers, properties, services, invoices, invoiceLineItems } from "../db/schema";

/** Scheduled visits with their property and customer, between two dates (inclusive). */
export async function scheduledVisits(opts: { from?: string; before?: string; to?: string; propertyId?: string; customerId?: string }) {
  const db = await getDb();
  const conds = [eq(services.status, "scheduled")];
  if (opts.from) conds.push(gte(services.scheduledDate, opts.from));
  if (opts.before) conds.push(lt(services.scheduledDate, opts.before));
  if (opts.to) conds.push(lte(services.scheduledDate, opts.to));
  if (opts.propertyId) conds.push(eq(services.propertyId, opts.propertyId));
  if (opts.customerId) conds.push(eq(properties.customerId, opts.customerId));
  return db
    .select({ visit: services, property: properties, customer: { id: customers.id, name: customers.name } })
    .from(services)
    .innerJoin(properties, eq(properties.id, services.propertyId))
    .innerJoin(customers, eq(customers.id, properties.customerId))
    .where(and(...conds))
    .orderBy(asc(services.scheduledDate), asc(customers.name));
}

/** Completed visits that aren't on any invoice yet. */
export async function unbilledVisits(customerId?: string) {
  const db = await getDb();
  const conds = [eq(services.status, "completed"), isNull(invoiceLineItems.id)];
  if (customerId) conds.push(eq(properties.customerId, customerId));
  return db
    .select({ visit: services, property: properties, customer: { id: customers.id, name: customers.name } })
    .from(services)
    .innerJoin(properties, eq(properties.id, services.propertyId))
    .innerJoin(customers, eq(customers.id, properties.customerId))
    .leftJoin(invoiceLineItems, eq(invoiceLineItems.serviceId, services.id))
    .where(and(...conds))
    .orderBy(asc(customers.name), asc(services.scheduledDate));
}

/** Last completed or scheduled visits at a property, newest first. */
export async function visitHistory(propertyId: string, limit = 25) {
  const db = await getDb();
  return db
    .select({ visit: services, lineItemId: invoiceLineItems.id, invoiceId: invoiceLineItems.invoiceId })
    .from(services)
    .leftJoin(invoiceLineItems, eq(invoiceLineItems.serviceId, services.id))
    .where(and(eq(services.propertyId, propertyId), eq(services.status, "completed")))
    .orderBy(desc(services.scheduledDate))
    .limit(limit);
}

/** The most recent price used for each service type at a property. */
export async function lastPrices(propertyId: string) {
  const db = await getDb();
  const rows = await db
    .select({ type: services.type, priceCents: services.priceCents })
    .from(services)
    .where(eq(services.propertyId, propertyId))
    .orderBy(desc(services.scheduledDate));
  const map: Record<string, number> = {};
  for (const r of rows) if (!(r.type in map)) map[r.type] = r.priceCents;
  return map;
}

export async function customerInvoices(customerId: string) {
  const db = await getDb();
  return db.select().from(invoices).where(eq(invoices.customerId, customerId)).orderBy(desc(invoices.createdAt));
}

export type CalendarEntry = {
  key: string;
  date: string;
  kind: "scheduled" | "completed" | "planned";
  visit: typeof services.$inferSelect;
  property: typeof properties.$inferSelect;
  customer: { id: string; name: string };
};

/**
 * Everything to show on the calendar between two dates: real scheduled and completed
 * visits, plus "planned" future repeats of recurring visits. (A repeating visit only
 * creates its next real visit when the current one is done or skipped, so later
 * repeats are worked out here just for display.)
 */
export async function calendarEntries(from: string, to: string): Promise<CalendarEntry[]> {
  const db = await getDb();
  const rows = await db
    .select({ visit: services, property: properties, customer: { id: customers.id, name: customers.name } })
    .from(services)
    .innerJoin(properties, eq(properties.id, services.propertyId))
    .innerJoin(customers, eq(customers.id, properties.customerId))
    .where(
      and(
        lte(services.scheduledDate, to),
        or(
          // real visits shown in this range
          and(gte(services.scheduledDate, from), inArray(services.status, ["scheduled", "completed"])),
          // repeating visits (even earlier ones) whose repeats may land in this range
          and(eq(services.status, "scheduled"), ne(services.recurrence, "none")),
        ),
      ),
    )
    .orderBy(asc(services.scheduledDate), asc(customers.name));

  const entries: CalendarEntry[] = [];
  for (const r of rows) {
    const d = r.visit.scheduledDate;
    if (d >= from && r.visit.status !== "canceled") {
      entries.push({ key: r.visit.id, date: d, kind: r.visit.status === "completed" ? "completed" : "scheduled", ...r });
    }
    if (r.visit.status === "scheduled" && r.visit.recurrence !== "none") {
      let next = nextVisitDate(d, r.visit.recurrence);
      for (let i = 0; next && next <= to && i < 60; i++) {
        if (next >= from) entries.push({ key: `${r.visit.id}:${next}`, date: next, kind: "planned", ...r });
        next = nextVisitDate(next, r.visit.recurrence);
      }
    }
  }
  // Within a day: work still to do first, then planned repeats, then finished visits.
  const order = { scheduled: 0, planned: 1, completed: 2 };
  return entries.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || order[a.kind] - order[b.kind] || a.customer.name.localeCompare(b.customer.name),
  );
}
