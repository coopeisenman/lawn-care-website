"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { user } from "@/lib/db/schema";

export async function ownerAccountExists() {
  const db = await getDb();
  const admin = await db.query.user.findFirst({ where: eq(user.role, "admin") });
  return Boolean(admin);
}

function sameText(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export type SetupState = { error?: string };

export async function createOwnerAccount(_prev: SetupState, form: FormData): Promise<SetupState> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.SETUP_CODE) return { error: "Setup is turned off. Add a SETUP_CODE secret in Cloudflare first." };
  if (await ownerAccountExists()) return { error: "The owner account already exists." };

  const code = String(form.get("code") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  if (!sameText(code, env.SETUP_CODE)) return { error: "That setup code isn't right." };
  if (!name || !email) return { error: "Please fill in your name and email." };
  if (password.length < 10) return { error: "Use a password of at least 10 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const ctx = await (await getAuth()).$context;
  const owner = await ctx.internalAdapter.createUser({
    name,
    email,
    emailVerified: true,
    role: "admin",
  }, { method: "admin" });
  await ctx.internalAdapter.linkAccount({
    providerId: "credential",
    accountId: owner.id,
    userId: owner.id,
    password: await ctx.password.hash(password),
  });

  redirect("/login/owner?setup=done");
}
