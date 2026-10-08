import { cn } from "@/lib/utils";

export function HealthRing({ value, size = 56, className, label }: { value: number | null; size?: number; className?: string; label?: string }) {
  const stroke = size / 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value ?? 0;
  const color = value == null ? "var(--subtle)" : pct >= 80 ? "var(--success)" : pct >= 50 ? "var(--warning)" : "var(--danger)";
  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }} aria-label={label ? `${label}: ${value ?? "–"}%` : undefined}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeOpacity={0.12} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="tabular absolute text-xs font-bold">{value == null ? "–" : value}</span>
    </div>
  );
}
