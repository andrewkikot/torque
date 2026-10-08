"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import * as cars from "@/lib/services/cars";
import { run } from "./_result";

async function presetNames() {
  const t = await getTranslations("presets");
  const keys = ["oilChange", "airFilter", "cabinFilter", "fuelFilter", "brakeFluid", "coolant", "sparkPlugs", "tireRotation", "brakeInspection", "inspection", "batteryCheck", "acService"];
  return Object.fromEntries(keys.map((k) => [k, t(k)]));
}

export async function createCarAction(input: unknown, withPresets: boolean) {
  const user = await requireUser();
  return run(async () => {
    const car = await cars.createCar(user.id, input, { withPresets, presetNames: await presetNames() });
    revalidatePath("/garage");
    return { id: car.id, name: cars.carLabel(car) };
  });
}

export async function updateCarAction(carId: string, input: unknown) {
  const user = await requireUser();
  return run(async () => {
    await cars.updateCar(user.id, carId, input);
    revalidatePath(`/cars/${carId}`, "layout");
    revalidatePath("/garage");
  });
}

export async function archiveCarAction(carId: string, archived: boolean) {
  const user = await requireUser();
  return run(async () => {
    await cars.setArchived(user.id, carId, archived);
    revalidatePath("/garage");
    revalidatePath(`/cars/${carId}`, "layout");
  });
}

export async function deleteCarAction(carId: string) {
  const user = await requireUser();
  return run(async () => {
    await cars.deleteCar(user.id, carId);
    revalidatePath("/garage");
  });
}

export async function logOdometerAction(carId: string, value: number, allowDecrease = false) {
  const user = await requireUser();
  return run(async () => {
    const r = await cars.logOdometer(user.id, carId, value, "web", { allowDecrease });
    revalidatePath(`/cars/${carId}`, "layout");
    revalidatePath("/garage");
    return { previous: r.previous, current: r.current };
  });
}

export async function checkinCodeAction(carId: string, rotate = false) {
  const user = await requireUser();
  return run(async () => {
    const code = rotate ? await cars.newCheckinCode(user.id, carId) : await cars.getCheckinCode(user.id, carId);
    return { code };
  });
}

export async function saveShareAction(carId: string, input: { enabled?: boolean; options?: Record<string, boolean> }) {
  const user = await requireUser();
  return run(async () => {
    const { saveShare } = await import("@/lib/services/car-share");
    const s = await saveShare(user.id, carId, input);
    revalidatePath(`/c/${s.token}`);
    return { token: s.token, enabled: s.enabled, options: s.options, views: s.views };
  });
}

export async function regenerateShareAction(carId: string) {
  const user = await requireUser();
  return run(async () => {
    const { regenerateShare } = await import("@/lib/services/car-share");
    const s = await regenerateShare(user.id, carId);
    return { token: s.token, enabled: s.enabled, options: s.options, views: s.views };
  });
}
