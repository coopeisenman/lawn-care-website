import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { createCustomer } from "@/lib/admin/actions";
import ActionForm, { SubmitButton } from "@/components/admin/ActionForm";
import CustomerFields from "@/components/admin/CustomerFields";

export const metadata = { title: "New customer | Westward Admin" };

export default async function NewCustomerPage() {
  await requireAdmin();
  return (
    <>
      <p className="crumbs"><Link href="/admin/customers">Customers</Link></p>
      <h1>New customer</h1>
      <p className="lede">You&apos;ll add their property on the next screen.</p>
      <div className="panel">
        <ActionForm action={createCustomer}>
          <CustomerFields />
          <div className="form-actions">
            <SubmitButton>Save customer</SubmitButton>
          </div>
        </ActionForm>
      </div>
    </>
  );
}
