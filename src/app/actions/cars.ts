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
