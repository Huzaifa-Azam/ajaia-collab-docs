const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["minute", 60],
  ["hour", 3600],
  ["day", 86400],
  ["week", 604800],
  ["month", 2629800],
  ["year", 31557600],
];

/** "just now", "5 minutes ago", "yesterday"... */
export function timeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  let [unit, size] = UNITS[0];
  for (const [u, s] of UNITS) if (abs >= s) [unit, size] = [u, s];
  return rtf.format(Math.round(seconds / size), unit);
}
