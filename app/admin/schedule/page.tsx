import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { calendarEntries, scheduledVisits, type CalendarEntry } from "@/lib/admin/queries";
import { todayLocal, prettyDate, money, SERVICE_LABELS, RECURRENCE_LABELS, MONTHS } from "@/lib/format";
import { addDays } from "@/lib/dates";
import VisitRow from "@/components/admin/VisitRow";

export const metadata = { title: "Schedule | Westward Admin" };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHORT: Record<string, string> = { lawn: "Lawn", leaf: "Leaves", snow: "Snow", other: "Other" };

function monthInfo(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstYmd = first.toISOString().slice(0, 10);
  const lastYmd = `${ym}-${String(days).padStart(2, "0")}`;
  const gridStart = addDays(firstYmd, -first.getUTCDay());
  const lastDow = new Date(lastYmd + "T00:00:00Z").getUTCDay();
  const gridEnd = addDays(lastYmd, 6 - lastDow);
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  return { y, m, firstYmd, lastYmd, gridStart, gridEnd, prev, next };
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string }>;
}) {
  await requireAdmin();
  const today = todayLocal();
  const sp = await searchParams;
  const ym = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : today.slice(0, 7);
  const mi = monthInfo(ym);
  const day =
    /^\d{4}-\d{2}-\d{2}$/.test(sp.day ?? "") && sp.day! >= mi.gridStart && sp.day! <= mi.gridEnd
      ? sp.day!
      : today.startsWith(ym)
        ? today
        : mi.firstYmd;

  const [entries, overdue] = await Promise.all([
    calendarEntries(mi.gridStart, mi.gridEnd),
    scheduledVisits({ before: today }),
  ]);

  const byDay = new Map<string, CalendarEntry[]>();
  for (const e of entries) {
    const list = byDay.get(e.date) ?? [];
    list.push(e);
    byDay.set(e.date, list);
  }

  const cells: string[] = [];
  for (let d = mi.gridStart; d <= mi.gridEnd; d = addDays(d, 1)) cells.push(d);

  const dayEntries = byDay.get(day) ?? [];
  const href = (month: string, d?: string) => `/admin/schedule?month=${month}${d ? `&day=${d}` : ""}`;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Schedule</h1>
          <p className="lede">Tap a day to see its visits. To add a visit, open a customer&apos;s property.</p>
        </div>
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

      <div className="panel cal-panel">
        <div className="cal-head">
          <Link href={href(mi.prev)} className="btn btn-outline btn-sm" aria-label="Previous month" scroll={false}>‹</Link>
          <h2>{MONTHS[mi.m - 1]} {mi.y}</h2>
          <Link href={href(mi.next)} className="btn btn-outline btn-sm" aria-label="Next month" scroll={false}>›</Link>
          {!today.startsWith(ym) && (
            <Link href={href(today.slice(0, 7), today)} className="btn btn-outline btn-sm cal-today" scroll={false}>Today</Link>
          )}
        </div>

        <div className="cal-grid" role="grid" aria-label={`${MONTHS[mi.m - 1]} ${mi.y}`}>
          {WEEKDAYS.map((w) => (
            <div key={w} className="cal-dow" role="columnheader">{w}</div>
          ))}
          {cells.map((d) => {
            const list = byDay.get(d) ?? [];
            const cls = [
              "cal-day",
              d.slice(0, 7) !== ym && "cal-out",
              d === today && "cal-is-today",
              d === day && "cal-selected",
              d < today && "cal-past",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <Link
                key={d}
                href={href(d.slice(0, 7) === ym ? ym : d.slice(0, 7), d)}
                className={cls}
                scroll={false}
                role="gridcell"
                aria-label={`${prettyDate(d)}: ${list.length} visit${list.length === 1 ? "" : "s"}`}
              >
                <span className="cal-num">{Number(d.slice(8))}</span>
                <span className="cal-chips">
                  {list.slice(0, 3).map((e) => (
                    <span key={e.key} className={`cal-chip t-${e.visit.type} k-${e.kind}`}>
                      {e.kind === "completed" && "✓ "}
                      {SHORT[e.visit.type]} · {e.customer.name.split(" ")[0]}
                    </span>
                  ))}
                  {list.length > 3 && <span className="cal-more">+{list.length - 3} more</span>}
                </span>
                <span className="cal-dots" aria-hidden="true">
                  {list.slice(0, 4).map((e) => (
                    <i key={e.key} className={`t-${e.visit.type} k-${e.kind}`} />
                  ))}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="cal-legend">
          <span><i className="t-lawn" /> Lawn</span>
          <span><i className="t-leaf" /> Leaves</span>
          <span><i className="t-snow" /> Snow</span>
          <span><i className="t-other" /> Other</span>
          <span><i className="t-lawn k-planned" /> Planned repeat</span>
          <span><i className="t-lawn k-completed" /> Done</span>
        </div>
      </div>

      <div className="panel" id="day">
        <h2>
          {day === today ? "Today · " : ""}
          {prettyDate(day)}
        </h2>
        {dayEntries.length === 0 ? (
          <p className="empty">No visits this day.</p>
        ) : (
          <ul className="list">
            {dayEntries.map((e) =>
              e.kind === "scheduled" ? (
                <VisitRow key={e.key} visit={e.visit} property={e.property} customer={e.customer} />
              ) : (
                <li key={e.key}>
                  <div>
                    <div className="title">
                      {SERVICE_LABELS[e.visit.type]} · {money(e.visit.priceCents)}
                    </div>
                    <div className="meta">
                      <Link href={`/admin/customers/${e.customer.id}`}>{e.customer.name}</Link> ·{" "}
                      <Link href={`/admin/properties/${e.property.id}`}>{e.property.address}</Link>, {e.property.city}
                      {e.kind === "planned" && <> · {RECURRENCE_LABELS[e.visit.recurrence]}</>}
                    </div>
                  </div>
                  {e.kind === "completed" ? (
                    <span className="badge">Done</span>
                  ) : (
                    <span className="badge badge-gray" title="Becomes a real visit once the one before it is done or skipped">
                      Planned repeat
                    </span>
                  )}
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </>
  );
}
