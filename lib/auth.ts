import { betterAuth } from "better-auth";
import { and, eq } from "drizzle-orm";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins/magic-link";
import { nextCookies } from "better-auth/next-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./db";
import * as schema from "./db/schema";
import { sendLoginEmail } from "./email";

async function createAuth() {
  const { env } = await getCloudflareContext({ async: true });
  const db = await getDb();

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    // Owner logs in with email + password. Nobody can sign themselves up:
    // the owner account comes from /setup, customer logins are created by the owner.
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 10,
    },
    user: {
      additionalFields: {
        // input: false means nobody can set their own role from the browser
        role: { type: "string", defaultValue: "customer", input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // stay logged in for 30 days
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-in/magic-link": { window: 60, max: 3 },
      },
    },
    plugins: [
      magicLink({
        disableSignUp: true, // only customers the owner has added can log in
        expiresIn: 60 * 15,
        sendMagicLink: async ({ email, url }) => {
          // Only email people who are actually customers with portal access.
          // Everyone else sees the same "check your email" message but gets nothing.
          const found = await db
            .select({ id: schema.customers.id })
            .from(schema.user)
            .innerJoin(schema.customers, eq(schema.customers.userId, schema.user.id))
            .where(and(eq(schema.user.email, email.toLowerCase()), eq(schema.user.role, "customer")))
            .limit(1);
          if (found.length) await sendLoginEmail(email, url);
        },
      }),
      nextCookies(),
    ],
  });
}

export type Auth = Awaited<ReturnType<typeof createAuth>>;

// Cloudflare gives us the database per request, so build the auth helper on demand.
export async function getAuth(): Promise<Auth> {
  return createAuth();
}
