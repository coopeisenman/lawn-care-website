"use server";

// Everything the owner can change. Every action starts with requireAdmin(),
// so none of these can be run by a customer or a logged-out visitor.

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "../db";
import {
  customers,
  properties,
  services,
  invoices,
  invoiceLineItems,
  user,
  SERVICE_TYPES,
  RECURRENCES,
} from "../db/schema";
import { requireAdmin } from "../session";
import { nextVisitDate, addDays } from "../dates";
import { todayLocal, SERVICE_LABELS, prettyDate } from "../format";
import {
  FormError,
  handle,
  text,
  requiredText,
  moneyToCents,
  dateField,
  oneOf,
  email,
  type ActionState,
} from "../forms";

const refresh = () => revalidatePath("/admin", "layout");

/* ───────────── Customers ───────────── */

function customerFields(form: FormData) {
  return {
    name: requiredText(form, "name", "Enter the customer's name.", 120),
    email: email(form, "email"),
    phone: text(form, "phone", { max: 40 }),
    notes: text(form, "notes"),
  };
}

export async function createCustomer(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  let id = "";
  const result = await handle(async () => {
    const db = await getDb();
    const [row] = await db.insert(customers).values(customerFields(form)).returning({ id: customers.id });
    id = row.id;
  });
  if (result.error) return result;
  refresh();
  redirect(`/admin/customers/${id}`);
}

export async function updateCustomer(customerId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  return handle(async () => {
    const db = await getDb();
    const existing = await db.query.customers.findFirst({ where: eq(customers.id, customerId) });
    if (!existing) throw new FormError("Customer not found.");
    const fields = customerFields(form);

    if (existing.userId) {
      // Their portal login uses this email, so keep the two in sync.
      if (!fields.email) throw new FormError("This customer has portal access, so they need an email. Remove portal access first to clear it.");
      const taken = await db.query.user.findFirst({ where: eq(user.email, fields.email) });
      if (taken && taken.id !== existing.userId) throw new FormError("Another login already uses that email.");
      await db.batch([
        db.update(customers).set(fields).where(eq(customers.id, customerId)),
        db.update(user).set({ email: fields.email, name: fields.name }).where(eq(user.id, existing.userId)),
      ]);
    } else {
      await db.update(customers).set(fields).where(eq(customers.id, customerId));
    }
    refresh();
    return { ok: "Saved." };
  });
}

export async function deleteCustomer(customerId: string) {
  await requireAdmin();
  const db = await getDb();
  const existing = await db.query.customers.findFirst({ where: eq(customers.id, customerId) });
  if (!existing) redirect("/admin/customers");
  const hasInvoices = await db.query.invoices.findFirst({ where: eq(invoices.customerId, customerId) });
  if (hasInvoices) redirect(`/admin/customers/${customerId}?error=has-invoices`);

  // Deleting the customer also removes their properties and visits.
  await db.delete(customers).where(eq(customers.id, customerId));
  if (existing.userId) await db.delete(user).where(eq(user.id, existing.userId));
  refresh();
  redirect("/admin/customers?deleted=1");
}

/** Creates a portal login for the customer, using their email. */
export async function givePortalAccess(customerId: string) {
  await requireAdmin();
  const db = await getDb();
  const c = await db.query.customers.findFirst({ where: eq(customers.id, customerId) });
  if (!c || c.userId) redirect(`/admin/customers/${customerId}`);
  if (!c.email) redirect(`/admin/customers/${customerId}?error=needs-email`);
  const taken = await db.query.user.findFirst({ where: eq(user.email, c.email) });
  if (taken) redirect(`/admin/customers/${customerId}?error=email-taken`);

  const userId = crypto.randomUUID();
  await db.batch([
    db.insert(user).values({ id: userId, name: c.name, email: c.email, emailVerified: true, role: "customer" }),
    db.update(customers).set({ userId }).where(eq(customers.id, customerId)),
  ]);
  refresh();
  redirect(`/admin/customers/${customerId}?portal=on`);
}

export async function removePortalAccess(customerId: string) {
  await requireAdmin();
  const db = await getDb();
  const c = await db.query.customers.findFirst({ where: eq(customers.id, customerId) });
  if (c?.userId) {
    // Removing the login also signs them out everywhere; the customer record stays.
    await db.delete(user).where(and(eq(user.id, c.userId), eq(user.role, "customer")));
  }
  refresh();
  redirect(`/admin/customers/${customerId}`);
}

/* ───────────── Properties ───────────── */

function propertyFields(form: FormData) {
  return {
    address: requiredText(form, "address", "Enter the street address.", 200),
    city: requiredText(form, "city", "Enter the city.", 80),
    state: (text(form, "state", { max: 2 }) ?? "NE").toUpperCase(),
    zip: text(form, "zip", { max: 10 }),
    notes: text(form, "notes"),
  };
}

export async function createProperty(customerId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  let id = "";
  const result = await handle(async () => {
    const db = await getDb();
    const c = await db.query.customers.findFirst({ where: eq(customers.id, customerId) });
    if (!c) throw new FormError("Customer not found.");
    const [row] = await db
      .insert(properties)
      .values({ customerId, ...propertyFields(form) })
      .returning({ id: properties.id });
    id = row.id;
  });
  if (result.error) return result;
  refresh();
  redirect(`/admin/properties/${id}`);
}

export async function updateProperty(propertyId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  return handle(async () => {
    const db = await getDb();
    await db.update(properties).set(propertyFields(form)).where(eq(properties.id, propertyId));
    refresh();
    return { ok: "Saved." };
  });
}

export async function deleteProperty(propertyId: string) {
  await requireAdmin();
  const db = await getDb();
  const p = await db.query.properties.findFirst({ where: eq(properties.id, propertyId) });
  if (!p) redirect("/admin/customers");
  const billed = await db
    .select({ id: invoiceLineItems.id })
    .from(invoiceLineItems)
    .innerJoin(services, eq(services.id, invoiceLineItems.serviceId))
    .where(eq(services.propertyId, propertyId))
    .limit(1);
  if (billed.length) redirect(`/admin/properties/${propertyId}?error=billed`);
  await db.delete(properties).where(eq(properties.id, propertyId));
  refresh();
  redirect(`/admin/customers/${p.customerId}`);
}

/* ───────────── Visits ───────────── */

function visitFields(form: FormData) {
  return {
    type: oneOf(form, "type", SERVICE_TYPES, "Pick a service."),
    scheduledDate: dateField(form, "scheduledDate"),
    priceCents: moneyToCents(form, "price"),
    recurrence: oneOf(form, "recurrence", RECURRENCES, "Pick how often."),
    description: text(form, "description", { max: 200 }),
    notes: text(form, "notes"),
  };
}

export async function scheduleVisit(propertyId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  return handle(async () => {
    const db = await getDb();
    const p = await db.query.properties.findFirst({ where: eq(properties.id, propertyId) });
    if (!p) throw new FormError("Property not found.");
    const fields = visitFields(form);
    await db.insert(services).values({ propertyId, ...fields });
    refresh();
    return { ok: `${SERVICE_LABELS[fields.type]} scheduled for ${prettyDate(fields.scheduledDate)}.` };
  });
}

export async function updateVisit(visitId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  return handle(async () => {
    const db = await getDb();
    const v = await db.query.services.findFirst({ where: eq(services.id, visitId) });
    if (!v) throw new FormError("Visit not found.");
    if (v.status !== "scheduled") throw new FormError("Only upcoming visits can be changed.");
    await db.update(services).set(visitFields(form)).where(eq(services.id, visitId));
    refresh();
    return { ok: "Saved." };
  });
}

async function loadScheduledVisit(visitId: string) {
  const db = await getDb();
  const v = await db.query.services.findFirst({ where: eq(services.id, visitId) });
  return { db, v: v?.status === "scheduled" ? v : null };
}

/** For repeating visits, the next one is scheduled from the planned date. */
function nextVisitInsert(db: Awaited<ReturnType<typeof getDb>>, v: typeof services.$inferSelect) {
  const date = nextVisitDate(v.scheduledDate, v.recurrence);
  if (!date) return null;
  return db.insert(services).values({
    propertyId: v.propertyId,
    type: v.type,
    description: v.description,
    priceCents: v.priceCents,
    recurrence: v.recurrence,
    scheduledDate: date,
    notes: v.notes,
  });
}

export async function completeVisit(visitId: string) {
  await requireAdmin();
  const { db, v } = await loadScheduledVisit(visitId);
  if (!v) return;
  // Only the first click counts, even if the button is pressed twice.
  const [marked] = await db
    .update(services)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(services.id, visitId), eq(services.status, "scheduled")))
    .returning({ id: services.id });
  if (!marked) return;
  const next = nextVisitInsert(db, v);
  if (next) await next;
  refresh();
}

/** Skip this one (rain, customer away). Repeating visits still get the next one scheduled. */
export async function skipVisit(visitId: string) {
  await requireAdmin();
  const { db, v } = await loadScheduledVisit(visitId);
  if (!v) return;
  const [marked] = await db
    .update(services)
    .set({ status: "canceled" })
    .where(and(eq(services.id, visitId), eq(services.status, "scheduled")))
    .returning({ id: services.id });
  if (!marked) return;
  const next = nextVisitInsert(db, v);
  if (next) await next;
  refresh();
}

/** Cancel for good: no next visit is scheduled. */
export async function cancelVisit(visitId: string) {
  await requireAdmin();
  const db = await getDb();
  await db
    .update(services)
    .set({ status: "canceled" })
    .where(and(eq(services.id, visitId), eq(services.status, "scheduled")));
  refresh();
}

/* ───────────── Invoices ───────────── */

async function recalcTotal(db: Awaited<ReturnType<typeof getDb>>, invoiceId: string) {
  await db
    .update(invoices)
    .set({
      totalCents: sql`(select coalesce(sum(${invoiceLineItems.amountCents}), 0) from ${invoiceLineItems} where ${invoiceLineItems.invoiceId} = ${invoiceId})`,
    })
    .where(eq(invoices.id, invoiceId));
}

async function loadDraft(invoiceId: string) {
  const db = await getDb();
  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
  if (!inv) throw new FormError("Invoice not found.");
  if (inv.status !== "draft") throw new FormError("This invoice was already sent, so it can't be changed.");
  return { db, inv };
}

/** Makes a draft invoice from the completed visits that were ticked. */
export async function createInvoice(customerId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  let invoiceId = "";
  const result = await handle(async () => {
    const db = await getDb();
    const picked = form.getAll("visit").map(String);
    if (picked.length === 0) throw new FormError("Tick at least one completed visit.");

    // Only completed, not-yet-billed visits that belong to this customer.
    const rows = await db
      .select({ visit: services, address: properties.address })
      .from(services)
      .innerJoin(properties, eq(properties.id, services.propertyId))
      .leftJoin(invoiceLineItems, eq(invoiceLineItems.serviceId, services.id))
      .where(
        and(
          inArray(services.id, picked),
          eq(properties.customerId, customerId),
          eq(services.status, "completed"),
          isNull(invoiceLineItems.id),
        ),
      );
    if (rows.length !== picked.length) throw new FormError("Some of those visits were already billed. Refresh and try again.");

    invoiceId = crypto.randomUUID();
    const total = rows.reduce((sum, r) => sum + r.visit.priceCents, 0);
    const today = todayLocal();
    await db.batch([
      db.insert(invoices).values({ id: invoiceId, customerId, totalCents: total, dueDate: addDays(today, 14) }),
      db.insert(invoiceLineItems).values(
        rows
          .sort((a, b) => a.visit.scheduledDate.localeCompare(b.visit.scheduledDate))
          .map((r) => ({
            invoiceId,
            serviceId: r.visit.id,
            description: `${r.visit.description || SERVICE_LABELS[r.visit.type]} — ${r.address} (${prettyDate(r.visit.scheduledDate)})`,
            quantity: 1,
            unitAmountCents: r.visit.priceCents,
            amountCents: r.visit.priceCents,
          })),
      ),
    ]);
  });
  if (result.error) return result;
  refresh();
  redirect(`/admin/invoices/${invoiceId}`);
}

export async function addLineItem(invoiceId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  return handle(async () => {
    const { db } = await loadDraft(invoiceId);
    const amount = moneyToCents(form, "amount", "amount");
    await db.insert(invoiceLineItems).values({
      invoiceId,
      description: requiredText(form, "description", "Describe the charge.", 200),
      quantity: 1,
      unitAmountCents: amount,
      amountCents: amount,
    });
    await recalcTotal(db, invoiceId);
    refresh();
    return { ok: "Added." };
  });
}

export async function removeLineItem(invoiceId: string, itemId: string) {
  await requireAdmin();
  const result = await handle(async () => {
    const { db } = await loadDraft(invoiceId);
    await db
      .delete(invoiceLineItems)
      .where(and(eq(invoiceLineItems.id, itemId), eq(invoiceLineItems.invoiceId, invoiceId)));
    await recalcTotal(db, invoiceId);
  });
  if (result.error) redirect(`/admin/invoices/${invoiceId}?error=locked`);
  refresh();
}

export async function updateInvoice(invoiceId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  return handle(async () => {
    const { db } = await loadDraft(invoiceId);
    await db
      .update(invoices)
      .set({ dueDate: dateField(form, "dueDate", "Pick a due date.") })
      .where(eq(invoices.id, invoiceId));
    refresh();
    return { ok: "Saved." };
  });
}

/** Deletes a draft. Its visits go back to "ready to bill". */
export async function deleteDraftInvoice(invoiceId: string) {
  await requireAdmin();
  const db = await getDb();
  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
  if (!inv) redirect("/admin/invoices");
  if (inv.status !== "draft") redirect(`/admin/invoices/${invoiceId}?error=locked`);
  await db.delete(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.status, "draft")));
  refresh();
  redirect(`/admin/customers/${inv.customerId}`);
}
