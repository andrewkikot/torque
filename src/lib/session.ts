import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
