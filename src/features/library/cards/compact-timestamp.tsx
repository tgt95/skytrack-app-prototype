import { useEffect, useState } from "react";

export function formatCompactUpdatedAt(
  value: string | null,
  now: number,
): string {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "—";

  const elapsed = Math.max(0, now - timestamp);
  if (elapsed < 60_000) return "Now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h`;
  if (elapsed < 7 * 86_400_000) return `${Math.floor(elapsed / 86_400_000)}d`;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year:
      timestamp < new Date(now).setFullYear(new Date(now).getFullYear() - 1)
        ? "numeric"
        : undefined,
  }).format(timestamp);
}

export function CompactTimestamp({ updatedAt }: { updatedAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const timestamp = updatedAt ? Date.parse(updatedAt) : Number.NaN;
  const fullDate = Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(timestamp)
    : "Edit time unavailable";

  return (
    <time
      dateTime={
        Number.isFinite(timestamp) ? (updatedAt ?? undefined) : undefined
      }
      aria-label={fullDate}
      title={fullDate}
      className="whitespace-nowrap text-right text-sm text-muted-foreground"
    >
      {formatCompactUpdatedAt(updatedAt, now)}
    </time>
  );
}
