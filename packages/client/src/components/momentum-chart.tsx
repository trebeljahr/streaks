import type { DayFlag } from "@starter/shared";

const W = 312;
const H = 84;
const WINDOW = 30;
const HALF_LIFE = 10;

/**
 * Momentum over the last 30 days, recomputed at each point so the curve
 * shows the shape of a comeback rather than just its endpoint.
 */
function seriesFrom(days: DayFlag[], needPerDay: number): number[] {
  const flags = days.map((d) => d.credited);
  const out: number[] = [];
  for (let end = flags.length - WINDOW; end < flags.length; end += 1) {
    let earned = 0;
    let asked = 0;
    for (let back = 0; back < WINDOW; back += 1) {
      const index = end - back;
      const weight = Math.pow(0.5, back / HALF_LIFE);
      asked += weight * needPerDay;
      if (index >= 0 && flags[index]) earned += weight;
    }
    out.push(asked === 0 ? 0 : Math.min(100, Math.round((earned / asked) * 100)));
  }
  return out;
}

export function MomentumChart({
  days,
  needPerDay,
}: {
  days: DayFlag[];
  needPerDay: number;
}) {
  const values = seriesFrom(days, needPerDay);
  if (values.length < 2) return null;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - (v / 100) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `0,${H} ${points} ${W},${H}`;
  const lastY = H - (values[values.length - 1] / 100) * H;
  const low = Math.min(...values);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2.5">
        <h3 className="text-[10.5px] tracking-[0.12em] text-ink-faint uppercase">
          Momentum · 30 days
        </h3>
        <span className="grow" />
        {values[values.length - 1] > low + 5 && (
          <span className="text-xs font-light text-secured-ink">
            back up from {low}
          </span>
        )}
      </div>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block"
        role="img"
        aria-label={`Momentum over 30 days, now ${values[values.length - 1]} of 100`}
      >
        <defs>
          <linearGradient id="momentum-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9a5f0" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#c9a5f0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#momentum-fill)" />
        <polyline
          points={points}
          fill="none"
          stroke="#c9a5f0"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={W - 3} cy={lastY} r="3.5" fill="#c9a5f0" />
      </svg>
    </div>
  );
}
