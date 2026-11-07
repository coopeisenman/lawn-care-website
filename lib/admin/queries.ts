import "server-only";
import { and, asc, desc, eq, gte, isNull, lt, lte } from "drizzle-orm";
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
