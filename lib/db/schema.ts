// Database tables. Changing this file? Run `npm run db:generate` to create a migration.
import { sql } from "drizzle-orm";
import { SERVICE_TYPES, RECURRENCES, SERVICE_STATUSES, INVOICE_STATUSES, PAYMENT_METHODS, INVOICE_EVENT_TYPES, REQUEST_STATUSES, REQUEST_SERVICES } from "../constants";
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export { SERVICE_TYPES, RECURRENCES, SERVICE_STATUSES, INVOICE_STATUSES, PAYMENT_METHODS };

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;
const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now)
    .$onUpdate(() => new Date()),
};
const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

/* ───────────── Login tables (used by Better Auth) ───────────── */

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  // "admin" (the business owner) or "customer"
  role: text("role", { enum: ["admin", "customer"] }).notNull().default("customer"),
  ...timestamps,
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const rateLimit = sqliteTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: integer("last_request").notNull(),
});

/* ───────────── Business tables ───────────── */

export const customers = sqliteTable(
  "customers",
  {
    id: id(),
    // The login linked to this customer (set once they're invited to the portal)
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    notes: text("notes"),
    stripeCustomerId: text("stripe_customer_id"),
    ...timestamps,
  },
  (t) => [uniqueIndex("customers_user_id_idx").on(t.userId)],
);

export const properties = sqliteTable(
  "properties",
  {
    id: id(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    address: text("address").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull().default("NE"),
    zip: text("zip"),
    // Gate codes, dog in yard, etc.
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("properties_customer_id_idx").on(t.customerId)],
);


// One row per visit. A recurring visit creates the next one when it's completed.
export const services = sqliteTable(
  "services",
  {
    id: id(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    type: text("type", { enum: SERVICE_TYPES }).notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    scheduledDate: text("scheduled_date").notNull(), // YYYY-MM-DD
    recurrence: text("recurrence", { enum: RECURRENCES }).notNull().default("none"),
    status: text("status", { enum: SERVICE_STATUSES }).notNull().default("scheduled"),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("services_property_id_idx").on(t.propertyId),
    index("services_scheduled_date_idx").on(t.scheduledDate),
  ],
);


export const invoices = sqliteTable(
  "invoices",
  {
    id: id(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    status: text("status", { enum: INVOICE_STATUSES }).notNull().default("draft"),
    totalCents: integer("total_cents").notNull().default(0),
    dueDate: text("due_date"), // YYYY-MM-DD
    stripeInvoiceId: text("stripe_invoice_id").unique(),
    hostedInvoiceUrl: text("hosted_invoice_url"),
    sentAt: integer("sent_at", { mode: "timestamp_ms" }),
    paidAt: integer("paid_at", { mode: "timestamp_ms" }),
    // How it was paid: through Stripe, or recorded by hand (cash, check, other)
    paymentMethod: text("payment_method", { enum: PAYMENT_METHODS }),
    // Stripe's processing fee, filled in when Stripe reports the payment
    feeCents: integer("fee_cents"),
    ...timestamps,
  },
  (t) => [index("invoices_customer_id_idx").on(t.customerId), index("invoices_paid_at_idx").on(t.paidAt)],
);

export const invoiceLineItems = sqliteTable(
  "invoice_line_items",
  {
    id: id(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    // The visit being billed. Unique so a visit can't be billed twice.
    serviceId: text("service_id")
      .unique()
      .references(() => services.id, { onDelete: "set null" }),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitAmountCents: integer("unit_amount_cents").notNull(),
    amountCents: integer("amount_cents").notNull(),
    ...timestamps,
  },
  (t) => [index("invoice_line_items_invoice_id_idx").on(t.invoiceId)],
);

// History of each invoice: when it was sent, every reminder, payment, and any undo.
export const invoiceEvents = sqliteTable(
  "invoice_events",
  {
    id: id(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    type: text("type", { enum: INVOICE_EVENT_TYPES }).notNull(),
    // in_person, text, email, phone, mail, other, stripe, cash, check
    method: text("method"),
    note: text("note"),
    at: integer("at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (t) => [index("invoice_events_invoice_id_idx").on(t.invoiceId, t.at)],
);

// Free-estimate requests sent from the homepage form.
export const estimateRequests = sqliteTable(
  "estimate_requests",
  {
    id: id(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    address: text("address"),
    city: text("city"),
    service: text("service", { enum: REQUEST_SERVICES }).notNull(),
    message: text("message"),
    status: text("status", { enum: REQUEST_STATUSES }).notNull().default("new"),
    // Your private notes (not seen by the person who asked)
    ownerNotes: text("owner_notes"),
    // Set when you turn the request into a customer
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    // Scrambled version of the sender's internet address, only used to limit spam
    ipHash: text("ip_hash"),
    ...timestamps,
  },
  (t) => [index("estimate_requests_status_idx").on(t.status, t.createdAt), index("estimate_requests_ip_idx").on(t.ipHash, t.createdAt)],
);
