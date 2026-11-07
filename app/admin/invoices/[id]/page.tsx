import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { invoices, invoiceLineItems, customers } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";
import {
  addLineItem,
  removeLineItem,
  updateInvoice,
  deleteDraftInvoice,
  markInvoicePaid,
  markInvoiceUnpaid,
  markInvoiceSent,
  markInvoiceUnsent,
  logReminderForm,
} from "@/lib/admin/actions";
import { money, prettyDate, prettyTimestamp, todayLocal, daysAgo, reminderMessage, PAYMENT_LABELS, CONTACT_LABELS } from "@/lib/format";
import { daysOverdue, invoiceHistory } from "@/lib/admin/invoice-info";
import TextReminderButton from "@/components/admin/TextReminderButton";
import { ymdOf } from "@/lib/admin/tax";
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
  const session = await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  const db = await getDb();
  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, id) });
  if (!inv) notFound();
  const [c, items, history] = await Promise.all([
    db.query.customers.findFirst({ where: eq(customers.id, inv.customerId) }),
    db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id)).orderBy(asc(invoiceLineItems.createdAt)),
    invoiceHistory(id),
  ]);
  const today = todayLocal();
  const overdue = daysOverdue(inv, today);
  const sentEvent = history.find((e) => e.type === "sent");
  const lastReminder = history.find((e) => e.type === "reminder");
  const reminders = history.filter((e) => e.type === "reminder").length;
  const draft = inv.status === "draft";
  const payable = (inv.status === "draft" || inv.status === "open") && inv.totalCents > 0;

  const markPaidPanel = payable && (
    <div className="panel">
      <h2>Paid by cash or check?</h2>
      <ActionForm action={markInvoicePaid.bind(null, id)}>
        <div>
          <label htmlFor="payMethod">How</label>
          <select id="payMethod" name="method" defaultValue="cash">
            <option value="cash">Cash</option>
            <option value="check">Check</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="paidOn">Date paid</label>
          <input id="paidOn" name="paidOn" type="date" required defaultValue={todayLocal()} max={todayLocal()} />
        </div>
        <div className="form-actions"><SubmitButton className="btn btn-outline btn-sm">Mark as paid</SubmitButton></div>
      </ActionForm>
    </div>
  );

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
        <InvoiceStatus status={inv.status} overdue={overdue} />
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

          <div className="panel">
            <h2>History</h2>
            <ul className="history">
              {history.map((e) => (
                <li key={e.id} className={`h-${e.type}`}>
                  <span>
                    {e.type === "sent" && <>Sent{e.method && ` · ${CONTACT_LABELS[e.method]}`}</>}
                    {e.type === "reminder" && <>Reminder{e.method && ` · ${CONTACT_LABELS[e.method]}`}</>}
                    {e.type === "paid" && <>Paid{e.method && ` · ${CONTACT_LABELS[e.method]}`}</>}
                    {e.type === "undone" && <>{e.note ?? "Undone"}</>}
                    {e.note && e.type !== "undone" && <> — {e.note}</>}
                    <span className="meta">{prettyTimestamp(e.at)}</span>
                  </span>
                </li>
              ))}
              <li>
                <span>
                  Created
                  <span className="meta">{prettyTimestamp(inv.createdAt)}</span>
                </span>
              </li>
            </ul>
          </div>
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
              {inv.totalCents > 0 && (
                <div className="panel">
                  <h2>Already gave it to them?</h2>
                  <p className="meta" style={{ marginBottom: 14 }}>
                    Record how and when. The invoice locks and shows in their portal as unpaid.
                  </p>
                  <ActionForm action={markInvoiceSent.bind(null, id)}>
                    <div>
                      <label htmlFor="sendMethod">How</label>
                      <select id="sendMethod" name="method" defaultValue="in_person">
                        <option value="in_person">In person</option>
                        <option value="text">Text</option>
                        <option value="email">Email</option>
                        <option value="mail">Mail</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="sentOn">Date sent</label>
                      <input id="sentOn" name="sentOn" type="date" required defaultValue={today} max={today} />
                    </div>
                    <div className="form-actions"><SubmitButton className="btn btn-outline btn-sm">Mark as sent</SubmitButton></div>
                  </ActionForm>
                </div>
              )}
              <div className="panel">
                <h2>Due date</h2>
                <ActionForm action={updateInvoice.bind(null, id)}>
                  <div className="full">
                    <input name="dueDate" type="date" required defaultValue={inv.dueDate ?? ""} aria-label="Due date" />
                  </div>
                  <div className="form-actions"><SubmitButton className="btn btn-outline btn-sm">Save</SubmitButton></div>
                </ActionForm>
              </div>
              {markPaidPanel}
              <ActionButton
                action={deleteDraftInvoice.bind(null, id)}
                confirm="Delete this draft? Its visits will go back to Ready to bill."
                className="btn btn-outline btn-sm danger"
              >
                Delete draft
              </ActionButton>
            </>
          ) : (
            <>
              {inv.status === "paid" && (
                <div className="panel">
                  <h2>Paid</h2>
                  <p className="meta" style={{ marginBottom: 14 }}>
                    {PAYMENT_LABELS[inv.paymentMethod ?? "other"]} · {inv.paidAt && prettyDate(ymdOf(inv.paidAt))}
                  </p>
                  {inv.paymentMethod !== "stripe" && (
                    <ActionButton
                      action={markInvoiceUnpaid.bind(null, id)}
                      confirm="Undo this payment? Use this only to fix a mistake."
                      className="btn btn-outline btn-sm danger"
                    >
                      Undo payment
                    </ActionButton>
                  )}
                </div>
              )}
              {inv.status === "open" && (
                <div className="panel">
                  <h2>{overdue > 0 ? `Overdue by ${overdue} day${overdue === 1 ? "" : "s"}` : "Waiting for payment"}</h2>
                  <p className="meta" style={{ marginBottom: 14 }}>
                    {inv.sentAt && <>Sent {daysAgo(inv.sentAt)}{sentEvent?.method && ` (${CONTACT_LABELS[sentEvent.method].toLowerCase()})`}. </>}
                    {inv.dueDate && <>Due {prettyDate(inv.dueDate)}. </>}
                    {lastReminder
                      ? <>Reminded {reminders} time{reminders === 1 ? "" : "s"}, last {daysAgo(lastReminder.at)}.</>
                      : <>No reminders yet.</>}
                  </p>
                  <div className="row-actions">
                    {c?.phone ? (
                      <TextReminderButton
                        invoiceId={id}
                        phone={c.phone}
                        message={reminderMessage({
                          customerName: c.name,
                          ownerName: session.user.name,
                          cents: inv.totalCents,
                          dueDate: inv.dueDate,
                          overdue,
                        })}
                      />
                    ) : (
                      <span className="meta">Add a phone number to {c?.name.split(" ")[0]}&apos;s details to text a reminder.</span>
                    )}
                  </div>
                  <details style={{ marginTop: 14 }}>
                    <summary className="meta" style={{ cursor: "pointer" }}>I reminded them another way</summary>
                    <ActionForm action={logReminderForm.bind(null, id)} resetOnSuccess>
                      <div>
                        <label htmlFor="remindMethod">How</label>
                        <select id="remindMethod" name="method" defaultValue="phone">
                          <option value="phone">Phone call</option>
                          <option value="in_person">In person</option>
                          <option value="email">Email</option>
                          <option value="text">Text</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="remindNote">Note (optional)</label>
                        <input id="remindNote" name="note" placeholder="e.g. Said they'd pay Friday" />
                      </div>
                      <div className="form-actions"><SubmitButton className="btn btn-outline btn-sm">Save reminder</SubmitButton></div>
                    </ActionForm>
                  </details>
                </div>
              )}
              {markPaidPanel}
              {inv.status === "open" && !inv.stripeInvoiceId && (
                <ActionButton
                  action={markInvoiceUnsent.bind(null, id)}
                  confirm="Undo sending? The invoice goes back to a draft and disappears from their portal."
                  className="btn btn-outline btn-sm danger"
                >
                  Undo sending
                </ActionButton>
              )}
              {inv.hostedInvoiceUrl && (
                <a href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                  View on Stripe
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
