type ElapsedRingProps = {
  elapsedMs: number;
  targetMinutes: number;
  minimumMinutes: number;
  color: string;
  size?: number;
};

/**
 * The running clock's ring.
 *
 * It fills towards the target and then simply stays full — there is no
 * overrun state and no countdown, so the screen never has a way to tell
 * someone they are behind. The small mark shows where the minimum sat,
 * i.e. the moment the day was already won.
 */
export function ElapsedRing({
  elapsedMs,
  targetMinutes,
  minimumMinutes,
  color,
  size = 264,
}: ElapsedRingProps) {
  const stroke = 7;
  const radius = size / 2 - stroke * 1.7;
  const circumference = 2 * Math.PI * radius;

  const targetMs = Math.max(1, targetMinutes * 60_000);
  const progress = Math.min(1, elapsedMs / targetMs);
  const filled = progress * circumference;

  const minimumFraction = Math.min(1, (minimumMinutes * 60_000) / targetMs);
  const angle = minimumFraction * 2 * Math.PI - Math.PI / 2;
  const markX = size / 2 + radius * Math.cos(angle);
  const markY = size / 2 + radius * Math.sin(angle);
  const secured = elapsedMs >= minimumMinutes * 60_000;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block"
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#282338"
        strokeWidth={stroke}
      />
      {/* Two passes: a soft wide glow under a crisp thin line. */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        opacity={0.28}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <circle
        cx={markX}
        cy={markY}
        r={4.5}
        fill="var(--ground)"
        stroke={secured ? "var(--secured)" : "var(--line-strong)"}
        strokeWidth={2.5}
      />
    </svg>
  );
}
