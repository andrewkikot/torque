import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 512 512" className="size-9 shrink-0" aria-hidden>
        <rect width="512" height="512" rx="120" fill="var(--accent)" />
        <g fill="none" stroke="var(--accent-fg)" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round">
          <path d="M128 330a128 128 0 1 1 256 0" />
          <path d="M256 330l70-92" />
          <path d="M168 392h176" />
        </g>
        <circle cx="256" cy="330" r="28" fill="var(--accent-fg)" />
      </svg>
      {!compact && <span className="font-display text-xl font-bold tracking-tight">Torque</span>}
    </span>
  );
}
