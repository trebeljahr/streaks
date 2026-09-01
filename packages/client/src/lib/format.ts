/** `mm:ss`, or `h:mm:ss` past an hour. Zero-padded so nothing shifts. */
export function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "24 min", "1 h 05". For summaries rather than a running clock. */
export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, "0")}`;
}

const DAY_LABEL = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** "Tuesday 26 August", from a `YYYY-MM-DD` key. */
export function formatDayKey(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return DAY_LABEL.format(new Date(Date.UTC(y, m - 1, d)));
}

/** Days between a `YYYY-MM-DD` key and today's key. */
export function daysAgo(day: string, today: string): number {
  const parse = (k: string): number => {
    const [y, m, d] = k.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((parse(today) - parse(day)) / 86_400_000);
}
