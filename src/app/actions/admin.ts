"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import * as licenses from "@/lib/services/licenses";
import { run } from "./_result";

export async function generateLicensesAction(input: { seats: number; months: number; quantity: number; note: string }) {
  const admin = await requireAdmin();
  return run(async () => {
    const keys = await licenses.generateLicenses(admin.id, input);
    revalidatePath("/admin");
    return { keys };
  });
}

export async function revokeLicenseAction(id: string) {
  await requireAdmin();
  return run(async () => {
    await licenses.revokeLicense(id);
    revalidatePath("/admin");
    revalidatePath("/admin/workshops");
  });
}
