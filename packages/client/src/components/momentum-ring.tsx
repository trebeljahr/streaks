type MomentumRingProps = {
  /** 0-100. */
  value: number;
  color: string;
  size?: number;
  /** Hidden on small rings where the number would be unreadable. */
  showValue?: boolean;
};

/**
 * The at-a-glance momentum figure. An empty ring reads as "not yet" rather
 * than as a failure, which is why the track is the same neutral line colour
 * used everywhere else.
 */
export function MomentumRing({
  value,
  color,
  size = 46,
  showValue = true,
}: MomentumRingProps) {
  const stroke = size >= 60 ? 6 : 4;
  const radius = size / 2 - stroke / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, value)) / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block shrink-0"
      role="img"
      aria-label={`Momentum ${Math.round(value)} of 100`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--line)"
        strokeWidth={stroke}
      />
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
      />
      {showValue && (
        <text
          x={size / 2}
          y={size / 2 + 4}
          textAnchor="middle"
          className="tabular"
          fontSize={size >= 60 ? 18 : 13}
          fill="var(--ink)"
        >
          {Math.round(value)}
        </text>
      )}
    </svg>
  );
}
