import Link from "next/link";
import { and, asc, count, eq, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { customers, invoices, estimateRequests } from "@/lib/db/schema";
import { daysOverdue, lastReminders } from "@/lib/admin/invoice-info";
import { daysAgo, REQUEST_SERVICE_LABELS } from "@/lib/format";
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

  const overdueInvoices = await db
    .select({ invoice: invoices, customer: { id: customers.id, name: customers.name } })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(and(eq(invoices.status, "open"), lt(invoices.dueDate, today)))
    .orderBy(asc(invoices.dueDate));
  const reminded = await lastReminders(overdueInvoices.map((r) => r.invoice.id));
  const newRequests = await db
    .select()
    .from(estimateRequests)
    .where(eq(estimateRequests.status, "new"))
    .orderBy(asc(estimateRequests.createdAt));

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

      {newRequests.length > 0 && (
        <div className="panel panel-highlight">
          <div className="panel-head">
            <h2>New estimate requests</h2>
            <Link href="/admin/requests" className="btn btn-outline btn-sm">See all</Link>
          </div>
          <ul className="list">
            {newRequests.map((r) => (
              <li key={r.id}>
                <div>
                  <Link href={`/admin/requests/${r.id}`} className="title">{r.name}</Link>
                  <div className="meta">
                    {REQUEST_SERVICE_LABELS[r.service]}
                    {r.city && r.city !== "Other" && <> · {r.city}</>} · {daysAgo(r.createdAt)}
                  </div>
                </div>
                <a href={`tel:${r.phone}`} className="btn btn-primary btn-sm">Call</a>
              </li>
            ))}
          </ul>
        </div>
      )}

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

      {overdueInvoices.length > 0 && (
        <div className="panel">
          <h2>Overdue invoices</h2>
          <ul className="list">
            {overdueInvoices.map(({ invoice: inv, customer }) => {
              const last = reminded.get(inv.id);
              return (
                <li key={inv.id}>
                  <div>
                    <Link href={`/admin/invoices/${inv.id}`} className="title">
                      {customer.name} · {money(inv.totalCents)}
                    </Link>
                    <div className="meta">
                      {daysOverdue(inv, today)} days overdue · {last ? `reminded ${daysAgo(last)}` : "not reminded yet"}
                    </div>
                  </div>
                  <Link href={`/admin/invoices/${inv.id}`} className="btn btn-primary btn-sm">Remind</Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

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
