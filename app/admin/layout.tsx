import AppHeader from "@/components/AppHeader";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <AppHeader area="Admin" home="/admin" />
      <main className="app-main">
        <div className="wrap">{children}</div>
      </main>
    </>
  );
}
