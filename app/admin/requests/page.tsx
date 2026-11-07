import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { estimateRequests } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";
import { daysAgo, REQUEST_SERVICE_LABELS } from "@/lib/format";
import RequestStatus from "@/components/admin/RequestStatus";

export const metadata = { title: "Estimate requests | Westward Admin" };

const FILTERS = {
  open: { label: "To do", statuses: ["new", "contacted", "quoted"] },
  won: { label: "Won", statuses: ["won"] },
  lost: { label: "Lost", statuses: ["lost"] },
  all: { label: "All", statuses: ["new", "contacted", "quoted", "won", "lost"] },
} as const;

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; deleted?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const show = (sp.show && sp.show in FILTERS ? sp.show : "open") as keyof typeof FILTERS;
  const db = await getDb();
  const rows = await db
    .select()
    .from(estimateRequests)
    .where(inArray(estimateRequests.status, [...FILTERS[show].statuses]))
    .orderBy(desc(estimateRequests.createdAt))
    .limit(200);
  // New ones on top.
  rows.sort((a, b) => Number(b.status === "new") - Number(a.status === "new"));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Estimate requests</h1>
          <p className="lede">Sent from the Free Estimate form on your website.</p>
        </div>
      </div>
      {sp.deleted && <div className="notice notice-ok">Request deleted.</div>}

      <nav className="admin-nav year-nav" aria-label="Filter requests">
        {Object.entries(FILTERS).map(([key, f]) => (
          <Link key={key} href={`/admin/requests?show=${key}`} className={key === show ? "active" : ""}>
            {f.label}
          </Link>
        ))}
      </nav>

      <div className="panel">
        {rows.length === 0 ? (
          <p className="empty">
            {show === "open" ? "No open requests. New ones from your website will show up here." : "Nothing here yet."}
          </p>
        ) : (
          <ul className="list">
            {rows.map((r) => (
              <li key={r.id}>
                <div>
                  <Link href={`/admin/requests/${r.id}`} className="title">
                    {r.name}
                  </Link>
                  <div className="meta">
                    {REQUEST_SERVICE_LABELS[r.service]}
                    {r.address && <> · {r.address}</>}
                    {r.city && r.city !== "Other" && <>, {r.city}</>} · {daysAgo(r.createdAt)}
                  </div>
                </div>
                <div className="row-actions">
                  <a href={`tel:${r.phone}`} className="btn btn-outline btn-sm">Call</a>
                  <RequestStatus status={r.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
