import { z } from "zod";
import { fuelEnum, transmissionEnum, workCategoryEnum, workTypeEnum, visitStatusEnum, aiProviderEnum } from "@/db/schema";

const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const odometer = z.coerce.number().int().min(0).max(5_000_000);
const money = z.coerce.number().min(0).max(100_000_000);

export const carInput = z.object({
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(60),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional().nullable(),
  nickname: optionalText(40),
  vin: z
    .string()
    .trim()
    .toUpperCase()
    .max(17)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  plate: optionalText(16),
  engine: optionalText(60),
  fuel: z.enum(fuelEnum.enumValues).default("petrol"),
  transmission: z.enum(transmissionEnum.enumValues).optional().nullable(),
  purchaseDate: z.coerce.date().optional().nullable(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#f97316"),
  photoUrl: z.string().url().optional().nullable(),
  currentOdometer: odometer.default(0),
});
export type CarInput = z.infer<typeof carInput>;

export const workInput = z.object({
  carId: z.string().min(1),
  visitId: z.string().optional().nullable(),
  category: z.enum(workCategoryEnum.enumValues).default("other"),
  type: z.enum(workTypeEnum.enumValues).default("labor"),
  name: z.string().trim().min(1).max(120),
  partNumber: optionalText(60),
  quantity: z.coerce.number().positive().max(10_000).default(1),
  cost: money.default(0),
  odometer: odometer.optional().nullable(),
  performedAt: z.coerce.date().optional(),
  notes: optionalText(1000),
  receiptUrl: z.string().url().optional().nullable(),
  diy: z.boolean().default(false),
  maintenancePlanId: z.string().optional().nullable(),
});
export type WorkInput = z.infer<typeof workInput>;

export const planInput = z
  .object({
    carId: z.string().min(1),
    name: z.string().trim().min(1).max(80),
    category: z.enum(workCategoryEnum.enumValues).default("other"),
    intervalKm: z.coerce.number().int().min(100).max(1_000_000).optional().nullable(),
    intervalMonths: z.coerce.number().int().min(1).max(240).optional().nullable(),
    lastDoneAt: z.coerce.date().optional().nullable(),
    lastDoneOdometer: odometer.optional().nullable(),
  })
  .refine((p) => p.intervalKm || p.intervalMonths, { message: "Set a distance or time interval" });
export type PlanInputData = z.infer<typeof planInput>;

export const visitInput = z.object({
  carId: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  shopName: optionalText(80),
  shopContact: optionalText(120),
  odometer: odometer.optional().nullable(),
  plannedAt: z.coerce.date().optional().nullable(),
  eta: z.coerce.date().optional().nullable(),
  status: z.enum(["planned", "dropped_off"]).default("planned"),
});
export type VisitInput = z.infer<typeof visitInput>;

export const statusInput = z.enum(visitStatusEnum.enumValues);

export const aiSettingsInput = z.object({
  provider: z.enum(aiProviderEnum.enumValues),
  model: z.string().trim().min(1).max(120),
  baseUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  apiKey: z.string().trim().max(500).optional(),
  temperature: z.coerce.number().min(0).max(1.5).default(0.4),
});
