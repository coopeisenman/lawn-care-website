import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortalPreview } from "@/lib/data/portal";
import PortalView from "@/components/portal/PortalView";
import Logo from "@/components/Logo";

export const metadata = { title: "Portal preview | Westward Admin" };

export default async function PortalPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPortalPreview(id);
  if (!data) notFound();
  const first = data.customer.name.split(" ")[0];

  return (
    <>
      <div className="preview-banner">
        <span>
          <strong>Preview:</strong> this is what {first} sees after logging in. You&apos;re still signed in as yourself.
        </span>
        <Link href={`/admin/customers/${id}`} className="btn btn-outline btn-sm">Back to {first}</Link>
      </div>
      <div className="preview-frame" aria-label={`${data.customer.name}'s portal`}>
        <div className="preview-header">
          <span className="logo">
            <Logo variant="mark" />
            <span>Westward <span className="app-area">Customer Portal</span></span>
          </span>
          <span className="btn btn-outline btn-sm" aria-disabled="true">Sign out</span>
        </div>
        <div className="preview-body">
          <PortalView {...data} />
        </div>
      </div>
      {!data.customer.userId && (
        <p className="meta" style={{ marginTop: 14 }}>
          {first} doesn&apos;t have portal access yet, so they can&apos;t log in. Turn it on from their customer page.
        </p>
      )}
    </>
  );
}
