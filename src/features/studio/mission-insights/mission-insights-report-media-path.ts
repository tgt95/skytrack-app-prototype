import {
  asRecord,
  textValue,
  type JsonRecord,
} from "./mission-insights-report-data";

export function copyableArtifactPath(artifact: JsonRecord): string {
  const metadata = asRecord(artifact.metadata);
  const file = asRecord(metadata.file);
  const availability = asRecord(artifact.availability);
  return textValue(
    availability.location,
    textValue(file.local_path, textValue(artifact.uri, "")),
  ).replaceAll("\\", "/");
}

export function sanitizedReportPath(artifact: JsonRecord): string {
  const metadata = asRecord(artifact.metadata);
  const file = asRecord(metadata.file);
  const availability = asRecord(artifact.availability);
  const source = textValue(
    availability.location,
    textValue(file.local_path, textValue(artifact.uri, "")),
  ).replaceAll("\\", "/");
  if (!source) return textValue(file.name, textValue(artifact.type));

  const normalized = source.startsWith("sample://")
    ? source.slice("sample://".length)
    : source;
  const parts = normalized
    .split("/")
    .filter((part) => part && part !== "." && part !== "..");
  const runsIndex = parts.lastIndexOf("runs");
  if (runsIndex >= 0 && parts[runsIndex + 1]) {
    return parts.slice(runsIndex + 2).join("/") || parts.at(-1)!;
  }
  if (
    normalized.startsWith("/") ||
    normalized.startsWith("~") ||
    /^[A-Za-z]:\//.test(normalized) ||
    normalized.includes("://")
  ) {
    return parts.at(-1) ?? "file";
  }
  return parts.join("/") || textValue(file.name, textValue(artifact.type));
}

export function displayLocalPath(artifact: JsonRecord): string {
  const source = copyableArtifactPath(artifact);
  if (source.startsWith("~/")) return source;
  const parts = source
    .replace(/^sample:\/\//, "")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..");
  const runsIndex = parts.lastIndexOf("runs");
  if (runsIndex >= 0 && parts[runsIndex + 1]) {
    return `~/SkyTrack/runs/…/${parts.slice(runsIndex + 2).join("/")}`;
  }
  return sanitizedReportPath(artifact);
}
