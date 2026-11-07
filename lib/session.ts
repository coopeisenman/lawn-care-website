import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getAuth } from "./auth";
import { getDb } from "./db";
import { customers } from "./db/schema";

export async function getSession() {
  const auth = await getAuth();
  return auth.api.getSession({ headers: await headers() });
}

/** Use at the top of every admin page and admin action. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login/owner");
  if (session.user.role !== "admin") redirect("/portal");
  return session;
}

/**
 * Use at the top of every customer page. Returns the customer record linked to
 * the logged-in user. Portal queries must only use this customer's id — never an
 * id that comes from the URL or a form.
 */
export async function requireCustomer() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role === "admin") redirect("/admin");

  const db = await getDb();
  const customer = await db.query.customers.findFirst({
    where: eq(customers.userId, session.user.id),
  });
  if (!customer) redirect("/login?error=no-account");
  return { session, customer };
}
