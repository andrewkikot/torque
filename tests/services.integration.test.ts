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
  const workshops = await import("@/lib/services/workshops");

  const A = `test-a-${Date.now()}`;
  const B = `test-b-${Date.now()}`;

  beforeAll(async () => {
    await db.insert(schema.user).values([
      { id: A, name: "Alice", email: `${A}@test.local` },
      { id: B, name: "Bob", email: `${B}@test.local` },
    ]);
  });
  afterAll(async () => {
    await db.delete(schema.workshops).where(inArray(schema.workshops.createdBy, [A, B]));
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

  it("workshop runs a code check-in; owner follows, approves, gets the service book", async () => {
    const car = await cars.createCar(A, { make: "Toyota", model: "Corolla", currentOdometer: 50000, fuel: "hybrid" }, { withPresets: false });
    // B runs a workshop; A is just a car owner.
    const shop = await workshops.createWorkshop(B, { name: "AutoMaster", phone: "+380441234567" });
    const staff = { kind: "staff" as const, userId: B };
    const owner = { kind: "owner" as const, userId: A };

    const code = await cars.getCheckinCode(A, car.id);
    await expect(cars.getCheckinCode(B, car.id)).rejects.toThrow(); // only the owner sees the code
    await expect(visits.checkInByCode(A, shop.id, code, { title: "x" })).rejects.toThrow(); // A is not a member
    const v = await visits.checkInByCode(B, shop.id, `tq-${code.toLowerCase()}`, { title: "Annual service" });
    expect(v.carId).toBe(car.id);
    // Codes are single-use.
    await expect(visits.checkInByCode(B, shop.id, code, { title: "again" })).rejects.toThrow(/not valid/);
    expect((await db.query.cars.findFirst({ where: eq(schema.cars.id, car.id) }))!.checkinCode).not.toBe(code);

    // Owners can't run the job; staff can't approve on the customer's behalf.
    await expect(visits.changeStatus(owner, v.id, "in_progress")).rejects.toThrow(/workshop/i);
    await expect(visits.addVisitWork(owner, v.id, { name: "x" })).rejects.toThrow();
    await visits.changeStatus(staff, v.id, "diagnosing");
    await visits.addVisitWork(staff, v.id, { name: "Oil", category: "oil", cost: 1500 });
    const req = await visits.requestApproval(staff, v.id, { message: "Pads worn", items: [{ name: "Brake pads", category: "brakes", cost: 2400 }] });
    await expect(visits.decideApproval(staff, req.id, true)).rejects.toThrow();
    // A stranger with the wrong token can't approve.
    await expect(visits.decideApproval({ kind: "customer", token: "nope" }, req.id, true)).rejects.toThrow();
    await visits.decideApproval(owner, req.id, true);
    await visits.addNote(owner, v.id, "Thanks!");
    await expect(visits.addNote(owner, v.id, "", "https://x/y.jpg")).rejects.toThrow(); // only shops post photos
    await visits.changeStatus(staff, v.id, "completed");

    const full = await visits.getVisit(A, v.id);
    expect(full.status).toBe("completed");
    expect(visits.visitTotal(full.workItems)).toBe(3900);
    expect((await work.listHistory(A, car.id)).map((h) => h.name).sort()).toEqual(["Brake pads", "Oil"]);
    // Another user can't open the owner's or the workshop's view.
    await expect(visits.getVisit(B, v.id)).rejects.toThrow();
    await expect(visits.getJob(A, v.id)).rejects.toThrow();
  });

  it("walk-in: tracking link, Telegram subscriber approval, then save to garage", async () => {
    const shop = await workshops.createWorkshop(B, { name: "Garage 77" });
    const staff = { kind: "staff" as const, userId: B };
    const v = await visits.createWalkIn(B, shop.id, { vehicleMake: "Mazda", vehicleModel: "3", vehiclePlate: "aa 1111 bb", customerName: "Olena", title: "Brakes" });
    expect(v.carId).toBeNull();
    expect(v.vehiclePlate).toBe("AA 1111 BB");
    const pub = await visits.getVisitByToken(v.shareToken);
    expect(pub?.vehicleVin).toBeNull();

    await visits.subscribeTelegram(v.shareToken, "chat-777", "uk");
    await visits.addVisitWork(staff, v.id, { name: "Pads", category: "brakes", cost: 2000 });
    const req = await visits.requestApproval(staff, v.id, { message: "Discs too", items: [{ name: "Discs", category: "brakes", cost: 3000 }] });
    await expect(visits.decideApproval({ kind: "subscriber", chatId: "other-chat" }, req.id, true)).rejects.toThrow();
    await visits.decideApproval({ kind: "subscriber", chatId: "chat-777" }, req.id, true);
    await visits.changeStatus(staff, v.id, "completed");

    // Customer A saves it to their garage later: a new car is created and the work lands in its book.
    const claimed = await visits.claimVisit(v.shareToken, A);
    const newCar = await cars.getCar(A, claimed.carId);
    expect(newCar.make).toBe("Mazda");
    expect(newCar.plate).toBe("AA 1111 BB");
    expect((await work.listHistory(A, newCar.id)).map((h) => h.name).sort()).toEqual(["Discs", "Pads"]);
    await expect(visits.claimVisit(v.shareToken, A)).rejects.toThrow(/already/);
  });

  it("not my car: owner detaches a wrong check-in", async () => {
    const car = await cars.createCar(A, { make: "Skoda", model: "Fabia", fuel: "petrol" }, { withPresets: false });
    const shop = await workshops.createWorkshop(B, { name: "Oops Garage" });
    const v = await visits.checkInByCode(B, shop.id, await cars.getCheckinCode(A, car.id), { title: "Wrong car" });
    await visits.detachVisit(A, v.id);
    expect((await visits.listVisits(A)).some((x) => x.id === v.id)).toBe(false);
    // The workshop keeps its job.
    expect((await visits.getJob(B, v.id)).carId).toBeNull();
  });

  it("team invites: join, roles, last owner protected", async () => {
    const shop = await workshops.createWorkshop(B, { name: "Team Garage" });
    await expect(workshops.createInvite(A, shop.id)).rejects.toThrow(); // not a member
    const invite = await workshops.createInvite(B, shop.id);
    await workshops.acceptInvite(invite.token, A);
    expect((await workshops.membership(A, shop.id))?.role).toBe("mechanic");
    await expect(workshops.createInvite(A, shop.id)).rejects.toThrow(/owner/); // mechanics can't invite
    await expect(workshops.removeMember(B, shop.id, B)).rejects.toThrow(/owner/);
    await workshops.removeMember(A, shop.id, A); // mechanics can leave
    expect(await workshops.membership(A, shop.id)).toBeNull();
  });

  it("public car page shows only what the owner switched on", async () => {
    const share = await import("@/lib/services/car-share");
    const car = await cars.createCar(A, { make: "Audi", model: "A4", year: 2018, vin: "WAUZZZ8K9JA000001", plate: "AA 0001 AA", currentOdometer: 90000, fuel: "diesel" });
    await work.addWork(A, { carId: car.id, name: "Timing belt", category: "timing", cost: 7000, odometer: 89000 });
    await expect(share.saveShare(B, car.id, {})).rejects.toThrow(); // not the owner

    const s1 = await share.saveShare(A, car.id, {}); // defaults: history on, costs/VIN/plate off
    let pub = (await share.getPublicCar(s1.token))!;
    expect(pub.car.vin).toBeNull();
    expect(pub.car.plate).toBeNull();
    expect(pub.history[0].cost).toBeNull();
    expect(pub.stats.total).toBeNull();
    expect(JSON.stringify(pub)).not.toContain("WAUZZZ");
    expect(pub.history.map((h) => h.name)).toEqual(["Timing belt"]);

    await share.saveShare(A, car.id, { options: { costs: true, vin: true, odometer: false } });
    pub = (await share.getPublicCar(s1.token, { countView: true }))!;
    expect(pub.car.vin).toBe("WAUZZZ8K9JA000001");
    expect(pub.history[0].cost).toBe(7000);
    expect(pub.car.odometer).toBeNull();
    expect(pub.history[0].odometer).toBeNull();
    expect((await share.getShare(A, car.id))!.views).toBe(1);

    await share.saveShare(A, car.id, { enabled: false });
    expect(await share.getPublicCar(s1.token)).toBeNull();
    await share.saveShare(A, car.id, { enabled: true });
    const s2 = await share.regenerateShare(A, car.id);
    expect(await share.getPublicCar(s1.token)).toBeNull(); // old link dead
    expect(await share.getPublicCar(s2.token)).not.toBeNull();
  });

  it("workshop profile: owner edits, links are normalized", async () => {
    const shop = await workshops.createWorkshop(B, { name: "Profile Garage" });
    const w = await workshops.updateWorkshop(B, shop.id, { website: "automaster.ua", telegram: "https://t.me/automaster_kyiv", hours: "Mon–Fri 9–19", description: "VAG specialists" });
    expect(w.website).toBe("https://automaster.ua");
    expect(w.telegram).toBe("automaster_kyiv");
    await expect(workshops.updateWorkshop(B, shop.id, { website: "javascript:alert(1)" })).rejects.toThrow();
    await expect(workshops.updateWorkshop(A, shop.id, { name: "Hijack" })).rejects.toThrow();
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
