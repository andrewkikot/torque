"use server";

import { revalidatePath } from "next/cache";
import * as visits from "@/lib/services/visits";
import { getCurrentUser } from "@/lib/session";
import { hit } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";
import { run } from "./_result";

/** Customer actions on the public tracking link, authorized by its token only. */
async function guard(token: string) {
  if (!(await hit(`track:${token}`, 60, 60 * 60))) throw new AppError("rate_limited", "Too many requests");
  const v = await visits.getVisitByToken(token);
  if (!v) throw new AppError("not_found", "Visit not found");
  return v;
}

const refresh = (token: string, visitId: string) => {
  revalidatePath(`/v/${token}`);
  revalidatePath(`/visits/${visitId}`);
  revalidatePath(`/w/jobs/${visitId}`);
};

export async function trackNoteAction(token: string, message: string) {
  return run(async () => {
    const v = await guard(token);
    await visits.addNote({ kind: "customer", token }, v.id, message);
    refresh(token, v.id);
  });
}

export async function trackDecideAction(token: string, eventId: string, approved: boolean) {
  return run(async () => {
    const v = await guard(token);
    await visits.decideApproval({ kind: "customer", token }, eventId, approved);
    refresh(token, v.id);
  });
}

export async function claimVisitAction(token: string, carId: string | null) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Sign in first" };
  return run(async () => {
    const r = await visits.claimVisit(token, user.id, { carId });
    revalidatePath("/garage");
    refresh(token, r.visitId);
    return r;
  });
}
