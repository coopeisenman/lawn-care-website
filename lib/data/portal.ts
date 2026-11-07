import "server-only";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { properties, services, invoices } from "../db/schema";
import { requireCustomer } from "../session";
import { todayLocal } from "../format";

// Everything a customer sees. The customer id always comes from their login.
export async function getPortalData() {
  const { customer } = await requireCustomer();
  const db = await getDb();

  const myProperties = await db
    .select()
    .from(properties)
    .where(eq(properties.customerId, customer.id))
    .orderBy(asc(properties.address));

  const propertyIds = myProperties.map((p) => p.id);
  const today = todayLocal();

  const upcoming = propertyIds.length
    ? await db
        .select()
        .from(services)
        .where(
          and(
            inArray(services.propertyId, propertyIds),
            eq(services.status, "scheduled"),
            gte(services.scheduledDate, today),
          ),
        )
        .orderBy(asc(services.scheduledDate))
        .limit(20)
    : [];

  const myInvoices = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.customerId, customer.id), inArray(invoices.status, ["open", "paid", "uncollectible"])))
    .orderBy(desc(invoices.createdAt));

  return { customer, properties: myProperties, upcoming, invoices: myInvoices };
}
