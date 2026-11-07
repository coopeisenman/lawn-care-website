import Link from "next/link";
import { asc, like, or, sql, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { customers, properties } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Customers | Westward Admin" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; deleted?: string }> }) {
  await requireAdmin();
  const { q = "", deleted } = await searchParams;
  const db = await getDb();
  const term = `%${q.trim().replace(/[%_]/g, "")}%`;

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      portal: customers.userId,
      addresses: sql<string | null>`group_concat(${properties.address}, ' · ')`,
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

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Customers</h1>
          <p className="lede">{rows.length} {q ? "found" : "total"}</p>
        </div>
        <Link href="/admin/customers/new" className="btn btn-primary">+ New customer</Link>
      </div>
      {deleted && <div className="notice notice-ok">Customer deleted.</div>}
      <form className="search">
        <input name="q" defaultValue={q} placeholder="Search name, phone, email or address" aria-label="Search customers" />
        <button className="btn btn-outline btn-sm">Search</button>
      </form>
      <div className="panel">
        {rows.length === 0 ? (
          <p className="empty">{q ? "No matches." : "No customers yet."}</p>
        ) : (
          <ul className="list">
            {rows.map((c) => (
              <li key={c.id}>
                <div>
                  <Link href={`/admin/customers/${c.id}`} className="title">{c.name}</Link>
                  <div className="meta">{c.addresses || "No property yet"}</div>
                </div>
                <div className="meta">
                  {c.phone}
                  {c.portal && <> · <span className="badge">Portal</span></>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
