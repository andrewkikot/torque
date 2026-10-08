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

  const v = await visits.createVisit(uid, { carId: golf.id, title: "Annual service + brake squeak", shopName: "AutoMaster Kyiv", shopContact: "+380 44 123 4567", status: "dropped_off", eta: new Date(Date.now() + 6 * 3_600_000) });
  const shop = { kind: "shop" as const, token: v.shareToken };
  await visits.changeStatus(shop, v.id, "diagnosing", "Car is on the lift, checking brakes.");
  await visits.addVisitWork(shop, v.id, { name: "Engine oil & filter", category: "oil", type: "fluid", cost: 1950 });
  await visits.requestApproval(shop, v.id, { message: "Rear pads at 2 mm — recommend replacing now.", items: [{ name: "Rear brake pads", category: "brakes", type: "part", cost: 2100 }] });

  console.log(`✅ Seeded garage for ${email}`);
  console.log(`   Shop link: ${process.env.NEXT_PUBLIC_APP_URL}/v/${v.shareToken}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
