import Link from "next/link";
import ActionButton from "./ActionButton";
import { completeVisit, skipVisit } from "@/lib/admin/actions";
import { money, SERVICE_LABELS, RECURRENCE_LABELS } from "@/lib/format";
import type { services, properties } from "@/lib/db/schema";

type Props = {
  visit: typeof services.$inferSelect;
  property?: typeof properties.$inferSelect;
  customer?: { id: string; name: string };
};

/** One scheduled visit with Done / Skip buttons. */
export default function VisitRow({ visit, property, customer }: Props) {
  const repeats = visit.recurrence !== "none";
  return (
    <li>
      <div>
        <div className="title">
          {SERVICE_LABELS[visit.type]} · {money(visit.priceCents)}
        </div>
        <div className="meta">
          {customer && <><Link href={`/admin/customers/${customer.id}`}>{customer.name}</Link> · </>}
          {property && <><Link href={`/admin/properties/${property.id}`}>{property.address}</Link>, {property.city} · </>}
          {RECURRENCE_LABELS[visit.recurrence]}
          {property?.notes && <> · <em>{property.notes}</em></>}
        </div>
      </div>
      <div className="row-actions">
        <ActionButton action={completeVisit.bind(null, visit.id)} className="btn btn-primary btn-sm">
          Done
        </ActionButton>
        <ActionButton
          action={skipVisit.bind(null, visit.id)}
          confirm={repeats ? "Skip this visit? The next one will still be scheduled." : "Cancel this one-time visit?"}
        >
          {repeats ? "Skip" : "Cancel"}
        </ActionButton>
        <Link href={`/admin/visits/${visit.id}`} className="btn btn-outline btn-sm">
          Edit
        </Link>
      </div>
    </li>
  );
}
