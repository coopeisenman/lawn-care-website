import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { properties, customers } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";
import { scheduledVisits, visitHistory, lastPrices } from "@/lib/admin/queries";
import { scheduleVisit, updateProperty, deleteProperty } from "@/lib/admin/actions";
import { money, prettyDate, SERVICE_LABELS, todayLocal } from "@/lib/format";
import ActionForm, { SubmitButton } from "@/components/admin/ActionForm";
import ActionButton from "@/components/admin/ActionButton";
import PropertyFields from "@/components/admin/PropertyFields";
import VisitFields from "@/components/admin/VisitFields";
import VisitRow from "@/components/admin/VisitRow";

export const metadata = { title: "Property | Westward Admin" };

export default async function PropertyPage({
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
  const p = await db.query.properties.findFirst({ where: eq(properties.id, id) });
  if (!p) notFound();
  const c = await db.query.customers.findFirst({ where: eq(customers.id, p.customerId) });
  const today = todayLocal();

  const [overdue, upcoming, history, prices] = await Promise.all([
    scheduledVisits({ propertyId: id, before: today }),
    scheduledVisits({ propertyId: id, from: today }),
    visitHistory(id),
    lastPrices(id),
  ]);

  return (
    <>
      <p className="crumbs">
        <Link href="/admin/customers">Customers</Link> › <Link href={`/admin/customers/${p.customerId}`}>{c?.name}</Link>
      </p>
      <div className="page-head">
        <div>
          <h1>{p.address}</h1>
          <p className="lede">
            {p.city}, {p.state} {p.zip}
            {p.notes && <> · {p.notes}</>}
          </p>
        </div>
        <a
          className="btn btn-outline btn-sm"
          href={`https://maps.google.com/?q=${encodeURIComponent(`${p.address}, ${p.city}, ${p.state} ${p.zip ?? ""}`)}`}
          target="_blank"
          rel="noreferrer"
        >
          Map
        </a>
      </div>
      {error === "billed" && (
        <div className="notice notice-error">This property has billed visits, so it can&apos;t be deleted.</div>
      )}

      <div className="cols">
        <div>
          <div className="panel">
            <h2>Schedule a visit</h2>
            <ActionForm action={scheduleVisit.bind(null, id)}>
              <VisitFields lastPrices={prices} defaultDate={today} />
              <div className="form-actions"><SubmitButton>Schedule</SubmitButton></div>
            </ActionForm>
          </div>

          <div className="panel">
            <h2>Upcoming</h2>
            {overdue.length + upcoming.length === 0 ? (
              <p className="empty">Nothing scheduled.</p>
            ) : (
              <ul className="list">
                {[...overdue, ...upcoming].map((r) => (
                  <li key={r.visit.id} style={{ display: "block" }}>
                    <div className={r.visit.scheduledDate < today ? "day-head overdue" : "day-head"} style={{ margin: "0 0 4px" }}>
                      {prettyDate(r.visit.scheduledDate)}
                      {r.visit.scheduledDate < today && " · past due"}
                    </div>
                    <ul className="list"><VisitRow visit={r.visit} /></ul>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel">
            <h2>Completed</h2>
            {history.length === 0 ? (
              <p className="empty">No completed visits yet.</p>
            ) : (
              <ul className="list">
                {history.map((h) => (
                  <li key={h.visit.id}>
                    <div>
                      <div className="title">{SERVICE_LABELS[h.visit.type]} · {money(h.visit.priceCents)}</div>
                      <div className="meta">{prettyDate(h.visit.scheduledDate)}</div>
                    </div>
                    {h.invoiceId ? (
                      <Link href={`/admin/invoices/${h.invoiceId}`} className="badge">Billed</Link>
                    ) : (
                      <span className="badge badge-amber">Not billed</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <details className="panel">
            <summary>Edit property</summary>
            <ActionForm action={updateProperty.bind(null, id)}>
              <PropertyFields p={p} />
              <div className="form-actions"><SubmitButton>Save</SubmitButton></div>
            </ActionForm>
          </details>
          <ActionButton
            action={deleteProperty.bind(null, id)}
            confirm="Delete this property and all of its visits? This can't be undone."
            className="btn btn-outline btn-sm danger"
          >
            Delete property
          </ActionButton>
        </div>
      </div>
    </>
  );
}
