const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["minute", 60],
  ["hour", 3600],
  ["day", 86400],
  ["week", 604800],
  ["month", 2629800],
  ["year", 31557600],
];

/** "Bob is here too", "Bob and Carol are here too", "Bob, Carol and 2 others are here too" (first names). */
export function describePresence(names: string[]): string {
  const first = names.map((name) => name.trim().split(/\s+/)[0]);
  if (first.length === 0) return "";
  if (first.length === 1) return `${first[0]} is here too`;
  if (first.length === 2) return `${first[0]} and ${first[1]} are here too`;
  const others = first.length - 2;
  return `${first[0]}, ${first[1]} and ${others} ${others === 1 ? "other" : "others"} are here too`;
}

/** "just now", "5 minutes ago", "yesterday"... */
export function timeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  let [unit, size] = UNITS[0];
  for (const [u, s] of UNITS) if (abs >= s) [unit, size] = [u, s];
  return rtf.format(Math.round(seconds / size), unit);
}
