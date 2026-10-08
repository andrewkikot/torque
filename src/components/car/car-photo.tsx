import { CarFront } from "lucide-react";
import { cn } from "@/lib/utils";

type CarLike = { photoUrl: string | null; accentColor: string; fuel: string; make: string; model?: string };

/** Side-profile silhouettes: a compact hatch and a taller SUV. */
const BODY = {
  hatch:
    "M18 112c0-10 4-18 14-21l40-12 34-28c8-6 18-9 28-9h70c11 0 21 4 29 11l30 28 29 6c13 3 22 13 22 26v8c0 6-5 11-11 11h-17a33 33 0 0 0-65 0H120a33 33 0 0 0-65 0H29c-6 0-11-5-11-11z",
  suv: "M16 110c0-9 5-17 14-20l34-10 26-34c6-8 15-12 25-12h96c10 0 19 4 25 11l29 33 30 6c12 3 21 13 21 26v10c0 6-5 11-11 11h-16a33 33 0 0 0-65 0H121a33 33 0 0 0-65 0H27c-6 0-11-5-11-11z",
};
const WINDOWS = {
  hatch: "M96 82l26-22c5-4 11-6 17-6h28v28zM180 54h22c8 0 15 3 21 8l21 20h-64z",
  suv: "M86 82l22-30c4-5 9-8 15-8h34v38zM170 44h37c7 0 13 3 18 8l25 30h-80z",
};

/** Car photo, or a friendly illustrated tile in the car's accent color. */
export function CarPhoto({
  car,
  className,
  rounded = "rounded-3xl",
  bare,
  thumb,
}: {
  car: CarLike;
  className?: string;
  rounded?: string;
  /** Smaller, quieter illustration (e.g. behind a hero title). */
  bare?: boolean;
  /** Small avatar-sized tile: an icon reads better than the silhouette. */
  thumb?: boolean;
}) {
  if (car.photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={car.photoUrl} alt="" className={cn("object-cover", rounded, className)} />;
  }
  const shape = /suv|cx-|x[1-7]\b|rav|tiguan|tucson|sportage|q[3-8]\b|kodiaq|duster|outlander/i.test(`${car.make} ${car.model ?? ""}`) ? "suv" : "hatch";
  return (
    <div
      className={cn("relative overflow-hidden", rounded, className)}
      style={{
        background: `radial-gradient(120% 90% at 15% 10%, color-mix(in oklab, ${car.accentColor} 70%, white) 0%, ${car.accentColor} 45%, color-mix(in oklab, ${car.accentColor} 45%, #0c0a09) 100%)`,
      }}
      aria-hidden
    >
      {thumb ? (
        <CarFront className="absolute left-1/2 top-1/2 size-1/2 -translate-x-1/2 -translate-y-1/2 text-white/90" strokeWidth={1.75} />
      ) : (
      /* Soft floor shadow + silhouette, anchored bottom-right so titles stay readable. */
      <svg
        viewBox="0 0 340 150"
        className={cn(
          "absolute right-[-8%] h-auto text-white",
          bare ? "bottom-[6%] w-[62%] max-w-80 opacity-25" : "top-[10%] w-[68%] opacity-35 mix-blend-soft-light",
        )}
      >
        <ellipse cx="170" cy="142" rx="150" ry="7" fill="black" opacity="0.18" />
        <path d={BODY[shape]} fill="currentColor" opacity="0.92" />
        <path d={WINDOWS[shape]} fill="black" opacity="0.22" />
        {[87, 252].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="123" r="25" fill="#1c1917" />
            <circle cx={cx} cy="123" r="11" fill="currentColor" opacity="0.85" />
          </g>
        ))}
      </svg>
      )}
      {car.fuel === "electric" && !bare && (
        <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-white/25 text-sm backdrop-blur">⚡</span>
      )}
    </div>
  );
}
