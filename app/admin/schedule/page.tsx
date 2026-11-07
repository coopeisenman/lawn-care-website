import { requireAdmin } from "@/lib/session";
import { scheduledVisits } from "@/lib/admin/queries";
import { todayLocal, prettyDate } from "@/lib/format";
import { addDays } from "@/lib/dates";
import VisitRow from "@/components/admin/VisitRow";

export const metadata = { title: "Schedule | Westward Admin" };

export default async function SchedulePage() {
  await requireAdmin();
  const today = todayLocal();
  const [overdue, upcoming] = await Promise.all([
    scheduledVisits({ before: today }),
    scheduledVisits({ from: today, to: addDays(today, 30) }),
  ]);

  const byDay = new Map<string, typeof upcoming>();
  for (const r of upcoming) {
    const list = byDay.get(r.visit.scheduledDate) ?? [];
    list.push(r);
    byDay.set(r.visit.scheduledDate, list);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Schedule</h1>
          <p className="lede">The next 30 days. To schedule a visit, open a customer&apos;s property.</p>
        </div>
      </div>
      <div className="panel">
        {overdue.length === 0 && upcoming.length === 0 && <p className="empty">Nothing scheduled yet.</p>}
        {overdue.length > 0 && (
          <>
            <div className="day-head overdue">Past due</div>
            <ul className="list">
              {overdue.map((r) => (
                <VisitRow key={r.visit.id} {...r} />
              ))}
            </ul>
          </>
        )}
        {[...byDay].map(([day, rows]) => (
          <div key={day}>
            <div className="day-head">
              {day === today ? "Today · " : ""}
              {prettyDate(day)}
            </div>
            <ul className="list">
              {rows.map((r) => (
                <VisitRow key={r.visit.id} {...r} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
