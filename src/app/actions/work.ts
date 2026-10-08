"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import * as work from "@/lib/services/work";
import * as maintenance from "@/lib/services/maintenance";
import { getCar } from "@/lib/services/cars";
import { presetsForFuel } from "@/lib/domain/maintenance";
import { db, schema } from "@/db";
import { run } from "./_result";

const refresh = (carId: string) => {
  revalidatePath(`/cars/${carId}`, "layout");
  revalidatePath("/garage");
};

export async function addWorkAction(input: { carId: string } & Record<string, unknown>) {
  const user = await requireUser();
  return run(async () => {
    const item = await work.addWork(user.id, input);
    refresh(input.carId);
    return { id: item.id };
  });
}

export async function deleteWorkAction(carId: string, workId: string) {
  const user = await requireUser();
  return run(async () => {
    await work.deleteWork(user.id, workId);
    refresh(carId);
  });
}

export async function addPlanAction(input: { carId: string } & Record<string, unknown>) {
  const user = await requireUser();
  return run(async () => {
    await maintenance.addPlan(user.id, input);
    refresh(input.carId);
  });
}

export async function updatePlanAction(carId: string, planId: string, input: Record<string, unknown>) {
  const user = await requireUser();
  return run(async () => {
    await maintenance.updatePlan(user.id, planId, input);
    refresh(carId);
  });
}

export async function deletePlanAction(carId: string, planId: string) {
  const user = await requireUser();
  return run(async () => {
    await maintenance.deletePlan(user.id, planId);
    refresh(carId);
  });
}

/** "Mark done" logs a DIY/standalone work item tied to the plan, which resets its counter. */
export async function markPlanDoneAction(carId: string, planId: string, opts: { cost?: number; odometer?: number; diy?: boolean }) {
  const user = await requireUser();
  return run(async () => {
    const { plans } = await maintenance.getUpcoming(user.id, carId);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) throw new Error("Plan not found");
    await work.addWork(user.id, {
      carId,
      name: plan.name,
      category: plan.category,
      cost: opts.cost ?? 0,
      odometer: opts.odometer,
      diy: opts.diy ?? false,
      maintenancePlanId: planId,
    });
    refresh(carId);
  });
}

export async function addPresetPlansAction(carId: string) {
  const user = await requireUser();
  return run(async () => {
    const car = await getCar(user.id, carId);
    const t = await getTranslations("presets");
    await db.insert(schema.maintenancePlans).values(
      presetsForFuel(car.fuel).map((p) => ({
        carId,
        name: t(p.key),
        category: p.category,
        intervalKm: p.intervalKm,
        intervalMonths: p.intervalMonths,
        lastDoneAt: new Date(),
        lastDoneOdometer: car.currentOdometer,
      })),
    );
    refresh(carId);
  });
}
