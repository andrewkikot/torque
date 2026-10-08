import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { AppError, notFound } from "@/lib/errors";
import type { WorkshopRole } from "@/db/schema";

const { workshops, workshopMembers, workshopInvites, user, userSettings } = schema;

export const workshopInput = z.object({
  name: z.string().trim().min(2).max(80),
  city: z.string().trim().max(60).optional().nullable().transform((v) => v || null),
  address: z.string().trim().max(160).optional().nullable().transform((v) => v || null),
  phone: z.string().trim().max(40).optional().nullable().transform((v) => v || null),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

/** Workshops the user belongs to, oldest membership first. */
export async function myWorkshops(userId: string) {
  return db
    .select({ workshop: workshops, role: workshopMembers.role })
    .from(workshopMembers)
    .innerJoin(workshops, eq(workshops.id, workshopMembers.workshopId))
    .where(eq(workshopMembers.userId, userId))
    .orderBy(asc(workshopMembers.createdAt));
}

export async function membership(userId: string, workshopId: string) {
  const [m] = await db
    .select({ role: workshopMembers.role })
    .from(workshopMembers)
    .where(and(eq(workshopMembers.userId, userId), eq(workshopMembers.workshopId, workshopId)));
  return m ?? null;
}

/** Throws unless the user is a member (optionally with the given role). */
export async function requireMember(userId: string, workshopId: string, role?: WorkshopRole) {
  const m = await membership(userId, workshopId);
  if (!m) notFound("Workshop");
  if (role && m.role !== role) throw new AppError("forbidden", "Only the workshop owner can do this");
  const ws = await db.query.workshops.findFirst({ where: eq(workshops.id, workshopId) });
  if (!ws) notFound("Workshop");
  return { workshop: ws, role: m.role };
}

export async function createWorkshop(userId: string, raw: unknown) {
  const data = workshopInput.parse(raw);
  const [ws] = await db.insert(workshops).values({ ...data, createdBy: userId }).returning();
  await db.insert(workshopMembers).values({ workshopId: ws.id, userId, role: "owner" });
  return ws;
}

export async function updateWorkshop(userId: string, workshopId: string, raw: unknown) {
  await requireMember(userId, workshopId, "owner");
  const data = workshopInput.partial().parse(raw);
  const [ws] = await db.update(workshops).set(data).where(eq(workshops.id, workshopId)).returning();
  return ws;
}

export async function listMembers(userId: string, workshopId: string) {
  await requireMember(userId, workshopId);
  return db
    .select({
      userId: workshopMembers.userId,
      role: workshopMembers.role,
      name: user.name,
      email: user.email,
      telegram: userSettings.telegramUsername,
      joinedAt: workshopMembers.createdAt,
    })
    .from(workshopMembers)
    .innerJoin(user, eq(user.id, workshopMembers.userId))
    .leftJoin(userSettings, eq(userSettings.userId, workshopMembers.userId))
    .where(eq(workshopMembers.workshopId, workshopId))
    .orderBy(asc(workshopMembers.createdAt));
}

/** Telegram chats of all members (for "the customer approved" pushes). */
export async function memberChats(workshopId: string) {
  return db
    .select({ userId: workshopMembers.userId, chatId: userSettings.telegramChatId, locale: userSettings.locale })
    .from(workshopMembers)
    .innerJoin(userSettings, eq(userSettings.userId, workshopMembers.userId))
    .where(and(eq(workshopMembers.workshopId, workshopId), sql`${userSettings.telegramChatId} is not null`));
}

/** One reusable invite link per workshop and role; valid 7 days. */
export async function createInvite(userId: string, workshopId: string, role: WorkshopRole = "mechanic") {
  await requireMember(userId, workshopId, "owner");
  const existing = await db.query.workshopInvites.findFirst({
    where: and(
      eq(workshopInvites.workshopId, workshopId),
      eq(workshopInvites.role, role),
      isNull(workshopInvites.usedAt),
      gt(workshopInvites.expiresAt, new Date(Date.now() + 24 * 3_600_000)),
    ),
  });
  if (existing) return existing;
  const [invite] = await db
    .insert(workshopInvites)
    .values({ token: randomBytes(18).toString("base64url"), workshopId, role, expiresAt: new Date(Date.now() + 7 * 86_400_000) })
    .returning();
  return invite;
}

export async function getInvite(token: string) {
  const invite = await db.query.workshopInvites.findFirst({
    where: and(eq(workshopInvites.token, token), gt(workshopInvites.expiresAt, new Date())),
  });
  if (!invite) return null;
  const ws = await db.query.workshops.findFirst({ where: eq(workshops.id, invite.workshopId) });
  return ws ? { invite, workshop: ws } : null;
}

/** Joining keeps the link usable for other teammates until it expires. */
export async function acceptInvite(token: string, userId: string) {
  const found = await getInvite(token);
  if (!found) throw new AppError("invalid", "This invite link has expired");
  await db
    .insert(workshopMembers)
    .values({ workshopId: found.workshop.id, userId, role: found.invite.role })
    .onConflictDoNothing();
  return found.workshop;
}

export async function removeMember(userId: string, workshopId: string, memberId: string) {
  const self = userId === memberId;
  await requireMember(userId, workshopId, self ? undefined : "owner");
  const owners = await db
    .select({ userId: workshopMembers.userId })
    .from(workshopMembers)
    .where(and(eq(workshopMembers.workshopId, workshopId), eq(workshopMembers.role, "owner")));
  if (owners.length === 1 && owners[0].userId === memberId) {
    throw new AppError("invalid", "A workshop needs at least one owner");
  }
  await db.delete(workshopMembers).where(and(eq(workshopMembers.workshopId, workshopId), eq(workshopMembers.userId, memberId)));
}
