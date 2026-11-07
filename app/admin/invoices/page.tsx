import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { invoices, customers } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";
import { money, prettyDate, prettyTimestamp } from "@/lib/format";
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
                    Created {prettyTimestamp(inv.createdAt)}
                    {inv.dueDate && inv.status !== "paid" && <> · due {prettyDate(inv.dueDate)}</>}
                  </div>
                </div>
                <InvoiceStatus status={inv.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
