import { describe, expect, it } from "vitest";
import { computeEntitlements, newLicenseKey, nextExpiry, normalizeLicenseKey, FREE } from "@/lib/plans";

const now = new Date("2026-10-09T12:00:00Z");
const DAY = 86_400_000;

describe("entitlements", () => {
  it("free limits when billing is on and no license", () => {
    const e = computeEntitlements([], now, { billing: true });
    expect(e).toMatchObject({ plan: "free", seats: FREE.seats, jobsPerMonth: 30, photosPerJob: 3, branding: false, teamTelegram: false });
  });
  it("nothing limited when billing is off", () => {
    const e = computeEntitlements([], now, { billing: false });
    expect(e.jobsPerMonth).toBeNull();
    expect(e.branding).toBe(true);
    expect(e.seats).toBeGreaterThan(100);
  });
  it("pro from an active, unexpired license; highest seats and latest expiry win", () => {
    const e = computeEntitlements(
      [
        { status: "active", seats: 5, expiresAt: new Date(now.getTime() + 10 * DAY) },
        { status: "active", seats: 8, expiresAt: new Date(now.getTime() + 40 * DAY) },
        { status: "revoked", seats: 50, expiresAt: new Date(now.getTime() + 99 * DAY) },
      ],
      now,
      { billing: true },
    );
    expect(e.plan).toBe("pro");
    expect(e.seats).toBe(8);
    expect(e.expiresAt!.getTime()).toBe(now.getTime() + 40 * DAY);
    expect(e.jobsPerMonth).toBeNull();
  });
  it("expired license falls back to free", () => {
    const e = computeEntitlements([{ status: "active", seats: 5, expiresAt: new Date(now.getTime() - DAY) }], now, { billing: true });
    expect(e.plan).toBe("free");
  });
});

describe("renewals stack", () => {
  it("extends from current expiry when still active", () => {
    const current = new Date(now.getTime() + 20 * DAY);
    expect(nextExpiry(current, 30, now).getTime()).toBe(current.getTime() + 30 * DAY);
  });
  it("starts from now when expired or none", () => {
    expect(nextExpiry(null, 30, now).getTime()).toBe(now.getTime() + 30 * DAY);
    expect(nextExpiry(new Date(now.getTime() - DAY), 30, now).getTime()).toBe(now.getTime() + 30 * DAY);
  });
});

describe("license keys", () => {
  it("generates the TQ-PRO format from the unambiguous alphabet", () => {
    const k = newLicenseKey();
    expect(k).toMatch(/^TQ-PRO-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
  });
  it("normalizes casing and spacing", () => {
    expect(normalizeLicenseKey(" tq-pro 7k4m q2ab-cd3e ")).toBe("TQ-PRO-7K4M-Q2AB-CD3E");
    expect(normalizeLicenseKey("TQPRO7K4MQ2ABCD3E")).toBe("TQ-PRO-7K4M-Q2AB-CD3E");
  });
  it("rejects malformed keys and confusable letters", () => {
    expect(normalizeLicenseKey("TQ-PRO-1234")).toBeNull();
    expect(normalizeLicenseKey("TQ-PRO-O0O0-IIII-LLLL")).toBeNull();
    expect(normalizeLicenseKey("hello")).toBeNull();
  });
});
