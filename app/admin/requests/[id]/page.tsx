import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { estimateRequests } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";
import { REQUEST_STATUSES } from "@/lib/constants";
import { setRequestStatus, saveRequestNotes, convertRequestToCustomer, deleteRequest } from "@/lib/admin/actions";
import { daysAgo, prettyTimestamp, REQUEST_SERVICE_LABELS, REQUEST_STATUS_LABELS } from "@/lib/format";
import ActionForm, { SubmitButton } from "@/components/admin/ActionForm";
import ActionButton from "@/components/admin/ActionButton";
import RequestStatus from "@/components/admin/RequestStatus";

export const metadata = { title: "Estimate request | Westward Admin" };

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;
  const db = await getDb();
  const r = await db.query.estimateRequests.findFirst({ where: eq(estimateRequests.id, id) });
  if (!r) notFound();
  const first = r.name.split(" ")[0];
  const smsBody = `Hi ${first}, this is ${session.user.name.split(" ")[0]} with Westward Property Care. Thanks for your estimate request! `;
  const mapQuery = [r.address, r.city !== "Other" ? r.city : "", "NE"].filter(Boolean).join(", ");

  return (
    <>
      <p className="crumbs"><Link href="/admin/requests">Estimate requests</Link></p>
      <div className="page-head">
        <div>
          <h1>{r.name}</h1>
          <p className="lede">
            {REQUEST_SERVICE_LABELS[r.service]} · received {daysAgo(r.createdAt)} ({prettyTimestamp(r.createdAt)})
          </p>
        </div>
        <RequestStatus status={r.status} />
      </div>

      <div className="cols">
        <div>
          <div className="panel">
            <h2>Their request</h2>
            <dl className="details">
              <dt>Phone</dt>
              <dd>
                {r.phone}
                <span className="row-actions" style={{ marginTop: 8 }}>
                  <a href={`tel:${r.phone}`} className="btn btn-primary btn-sm">Call</a>
                  <a href={`sms:${r.phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(smsBody)}`} className="btn btn-outline btn-sm">Text</a>
                </span>
              </dd>
              {r.email && (<><dt>Email</dt><dd><a href={`mailto:${r.email}`}>{r.email}</a></dd></>)}
              <dt>Address</dt>
              <dd>
                {r.address || <span className="meta">Not given</span>}
                {r.city && <>{r.address ? ", " : ""}{r.city === "Other" ? "(outside the usual towns)" : r.city}</>}
                {r.address && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(mapQuery)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ marginLeft: 10 }}
                  >
                    Map
                  </a>
                )}
              </dd>
              <dt>Service</dt>
              <dd>{REQUEST_SERVICE_LABELS[r.service]}</dd>
              <dt>Message</dt>
              <dd className="pre">{r.message || <span className="meta">None</span>}</dd>
            </dl>
          </div>

          <div className="panel">
            <h2>Your notes</h2>
            <ActionForm action={saveRequestNotes.bind(null, id)}>
              <div className="full">
                <textarea
                  name="ownerNotes"
                  aria-label="Your notes"
                  defaultValue={r.ownerNotes ?? ""}
                  placeholder="e.g. Quoted $45/week, wants to start in April"
                />
              </div>
              <div className="form-actions"><SubmitButton className="btn btn-outline btn-sm">Save notes</SubmitButton></div>
            </ActionForm>
          </div>
        </div>

        <div>
          <div className="panel">
            <h2>Status</h2>
            <div className="status-steps">
              {REQUEST_STATUSES.map((s) => (
                <ActionButton
                  key={s}
                  action={setRequestStatus.bind(null, id, s)}
                  className={`btn btn-sm ${s === r.status ? "btn-current" : "btn-outline"}`}
                >
                  {REQUEST_STATUS_LABELS[s]}
                </ActionButton>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2>Customer</h2>
            {r.customerId ? (
              <Link href={`/admin/customers/${r.customerId}`} className="btn btn-outline btn-sm">View {first}&apos;s customer page</Link>
            ) : (
              <>
                <p className="meta" style={{ marginBottom: 14 }}>
                  Adds {first} to your customers{r.address ? " with this property" : ""}, so you can schedule visits.
                </p>
                <ActionButton action={convertRequestToCustomer.bind(null, id)} className="btn btn-primary btn-sm">
                  Turn into customer
                </ActionButton>
              </>
            )}
          </div>

          <ActionButton
            action={deleteRequest.bind(null, id)}
            confirm="Delete this request? Use this for spam or duplicates. This can't be undone."
            className="btn btn-outline btn-sm danger"
          >
            Delete request
          </ActionButton>
        </div>
      </div>
    </>
  );
}
