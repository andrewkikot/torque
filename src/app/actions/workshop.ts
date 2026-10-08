"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireAcceptedUser } from "@/lib/session";
import * as visits from "@/lib/services/visits";
import * as ws from "@/lib/services/workshops";
import { WORKSHOP_COOKIE, getCurrentWorkshop } from "@/lib/workshop-context";
import { AppError } from "@/lib/errors";
import { hit } from "@/lib/rate-limit";
import { run } from "./_result";

async function current() {
  const user = await requireAcceptedUser();
  const w = await getCurrentWorkshop(user.id);
  if (!w) throw new AppError("not_found", "Create or join a workshop first");
  return { user, workshopId: w.workshop.id };
}

const staff = (userId: string) => ({ kind: "staff" as const, userId });

const refreshJob = (visitId: string) => {
  revalidatePath(`/w/jobs/${visitId}`);
  revalidatePath("/w");
  revalidatePath(`/visits/${visitId}`);
};

/* Workshop profile & team */

export async function createWorkshopAction(input: Record<string, unknown>) {
  const user = await requireAcceptedUser();
  return run(async () => {
    const w = await ws.createWorkshop(user.id, input);
    (await cookies()).set(WORKSHOP_COOKIE, w.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    revalidatePath("/", "layout");
    return { id: w.id };
  });
}

export async function updateWorkshopAction(input: Record<string, unknown>) {
  return run(async () => {
    const { user, workshopId } = await current();
    await ws.updateWorkshop(user.id, workshopId, input);
    revalidatePath("/w", "layout");
  });
}

export async function switchWorkshopAction(workshopId: string) {
  const user = await requireAcceptedUser();
  return run(async () => {
    await ws.requireMember(user.id, workshopId);
    (await cookies()).set(WORKSHOP_COOKIE, workshopId, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    revalidatePath("/w", "layout");
  });
}

export async function inviteLinkAction() {
  return run(async () => {
    const { user, workshopId } = await current();
    const invite = await ws.createInvite(user.id, workshopId, "mechanic");
    return { token: invite.token, expiresAt: invite.expiresAt.toISOString() };
  });
}

export async function acceptInviteAction(token: string) {
  const user = await requireAcceptedUser();
  return run(async () => {
    const w = await ws.acceptInvite(token, user.id);
    (await cookies()).set(WORKSHOP_COOKIE, w.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    revalidatePath("/", "layout");
    return { id: w.id };
  });
}

export async function removeMemberAction(memberId: string) {
  return run(async () => {
    const { user, workshopId } = await current();
    await ws.removeMember(user.id, workshopId, memberId);
    revalidatePath("/", "layout");
  });
}

/* Jobs */

export async function checkInAction(code: string, input: Record<string, unknown>) {
  return run(async () => {
    const { user, workshopId } = await current();
    // Slows down anyone trying to guess codes.
    if (!(await hit(`checkin:${user.id}`, 30, 60 * 60))) throw new AppError("rate_limited", "Too many attempts, try again later");
    const v = await visits.checkInByCode(user.id, workshopId, code, input);
    revalidatePath("/w");
    return { id: v.id };
  });
}

export async function previewCheckInAction(code: string) {
  return run(async () => {
    const { user, workshopId } = await current();
    if (!(await hit(`checkin:${user.id}`, 30, 60 * 60))) throw new AppError("rate_limited", "Too many attempts, try again later");
    return visits.previewCheckIn(user.id, workshopId, code);
  });
}

export async function walkInAction(input: Record<string, unknown>) {
  return run(async () => {
    const { user, workshopId } = await current();
    const v = await visits.createWalkIn(user.id, workshopId, input);
    revalidatePath("/w");
    return { id: v.id };
  });
}

export async function jobStatusAction(visitId: string, status: string, message?: string) {
  const user = await requireAcceptedUser();
  return run(async () => {
    await visits.changeStatus(staff(user.id), visitId, status, message);
    refreshJob(visitId);
  });
}

export async function jobNoteAction(visitId: string, message: string, photoUrl?: string | null) {
  const user = await requireAcceptedUser();
  return run(async () => {
    await visits.addNote(staff(user.id), visitId, message, photoUrl);
    refreshJob(visitId);
  });
}

export async function jobWorkAction(visitId: string, input: Record<string, unknown>) {
  const user = await requireAcceptedUser();
  return run(async () => {
    await visits.addVisitWork(staff(user.id), visitId, input);
    refreshJob(visitId);
  });
}

export async function jobRemoveWorkAction(visitId: string, workId: string) {
  const user = await requireAcceptedUser();
  return run(async () => {
    await visits.removeVisitWork(staff(user.id), visitId, workId);
    refreshJob(visitId);
  });
}

export async function jobApprovalAction(visitId: string, message: string, items: Record<string, unknown>[]) {
  const user = await requireAcceptedUser();
  return run(async () => {
    await visits.requestApproval(staff(user.id), visitId, { message, items });
    refreshJob(visitId);
  });
}

export async function jobUpdateAction(visitId: string, input: Record<string, unknown>) {
  const user = await requireAcceptedUser();
  return run(async () => {
    await visits.updateJob(staff(user.id), visitId, input);
    refreshJob(visitId);
  });
}

export async function jobSharingAction(visitId: string, opts: { enabled?: boolean; regenerate?: boolean }) {
  const user = await requireAcceptedUser();
  return run(async () => {
    const v = await visits.setSharing(staff(user.id), visitId, opts);
    refreshJob(visitId);
    return { shareToken: v.shareToken, shareEnabled: v.shareEnabled };
  });
}
