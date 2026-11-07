import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { customers, properties } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";
import { scheduledVisits, unbilledVisits, customerInvoices } from "@/lib/admin/queries";
import {
  updateCustomer,
  deleteCustomer,
  createProperty,
  givePortalAccess,
  removePortalAccess,
  createInvoice,
} from "@/lib/admin/actions";
import { money, prettyDate, prettyTimestamp, SERVICE_LABELS, todayLocal } from "@/lib/format";
import ActionForm, { SubmitButton } from "@/components/admin/ActionForm";
import ActionButton from "@/components/admin/ActionButton";
import CustomerFields from "@/components/admin/CustomerFields";
import PropertyFields from "@/components/admin/PropertyFields";
import InvoiceStatus from "@/components/admin/InvoiceStatus";

export const metadata = { title: "Customer | Westward Admin" };

const ERRORS: Record<string, string> = {
  "has-invoices": "This customer has invoices, so they can't be deleted.",
  "needs-email": "Add an email address before giving portal access.",
  "email-taken": "Another login already uses this customer's email.",
};

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; portal?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error, portal } = await searchParams;
  const db = await getDb();
  const c = await db.query.customers.findFirst({ where: eq(customers.id, id) });
  if (!c) notFound();

  const [props, upcoming, unbilled, invs] = await Promise.all([
    db.select().from(properties).where(eq(properties.customerId, id)).orderBy(asc(properties.address)),
    scheduledVisits({ from: todayLocal(), customerId: id }),
    unbilledVisits(id),
    customerInvoices(id),
  ]);
  const myUpcoming = upcoming.slice(0, 10);
  const unbilledTotal = unbilled.reduce((s, r) => s + r.visit.priceCents, 0);

  return (
    <>
      <p className="crumbs"><Link href="/admin/customers">Customers</Link></p>
      <div className="page-head">
        <div>
          <h1>{c.name}</h1>
          <p className="lede">
            {[c.phone, c.email].filter(Boolean).join(" · ") || "No contact info yet"}
          </p>
        </div>
        {c.phone && <a href={`sms:${c.phone}`} className="btn btn-outline btn-sm">Text</a>}
      </div>
      {error && ERRORS[error] && <div className="notice notice-error">{ERRORS[error]}</div>}
      {portal === "on" && (
        <div className="notice notice-ok">
          Portal access is on. Once login emails are set up, {c.name.split(" ")[0]} can log in at your site&apos;s Customer Login page with {c.email}.
        </div>
      )}

      <div className="cols">
        <div>
          <div className="panel">
            <div className="panel-head">
              <h2>Properties</h2>
            </div>
            {props.length === 0 ? (
              <p className="empty">No property yet — add one below.</p>
            ) : (
              <ul className="list">
                {props.map((p) => (
                  <li key={p.id}>
                    <div>
                      <Link href={`/admin/properties/${p.id}`} className="title">{p.address}</Link>
                      <div className="meta">{p.city}, {p.state} {p.zip}{p.notes ? ` · ${p.notes}` : ""}</div>
                    </div>
                    <Link href={`/admin/properties/${p.id}`} className="btn btn-outline btn-sm">Schedule</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <details className="panel" open={props.length === 0}>
            <summary>+ Add a property</summary>
            <ActionForm action={createProperty.bind(null, id)}>
              <PropertyFields />
              <div className="form-actions"><SubmitButton>Add property</SubmitButton></div>
            </ActionForm>
          </details>

          <div className="panel">
            <h2>Upcoming visits</h2>
            {myUpcoming.length === 0 ? (
              <p className="empty">Nothing scheduled.</p>
            ) : (
              <ul className="list">
                {myUpcoming.map((r) => (
                  <li key={r.visit.id}>
                    <div>
                      <div className="title">{SERVICE_LABELS[r.visit.type]} · {money(r.visit.priceCents)}</div>
                      <div className="meta">{r.property.address}</div>
                    </div>
                    <span className="meta">{prettyDate(r.visit.scheduledDate)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel" id="bill">
            <h2>Ready to bill <span className="count">{unbilled.length ? `— ${money(unbilledTotal)}` : ""}</span></h2>
            {unbilled.length === 0 ? (
              <p className="empty">No completed visits waiting to be billed.</p>
            ) : (
              <ActionForm action={createInvoice.bind(null, id)} className="admin-form">
                <ul className="list check-list full">
                  {unbilled.map((r) => (
                    <li key={r.visit.id}>
                      <label>
                        <input type="checkbox" name="visit" value={r.visit.id} defaultChecked />
                        <span>
                          {SERVICE_LABELS[r.visit.type]} · {prettyDate(r.visit.scheduledDate)}
                          <span className="meta"> · {r.property.address}</span>
                        </span>
                      </label>
                      <span>{money(r.visit.priceCents)}</span>
                    </li>
                  ))}
                </ul>
                <div className="form-actions"><SubmitButton>Create invoice</SubmitButton></div>
              </ActionForm>
            )}
          </div>

          <div className="panel">
            <h2>Invoices</h2>
            {invs.length === 0 ? (
              <p className="empty">No invoices yet.</p>
            ) : (
              <ul className="list">
                {invs.map((inv) => (
                  <li key={inv.id}>
                    <div>
                      <Link href={`/admin/invoices/${inv.id}`} className="title">{money(inv.totalCents)}</Link>
                      <div className="meta">Created {prettyTimestamp(inv.createdAt)}</div>
                    </div>
                    <InvoiceStatus status={inv.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <div className="panel">
            <div className="panel-head">
              <h2>Customer portal</h2>
              <Link href={`/admin/customers/${id}/preview`} className="btn btn-outline btn-sm">Preview</Link>
            </div>
            {c.userId ? (
              <>
                <p className="meta" style={{ marginBottom: 14 }}>
                  <span className="badge">On</span> They can log in with {c.email}.
                </p>
                <ActionButton
                  action={removePortalAccess.bind(null, id)}
                  confirm="Remove portal access? They'll be logged out. Their records stay."
                  className="btn btn-outline btn-sm danger"
                >
                  Remove access
                </ActionButton>
              </>
            ) : (
              <>
                <p className="meta" style={{ marginBottom: 14 }}>
                  Let them log in to see upcoming visits and invoices.
                </p>
                <ActionButton action={givePortalAccess.bind(null, id)} className="btn btn-primary btn-sm">
                  Give portal access
                </ActionButton>
              </>
            )}
          </div>

          <details className="panel">
            <summary>Edit details</summary>
            <ActionForm action={updateCustomer.bind(null, id)}>
              <CustomerFields c={c} />
              <div className="form-actions"><SubmitButton>Save</SubmitButton></div>
            </ActionForm>
          </details>

          {invs.length === 0 && (
            <ActionButton
              action={deleteCustomer.bind(null, id)}
              confirm={`Delete ${c.name}? This also deletes their properties and visits. This can't be undone.`}
              className="btn btn-outline btn-sm danger"
            >
              Delete customer
            </ActionButton>
          )}
        </div>
      </div>
    </>
  );
}
