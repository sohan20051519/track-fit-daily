import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClassName?: string;
  /** CSS color for the progress stroke */
  color?: string;
  children?: React.ReactNode;
}

/**
 * Apple-Health-style circular progress ring.
 */
export function ProgressRing({
  value,
  max,
  size = 140,
  stroke = 12,
  className,
  trackClassName,
  color = "var(--color-primary)",
  children,
}: ProgressRingProps) {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={cn("stroke-secondary", trackClassName)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
