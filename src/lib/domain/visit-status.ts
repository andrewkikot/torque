export const VISIT_PIPELINE = [
  "planned",
  "dropped_off",
  "diagnosing",
  "awaiting_approval",
  "waiting_parts",
  "in_progress",
  "quality_check",
  "ready",
  "completed",
] as const;

export type PipelineStatus = (typeof VISIT_PIPELINE)[number];
export type VisitStatusValue = PipelineStatus | "cancelled";

export const STATUS_EMOJI: Record<VisitStatusValue, string> = {
  planned: "🗓️",
  dropped_off: "🔑",
  diagnosing: "🔍",
  awaiting_approval: "✋",
  waiting_parts: "📦",
  in_progress: "🔧",
  quality_check: "✅",
  ready: "🎉",
  completed: "🏁",
  cancelled: "✖️",
};

/** Statuses that are optional detours: they may be skipped in either direction. */
const DETOURS: VisitStatusValue[] = ["awaiting_approval", "waiting_parts", "quality_check", "diagnosing"];

export function isActive(status: VisitStatusValue) {
  return status !== "completed" && status !== "cancelled";
}

export function stepIndex(status: VisitStatusValue) {
  return VISIT_PIPELINE.indexOf(status as PipelineStatus);
}

/**
 * Transition rules:
 * - finished visits (completed/cancelled) are frozen;
 * - anything active can be cancelled;
 * - moving forward is always allowed (shops often skip steps);
 * - moving backward is allowed only into a detour (e.g. back to waiting for parts, or re-diagnosing).
 */
export function canTransition(from: VisitStatusValue, to: VisitStatusValue): boolean {
  if (from === to) return false;
  if (!isActive(from)) return false;
  if (to === "cancelled") return true;
  const a = stepIndex(from);
  const b = stepIndex(to);
  if (b > a) return true;
  return DETOURS.includes(to) || to === "in_progress";
}

/** Suggested next step for the one-tap "advance" button. */
export function nextStatus(from: VisitStatusValue): VisitStatusValue | null {
  if (!isActive(from)) return null;
  const order: VisitStatusValue[] = ["planned", "dropped_off", "diagnosing", "in_progress", "quality_check", "ready", "completed"];
  const i = order.indexOf(from);
  if (i === -1) return "in_progress"; // from awaiting_approval / waiting_parts
  return order[i + 1] ?? null;
}

/** Statuses a shop (public link) may set — shops can't mark a visit completed or cancel it. */
export const SHOP_STATUSES: VisitStatusValue[] = [
  "dropped_off",
  "diagnosing",
  "awaiting_approval",
  "waiting_parts",
  "in_progress",
  "quality_check",
  "ready",
];
