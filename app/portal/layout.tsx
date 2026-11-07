import AppHeader from "@/components/AppHeader";
import { requireCustomer } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await requireCustomer();
  return (
    <>
      <AppHeader area="Customer Portal" home="/portal" />
      <main className="app-main">
        <div className="wrap">{children}</div>
      </main>
    </>
  );
}
