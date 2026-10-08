import { cn } from "@/lib/utils";

const FUEL_EMOJI: Record<string, string> = { electric: "⚡", hybrid: "🍃", diesel: "🚙", lpg: "🔥", petrol: "🚗", other: "🚙" };

/** Car photo, or a friendly gradient tile in the car's accent color. */
export function CarPhoto({
  car,
  className,
  rounded = "rounded-3xl",
  bare,
}: {
  car: { photoUrl: string | null; accentColor: string; fuel: string; make: string };
  className?: string;
  rounded?: string;
  /** Hide the center icon (e.g. behind a hero title). */
  bare?: boolean;
}) {
  if (car.photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={car.photoUrl} alt="" className={cn("object-cover", rounded, className)} />;
  }
  return (
    <div
      className={cn("relative grid place-items-center overflow-hidden", rounded, className)}
      style={{ background: `linear-gradient(135deg, ${car.accentColor}, color-mix(in oklab, ${car.accentColor} 55%, #1c1917))` }}
    >
      <span className="absolute -bottom-4 -right-2 font-display text-7xl font-bold text-white/15 select-none">{car.make.slice(0, 2).toUpperCase()}</span>
      {!bare && <span className="text-4xl drop-shadow">{FUEL_EMOJI[car.fuel] ?? "🚗"}</span>}
    </div>
  );
}
