import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { customers, invoices } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";
import { scheduledVisits, unbilledVisits } from "@/lib/admin/queries";
import { todayLocal, prettyDate, money } from "@/lib/format";
import { addDays } from "@/lib/dates";
import VisitRow from "@/components/admin/VisitRow";

export const metadata = { title: "Today | Westward Admin" };

export default async function AdminHome() {
  const session = await requireAdmin();
  const db = await getDb();
  const today = todayLocal();

  const [overdue, todays, week, unbilled, [c], [open]] = await Promise.all([
    scheduledVisits({ before: today }),
    scheduledVisits({ from: today, to: today }),
    scheduledVisits({ from: addDays(today, 1), to: addDays(today, 7) }),
    unbilledVisits(),
    db.select({ n: count() }).from(customers),
    db.select({ n: count() }).from(invoices).where(eq(invoices.status, "open")),
  ]);

  // Group "ready to bill" by customer.
  const toBill = new Map<string, { name: string; visits: number; cents: number }>();
  for (const r of unbilled) {
    const e = toBill.get(r.customer.id) ?? { name: r.customer.name, visits: 0, cents: 0 };
    e.visits++;
    e.cents += r.visit.priceCents;
    toBill.set(r.customer.id, e);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hi, {session.user.name.split(" ")[0]}</h1>
          <p className="lede">{prettyDate(today)}</p>
        </div>
        <Link href="/admin/customers/new" className="btn btn-primary">+ New customer</Link>
      </div>

      <div className="stats">
        <div className="stat"><strong>{todays.length}</strong><span>Visits today</span></div>
        <div className="stat"><strong>{week.length}</strong><span>Next 7 days</span></div>
        <div className="stat"><strong>{toBill.size}</strong><span>Customers ready to bill</span></div>
        <div className="stat"><strong>{open.n}</strong><span>Unpaid invoices</span></div>
      </div>

      {overdue.length > 0 && (
        <div className="panel">
          <h2>Past due <span className="count">— still marked as scheduled</span></h2>
          <ul className="list">
            {overdue.map((r) => (
              <VisitRow key={r.visit.id} {...r} />
            ))}
          </ul>
        </div>
      )}

      <div className="panel">
        <h2>Today</h2>
        {todays.length === 0 ? (
          <p className="empty">
            Nothing scheduled today.{" "}
            {c.n === 0 ? <Link href="/admin/customers/new">Add your first customer</Link> : <Link href="/admin/schedule">See the schedule</Link>}
          </p>
        ) : (
          <ul className="list">
            {todays.map((r) => (
              <VisitRow key={r.visit.id} {...r} />
            ))}
          </ul>
        )}
      </div>

      {toBill.size > 0 && (
        <div className="panel">
          <h2>Ready to bill</h2>
          <ul className="list">
            {[...toBill].map(([id, e]) => (
              <li key={id}>
                <Link href={`/admin/customers/${id}#bill`} className="title">{e.name}</Link>
                <span className="meta">
                  {e.visits} visit{e.visits === 1 ? "" : "s"} · {money(e.cents)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
