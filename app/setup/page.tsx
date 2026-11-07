import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import SetupForm from "./SetupForm";
import { ownerAccountExists } from "./actions";

export const metadata = { title: "Setup | Westward Property Care" };
export const dynamic = "force-dynamic";

// One-time page for creating the owner account. It turns itself off once that exists.
export default async function SetupPage() {
  if (await ownerAccountExists()) redirect("/login/owner");
  return (
    <AuthShell>
      <div className="auth-card">
        <h1>Create the owner account</h1>
        <p>This only works once. Use the setup code you saved in Cloudflare.</p>
        <SetupForm />
      </div>
    </AuthShell>
  );
}
