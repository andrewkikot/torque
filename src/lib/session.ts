import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { TERMS_VERSION } from "@/lib/terms";

export type CurrentUser = { id: string; email: string; name: string };

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, email, name } = session.user;
  return { id, email, name };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** Signed in AND accepted the current Terms; otherwise sent to sign-in / acceptance. */
export async function requireAcceptedUser(): Promise<CurrentUser> {
  const user = await requireUser();
  const settings = await getSettings(user.id);
  if (settings.termsVersion !== TERMS_VERSION) redirect("/accept-terms");
  return user;
}

/**
 * Torque staff who issue licenses. ADMIN_EMAILS is comma-separated and may contain
 * emails and/or Telegram usernames ("@name") for accounts that sign in with Telegram.
 */
export async function isAdmin(user: CurrentUser | null) {
  if (!user) return false;
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (list.includes(user.email.toLowerCase())) return true;
  const handles = list.filter((e) => e.startsWith("@"));
  if (!handles.length) return false;
  const s = await db.query.userSettings.findFirst({ where: eq(schema.userSettings.userId, user.id), columns: { telegramUsername: true } });
  return !!s?.telegramUsername && handles.includes(s.telegramUsername.toLowerCase());
}

/** Signed-in admin, or a plain 404 for everyone else (the admin area doesn't advertise itself). */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!(await isAdmin(user))) notFound();
  return user!;
}

export const getSettings = cache(async (userId: string) => {
  const existing = await db.query.userSettings.findFirst({
    where: eq(schema.userSettings.userId, userId),
  });
  if (existing) return existing;
  const [created] = await db
    .insert(schema.userSettings)
    .values({ userId })
    .onConflictDoNothing()
    .returning();
  return (
    created ??
    (await db.query.userSettings.findFirst({ where: eq(schema.userSettings.userId, userId) }))!
  );
});
