import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { taxYears, taxYear, ymdOf } from "@/lib/admin/tax";
import { money, prettyDate, MONTHS, PAYMENT_LABELS, SERVICE_LABELS } from "@/lib/format";

export const metadata = { title: "Tax records | Westward Admin" };

export default async function TaxPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  await requireAdmin();
  const years = await taxYears();
  const asked = Number((await searchParams).year);
  const year = years.includes(asked) ? asked : years[0];
  const t = await taxYear(year);
  const services = Object.entries(t.byService).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tax records</h1>
          <p className="lede">Everything you were paid in {year}, by the date the payment came in.</p>
        </div>
        {t.rows.length > 0 && (
          <a href={`/admin/tax/${year}`} className="btn btn-primary" download>
            Download spreadsheet
          </a>
        )}
      </div>

      <nav className="admin-nav year-nav" aria-label="Year">
        {years.map((y) => (
          <Link key={y} href={`/admin/tax?year=${y}`} className={y === year ? "active" : ""}>
            {y}
          </Link>
        ))}
      </nav>

      <div className="stats">
        <div className="stat"><strong>{money(t.total)}</strong><span>Collected</span></div>
        <div className="stat"><strong>{t.rows.length}</strong><span>Paid invoices</span></div>
        <div className="stat"><strong>{money(t.fees)}</strong><span>Stripe fees</span></div>
        <div className="stat"><strong>{money(t.total - t.fees)}</strong><span>After fees</span></div>
      </div>

      {t.rows.length === 0 ? (
        <div className="panel">
          <p className="empty">No paid invoices in {year} yet.</p>
        </div>
      ) : (
        <>
          <div className="cols">
            <div className="panel">
              <h2>By month</h2>
              <table className="table">
                <thead><tr><th>Month</th><th className="num">Invoices</th><th className="num">Collected</th></tr></thead>
                <tbody>
                  {t.byMonth.map((m, i) =>
                    m.count ? (
                      <tr key={i}><td>{MONTHS[i]}</td><td className="num">{m.count}</td><td className="num">{money(m.cents)}</td></tr>
                    ) : null,
                  )}
                </tbody>
                <tfoot><tr><td>Total</td><td className="num">{t.rows.length}</td><td className="num">{money(t.total)}</td></tr></tfoot>
              </table>
            </div>
            <div className="panel">
              <h2>By service</h2>
              <table className="table">
                <tbody>
                  {services.map(([type, cents]) => (
                    <tr key={type}><td>{type === "extra" ? "Extra charges" : SERVICE_LABELS[type]}</td><td className="num">{money(cents)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <h2>Paid invoices</h2>
            <div className="table-scroll">
              <table className="table">
                <thead><tr><th>Paid</th><th>Customer</th><th>How</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  {t.rows.map(({ invoice: inv, customerName }) => (
                    <tr key={inv.id}>
                      <td>{prettyDate(ymdOf(inv.paidAt!))}</td>
                      <td><Link href={`/admin/invoices/${inv.id}`}>{customerName}</Link></td>
                      <td>{PAYMENT_LABELS[inv.paymentMethod ?? "other"]}</td>
                      <td className="num">{money(inv.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <p className="meta">
        PDF copies of each paid invoice will be saved here automatically once Stripe is connected. Ask your accountant how
        long to keep records — the IRS generally says at least 3 years.
      </p>
    </>
  );
}
