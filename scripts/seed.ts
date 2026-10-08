/**
 * Demo data: npm run seed -- you@example.com
 * Creates (or reuses) the user and fills a garage with two cars, history, reminders and a live shop visit.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const email = process.argv[2] ?? "demo@torque.local";
  const { db, schema } = await import("@/db");
  const { eq } = await import("drizzle-orm");
  const cars = await import("@/lib/services/cars");
  const work = await import("@/lib/services/work");
  const visits = await import("@/lib/services/visits");
  const { TERMS_VERSION } = await import("@/lib/terms");
  const { appUrl } = await import("@/lib/app-url");

  let user = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
  if (!user) {
    [user] = await db.insert(schema.user).values({ id: crypto.randomUUID(), name: "Demo Driver", email, emailVerified: true }).returning();
  }
  const uid = user.id;
  const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

  const golf = await cars.createCar(
    uid,
    { make: "Volkswagen", model: "Golf", year: 2017, nickname: "Blue Bullet", plate: "AA 1234 KX", engine: "1.4 TSI, 125 hp", fuel: "petrol", transmission: "dct", accentColor: "#3b82f6", currentOdometer: 81200 },
    { presetNames: { oilChange: "Engine oil & filter", airFilter: "Air filter", cabinFilter: "Cabin filter", brakeFluid: "Brake fluid", coolant: "Coolant", sparkPlugs: "Spark plugs", tireRotation: "Tire rotation", brakeInspection: "Brake inspection", inspection: "Annual inspection" } },
  );
  // Mileage history → realistic km/day prediction.
  for (const [d, v] of [[300, 68000], [200, 72500], [120, 76000], [60, 79000], [10, 81200]] as const) {
    await db.insert(schema.odometerReadings).values({ carId: golf.id, value: v, recordedAt: daysAgo(d), source: "web" });
  }
  const entries = [
    { name: "Engine oil 5W-30 & filter", category: "oil", type: "fluid", cost: 1850, odometer: 72500, performedAt: daysAgo(200) },
    { name: "Front brake pads (TRW)", category: "brakes", type: "part", cost: 2400, odometer: 76000, performedAt: daysAgo(120), partNumber: "GDB1550" },
    { name: "Cabin filter", category: "filters", type: "part", cost: 450, odometer: 76000, performedAt: daysAgo(120), diy: true },
    { name: "Winter tires mounted", category: "tires", type: "labor", cost: 800, odometer: 79000, performedAt: daysAgo(60) },
    { name: "Battery Varta 60Ah", category: "battery", type: "part", cost: 3900, odometer: 79000, performedAt: daysAgo(55) },
  ] as const;
  for (const e of entries) await work.addWork(uid, { carId: golf.id, ...e });

  const tesla = await cars.createCar(uid, { make: "Tesla", model: "Model 3", year: 2021, fuel: "electric", accentColor: "#e11d48", currentOdometer: 42000, plate: "KA 0777 EV" });
  await work.addWork(uid, { carId: tesla.id, name: "Tire rotation", category: "tires", cost: 600, odometer: 40000, performedAt: daysAgo(40) });

  // A demo workshop with its own mechanic account runs the jobs.
  const workshops = await import("@/lib/services/workshops");
  const mechEmail = email.replace("@", "+mechanic@");
  let mech = await db.query.user.findFirst({ where: eq(schema.user.email, mechEmail) });
  if (!mech) {
    [mech] = await db.insert(schema.user).values({ id: crypto.randomUUID(), name: "Oleh (mechanic)", email: mechEmail, emailVerified: true }).returning();
  }
  for (const id of [uid, mech.id]) {
    await db
      .insert(schema.userSettings)
      .values({ userId: id, termsVersion: TERMS_VERSION, termsAcceptedAt: new Date() })
      .onConflictDoUpdate({ target: schema.userSettings.userId, set: { termsVersion: TERMS_VERSION, termsAcceptedAt: new Date() } });
  }
  const shop = await workshops.createWorkshop(mech.id, { name: "AutoMaster Kyiv", city: "Kyiv", address: "Bohatyrska St, 11", phone: "+380 44 123 4567" });
  const staff = { kind: "staff" as const, userId: mech.id };

  const v = await visits.checkInByCode(mech.id, shop.id, await cars.getCheckinCode(uid, golf.id), {
    title: "Annual service + brake squeak",
    eta: new Date(Date.now() + 6 * 3_600_000),
  });
  await visits.changeStatus(staff, v.id, "diagnosing", "Car is on the lift, checking brakes.");
  await visits.addVisitWork(staff, v.id, { name: "Engine oil & filter", category: "oil", type: "fluid", cost: 1950 });
  await visits.requestApproval(staff, v.id, { message: "Rear pads at 2 mm — recommend replacing now.", items: [{ name: "Rear brake pads", category: "brakes", type: "part", cost: 2100 }] });

  const walkIn = await visits.createWalkIn(mech.id, shop.id, {
    vehicleMake: "Renault",
    vehicleModel: "Megane",
    vehiclePlate: "KA 4321 AB",
    customerName: "Iryna",
    customerPhone: "+380 67 555 0101",
    title: "Clutch noise",
  });
  await visits.changeStatus(staff, walkIn.id, "in_progress");

  console.log(`✅ Seeded garage for ${email}`);
  console.log(`   Mechanic account: ${mechEmail} (workshop "${shop.name}")`);
  console.log(`   Owner visit:   ${appUrl()}/visits/${v.id}`);
  console.log(`   Walk-in link:  ${appUrl()}/v/${walkIn.shareToken}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
