import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { myWorkshops } from "@/lib/services/workshops";
import { listCars } from "@/lib/services/cars";
import { MODE_COOKIE } from "@/lib/mode";

/**
 * Smart entry point after sign-in and when opening the app:
 * return to the side the user last used; mechanics without cars go to their job board.
 */
export async function GET(req: Request) {
  const to = (path: string) => NextResponse.redirect(new URL(path, req.url));
  const user = await getCurrentUser();
  if (!user) return to("/sign-in");
  const [workshops, cars] = await Promise.all([myWorkshops(user.id), listCars(user.id)]);
  if (!workshops.length) return to("/garage");
  const mode = (await cookies()).get(MODE_COOKIE)?.value;
  if (mode === "workshop") return to("/w");
  if (mode === "garage") return to("/garage");
  return to(cars.length ? "/garage" : "/w");
}
