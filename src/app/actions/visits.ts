"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import * as visits from "@/lib/services/visits";
import { run } from "./_result";

const refresh = (visitId?: string, carId?: string) => {
  if (visitId) revalidatePath(`/visits/${visitId}`);
  revalidatePath("/visits");
  revalidatePath("/garage");
  if (carId) revalidatePath(`/cars/${carId}`, "layout");
};

export async function createVisitAction(input: { carId: string } & Record<string, unknown>) {
  const user = await requireUser();
  return run(async () => {
    const v = await visits.createVisit(user.id, input);
    refresh(v.id, v.carId);
    return { id: v.id };
  });
}

export async function updateVisitAction(visitId: string, input: Record<string, unknown>) {
  const user = await requireUser();
  return run(async () => {
    await visits.updateVisitDetails(user.id, visitId, input);
    refresh(visitId);
  });
}

export async function changeStatusAction(visitId: string, status: string, message?: string) {
  const user = await requireUser();
  return run(async () => {
    await visits.changeStatus({ kind: "owner", userId: user.id }, visitId, status, message);
    refresh(visitId);
    revalidatePath("/cars", "layout");
  });
}

export async function addNoteAction(visitId: string, message: string, photoUrl?: string | null) {
  const user = await requireUser();
  return run(async () => {
    await visits.addNote({ kind: "owner", userId: user.id }, visitId, message, photoUrl);
    refresh(visitId);
  });
}

export async function addVisitWorkAction(visitId: string, input: Record<string, unknown>) {
  const user = await requireUser();
  return run(async () => {
    await visits.addVisitWork({ kind: "owner", userId: user.id }, visitId, input);
    refresh(visitId);
  });
}

export async function removeVisitWorkAction(visitId: string, workId: string) {
  const user = await requireUser();
  return run(async () => {
    await visits.removeVisitWork({ kind: "owner", userId: user.id }, visitId, workId);
    refresh(visitId);
  });
}

export async function decideApprovalAction(visitId: string, eventId: string, approved: boolean) {
  const user = await requireUser();
  return run(async () => {
    await visits.decideApproval(user.id, eventId, approved);
    refresh(visitId);
  });
}

export async function sharingAction(visitId: string, opts: { enabled?: boolean; regenerate?: boolean }) {
  const user = await requireUser();
  return run(async () => {
    const v = await visits.setSharing(user.id, visitId, opts);
    refresh(visitId);
    return { shareToken: v.shareToken, shareEnabled: v.shareEnabled };
  });
}

export async function deleteVisitAction(visitId: string) {
  const user = await requireUser();
  return run(async () => {
    await visits.deleteVisit(user.id, visitId);
    refresh();
  });
}
