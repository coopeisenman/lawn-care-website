import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { services, properties } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";
import { updateVisit, cancelVisit } from "@/lib/admin/actions";
import { SERVICE_LABELS } from "@/lib/format";
import ActionForm, { SubmitButton } from "@/components/admin/ActionForm";
import ActionButton from "@/components/admin/ActionButton";
import VisitFields from "@/components/admin/VisitFields";

export const metadata = { title: "Edit visit | Westward Admin" };

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const db = await getDb();
  const v = await db.query.services.findFirst({ where: eq(services.id, id) });
  if (!v) notFound();
  const p = await db.query.properties.findFirst({ where: eq(properties.id, v.propertyId) });

  return (
    <>
      <p className="crumbs">
        <Link href={`/admin/properties/${v.propertyId}`}>{p?.address}</Link>
      </p>
      <h1>{SERVICE_LABELS[v.type]}</h1>
      <p className="lede">
        {v.status === "scheduled"
          ? "Change the date or price, or stop it from repeating by setting How often to One time."
          : `This visit is ${v.status}, so it can't be changed.`}
      </p>
      {v.status === "scheduled" && (
        <>
          <div className="panel">
            <ActionForm action={updateVisit.bind(null, id)}>
              <VisitFields initial={v} />
              <div className="form-actions"><SubmitButton>Save</SubmitButton></div>
            </ActionForm>
          </div>
          <ActionButton
            action={cancelVisit.bind(null, id)}
            confirm="Cancel this visit for good? If it repeats, no more visits will be scheduled."
            className="btn btn-outline btn-sm danger"
          >
            Cancel visit (stop repeating)
          </ActionButton>
        </>
      )}
    </>
  );
}
