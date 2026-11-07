import { getPortalData } from "@/lib/data/portal";
import { money, prettyDate, SERVICE_LABELS } from "@/lib/format";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "My Account | Westward Property Care" };

export default async function PortalHome() {
  const { customer, properties, upcoming, invoices } = await getPortalData();
  const addressOf = new Map(properties.map((p) => [p.id, p.address]));

  return (
    <>
      <h1>Welcome, {customer.name.split(" ")[0]}</h1>
      <p className="lede">
        Questions? Call or text <a href={`tel:${BUSINESS.phone}`}>{BUSINESS.phoneDisplay}</a>.
      </p>

      <div className="panel">
        <h2>Upcoming visits</h2>
        {upcoming.length === 0 ? (
          <p className="empty">Nothing scheduled right now.</p>
        ) : (
          <ul className="list">
            {upcoming.map((s) => (
              <li key={s.id}>
                <div>
                  <strong>{SERVICE_LABELS[s.type]}</strong>
                  <div className="meta">{addressOf.get(s.propertyId)}</div>
                </div>
                <div className="meta">{prettyDate(s.scheduledDate)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel">
        <h2>Invoices</h2>
        {invoices.length === 0 ? (
          <p className="empty">No invoices yet.</p>
        ) : (
          <ul className="list">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <div>
                  <strong>{money(inv.totalCents)}</strong>
                  <div className="meta">
                    {inv.dueDate ? `Due ${prettyDate(inv.dueDate)}` : "Invoice"}
                  </div>
                </div>
                <span className={inv.status === "paid" ? "badge" : "badge badge-amber"}>
                  {inv.status === "paid" ? "Paid" : "Unpaid"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel">
        <h2>Your properties</h2>
        {properties.length === 0 ? (
          <p className="empty">No properties on file.</p>
        ) : (
          <ul className="list">
            {properties.map((p) => (
              <li key={p.id}>
                <strong>{p.address}</strong>
                <span className="meta">
                  {p.city}, {p.state} {p.zip}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
