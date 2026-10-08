import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
config({ path: ".env.local" });

const enabled = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("neon.tech");

/** Runs against the local dev Postgres only (never Neon) — checks authorization & flows end to end. */
describe.skipIf(!enabled)("services (local DB)", async () => {
  const { db, schema } = await import("@/db");
  const { eq, inArray } = await import("drizzle-orm");
  const cars = await import("@/lib/services/cars");
  const work = await import("@/lib/services/work");
  const visits = await import("@/lib/services/visits");
  const maintenance = await import("@/lib/services/maintenance");
  const ai = await import("@/lib/services/ai-settings");

  const A = `test-a-${Date.now()}`;
  const B = `test-b-${Date.now()}`;

  beforeAll(async () => {
    await db.insert(schema.user).values([
      { id: A, name: "Alice", email: `${A}@test.local` },
      { id: B, name: "Bob", email: `${B}@test.local` },
    ]);
  });
  afterAll(async () => {
    await db.delete(schema.user).where(inArray(schema.user.id, [A, B]));
  });

  it("scopes cars to their owner", async () => {
    const car = await cars.createCar(A, { make: "VW", model: "Golf", currentOdometer: 80000, fuel: "petrol" });
    await expect(cars.getCar(B, car.id)).rejects.toThrow(/not found/i);
    await expect(cars.updateCar(B, car.id, { nickname: "pwned" })).rejects.toThrow();
    await expect(work.addWork(B, { carId: car.id, name: "x" })).rejects.toThrow();
    expect((await cars.listCars(B)).length).toBe(0);
  });

  it("logs work and resets the matching maintenance plan", async () => {
    const car = await cars.createCar(A, { make: "Skoda", model: "Octavia", currentOdometer: 100000, fuel: "diesel" }, { presetNames: { oilChange: "Oil" } });
    await cars.logOdometer(A, car.id, 112000, "web");
    const before = await maintenance.getUpcoming(A, car.id);
    const oil = before.plans.find((p) => p.category === "oil")!;
    expect(oil.due.status).toBe("overdue");
    await work.addWork(A, { carId: car.id, name: "Oil change", category: "oil", cost: 1800, odometer: 112000 });
    const after = await maintenance.getUpcoming(A, car.id);
    expect(after.plans.find((p) => p.id === oil.id)!.due.status).toBe("ok");
    await expect(cars.logOdometer(A, car.id, 90000, "telegram")).rejects.toThrow(/lower/);
  });

  it("runs a full shop visit with approval and completion", async () => {
    const car = await cars.createCar(A, { make: "Toyota", model: "Corolla", currentOdometer: 50000, fuel: "hybrid" }, { withPresets: false });
    const v = await visits.createVisit(A, { carId: car.id, title: "Service", status: "dropped_off" });
    const shop = { kind: "shop" as const, token: v.shareToken };

    await expect(visits.changeStatus({ kind: "shop", token: "wrong" }, v.id, "diagnosing")).rejects.toThrow();
    await expect(visits.changeStatus(shop, v.id, "completed")).rejects.toThrow(/can't/i);
    await visits.changeStatus(shop, v.id, "diagnosing");
    await visits.addVisitWork(shop, v.id, { name: "Oil", category: "oil", cost: 1500 });
    const req = await visits.requestApproval(shop, v.id, { message: "Pads worn", items: [{ name: "Brake pads", category: "brakes", cost: 2400 }] });

    await expect(visits.decideApproval(B, req.id, true)).rejects.toThrow();
    await visits.decideApproval(A, req.id, true);
    await visits.changeStatus({ kind: "owner", userId: A }, v.id, "completed");

    const full = await visits.getVisit(A, v.id);
    expect(full.status).toBe("completed");
    expect(visits.visitTotal(full.workItems)).toBe(3900);
    const history = await work.listHistory(A, car.id);
    expect(history.map((h) => h.name).sort()).toEqual(["Brake pads", "Oil"]);

    // Shop link is dead once sharing is disabled.
    await visits.setSharing(A, v.id, { enabled: false });
    expect(await visits.getVisitByToken(v.shareToken)).toBeNull();
  });

  it("stores AI keys encrypted and never exposes them publicly", async () => {
    process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 1).toString("base64");
    await ai.saveAiSettings(A, { provider: "google", model: "gemini-3.8-flash", apiKey: "AIzaSECRETKEY123456" });
    const row = await db.query.aiSettings.findFirst({ where: eq(schema.aiSettings.userId, A) });
    expect(row!.encryptedKey).not.toContain("SECRET");
    const pub = await ai.getPublicAiSettings(A);
    expect(JSON.stringify(pub)).not.toContain("SECRET");
    expect(pub!.keyHint).toBe("AIza…3456");
    // Changing model only keeps the stored key.
    await ai.saveAiSettings(A, { provider: "google", model: "gemini-2.5-flash" });
    expect((await ai.getPublicAiSettings(A))!.model).toBe("gemini-2.5-flash");
    // Switching provider requires a new key.
    await expect(ai.saveAiSettings(A, { provider: "openai", model: "gpt-5.4-mini" })).rejects.toThrow(/required/);
  });
});
