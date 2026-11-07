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
  invoiceEvents,
  estimateRequests,
  user,
  SERVICE_TYPES,
  RECURRENCES,
} from "../db/schema";
import { CONTACT_METHODS, REQUEST_STATUSES } from "../constants";
import { requireAdmin } from "../session";
import { setSetting } from "../settings";
import { THEMES, THEME_INFO } from "../theme";
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

const MANUAL_METHODS = ["cash", "check", "other"] as const;

/** Records a payment made outside Stripe (cash, check, etc.). */
export async function markInvoicePaid(invoiceId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  return handle(async () => {
    const db = await getDb();
    const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
    if (!inv) throw new FormError("Invoice not found.");
    if (inv.status !== "draft" && inv.status !== "open") throw new FormError("This invoice is already closed.");
    if (inv.totalCents <= 0) throw new FormError("This invoice has no charges.");
    const method = oneOf(form, "method", MANUAL_METHODS, "Pick how they paid.");
    const paidOn = dateField(form, "paidOn", "Pick the date they paid.");
    if (paidOn > todayLocal()) throw new FormError("The payment date can't be in the future.");
    // TODO (Phase 4): if this invoice was sent through Stripe, also mark it paid there.
    const paidAt = new Date(`${paidOn}T18:00:00Z`);
    const [updated] = await db
      .update(invoices)
      .set({ status: "paid", paymentMethod: method, paidAt })
      .where(and(eq(invoices.id, invoiceId), inArray(invoices.status, ["draft", "open"])))
      .returning({ id: invoices.id });
    if (updated) await db.insert(invoiceEvents).values({ invoiceId, type: "paid", method, at: paidAt });
    refresh();
    revalidatePath("/portal");
    return { ok: "Marked as paid." };
  });
}

/** Undo a hand-recorded payment (for mistakes). Stripe payments can't be undone here. */
export async function markInvoiceUnpaid(invoiceId: string) {
  await requireAdmin();
  const db = await getDb();
  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
  if (!inv || inv.status !== "paid" || inv.paymentMethod === "stripe") redirect(`/admin/invoices/${invoiceId}`);
  await db.batch([
    db
      .update(invoices)
      .set({ status: inv.sentAt ? "open" : "draft", paymentMethod: null, paidAt: null })
      .where(eq(invoices.id, invoiceId)),
    db.insert(invoiceEvents).values({ invoiceId, type: "undone", note: "Payment undone" }),
  ]);
  refresh();
  revalidatePath("/portal");
}

const SEND_METHODS = ["in_person", "text", "email", "mail", "other"] as const;

/**
 * Records that you gave the customer this invoice yourself (in person, by text, etc.).
 * It locks the invoice and shows it in their portal as unpaid.
 * (Phase 4 adds sending through Stripe, which will record this automatically.)
 */
export async function markInvoiceSent(invoiceId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  return handle(async () => {
    const { db, inv } = await loadDraft(invoiceId);
    if (inv.totalCents <= 0) throw new FormError("Add at least one charge first.");
    const method = oneOf(form, "method", SEND_METHODS, "Pick how you sent it.");
    const sentOn = dateField(form, "sentOn", "Pick the date you sent it.");
    if (sentOn > todayLocal()) throw new FormError("The date can't be in the future.");
    const sentAt = sentOn === todayLocal() ? new Date() : new Date(`${sentOn}T18:00:00Z`);
    const [updated] = await db
      .update(invoices)
      .set({ status: "open", sentAt })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.status, "draft")))
      .returning({ id: invoices.id });
    if (updated) await db.insert(invoiceEvents).values({ invoiceId, type: "sent", method, at: sentAt });
    refresh();
    revalidatePath("/portal");
    return { ok: "Marked as sent." };
  });
}

/** Undo "Mark as sent" (for mistakes). Puts the invoice back to a draft. */
export async function markInvoiceUnsent(invoiceId: string) {
  await requireAdmin();
  const db = await getDb();
  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
  if (!inv || inv.status !== "open" || inv.stripeInvoiceId) redirect(`/admin/invoices/${invoiceId}`);
  await db.batch([
    db.update(invoices).set({ status: "draft", sentAt: null }).where(eq(invoices.id, invoiceId)),
    db.insert(invoiceEvents).values({ invoiceId, type: "undone", note: "Sending undone — back to draft" }),
  ]);
  refresh();
  revalidatePath("/portal");
}

/** Saves a payment reminder to the invoice's history. */
export async function logReminder(invoiceId: string, method: string, note?: string) {
  await requireAdmin();
  if (!(CONTACT_METHODS as readonly string[]).includes(method)) return;
  const db = await getDb();
  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
  if (!inv || inv.status !== "open") return;
  await db.insert(invoiceEvents).values({ invoiceId, type: "reminder", method, note: note?.trim().slice(0, 300) || null });
  refresh();
}

export async function logReminderForm(invoiceId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  return handle(async () => {
    const method = oneOf(form, "method", CONTACT_METHODS, "Pick how you reminded them.");
    await logReminder(invoiceId, method, text(form, "note", { max: 300 }) ?? undefined);
    return { ok: "Reminder saved." };
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

/* ───────────── Estimate requests ───────────── */

export async function setRequestStatus(requestId: string, status: string) {
  await requireAdmin();
  if (!(REQUEST_STATUSES as readonly string[]).includes(status)) return;
  const db = await getDb();
  await db
    .update(estimateRequests)
    .set({ status: status as (typeof REQUEST_STATUSES)[number] })
    .where(eq(estimateRequests.id, requestId));
  refresh();
}

export async function saveRequestNotes(requestId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  return handle(async () => {
    const db = await getDb();
    await db
      .update(estimateRequests)
      .set({ ownerNotes: text(form, "ownerNotes") })
      .where(eq(estimateRequests.id, requestId));
    refresh();
    return { ok: "Notes saved." };
  });
}

/** Creates a customer (and their property, if an address was given) from a request. */
export async function convertRequestToCustomer(requestId: string) {
  await requireAdmin();
  const db = await getDb();
  const r = await db.query.estimateRequests.findFirst({ where: eq(estimateRequests.id, requestId) });
  if (!r) redirect("/admin/requests");
  if (r.customerId) redirect(`/admin/customers/${r.customerId}`);

  const customerId = crypto.randomUUID();
  const steps = [
    db.insert(customers).values({
      id: customerId,
      name: r.name,
      phone: r.phone,
      email: r.email,
      notes: r.message ? `From estimate request: ${r.message}` : null,
    }),
    db
      .update(estimateRequests)
      .set({ customerId, status: r.status === "new" ? "contacted" : r.status })
      .where(eq(estimateRequests.id, requestId)),
  ] as const;
  if (r.address) {
    await db.batch([
      ...steps,
      db.insert(properties).values({
        customerId,
        address: r.address,
        // "Other" means outside the usual towns — fill in the real city on the property page.
        city: r.city && r.city !== "Other" ? r.city : "",
      }),
    ]);
  } else {
    await db.batch(steps);
  }
  refresh();
  redirect(`/admin/customers/${customerId}?from=request`);
}

export async function deleteRequest(requestId: string) {
  await requireAdmin();
  const db = await getDb();
  await db.delete(estimateRequests).where(eq(estimateRequests.id, requestId));
  refresh();
  redirect("/admin/requests?deleted=1");
}

/* ───────────── Settings ───────────── */

export async function saveTheme(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await handle(async () => {
    const theme = oneOf(form, "theme", THEMES, "Pick a look for the website.");
    await setSetting("theme", theme);
    return { ok: `Saved. The website is now using the ${THEME_INFO[theme].label} look.` };
  });
  revalidatePath("/", "layout");
  return result;
}
