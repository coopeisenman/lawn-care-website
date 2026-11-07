import "server-only";
import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { getDb } from "../db";
import { invoices, customers, invoiceLineItems, services } from "../db/schema";

const TZ = "America/Chicago";

/** The calendar year (in Nebraska) of a moment in time. */
export function yearOf(d: Date) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric" }).format(d));
}

export function monthOf(d: Date) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "numeric" }).format(d));
}

export function ymdOf(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

/** Years that have at least one paid invoice, plus this year. Newest first. */
export async function taxYears() {
  const db = await getDb();
  const rows = await db
    .select({ paidAt: invoices.paidAt })
    .from(invoices)
    .where(eq(invoices.status, "paid"));
  const years = new Set<number>([yearOf(new Date())]);
  for (const r of rows) if (r.paidAt) years.add(yearOf(r.paidAt));
  return [...years].sort((a, b) => b - a);
}

/** Every invoice paid during a calendar year, with its charges. */
export async function taxYear(year: number) {
  const db = await getDb();
  // Look a day either side in UTC, then keep only those in the Nebraska calendar year.
  const from = new Date(Date.UTC(year, 0, 1) - 86_400_000);
  const to = new Date(Date.UTC(year + 1, 0, 1) + 86_400_000);
  const paid = (
    await db
      .select({ invoice: invoices, customerName: customers.name })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(and(eq(invoices.status, "paid"), gte(invoices.paidAt, from), lt(invoices.paidAt, to)))
      .orderBy(asc(invoices.paidAt))
  ).filter((r) => r.invoice.paidAt && yearOf(r.invoice.paidAt) === year);

  const ids = paid.map((r) => r.invoice.id);
  const items = ids.length
    ? await db
        .select({ item: invoiceLineItems, type: services.type })
        .from(invoiceLineItems)
        .leftJoin(services, eq(services.id, invoiceLineItems.serviceId))
        .where(inArray(invoiceLineItems.invoiceId, ids))
        .orderBy(asc(invoiceLineItems.createdAt))
    : [];

  const itemsByInvoice = new Map<string, typeof items>();
  for (const it of items) {
    const list = itemsByInvoice.get(it.item.invoiceId) ?? [];
    list.push(it);
    itemsByInvoice.set(it.item.invoiceId, list);
  }

  const byMonth = Array.from({ length: 12 }, () => ({ count: 0, cents: 0 }));
  const byService: Record<string, number> = {};
  let total = 0;
  let fees = 0;
  for (const r of paid) {
    const m = monthOf(r.invoice.paidAt!) - 1;
    byMonth[m].count++;
    byMonth[m].cents += r.invoice.totalCents;
    total += r.invoice.totalCents;
    fees += r.invoice.feeCents ?? 0;
    for (const it of itemsByInvoice.get(r.invoice.id) ?? []) {
      const key = it.type ?? "extra";
      byService[key] = (byService[key] ?? 0) + it.item.amountCents;
    }
  }

  return {
    year,
    rows: paid.map((r) => ({ ...r, items: itemsByInvoice.get(r.invoice.id) ?? [] })),
    byMonth,
    byService,
    total,
    fees,
  };
}
