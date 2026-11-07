import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { invoices, invoiceLineItems, customers } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";
import { addLineItem, removeLineItem, updateInvoice, deleteDraftInvoice } from "@/lib/admin/actions";
import { money, prettyDate, prettyTimestamp } from "@/lib/format";
import ActionForm, { SubmitButton } from "@/components/admin/ActionForm";
import ActionButton from "@/components/admin/ActionButton";
import InvoiceStatus from "@/components/admin/InvoiceStatus";

export const metadata = { title: "Invoice | Westward Admin" };

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  const db = await getDb();
  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, id) });
  if (!inv) notFound();
  const [c, items] = await Promise.all([
    db.query.customers.findFirst({ where: eq(customers.id, inv.customerId) }),
    db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id)).orderBy(asc(invoiceLineItems.createdAt)),
  ]);
  const draft = inv.status === "draft";

  return (
    <>
      <p className="crumbs">
        <Link href="/admin/invoices">Invoices</Link> › <Link href={`/admin/customers/${inv.customerId}`}>{c?.name}</Link>
      </p>
      <div className="page-head">
        <div>
          <h1>Invoice for {c?.name}</h1>
          <p className="lede">
            Created {prettyTimestamp(inv.createdAt)}
            {inv.dueDate && <> · due {prettyDate(inv.dueDate)}</>}
          </p>
        </div>
        <InvoiceStatus status={inv.status} />
      </div>
      {error === "locked" && <div className="notice notice-error">This invoice was already sent, so it can&apos;t be changed.</div>}

      <div className="cols">
        <div>
          <div className="panel">
            <h2>Charges</h2>
            {items.length === 0 ? (
              <p className="empty">No charges on this invoice.</p>
            ) : (
              <ul className="list">
                {items.map((it) => (
                  <li key={it.id}>
                    <span>{it.description}</span>
                    <span className="row-actions">
                      {money(it.amountCents)}
                      {draft && (
                        <ActionButton
                          action={removeLineItem.bind(null, id, it.id)}
                          className="btn btn-outline btn-sm danger"
                        >
                          Remove
                        </ActionButton>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="totals">
              <span>Total</span>
              <strong>{money(inv.totalCents)}</strong>
            </div>
          </div>

          {draft && (
            <details className="panel">
              <summary>+ Add another charge</summary>
              <ActionForm action={addLineItem.bind(null, id)} resetOnSuccess>
                <div className="full">
                  <label htmlFor="description">Description</label>
                  <input id="description" name="description" required placeholder="e.g. Extra bag haul-away" />
                </div>
                <div>
                  <label htmlFor="amount">Amount ($)</label>
                  <input id="amount" name="amount" inputMode="decimal" required placeholder="25.00" />
                </div>
                <div className="form-actions"><SubmitButton>Add charge</SubmitButton></div>
              </ActionForm>
            </details>
          )}
        </div>

        <div>
          {draft ? (
            <>
              <div className="panel">
                <h2>Send</h2>
                <p className="meta" style={{ marginBottom: 14 }}>
                  Sending by email with a Pay button arrives in the next phase, when Stripe is connected.
                  Drafts aren&apos;t visible to the customer.
                </p>
                <button className="btn btn-primary btn-sm" disabled>Send invoice</button>
              </div>
              <div className="panel">
                <h2>Due date</h2>
                <ActionForm action={updateInvoice.bind(null, id)}>
                  <div className="full">
                    <input name="dueDate" type="date" required defaultValue={inv.dueDate ?? ""} aria-label="Due date" />
                  </div>
                  <div className="form-actions"><SubmitButton className="btn btn-outline btn-sm">Save</SubmitButton></div>
                </ActionForm>
              </div>
              <ActionButton
                action={deleteDraftInvoice.bind(null, id)}
                confirm="Delete this draft? Its visits will go back to Ready to bill."
                className="btn btn-outline btn-sm danger"
              >
                Delete draft
              </ActionButton>
            </>
          ) : (
            inv.hostedInvoiceUrl && (
              <a href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                View on Stripe
              </a>
            )
          )}
        </div>
      </div>
    </>
  );
}
