import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { siteSettings } from "./db/schema";
import { DEFAULT_THEME, isTheme, type Theme } from "./theme";

// Site-wide settings, saved as simple name → value pairs.

/** Read one setting. Returns null if it isn't set (or the table isn't there yet). */
export async function getSetting(key: string): Promise<string | null> {
  try {
    const db = await getDb();
    const row = await db.query.siteSettings.findFirst({ where: eq(siteSettings.key, key) });
    return row?.value ?? null;
  } catch {
    // Never let a settings problem take the website down — fall back to defaults.
    return null;
  }
}

export async function setSetting(key: string, value: string) {
  const db = await getDb();
  // Safety net in case the database migration hasn't been applied yet.
  await db.run(sql`CREATE TABLE IF NOT EXISTS site_settings (
    key text PRIMARY KEY NOT NULL,
    value text NOT NULL,
    updated_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
  )`);
  await db
    .insert(siteSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
}

export async function getTheme(): Promise<Theme> {
  const v = await getSetting("theme");
  return isTheme(v) ? v : DEFAULT_THEME;
}
