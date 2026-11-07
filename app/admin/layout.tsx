import AppHeader from "@/components/AppHeader";
import { requireAdmin } from "@/lib/session";
import AdminNav from "@/components/admin/AdminNav";
import { count, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { estimateRequests } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const db = await getDb();
  const [{ n: newRequests }] = await db
    .select({ n: count() })
    .from(estimateRequests)
    .where(eq(estimateRequests.status, "new"));
  return (
    <>
      <AppHeader area="Admin" home="/admin" />
      <main className="app-main">
        <div className="wrap">
          <AdminNav newRequests={newRequests} />
          {children}
        </div>
      </main>
    </>
  );
}
