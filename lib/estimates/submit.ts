"use server";

// Handles the public "Free estimate" form on the homepage. Anyone can call this,
// so everything is checked carefully and spam is quietly dropped.

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { and, count, eq, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "../db";
import { estimateRequests } from "../db/schema";
import { REQUEST_SERVICES, SERVICE_AREA_CITIES } from "../constants";
import { FormError, text, requiredText, email, oneOf, type ActionState } from "../forms";

const PER_SENDER_PER_HOUR = 3;
const ALL_SENDERS_PER_HOUR = 30;

export async function submitEstimateRequest(_prev: ActionState, form: FormData): Promise<ActionState> {
  const thanks = { ok: "Thanks! We got your request and will be in touch soon." };

  // Spam traps: a hidden field people never see, and forms filled in faster than a person can type.
  if (String(form.get("company") ?? "") !== "") return thanks;
  const startedAt = Number(form.get("startedAt"));
  const elapsed = Date.now() - startedAt;
  if (!Number.isFinite(startedAt) || elapsed < 3000 || elapsed > 86_400_000) return thanks;

  try {
    const name = requiredText(form, "name", "Please enter your name.", 120);
    const phoneRaw = requiredText(form, "phone", "Please enter your phone number.", 40);
    const digits = phoneRaw.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) throw new FormError("Please enter a 10-digit phone number.");
    const fields = {
      name,
      phone: phoneRaw,
      email: email(form, "email"),
      address: text(form, "address", { max: 200 }),
      city: oneOf(form, "city", SERVICE_AREA_CITIES, "Please pick your city."),
      service: oneOf(form, "service", REQUEST_SERVICES, "Please pick a service."),
      message: text(form, "message", { max: 1000 }),
    };

    const db = await getDb();
    const { env } = await getCloudflareContext({ async: true });
    const h = await headers();
    const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    // Store only a scrambled version of the address, never the address itself.
    const ipHash = createHash("sha256").update(`${env.BETTER_AUTH_SECRET}:${ip}`).digest("hex").slice(0, 32);
    const hourAgo = new Date(Date.now() - 3_600_000);

    const [[mine], [all]] = await Promise.all([
      db.select({ n: count() }).from(estimateRequests).where(and(eq(estimateRequests.ipHash, ipHash), gte(estimateRequests.createdAt, hourAgo))),
      db.select({ n: count() }).from(estimateRequests).where(gte(estimateRequests.createdAt, hourAgo)),
    ]);
    if (mine.n >= PER_SENDER_PER_HOUR || all.n >= ALL_SENDERS_PER_HOUR) {
      throw new FormError("We've received a lot of requests just now. Please call or text us instead.");
    }

    await db.insert(estimateRequests).values({ ...fields, ipHash });
    revalidatePath("/admin", "layout");
    return thanks;
  } catch (e) {
    if (e instanceof FormError) return { error: e.message };
    throw e;
  }
}
