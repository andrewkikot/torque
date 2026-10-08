import { describe, expect, it } from "vitest";
import { canTransition, nextStatus, SHOP_STATUSES } from "@/lib/domain/visit-status";

describe("visit status transitions", () => {
  it("allows forward moves and skipping steps", () => {
    expect(canTransition("planned", "dropped_off")).toBe(true);
    expect(canTransition("dropped_off", "ready")).toBe(true);
  });
  it("allows backward moves only into detours", () => {
    expect(canTransition("in_progress", "waiting_parts")).toBe(true);
    expect(canTransition("ready", "in_progress")).toBe(true);
    expect(canTransition("ready", "planned")).toBe(false);
    expect(canTransition("in_progress", "dropped_off")).toBe(false);
  });
  it("freezes finished visits", () => {
    expect(canTransition("completed", "in_progress")).toBe(false);
    expect(canTransition("cancelled", "planned")).toBe(false);
  });
  it("can cancel anything active", () => {
    expect(canTransition("waiting_parts", "cancelled")).toBe(true);
  });
  it("suggests a next step", () => {
    expect(nextStatus("planned")).toBe("dropped_off");
    expect(nextStatus("waiting_parts")).toBe("in_progress");
    expect(nextStatus("ready")).toBe("completed");
    expect(nextStatus("completed")).toBeNull();
  });
  it("shops can't complete or cancel", () => {
    expect(SHOP_STATUSES).not.toContain("completed");
    expect(SHOP_STATUSES).not.toContain("cancelled");
  });
});
