import Link from "next/link";
import { asc, like, or, sql, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { customers, properties, services } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";
import { prettyDate, todayLocal } from "@/lib/format";

export const metadata = { title: "Customers | Westward Admin" };

const TABS = { active: "Active", inactive: "Inactive", all: "All" } as const;
type Tab = keyof typeof TABS;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; deleted?: string; show?: string }>;
}) {
  await requireAdmin();
  const { q = "", deleted, show: showParam } = await searchParams;
  const show: Tab = showParam && showParam in TABS ? (showParam as Tab) : "active";
  const db = await getDb();
  const term = `%${q.trim().replace(/[%_]/g, "")}%`;

  // A customer is active when any of their properties has a visit still scheduled.
  const nextVisit = sql<string | null>`(
    select min(s.scheduled_date) from ${services} s
    join ${properties} p2 on p2.id = s.property_id
    where p2.customer_id = ${customers.id} and s.status = 'scheduled'
  )`;
  const lastService = sql<string | null>`(
    select max(s.scheduled_date) from ${services} s
    join ${properties} p3 on p3.id = s.property_id
    where p3.customer_id = ${customers.id} and s.status = 'completed'
  )`;

  const all = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      portal: customers.userId,
      addresses: sql<string | null>`group_concat(${properties.address}, ' · ')`,
      nextVisit,
      lastService,
    })
    .from(customers)
    .leftJoin(properties, eq(properties.customerId, customers.id))
    .where(
      q.trim()
        ? or(like(customers.name, term), like(customers.phone, term), like(customers.email, term), like(properties.address, term))
        : undefined,
    )
    .groupBy(customers.id)
    .orderBy(asc(customers.name));

  const counts = {
    active: all.filter((c) => c.nextVisit).length,
    inactive: all.filter((c) => !c.nextVisit).length,
    all: all.length,
  };
  const rows = show === "all" ? all : all.filter((c) => (show === "active" ? c.nextVisit : !c.nextVisit));
  const today = todayLocal();
  const qs = (tab: Tab) => `/admin/customers?show=${tab}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Customers</h1>
          <p className="lede">
            {counts.active} active · {counts.inactive} inactive{q && " (matching your search)"}
          </p>
        </div>
        <Link href="/admin/customers/new" className="btn btn-primary">+ New customer</Link>
      </div>
      {deleted && <div className="notice notice-ok">Customer deleted.</div>}

      <nav className="admin-nav year-nav" aria-label="Show customers">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <Link key={t} href={qs(t)} className={t === show ? "active" : ""}>
            {TABS[t]} <span className="tab-count">{counts[t]}</span>
          </Link>
        ))}
      </nav>

      <form className="search">
        <input type="hidden" name="show" value={show} />
        <input name="q" defaultValue={q} placeholder="Search name, phone, email or address" aria-label="Search customers" />
        <button className="btn btn-outline btn-sm">Search</button>
      </form>

      <p className="meta" style={{ marginBottom: 12 }}>
        {show === "active" && "Customers with at least one visit scheduled."}
        {show === "inactive" && "Customers with nothing scheduled — good people to call when the season starts."}
      </p>

      <div className="panel">
        {rows.length === 0 ? (
          <p className="empty">
            {q
              ? "No matches."
              : show === "active"
                ? "No active customers. Schedule a visit on a customer's property to make them active."
                : show === "inactive"
                  ? "Everyone has something scheduled."
                  : "No customers yet."}
          </p>
        ) : (
          <ul className="list">
            {rows.map((c) => (
              <li key={c.id}>
                <div>
                  <Link href={`/admin/customers/${c.id}`} className="title">{c.name}</Link>
                  <div className="meta">{c.addresses || "No property yet"}</div>
                  <div className="meta">
                    {c.nextVisit ? (
                      c.nextVisit < today ? (
                        <span className="text-red">Past due visit {prettyDate(c.nextVisit)}</span>
                      ) : (
                        <>Next visit {prettyDate(c.nextVisit)}{c.nextVisit.slice(0, 4) !== today.slice(0, 4) && `, ${c.nextVisit.slice(0, 4)}`}</>
                      )
                    ) : c.lastService ? (
                      <>Last service {prettyDate(c.lastService)}{c.lastService.slice(0, 4) !== today.slice(0, 4) && `, ${c.lastService.slice(0, 4)}`}</>
                    ) : (
                      <>No services yet</>
                    )}
                  </div>
                </div>
                <div className="row-actions">
                  {c.phone && <a href={`tel:${c.phone}`} className="btn btn-outline btn-sm">Call</a>}
                  <span className={c.nextVisit ? "badge" : "badge badge-gray"}>{c.nextVisit ? "Active" : "Inactive"}</span>
                  {c.portal && <span className="badge">Portal</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
