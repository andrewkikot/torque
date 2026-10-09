/** Workshop plans. Car owners are always free; workshops are Free or Pro (activated by a license key). */
export type PlanId = "free" | "pro";

export type Entitlements = {
  plan: PlanId;
  /** Team size including the owner. */
  seats: number;
  /** New jobs per calendar month; null = unlimited. */
  jobsPerMonth: number | null;
  photosPerJob: number;
  /** Logo, about, hours, website, Telegram on customer pages; no "Powered by Torque". */
  branding: boolean;
  /** Telegram pushes to the team when a customer approves, declines or writes. */
  teamTelegram: boolean;
  expiresAt: Date | null;
};

export const FREE: Omit<Entitlements, "expiresAt"> = {
  plan: "free",
  seats: 2,
  jobsPerMonth: 30,
  photosPerJob: 3,
  branding: false,
  teamTelegram: false,
};

export const PRO_DEFAULT_SEATS = 5;
const PRO_PHOTOS_PER_JOB = 20;

export function billingEnabled() {
  return process.env.BILLING_ENABLED === "true";
}

type LicenseRow = { status: string; seats: number; expiresAt: Date | null };

/** Pure: entitlements from a workshop's licenses at a given moment. */
export function computeEntitlements(licenses: LicenseRow[], now = new Date(), opts: { billing?: boolean } = {}): Entitlements {
  const active = licenses.filter((l) => l.status === "active" && l.expiresAt && l.expiresAt > now);
  if (active.length) {
    const expiresAt = new Date(Math.max(...active.map((l) => l.expiresAt!.getTime())));
    const seats = Math.max(...active.map((l) => l.seats));
    return { plan: "pro", seats, jobsPerMonth: null, photosPerJob: PRO_PHOTOS_PER_JOB, branding: true, teamTelegram: true, expiresAt };
  }
  // Billing off (e.g. on non-commercial hosting): nothing is limited.
  if (!(opts.billing ?? billingEnabled())) {
    return { plan: "free", seats: 1000, jobsPerMonth: null, photosPerJob: PRO_PHOTOS_PER_JOB, branding: true, teamTelegram: true, expiresAt: null };
  }
  return { ...FREE, expiresAt: null };
}

/** A new key extends from the current Pro expiry (renewals stack), else from now. */
export function nextExpiry(currentExpiry: Date | null, durationDays: number, now = new Date()) {
  const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
  return new Date(base.getTime() + durationDays * 86_400_000);
}

const KEY_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** TQ-PRO-XXXX-XXXX-XXXX */
export function newLicenseKey(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  const bytes = random(12);
  const chars = Array.from(bytes, (b) => KEY_ALPHABET[b % KEY_ALPHABET.length]).join("");
  return `TQ-PRO-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

/** Accepts any casing/spacing: " tq-pro xxxx xxxx-xxxx " → "TQ-PRO-XXXX-XXXX-XXXX". Null if malformed. */
export function normalizeLicenseKey(input: string): string | null {
  const raw = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const m = raw.match(/^TQPRO([0-9A-Z]{12})$/);
  if (!m) return null;
  const c = m[1];
  if ([...c].some((ch) => !KEY_ALPHABET.includes(ch))) return null;
  return `TQ-PRO-${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}`;
}

/** Whole days until a date (0 if past). Kept out of components so renders stay pure. */
export function daysUntil(date: Date | string, now: number = Date.now()) {
  return Math.max(0, Math.ceil((new Date(date).getTime() - now) / 86_400_000));
}
