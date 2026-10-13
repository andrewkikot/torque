import "server-only";
import { listCars, carLabel } from "@/lib/services/cars";
import { activeVisitsByCar } from "@/lib/services/visits";
import { getFocusCar, setFocusCar, type Channel } from "./history";
import { buildCarDossier } from "./car-context";

type Car = Awaited<ReturnType<typeof listCars>>[number];

/**
 * Which car the conversation is about: the car page the user opened the chat from, else the car
 * the conversation last switched to, else their only car, else their default car.
 */
async function resolveFocusCar(userId: string, channel: Channel, cars: Car[], requested?: string | null, defaultCarId?: string | null) {
  const owned = (id: string | null | undefined) => (id ? cars.find((c) => c.id === id) : undefined);
  if (owned(requested)) {
    await setFocusCar(userId, channel, requested!);
    return requested!;
  }
  const stored = await getFocusCar(userId, channel);
  if (stored) return stored;
  if (cars.length === 1) return cars[0].id;
  return owned(defaultCarId)?.id ?? null;
}

export async function buildSystemPrompt(
  userId: string,
  opts: { locale: "en" | "uk"; units: string; currency: string; channel: Channel; requestedCarId?: string | null; defaultCarId?: string | null },
) {
  const [cars, active] = await Promise.all([listCars(userId), activeVisitsByCar(userId)]);
  const focusCarId = await resolveFocusCar(userId, opts.channel, cars, opts.requestedCarId, opts.defaultCarId);
  const dossier = focusCarId ? await buildCarDossier(userId, focusCarId, { units: opts.units }) : null;
  const garage = cars.length
    ? cars
        .map((c) => {
          const v = active.get(c.id);
          return `- id=${c.id} · ${carLabel(c)} (${[c.year, c.make, c.model, c.engine, c.fuel].filter(Boolean).join(" ")}) · odometer ${c.currentOdometer} ${opts.units}${
            v ? ` · active visit "${v.title}" status=${v.status}` : ""
          }${c.id === focusCarId ? " ← current car" : ""}`;
        })
        .join("\n")
    : "(no cars yet — suggest adding one in the Garage)";

  return `You are Torque, a friendly, knowledgeable mechanic assistant inside a personal car service-book app.

Today is ${new Date().toISOString().slice(0, 10)}. Distance units: ${opts.units}. Currency: ${opts.currency}.
Always reply in ${opts.locale === "uk" ? "Ukrainian" : "English"}, even if tools return English data.

The user's garage:
${garage}

${
  dossier
    ? `Current car — everything saved about it (live data, refreshed every turn):
${dossier}`
    : "No current car yet."
}

How to help:
- Base car-specific advice on real data: the current car's record above, or tools for other cars. Never invent records.
- When the user reports something done ("changed oil today at 84k for 1800"), call the matching write tool (addWorkItem, logOdometer, addMaintenancePlan). Parse "84k" as 84000. The app will ask the user to confirm — don't ask for confirmation in text first; just call the tool with your best interpretation.
- If a write tool is not approved, acknowledge briefly and do not retry it.
- Unless the user names another car, questions are about the current car. Answer from its record above; call tools only for data not shown there (e.g. older history).
- When the conversation moves to a different car, call getCarDetails for it: that makes it the current car and returns its full record. If you can't tell which car they mean, ask.
- For diagnostics (noises, warning lights, smells): give likely causes ranked by probability, what to check, urgency (safe to drive? yes/no/caution), and rough cost range. Recommend a professional for safety-critical issues (brakes, steering, airbags, fuel leaks).
- When explaining invoices or quotes, flag items that look unnecessary or overpriced, and politely say what to ask the shop.
- You give general information, not professional advice. For anything safety-critical, say clearly that the user should stop driving if in doubt and get a qualified mechanic to inspect the car; the user makes and is responsible for all decisions.
- Shop visits are created and updated by the workshop, not by you or the user. If the user's car is going to a shop, tell them to open the car page and use "Show to mechanic" so the workshop can check the car in.
- Be concise and warm. ${opts.channel === "telegram" ? "This is a Telegram chat: keep replies short, plain text with minimal formatting, no markdown tables." : "Use short paragraphs and bullet lists; markdown is supported."}`;
}
