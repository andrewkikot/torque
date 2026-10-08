"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import * as visits from "@/lib/services/visits";
import { run } from "./_result";

/** Car-owner actions: owners follow jobs, approve extra work and message the workshop. */
const refresh = (visitId?: string) => {
  if (visitId) revalidatePath(`/visits/${visitId}`);
  revalidatePath("/visits");
  revalidatePath("/garage");
  revalidatePath("/cars", "layout");
};

export async function addNoteAction(visitId: string, message: string) {
  const user = await requireUser();
  return run(async () => {
    await visits.addNote({ kind: "owner", userId: user.id }, visitId, message);
    refresh(visitId);
  });
}

export async function decideApprovalAction(visitId: string, eventId: string, approved: boolean) {
  const user = await requireUser();
  return run(async () => {
    await visits.decideApproval({ kind: "owner", userId: user.id }, eventId, approved);
    refresh(visitId);
  });
}

export async function detachVisitAction(visitId: string) {
  const user = await requireUser();
  return run(async () => {
    await visits.detachVisit(user.id, visitId);
    refresh();
  });
}
