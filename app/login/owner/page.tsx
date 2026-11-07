import AuthShell from "@/components/AuthShell";
import OwnerLoginForm from "./OwnerLoginForm";

export const metadata = { title: "Owner Login | Westward Property Care" };

export default async function OwnerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const { setup } = await searchParams;
  return (
    <AuthShell>
      <div className="auth-card">
        <h1>Owner login</h1>
        <p>Sign in to manage customers, schedules and invoices.</p>
        {setup === "done" && <div className="notice notice-ok">Owner account created. Sign in below.</div>}
        <OwnerLoginForm />
      </div>
    </AuthShell>
  );
}
