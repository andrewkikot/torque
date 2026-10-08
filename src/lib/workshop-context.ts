import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAcceptedUser, getCurrentUser, getSettings } from "@/lib/session";
import { TERMS_VERSION } from "@/lib/terms";
import { myWorkshops } from "@/lib/services/workshops";

export const WORKSHOP_COOKIE = "torque_ws";

/** The workshop the signed-in user is working in (cookie choice, else their first one). */
export const getCurrentWorkshop = cache(async (userId: string) => {
  const all = await myWorkshops(userId);
  if (!all.length) return null;
  const chosen = (await cookies()).get(WORKSHOP_COOKIE)?.value;
  const current = all.find((w) => w.workshop.id === chosen) ?? all[0];
  return { ...current, all };
});

/** Like requireAcceptedUser, but comes back to `path` after sign-in / accepting terms. */
export async function requireAcceptedUserFor(path: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(path)}`);
  const settings = await getSettings(user.id);
  if (settings.termsVersion !== TERMS_VERSION) redirect(`/accept-terms?next=${encodeURIComponent(path)}`);
  return user;
}

export async function requireWorkshop() {
  const user = await requireAcceptedUser();
  const ws = await getCurrentWorkshop(user.id);
  if (!ws) redirect("/w/create");
  return { user, ...ws };
}
