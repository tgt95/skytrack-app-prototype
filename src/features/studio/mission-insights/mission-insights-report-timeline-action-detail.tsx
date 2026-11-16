import { ArrowSquareOutIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "skytrack-ui/alert";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import { DataTable, type DataTableColumnDef } from "skytrack-ui/data-table";
import { Separator } from "skytrack-ui/separator";
import {
  asRecord,
  asRecords,
  numberValue,
  reportArtifacts,
  sampleMedia,
  textValue,
  type JsonRecord,
} from "./mission-insights-report-data";
import { type MissionInsightSample } from "./mission-insights-data";
import {
  copyableArtifactPath,
  displayLocalPath,
} from "./mission-insights-report-media-path";
import { MediaPathActions } from "./mission-insights-report-media-path-actions";
import {
  KeyValueList,
  statusVariant,
} from "./mission-insights-report-shared.tsx";
import { type MissionInsightsReportTab } from "@/features/studio/mission-report-url";

function formatBytes(value: unknown): string {
  const bytes = numberValue(value);
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes.toLocaleString()} B`;
  return `${(bytes / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB`;
}

function fileName(artifact: JsonRecord): string {
  const metadata = asRecord(artifact.metadata);
  const file = asRecord(metadata.file);
  return textValue(
    file.name,
    textValue(artifact.uri, "Artifact").split("/").at(-1),
  );
}

function displayArtifactUri(artifact: JsonRecord): string {
  const uri = textValue(artifact.uri, "—");
  if (!uri.startsWith("sample://")) return uri;
  const location = textValue(asRecord(artifact.availability).location, "");
  return location.match(/\/runs\/[^/]+\/(.+)$/)?.[1] ?? uri;
}

function formatBytesWithExact(value: unknown): string {
  const bytes = numberValue(value);
  if (bytes === null) return "—";
  return bytes < 1024
    ? formatBytes(bytes)
    : `${formatBytes(bytes)} (${bytes.toLocaleString()} B)`;
}

function compactArtifactIds(ids: string[]): string {
  if (!ids.length) return "—";
  if (ids.length === 1) return ids[0];
  const first = ids[0];
  const last = ids.at(-1)!;
  const sharedPrefix = first.match(/^(.*?\D)\d+$/)?.[1];
  if (sharedPrefix && last.startsWith(sharedPrefix)) {
    return `${first}…${last.slice(sharedPrefix.length)}`;
  }
  return `${first}…${last}`;
}

function artifactRows(
  report: JsonRecord,
  value: unknown,
): Array<[string, string]> {
  const artifacts = reportArtifacts(report);
  const models = asRecords(report.ai_models);
  return Object.entries(asRecord(value)).map(([key, entry]) => {
    const artifact =
      typeof entry === "string"
        ? artifacts.find((candidate) => candidate.artifact_id === entry)
        : undefined;
    const label = key
      .replace(/_mps$/, " (m/s)")
      .replace(/_ms$/, " (ms)")
      .replace(/_m$/, " (m)")
      .replace(/_s$/, " (s)")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    if (key === "model_id") {
      const model = models.find((candidate) => candidate.model_id === entry);
      return [
        "Model",
        `${textValue(model?.name, String(entry))} (${String(entry)})`,
      ];
    }
    if (key === "detection_count") return ["Detections", String(entry)];
    if (key === "map_artifact_id") {
      return [
        "Map",
        artifact ? `${fileName(artifact)} (${entry})` : String(entry),
      ];
    }
    return [
      label,
      artifact ? `${fileName(artifact)} (${entry})` : String(entry),
    ];
  });
}

function FactList({ rows }: { rows: Array<[string, string]> }) {
  return rows.length ? (
    <dl className="m-0 grid min-w-0 grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-1"
        >
          <dt className="shrink-0 text-sm text-muted-foreground">{label}:</dt>
          <dd className="m-0 min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}

function PathCell({ artifact }: { artifact: JsonRecord }) {
  const displayPath = displayLocalPath(artifact);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <code
        className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
        title={displayPath}
      >
        {displayPath}
      </code>
      <MediaPathActions
        value={displayPath}
        copyValue={copyableArtifactPath(artifact)}
      />
    </div>
  );
}

function ActionFileTable({
  artifacts,
  invocations,
}: {
  artifacts: JsonRecord[];
  invocations: JsonRecord[];
}) {
  const invocationByOutput = new Map(
    invocations.map((invocation) => [
      textValue(invocation.output_artifact_id),
      invocation,
    ]),
  );
  const rows = artifacts.map((artifact) => {
    const id = textValue(artifact.artifact_id);
    const metadata = asRecord(artifact.metadata);
    const count =
      numberValue(metadata.object_count) ??
      numberValue(invocationByOutput.get(id)?.result_count);
    return {
      id,
      artifact,
      uri: displayArtifactUri(artifact),
      artifactId: id || "—",
      detections: count?.toLocaleString() ?? "—",
      size: formatBytesWithExact(artifact.size_bytes),
      sha256: textValue(artifact.sha256, "—"),
      role: textValue(artifact.role, "—"),
    };
  });
  const columns: DataTableColumnDef<(typeof rows)[number]>[] = [
    {
      id: "URI",
      accessorKey: "uri",
      header: "URI",
      cell: ({ row }) => (
        <code className="block truncate text-xs" title={row.original.uri}>
          {row.original.uri}
        </code>
      ),
    },
    {
      id: "Artifact · Detections · Size · SHA-256",
      accessorKey: "artifactId",
      header: "Artifact · Detections · Size · SHA-256",
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-wrap items-center gap-x-1 text-xs">
          <code>{row.original.artifactId}</code>
          <span className="text-muted-foreground">
            · {row.original.detections} detections · {row.original.size} ·{" "}
            {row.original.role} ·
          </span>
          <code className="min-w-0 truncate" title={row.original.sha256}>
            {row.original.sha256}
          </code>
        </div>
      ),
    },
    {
      id: "Local path",
      accessorKey: "uri",
      header: "Local path",
      cell: ({ row }) => <PathCell artifact={row.original.artifact} />,
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      pageSize={Math.max(rows.length, 1)}
      emptyMessage="No produced files are recorded for this action."
      renderSearch={() => null}
      renderColumnVisibility={() => null}
      renderPagination={() => null}
      className="min-w-0 [&>div:first-child>table]:!w-full [&>div:first-child>table]:table-fixed [&>div:first-child>table_th]:!whitespace-normal [&>div:first-child>table_td]:!whitespace-normal [&>div:first-child>table_th:nth-child(1)]:w-[36%] [&>div:first-child>table_th:nth-child(2)]:w-[40%] [&>div:first-child>table_th:nth-child(3)]:w-[24%]"
    />
  );
}

function ActionSourceImages({
  report,
  sample,
  artifacts,
  onOpenMedia,
  onOpenMediaFiles,
}: {
  report: JsonRecord;
  sample: MissionInsightSample;
  artifacts: JsonRecord[];
  onOpenMedia: (id: string) => void;
  onOpenMediaFiles: () => void;
}) {
  const mapArtifact = artifacts.find(
    (artifact) => artifact.type === "semantic_map",
  );
  const sourceIds = new Set(
    Array.isArray(mapArtifact?.derived_from)
      ? mapArtifact.derived_from.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
  );
  const images = sampleMedia(sample)
    .filter((media) => sourceIds.has(media.id))
    .slice(0, 4);
  if (!images.length) return null;

  const totalImages = sourceIds.size;
  const captureActionName = textValue(
    asRecords(report.executions)
      .flatMap((execution) => asRecords(asRecord(execution).actions))
      .find((action) => action.type === "capture.image")?.name,
    "the capture action",
  );

  return (
    <section
      className="flex min-w-0 flex-col gap-3"
      aria-labelledby="timeline-source-images-heading"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h4 id="timeline-source-images-heading" className="m-0 font-medium">
            Source images
          </h4>
          <p className="m-0 text-sm text-muted-foreground">
            Showing {images.length} of {totalImages} images with detections ·
            Produced by {captureActionName}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenMediaFiles}
        >
          Open in Media &amp; Files
          <ArrowSquareOutIcon aria-hidden="true" />
        </Button>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((image) => {
          const imageArtifact = image.artifact;
          const displayPath = displayLocalPath(imageArtifact);
          const thumbnail = image.imageUrl ? (
            <img
              src={image.imageUrl}
              alt=""
              className="aspect-video w-full rounded-(--radius) object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-(--radius) bg-muted text-sm text-muted-foreground">
              Preview unavailable
            </div>
          );
          return (
            <div
              key={image.id}
              className="flex min-w-0 flex-col gap-1.5"
              data-note={`Source image ${image.name}; report-backed detection count, capture time, and local path`}
            >
              {image.id === "art_image_0005" ? (
                <button
                  type="button"
                  className="cursor-pointer rounded-(--radius) text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onOpenMedia(image.id)}
                  aria-label={`Open source image ${image.name} (${image.detectionCount} detections, ${image.captureTime?.toFixed(1) ?? "—"} s) in Media & Files`}
                >
                  {thumbnail}
                </button>
              ) : (
                thumbnail
              )}
              <div className="flex min-w-0 items-center gap-2">
                <Badge count={image.detectionCount} status="success" />
                <code
                  className="min-w-0 flex-1 truncate text-xs"
                  title={image.name}
                >
                  {image.name}
                </code>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {image.captureTime?.toFixed(1) ?? "—"} s
                </span>
              </div>
              <div className="flex min-w-0 items-center gap-1.5">
                <code
                  className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
                  title={displayPath}
                >
                  {displayPath}
                </code>
                <MediaPathActions
                  value={displayPath}
                  copyValue={copyableArtifactPath(imageArtifact)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function TimelineActionDetail({
  report,
  action,
  sample,
  executionId,
  onOpenMedia,
  onOpenMediaFiles,
  onNavigate,
}: {
  report: JsonRecord;
  action: JsonRecord;
  sample: MissionInsightSample;
  executionId: string;
  onOpenMedia: (id: string) => void;
  onOpenMediaFiles: () => void;
  onNavigate: (tab: MissionInsightsReportTab) => void;
}) {
  const actionId = textValue(action.action_id);
  const artifacts = reportArtifacts(report).filter(
    (artifact) => textValue(asRecord(artifact.context).action_id) === actionId,
  );
  const detectionFiles = artifacts.filter(
    (artifact) => artifact.type === "detection_result",
  );
  const otherFiles = artifacts.filter(
    (artifact) => artifact.type !== "detection_result",
  );
  const otherFileRows = otherFiles.map((artifact) => ({
    id: textValue(artifact.artifact_id),
    artifact,
    uri: displayArtifactUri(artifact),
    role: textValue(artifact.role, textValue(artifact.type, "—")),
    kind:
      artifact.type === "semantic_map"
        ? "Stressed-area map"
        : textValue(artifact.type, "File"),
    artifactId: textValue(artifact.artifact_id, "—"),
    size: formatBytesWithExact(artifact.size_bytes),
    sha256: textValue(artifact.sha256, "—"),
  }));
  const otherFileColumns: DataTableColumnDef<(typeof otherFileRows)[number]>[] =
    [
      {
        id: "File",
        accessorKey: "uri",
        header: "File",
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <code className="truncate font-medium" title={row.original.uri}>
              {row.original.uri}
            </code>
            <span className="text-xs text-muted-foreground">
              {row.original.kind}
            </span>
          </div>
        ),
      },
      {
        id: "Artifact",
        accessorKey: "artifactId",
        header: "Artifact",
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <code className="truncate text-xs" title={row.original.artifactId}>
              {row.original.artifactId}
            </code>
            <span className="text-xs text-muted-foreground">
              {row.original.role} · SHA-256 {row.original.sha256}
            </span>
          </div>
        ),
      },
      {
        id: "Size",
        accessorKey: "size",
        header: "Size",
        meta: { align: "right" },
      },
      {
        id: "Local path",
        accessorKey: "uri",
        header: "Local path",
        cell: ({ row }) => <PathCell artifact={row.original.artifact} />,
      },
    ];
  const models = asRecords(report.ai_models);
  const modelId = textValue(asRecord(action.inputs).model_id, "");
  const model = models.find((candidate) => candidate.model_id === modelId);
  const allInvocations = asRecords(report.invocations);
  const invocations = modelId
    ? allInvocations.filter((invocation) => invocation.model_id === modelId)
    : [];
  const diagnostics = asRecords(asRecord(report.diagnostics).items);
  const relatedDiagnostics = diagnostics.filter(
    (item) => item.action_id === actionId,
  );
  const runDiagnostics = diagnostics.filter(
    (item) => item.action_id !== actionId,
  );
  const execution = asRecords(report.executions).find((item) =>
    asRecords(asRecord(item).actions).some(
      (candidate) => candidate.action_id === actionId,
    ),
  );
  const error = asRecord(action.error);
  const outputRows = artifactRows(report, action.outputs);
  const inputs = asRecord(action.inputs);
  const targetPose = ["x_m", "y_m"]
    .filter((key) => numberValue(inputs[key]) !== null)
    .map((key) => `${key[0]}: ${numberValue(inputs[key])} m`);
  const frameId = textValue(
    asRecord(report.flight_path).frame_id,
    "Not supplied",
  );
  const inputDetailRow = targetPose.length
    ? ([
        "Input · target pose",
        <span>
          {targetPose.join(" · ")} · frame <code>{frameId}</code>
        </span>,
      ] as const)
    : ([
        "Inputs",
        <FactList rows={artifactRows(report, action.inputs)} />,
      ] as const);
  const lastPosition = asRecord(asRecord(report.flight_path).last_position);
  const fallbackOutputs =
    Object.keys(error).length > 0 &&
    outputRows.length === 0 &&
    Object.keys(lastPosition).length > 0
      ? `— (last position ${Object.entries(lastPosition)
          .map(([key, value]) => {
            const axis = key.replace(/_m$/, "");
            const unit = key.endsWith("_m") ? " m" : "";
            return `${axis}: ${String(value)}${unit}`;
          })
          .join(", ")})`
      : null;
  const mapArtifact = artifacts.find(
    (artifact) => artifact.type === "semantic_map",
  );
  const sourceIds = Array.isArray(mapArtifact?.derived_from)
    ? mapArtifact.derived_from.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const detections = asRecords(report.detections_geo).filter((item) =>
    sourceIds.includes(textValue(item.source_artifact_id)),
  );
  const classes = [
    ...new Set(detections.map((item) => textValue(item.class)).filter(Boolean)),
  ];
  const mapLineage = mapArtifact
    ? `${compactArtifactIds(sourceIds)} → ${compactArtifactIds(detectionFiles.map((artifact) => textValue(artifact.artifact_id)).filter(Boolean))} → ${textValue(mapArtifact.artifact_id)}`
    : "No detection lineage is recorded for this action.";
  const folderPath = detectionFiles.length
    ? displayLocalPath(detectionFiles[0]).replace(/[^/]+$/, "")
    : "";
  const copyFolderPath = detectionFiles.length
    ? `${textValue(asRecord(detectionFiles[0].availability).location).replace(/[^/]+$/, "")}`
    : "";
  const invocationSummary = model
    ? `${numberValue(asRecord(model.invocations).total) ?? invocations.length} invocations${invocations.length ? ` (${textValue(invocations[0].invocation_id)}–${textValue(invocations.at(-1)?.invocation_id)})` : ""} · ${numberValue(asRecord(model.invocations).with_results) ?? 0} with results · ${numberValue(asRecord(model.invocations).zero_results) ?? 0} zero · ${numberValue(asRecord(model.invocations).failed) ?? 0} failed · mean invocation duration ${numberValue(model.mean_duration_ms)?.toFixed(0) ?? "—"} ms · p95 invocation duration ${numberValue(model.p95_duration_ms)?.toFixed(0) ?? "—"} ms`
    : `${artifacts.length} files produced · ${invocations.length} model invocations`;
  const relatedDiagnosticContent = relatedDiagnostics.length ? (
    <div className="flex min-w-0 flex-col gap-2">
      {relatedDiagnostics.map((item, index) => (
        <div
          key={`${textValue(item.code)}-${index}`}
          className="flex min-w-0 flex-wrap items-center gap-2"
        >
          <Badge
            count={textValue(item.severity, "Issue")}
            status={statusVariant(item.severity)}
          />
          <code>{textValue(item.code)}</code>
          <span className="text-muted-foreground">
            at {numberValue(item.time_s)?.toFixed(1) ?? "—"} s ·{" "}
            {textValue(item.component, "Component unavailable")}
          </span>
        </div>
      ))}
    </div>
  ) : runDiagnostics.length ? (
    <span className="text-muted-foreground">
      0 for this action ({runDiagnostics.length} run{" "}
      {runDiagnostics.length === 1 ? "warning" : "warnings"}{" "}
      {runDiagnostics
        .map(
          (item) =>
            `at ${numberValue(item.time_s)?.toFixed(1) ?? "—"} s: ${textValue(item.code)}`,
        )
        .join(" · ")}
      )
    </span>
  ) : (
    "0 for this action"
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <KeyValueList
        columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        rows={[
          [
            "Action · execution",
            <span>
              <code>{actionId}</code> · execution{" "}
              <code>
                {executionId ||
                  textValue(asRecord(execution).execution_id, "Not supplied")}
              </code>
              <br />
              <span className="text-sm text-muted-foreground">
                {textValue(action.started_at, "Start time not supplied")} →{" "}
                {textValue(action.ended_at, "End time not supplied")}
              </span>
            </span>,
          ],
          ["Type", <code>{textValue(action.type, "Not supplied")}</code>],
          inputDetailRow,
          ["Outputs", fallbackOutputs ?? <FactList rows={outputRows} />],
          ...(model
            ? [
                [
                  "Model",
                  <span>
                    {textValue(model.name)} {textValue(model.version, "")} ·{" "}
                    <code>{textValue(model.model_id)}</code>
                    <br />
                    <span className="text-sm text-muted-foreground">
                      SHA-256 {textValue(model.sha256, "Not supplied")} ·{" "}
                      {textValue(
                        model.producer_type,
                        textValue(model.producer, "Producer not supplied"),
                      ).replaceAll("_", " ")}
                    </span>
                  </span>,
                ] as const,
              ]
            : []),
          [
            model ? "Invocations" : "Produced files · invocations",
            <span>{invocationSummary}</span>,
          ],
          ...(mapArtifact
            ? [
                [
                  "Detections · lineage",
                  <span>
                    {detections.length} detections across {sourceIds.length}{" "}
                    images ({classes.join(", ") || "class not supplied"})<br />
                    <code className="text-xs">{mapLineage}</code>
                  </span>,
                ] as const,
              ]
            : []),
          [
            relatedDiagnostics.length === 1
              ? "Related diagnostic"
              : "Related diagnostics",
            relatedDiagnosticContent,
          ],
        ]}
      />

      {error.code || error.message ? (
        <Alert variant="destructive" role="status">
          <WarningCircleIcon className="size-5 shrink-0" aria-hidden="true" />
          <AlertTitle>
            {textValue(error.message, textValue(error.code, "Action failed"))}
          </AlertTitle>
          <AlertDescription>
            <div className="flex flex-wrap items-center gap-2">
              <Badge count={textValue(error.code)} status="error" />
              {textValue(action.type)}
            </div>
            {typeof error.stack === "string" && error.stack ? (
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs">
                {error.stack}
              </pre>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {artifacts.length ? (
        <>
          <Separator />
          <section
            className="flex min-w-0 flex-col gap-3"
            aria-labelledby={`timeline-produced-files-${actionId}`}
          >
            <header className="flex min-w-0 flex-col gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <h4
                  id={`timeline-produced-files-${actionId}`}
                  className="m-0 shrink-0 font-medium"
                >
                  Produced files ({artifacts.length})
                </h4>
                <Separator className="min-w-0 flex-1" />
              </div>
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <Badge
                  count={`Local · ${artifacts.filter((artifact) => asRecord(artifact.availability).state === "local").length} of ${artifacts.length} files`}
                  status="success"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenMediaFiles}
                >
                  Open in Media &amp; Files
                  <ArrowSquareOutIcon aria-hidden="true" />
                </Button>
              </div>
            </header>
            {otherFiles.length ? (
              <DataTable
                columns={otherFileColumns}
                data={otherFileRows}
                getRowId={(row) => row.id}
                pageSize={Math.max(otherFileRows.length, 1)}
                renderSearch={() => null}
                renderColumnVisibility={() => null}
                renderPagination={() => null}
                className="min-w-0 [&>div:first-child>table]:!w-full [&>div:first-child>table]:table-fixed [&>div:first-child>table_th]:!whitespace-normal [&>div:first-child>table_td]:!whitespace-normal [&>div:first-child>table_th:nth-child(1)]:w-[34%] [&>div:first-child>table_th:nth-child(2)]:w-[24%] [&>div:first-child>table_th:nth-child(3)]:w-[10%] [&>div:first-child>table_th:nth-child(4)]:w-[32%]"
              />
            ) : null}
            {detectionFiles.length ? (
              <div className="flex min-w-0 flex-col gap-3 rounded-(--radius) border border-border p-3">
                <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(12rem,0.8fr)_minmax(0,1.2fr)]">
                  <div className="min-w-0">
                    <div className="font-medium">Detection results</div>
                    <div className="text-sm text-muted-foreground">
                      {detectionFiles.length} files ·{" "}
                      {formatBytesWithExact(
                        detectionFiles.reduce(
                          (sum, artifact) =>
                            sum + (numberValue(artifact.size_bytes) ?? 0),
                          0,
                        ),
                      )}{" "}
                      · {textValue(detectionFiles[0]?.role, "—")} ·{" "}
                      {textValue(
                        asRecord(detectionFiles[0]?.metadata).format,
                        "Format unavailable",
                      )}
                    </div>
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <code
                      className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
                      title={folderPath}
                    >
                      {folderPath}
                    </code>
                    <MediaPathActions
                      value={folderPath}
                      copyValue={copyFolderPath}
                    />
                  </div>
                </div>
                <details open>
                  <summary className="cursor-pointer text-sm font-medium">
                    Individual detection files ({detectionFiles.length})
                  </summary>
                  <p className="mb-3 mt-1 text-sm text-muted-foreground">
                    {numberValue(
                      asRecord(asRecord(model).invocations).with_results,
                    ) ?? 0}{" "}
                    with detections ·{" "}
                    {numberValue(
                      asRecord(asRecord(model).invocations).zero_results,
                    ) ?? 0}{" "}
                    with 0 detections ·{" "}
                    {detectionFiles
                      .reduce(
                        (sum, artifact) =>
                          sum + (numberValue(artifact.size_bytes) ?? 0),
                        0,
                      )
                      .toLocaleString()}{" "}
                    B total
                  </p>
                  <ActionFileTable
                    artifacts={detectionFiles}
                    invocations={allInvocations}
                  />
                </details>
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      {mapArtifact ? (
        <>
          <Separator />
          <ActionSourceImages
            report={report}
            sample={sample}
            artifacts={artifacts}
            onOpenMedia={onOpenMedia}
            onOpenMediaFiles={onOpenMediaFiles}
          />
        </>
      ) : null}
      {model ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onNavigate("ai-models")}
          >
            View model in AI Models
            <ArrowSquareOutIcon aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
