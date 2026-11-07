import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { invoices, customers } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";
import { money, prettyDate, prettyTimestamp, todayLocal, daysAgo } from "@/lib/format";
import { daysOverdue, lastReminders } from "@/lib/admin/invoice-info";
import InvoiceStatus from "@/components/admin/InvoiceStatus";

export const metadata = { title: "Invoices | Westward Admin" };

export default async function InvoicesPage() {
  await requireAdmin();
  const db = await getDb();
  const rows = await db
    .select({ invoice: invoices, customer: { id: customers.id, name: customers.name } })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .orderBy(desc(invoices.createdAt))
    .limit(200);

  const unpaid = rows.filter((r) => r.invoice.status === "open").reduce((s, r) => s + r.invoice.totalCents, 0);
  const today = todayLocal();
  const reminded = await lastReminders(rows.filter((r) => r.invoice.status === "open").map((r) => r.invoice.id));
  // Overdue first, then everything else newest first.
  rows.sort((a, b) => daysOverdue(b.invoice, today) - daysOverdue(a.invoice, today));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Invoices</h1>
          <p className="lede">{money(unpaid)} waiting to be paid. To make an invoice, open a customer and use Ready to bill.</p>
        </div>
      </div>
      <div className="panel">
        {rows.length === 0 ? (
          <p className="empty">No invoices yet.</p>
        ) : (
          <ul className="list">
            {rows.map(({ invoice: inv, customer }) => (
              <li key={inv.id}>
                <div>
                  <Link href={`/admin/invoices/${inv.id}`} className="title">
                    {customer.name} · {money(inv.totalCents)}
                  </Link>
                  <div className="meta">
                    {inv.sentAt ? <>Sent {prettyTimestamp(inv.sentAt)}</> : <>Created {prettyTimestamp(inv.createdAt)}</>}
                    {inv.dueDate && inv.status !== "paid" && <> · due {prettyDate(inv.dueDate)}</>}
                    {reminded.get(inv.id) && <> · reminded {daysAgo(reminded.get(inv.id)!)}</>}
                  </div>
                </div>
                <InvoiceStatus status={inv.status} overdue={daysOverdue(inv, today)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
