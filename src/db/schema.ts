import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
  bigint,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ───────────────────────── Better Auth tables ───────────────────────── */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// Better Auth rate limiting stored in Postgres (no paid KV needed).
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/* ───────────────────────── App tables ───────────────────────── */

export const localeEnum = pgEnum("locale", ["en", "uk"]);
export const unitsEnum = pgEnum("units", ["km", "mi"]);

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  locale: localeEnum("locale").notNull().default("en"),
  units: unitsEnum("units").notNull().default("km"),
  currency: text("currency").notNull().default("UAH"),
  telegramChatId: text("telegram_chat_id").unique(),
  telegramUsername: text("telegram_username"),
  telegramLinkCode: text("telegram_link_code").unique(),
  telegramLinkExpiresAt: timestamp("telegram_link_expires_at", { withTimezone: true }),
  notifyVisitUpdates: boolean("notify_visit_updates").notNull().default(true),
  notifyMaintenance: boolean("notify_maintenance").notNull().default(true),
  notifyMileageNudge: boolean("notify_mileage_nudge").notNull().default(true),
  // Car the bot uses by default when the user has several.
  defaultCarId: text("default_car_id"),
  updatedAt: updatedAt(),
});

export const aiProviderEnum = pgEnum("ai_provider", [
  "anthropic",
  "openai",
  "google",
  "openrouter",
  "groq",
  "openai_compatible",
]);

export const aiSettings = pgTable("ai_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  provider: aiProviderEnum("provider").notNull(),
  model: text("model").notNull(),
  baseUrl: text("base_url"),
  // AES-256-GCM: base64 ciphertext, iv and auth tag. Never leaves the server.
  encryptedKey: text("encrypted_key").notNull(),
  iv: text("iv").notNull(),
  tag: text("tag").notNull(),
  keyHint: text("key_hint").notNull(),
  temperature: real("temperature").notNull().default(0.4),
  enabled: boolean("enabled").notNull().default(true),
  lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
  lastTestOk: boolean("last_test_ok"),
  updatedAt: updatedAt(),
});

export const fuelEnum = pgEnum("fuel", ["petrol", "diesel", "hybrid", "electric", "lpg", "other"]);
export const transmissionEnum = pgEnum("transmission", ["manual", "automatic", "cvt", "dct", "other"]);

export const cars = pgTable(
  "cars",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year"),
    nickname: text("nickname"),
    vin: text("vin"),
    plate: text("plate"),
    engine: text("engine"),
    fuel: fuelEnum("fuel").notNull().default("petrol"),
    transmission: transmissionEnum("transmission"),
    purchaseDate: timestamp("purchase_date", { withTimezone: true, mode: "date" }),
    accentColor: text("accent_color").notNull().default("#f97316"),
    photoUrl: text("photo_url"),
    currentOdometer: integer("current_odometer").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("cars_user_idx").on(t.userId)],
);

export const odometerSourceEnum = pgEnum("odometer_source", ["web", "telegram", "service", "ai"]);

export const odometerReadings = pgTable(
  "odometer_readings",
  {
    id: id(),
    carId: text("car_id")
      .notNull()
      .references(() => cars.id, { onDelete: "cascade" }),
    value: integer("value").notNull(),
    source: odometerSourceEnum("source").notNull().default("web"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("odo_car_idx").on(t.carId, t.recordedAt)],
);

export const visitStatusEnum = pgEnum("visit_status", [
  "planned",
  "dropped_off",
  "diagnosing",
  "awaiting_approval",
  "waiting_parts",
  "in_progress",
  "quality_check",
  "ready",
  "completed",
  "cancelled",
]);

export const serviceVisits = pgTable(
  "service_visits",
  {
    id: id(),
    carId: text("car_id")
      .notNull()
      .references(() => cars.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    shopName: text("shop_name"),
    shopContact: text("shop_contact"),
    status: visitStatusEnum("status").notNull().default("planned"),
    odometer: integer("odometer"),
    plannedAt: timestamp("planned_at", { withTimezone: true }),
    eta: timestamp("eta", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    currency: text("currency").notNull().default("UAH"),
    shareToken: text("share_token").notNull().unique(),
    shareEnabled: boolean("share_enabled").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("visits_car_idx").on(t.carId)],
);

export const eventKindEnum = pgEnum("event_kind", [
  "status",
  "note",
  "photo",
  "work",
  "approval_request",
  "approval_decision",
]);
export const authorEnum = pgEnum("author", ["owner", "shop", "bot", "ai"]);

export const visitEvents = pgTable(
  "visit_events",
  {
    id: id(),
    visitId: text("visit_id")
      .notNull()
      .references(() => serviceVisits.id, { onDelete: "cascade" }),
    kind: eventKindEnum("kind").notNull(),
    author: authorEnum("author").notNull(),
    status: visitStatusEnum("status"),
    message: text("message"),
    photoUrl: text("photo_url"),
    amount: numeric("amount", { precision: 12, scale: 2 }),
    // approval_request: { approved?: boolean; decidedAt?: string }
    data: jsonb("data").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("events_visit_idx").on(t.visitId, t.createdAt)],
);

export const workCategoryEnum = pgEnum("work_category", [
  "oil",
  "filters",
  "brakes",
  "tires",
  "suspension",
  "engine",
  "transmission",
  "electrical",
  "battery",
  "cooling",
  "ac",
  "body",
  "inspection",
  "fluids",
  "timing",
  "other",
]);
export const workTypeEnum = pgEnum("work_type", ["labor", "part", "fluid"]);

export const workItems = pgTable(
  "work_items",
  {
    id: id(),
    carId: text("car_id")
      .notNull()
      .references(() => cars.id, { onDelete: "cascade" }),
    visitId: text("visit_id").references(() => serviceVisits.id, { onDelete: "set null" }),
    // Items proposed by the shop but not yet approved by the owner stay out of the book.
    approved: boolean("approved").notNull().default(true),
    category: workCategoryEnum("category").notNull().default("other"),
    type: workTypeEnum("type").notNull().default("labor"),
    name: text("name").notNull(),
    partNumber: text("part_number"),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
    cost: numeric("cost", { precision: 12, scale: 2 }).notNull().default("0"),
    currency: text("currency").notNull().default("UAH"),
    odometer: integer("odometer"),
    performedAt: timestamp("performed_at", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes"),
    receiptUrl: text("receipt_url"),
    diy: boolean("diy").notNull().default(false),
    maintenancePlanId: text("maintenance_plan_id"),
    createdAt: createdAt(),
  },
  (t) => [
    index("work_car_idx").on(t.carId, t.performedAt),
    index("work_visit_idx").on(t.visitId),
  ],
);

export const maintenancePlans = pgTable(
  "maintenance_plans",
  {
    id: id(),
    carId: text("car_id")
      .notNull()
      .references(() => cars.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: workCategoryEnum("category").notNull().default("other"),
    intervalKm: integer("interval_km"),
    intervalMonths: integer("interval_months"),
    lastDoneAt: timestamp("last_done_at", { withTimezone: true }),
    lastDoneOdometer: integer("last_done_odometer"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("plans_car_idx").on(t.carId)],
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // "web" or "telegram"
    channel: text("channel").notNull().default("web"),
    role: text("role").notNull(),
    // AI SDK UIMessage parts
    parts: jsonb("parts").$type<unknown[]>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("ai_msg_user_idx").on(t.userId, t.channel, t.createdAt)],
);

export const usageCounters = pgTable(
  "usage_counters",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull().default(0),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const remindersLog = pgTable(
  "reminders_log",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("reminders_key_idx").on(t.userId, t.key)],
);

/* ───────────────────────── Relations ───────────────────────── */

export const carsRelations = relations(cars, ({ many, one }) => ({
  owner: one(user, { fields: [cars.userId], references: [user.id] }),
  visits: many(serviceVisits),
  workItems: many(workItems),
  plans: many(maintenancePlans),
  readings: many(odometerReadings),
}));

export const visitsRelations = relations(serviceVisits, ({ one, many }) => ({
  car: one(cars, { fields: [serviceVisits.carId], references: [cars.id] }),
  events: many(visitEvents),
  workItems: many(workItems),
}));

export const eventsRelations = relations(visitEvents, ({ one }) => ({
  visit: one(serviceVisits, { fields: [visitEvents.visitId], references: [serviceVisits.id] }),
}));

export const workRelations = relations(workItems, ({ one }) => ({
  car: one(cars, { fields: [workItems.carId], references: [cars.id] }),
  visit: one(serviceVisits, { fields: [workItems.visitId], references: [serviceVisits.id] }),
}));

export const plansRelations = relations(maintenancePlans, ({ one }) => ({
  car: one(cars, { fields: [maintenancePlans.carId], references: [cars.id] }),
}));

export const readingsRelations = relations(odometerReadings, ({ one }) => ({
  car: one(cars, { fields: [odometerReadings.carId], references: [cars.id] }),
}));

export type Car = typeof cars.$inferSelect;
export type ServiceVisit = typeof serviceVisits.$inferSelect;
export type VisitEvent = typeof visitEvents.$inferSelect;
export type WorkItem = typeof workItems.$inferSelect;
export type MaintenancePlan = typeof maintenancePlans.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type VisitStatus = (typeof visitStatusEnum.enumValues)[number];
export type WorkCategory = (typeof workCategoryEnum.enumValues)[number];
export type AiProvider = (typeof aiProviderEnum.enumValues)[number];
