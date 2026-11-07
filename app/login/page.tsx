import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import CustomerLoginForm from "./CustomerLoginForm";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Customer Login | Westward Property Care" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthShell>
      <div className="auth-card">
        <h1>Customer login</h1>
        <p>Enter the email address we have on file and we&apos;ll send you a link to log in. No password needed.</p>
        {error === "no-account" && (
          <div className="notice notice-error">
            We couldn&apos;t find a customer account for that login. Call or text {BUSINESS.phoneDisplay} and we&apos;ll get you set up.
          </div>
        )}
        {error && error !== "no-account" && (
          <div className="notice notice-error">That login link has expired or was already used. Request a new one below.</div>
        )}
        <CustomerLoginForm />
        <p className="small">
          Business owner? <Link href="/login/owner">Sign in with password</Link>
        </p>
      </div>
    </AuthShell>
  );
}
