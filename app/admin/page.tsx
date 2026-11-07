import { and, count, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { customers, properties, services, invoices } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";
import { todayLocal } from "@/lib/format";

export const metadata = { title: "Admin | Westward Property Care" };

export default async function AdminHome() {
  // Pages check again on their own, so access never depends on the layout alone.
  const session = await requireAdmin();
  const db = await getDb();
  const today = todayLocal();

  const [[c], [p], [s], [i]] = await Promise.all([
    db.select({ n: count() }).from(customers),
    db.select({ n: count() }).from(properties),
    db
      .select({ n: count() })
      .from(services)
      .where(and(eq(services.status, "scheduled"), gte(services.scheduledDate, today))),
    db.select({ n: count() }).from(invoices).where(eq(invoices.status, "open")),
  ]);

  return (
    <>
      <h1>Hi, {session.user.name.split(" ")[0]}</h1>
      <p className="lede">Here&apos;s where your business stands.</p>
      <div className="stats">
        <div className="stat"><strong>{c.n}</strong><span>Customers</span></div>
        <div className="stat"><strong>{p.n}</strong><span>Properties</span></div>
        <div className="stat"><strong>{s.n}</strong><span>Upcoming visits</span></div>
        <div className="stat"><strong>{i.n}</strong><span>Unpaid invoices</span></div>
      </div>
      <div className="panel">
        <h2>Coming next</h2>
        <p className="empty">
          Adding customers and properties, scheduling visits, and creating invoices arrive in the next phase.
        </p>
      </div>
    </>
  );
}
