import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUser, getSettings } from "@/lib/session";
import { getCar } from "@/lib/services/cars";
import { AppError } from "@/lib/errors";

/** Shared loader for /cars/[id]/* — deduped per request. */
export const loadCar = cache(async (id: string) => {
  const user = await requireUser();
  const [settings, car] = await Promise.all([
    getSettings(user.id),
    getCar(user.id, id).catch((e) => {
      if (e instanceof AppError) notFound();
      throw e;
    }),
  ]);
  return { user, settings, car };
});
