"use server";

import { revalidatePath } from "next/cache";
import * as visits from "@/lib/services/visits";
import { hit } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";
import { run } from "./_result";

/** Public actions for mechanics, authorized by the visit's share token only. */
async function guard(token: string) {
  if (!(await hit(`shop:${token}`, 120, 60 * 60))) throw new AppError("rate_limited", "Too many updates");
  const v = await visits.getVisitByToken(token);
  if (!v) throw new AppError("not_found", "Visit not found");
  return v;
}

const refresh = (token: string, visitId: string) => {
  revalidatePath(`/v/${token}`);
  revalidatePath(`/visits/${visitId}`);
};

export async function shopStatusAction(token: string, status: string, message?: string) {
  return run(async () => {
    const v = await guard(token);
    await visits.changeStatus({ kind: "shop", token }, v.id, status, message);
    refresh(token, v.id);
  });
}

export async function shopNoteAction(token: string, message: string, photoUrl?: string | null) {
  return run(async () => {
    const v = await guard(token);
    await visits.addNote({ kind: "shop", token }, v.id, message, photoUrl);
    refresh(token, v.id);
  });
}

export async function shopWorkAction(token: string, input: Record<string, unknown>) {
  return run(async () => {
    const v = await guard(token);
    await visits.addVisitWork({ kind: "shop", token }, v.id, input);
    refresh(token, v.id);
  });
}

export async function shopApprovalAction(token: string, message: string, items: Record<string, unknown>[]) {
  return run(async () => {
    const v = await guard(token);
    await visits.requestApproval({ kind: "shop", token }, v.id, { message, items });
    refresh(token, v.id);
  });
}
