import { asRecord, type JsonRecord, numberValue, textValue } from "./mission-insights-report-data";
import { type ReactNode } from "react";

export function textRecord(value: unknown) {
  const record = asRecord(value);
  return Object.entries(record)
    .map(([key, item]) => `${key}: ${formatValue(item)}`)
    .join(" · ");
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function SurveyContactSheetFrame({
  src,
  frameIndex,
  alt,
  className,
}: {
  src: string;
  frameIndex: number;
  alt: string;
  className: string;
}) {
  return (
    <span
      role="img"
      aria-label={alt}
      className={`relative block overflow-hidden ${className}`}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute size-[200%] max-w-none"
        style={{
          left: frameIndex % 2 === 0 ? "0%" : "-100%",
          top: frameIndex < 2 ? "0%" : "-100%",
        }}
      />
    </span>
  );
}

export function recordDuration(action: JsonRecord) {
  const start = numberValue(action.t0_s);
  const end = numberValue(action.t1_s);
  return start === null || end === null ? "—" : `${(end - start).toFixed(1)} s`;
}

export function statusLabel(value: unknown) {
  const raw = textValue(value, "Unknown");
  return raw
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function statusVariant(value: unknown) {
  const raw = textValue(value, "").toLowerCase();
  if (raw.includes("fail") || raw.includes("error")) return "error";
  if (raw.includes("partial") || raw.includes("missing")) return "warning";
  if (raw.includes("completed") || raw.includes("succeeded")) return "success";
  return "secondary";
}

export function KeyValueList({
  rows,
  columns = "sm:grid-cols-2",
}: {
  rows: ReadonlyArray<readonly [string, ReactNode]>;
  columns?: string;
}) {
  return (
    <dl className={`m-0 grid min-w-0 grid-cols-1 gap-x-6 gap-y-3 ${columns}`}>
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-(--muted-foreground)">{label}</dt>
          <dd className="m-0 mt-1 min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
