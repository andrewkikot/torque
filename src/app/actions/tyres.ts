"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import * as tyres from "@/lib/services/tyres";
import type { TyreSeason } from "@/lib/domain/tyres";
import { run } from "./_result";

const refresh = (carId?: string) => {
  revalidatePath("/garage");
  revalidatePath("/settings");
  if (carId) revalidatePath(`/cars/${carId}`, "layout");
};

export async function setLocationAction(input: { lat: number; lon: number; place: string }) {
  const user = await requireUser();
  return run(async () => {
    await tyres.setLocation(user.id, input);
    await tyres.evaluateUser(user.id); // show advice right away (forecast is cached)
    refresh();
  });
}

export async function clearLocationAction() {
  const user = await requireUser();
  return run(async () => {
    await tyres.clearLocation(user.id);
    refresh();
  });
}

export async function setTyreSeasonAction(carId: string, season: TyreSeason | null) {
  const user = await requireUser();
  return run(async () => {
    await tyres.setTyreSeason(user.id, carId, season);
    await tyres.evaluateUser(user.id);
    refresh(carId);
  });
}

export async function markSwappedAction(carId: string, season: "winter" | "summer") {
  const user = await requireUser();
  const t = await getTranslations("tyres");
  return run(async () => {
    await tyres.markSwapped(user.id, carId, season, t(`workName.${season}`));
    refresh(carId);
  });
}

export async function snoozeTyresAction(carId: string) {
  const user = await requireUser();
  return run(async () => {
    await tyres.snoozeAdvice(user.id, carId);
    refresh(carId);
  });
}
