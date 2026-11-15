import { useState } from "react";
import {
  CheckIcon,
  CopySimpleIcon,
  FileIcon,
  FolderOpenIcon,
} from "@phosphor-icons/react";
import {
  type JsonRecord,
  asRecords,
  textValue,
  asRecord,
  reportForSample,
  numberValue,
  reportArtifacts,
  sampleActions,
  sampleMedia,
} from "./mission-insights-report-data";
import { type MissionInsightSample } from "./mission-insights-data";
import { type MissionInsightsReportTab } from "@/features/studio/mission-report-url";
import {
  statusLabel,
  statusVariant,
  KeyValueList,
} from "./mission-insights-report-shared.tsx";
import { type DataTableColumnDef, DataTable } from "skytrack-ui/data-table";
import { DetailSection } from "./mission-insights-page-sections";
import { CategoryChart } from "./mission-insights-report-overview.tsx";
import { Badge } from "skytrack-ui/badge";
import { Separator } from "skytrack-ui/separator";
import { Button } from "skytrack-ui/button";
import { Meter, MeterIndicator, MeterTrack } from "skytrack-ui/meter";

export function modelRows(
  report: JsonRecord,
): Array<JsonRecord & { id: string; name: string; calls: JsonRecord }> {
  return asRecords(report.ai_models).map((model) => ({
    ...model,
    id: textValue(model.model_id),
    name: textValue(model.name),
    calls: asRecord(model.invocations),
  }));
}

function CopyInputPath({ path }: { path: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  async function copyPath() {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard API is unavailable");
      await navigator.clipboard.writeText(path);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1600);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={copyState === "error" ? "Copy failed" : "Copy input path"}
      title={
        copyState === "copied"
          ? "Path copied"
          : copyState === "error"
            ? "Copy failed"
            : "Copy input path"
      }
      onClick={copyPath}
    >
      {copyState === "copied" ? (
        <CheckIcon aria-hidden="true" />
      ) : (
        <CopySimpleIcon aria-hidden="true" />
      )}
    </Button>
  );
}

export function AIModelsTab({
  sample,
  onNavigate,
  onOpenMedia,
}: {
  sample: MissionInsightSample;
  onNavigate: (tab: MissionInsightsReportTab) => void;
  onOpenMedia: (id: string) => void;
}) {
  const report = reportForSample(sample);
  const executionSource = asRecord(report.source);
  const models = modelRows(report);
  const invocationKeys = ["with_results", "zero_results", "failed"] as const;
  const invocationTotals = models.reduce<
    Record<(typeof invocationKeys)[number], number>
  >(
    (totals, model) => {
      for (const key of invocationKeys) {
        totals[key] += numberValue(model.calls[key]) ?? 0;
      }
      return totals;
    },
    { with_results: 0, zero_results: 0, failed: 0 },
  );
  const detections = asRecords(report.detections_geo);
  const classCounts = new Map<string, number>();
  models.forEach((model) => {
    const classes = Array.isArray(model.classes) ? model.classes : [];
    classes.forEach((name) => {
      if (typeof name === "string") classCounts.set(name, 0);
    });
  });
  detections.forEach((item) => {
    const label = textValue(item.class, "Unclassified");
    classCounts.set(label, (classCounts.get(label) ?? 0) + 1);
  });
  const classRows = [...classCounts.entries()].sort((a, b) => b[1] - a[1]);
  const resultRows = [
    ["With results", invocationTotals.with_results] as const,
    ["Zero results", invocationTotals.zero_results] as const,
    ["Failed", invocationTotals.failed] as const,
  ];
  const mediaById = new Map(
    sampleMedia(sample).map((media) => [media.id, media]),
  );
  const invocationRows = asRecords(report.invocations).map((invocation) => {
    const inputArtifact = reportArtifacts(report).find(
      (artifact) => artifact.artifact_id === invocation.input_artifact_id,
    );
    const inputFile = asRecord(asRecord(inputArtifact).metadata).file;
    const availability = asRecord(asRecord(inputArtifact).availability);
    const inputId = textValue(invocation.input_artifact_id);
    const inputName = textValue(asRecord(inputFile).name, inputId);
    const inputPath = textValue(
      availability.location,
      textValue(asRecord(inputArtifact).local_path, ""),
    );
    const inputPathDisplay = inputPath.startsWith("sample://")
      ? `~/SkyTrack/${inputPath.slice("sample://".length)}`
      : inputPath.replace(/^\/Users\/[^/]+(?=\/)/, "~");
    const outputArtifact = reportArtifacts(report).find(
      (artifact) => artifact.artifact_id === invocation.output_artifact_id,
    );
    const outputClasses = asRecord(
      asRecord(asRecord(outputArtifact).metadata).classes,
    );
    const detectionCount = numberValue(invocation.result_count) ?? 0;
    const detectionClasses = Object.entries(outputClasses)
      .filter(([, count]) => typeof count === "number" && count > 0)
      .map(([name, count]) => `${count} ${name}`)
      .join(", ");
    const result = textValue(invocation.result);
    const error = asRecord(invocation.error);
    const errorCode = textValue(error.code, "");
    const errorMessage = textValue(error.message, "");
    return {
      id: textValue(invocation.invocation_id),
      input: `${inputName} ${inputId} ${inputPath}`,
      inputName,
      inputId,
      inputPath,
      inputPathDisplay: inputPath ? inputPathDisplay : "—",
      inputPreview: mediaById.get(inputId)?.imageUrl ?? null,
      time: `${numberValue(invocation.started_s)?.toFixed(1) ?? "—"} s`,
      duration: `${numberValue(invocation.duration_ms)?.toFixed(0) ?? "—"} ms`,
      result: statusLabel(result),
      resultStatus: (result === "with_results"
        ? "success"
        : statusVariant(result)) as
        "error" | "warning" | "success" | "secondary",
      detectionSummary: detectionClasses
        ? `${detectionCount} (${detectionClasses})`
        : `${detectionCount}`,
      error: [errorCode, errorMessage].filter(Boolean).join(": ") || "—",
    };
  });
  const invocationColumns: DataTableColumnDef<
    (typeof invocationRows)[number]
  >[] = [
    {
      id: "Invocation ID",
      accessorKey: "id",
      header: "Invocation ID",
      cell: ({ row }) => (
        <span className="block max-w-40 truncate" title={row.original.id}>
          {row.original.id}
        </span>
      ),
    },
    {
      id: "Image",
      accessorKey: "input",
      header: "Image",
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-2">
          {row.original.inputPreview ? (
            <img
              src={row.original.inputPreview}
              alt=""
              aria-hidden="true"
              className="aspect-video h-8 shrink-0 rounded-(--radius) border border-border object-cover"
            />
          ) : (
            <span className="flex aspect-square h-8 shrink-0 items-center justify-center rounded-(--radius) border border-border bg-muted text-muted-foreground">
              <FileIcon aria-hidden="true" />
            </span>
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <span
              className="truncate font-medium text-foreground"
              title={row.original.inputName}
            >
              {row.original.inputName}
            </span>
          </span>
        </div>
      ),
    },
    {
      id: "Path",
      accessorKey: "inputPathDisplay",
      header: "Path",
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex min-w-0 flex-1 text-muted-foreground"
            title={row.original.inputPath || row.original.inputId}
          >
            {row.original.inputPathDisplay.startsWith("~/SkyTrack/") ? (
              <>
                <span className="shrink-0">~/SkyTrack/</span>
                <span className="min-w-0 truncate text-right" dir="rtl">
                  {row.original.inputPathDisplay.slice("~/SkyTrack/".length)}
                </span>
              </>
            ) : (
              <span className="min-w-0 truncate">
                {row.original.inputPathDisplay}
              </span>
            )}
          </span>
          {row.original.inputPath ? (
            <>
              <CopyInputPath path={row.original.inputPath} />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={`Open ${row.original.inputName} in Media & Files`}
                title="Open in Media & Files"
                onClick={() => onOpenMedia(row.original.inputId)}
              >
                <FolderOpenIcon aria-hidden="true" />
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
    {
      id: "Start",
      accessorKey: "time",
      header: "Start",
      meta: { align: "right" },
    },
    {
      id: "Duration",
      accessorKey: "duration",
      header: "Duration",
      meta: { align: "right" },
    },
    {
      id: "Result",
      accessorKey: "result",
      header: "Result",
      cell: ({ row }) => (
        <Badge
          className="rounded-(--radius) whitespace-nowrap uppercase"
          count={row.original.result}
          status={row.original.resultStatus}
        />
      ),
    },
    {
      id: "Detections",
      accessorKey: "detectionSummary",
      header: "Detections",
      meta: { align: "right" },
    },
    {
      id: "Error",
      accessorKey: "error",
      header: "Error",
      cell: ({ row }) => (
        <span className="block max-w-48 truncate" title={row.original.error}>
          {row.original.error}
        </span>
      ),
    },
  ];
  const modelActions = sampleActions(report);
  const executionLocation = (model: JsonRecord) => {
    const runsOn = textValue(model.runs_on, "");
    if (runsOn === "mission_computer") return "Mission Computer";
    if (runsOn === "local")
      return textValue(asRecord(report.run).environment) === "simulation"
        ? "This computer (simulation)"
        : "This computer";
    return "Not supplied";
  };
  type InventoryRow = (typeof models)[number] & {
    invoked: number;
    withResults: number;
    zeroResults: number;
    failed: number;
    invocationSummary: string;
    detectionCount: number;
    durationSummary: string;
    runsOn: string;
  };
  const inventoryRows: InventoryRow[] = models.map((model) => {
    const invoked = numberValue(model.calls.total) ?? 0;
    const withResults = numberValue(model.calls.with_results) ?? 0;
    const zeroResults = numberValue(model.calls.zero_results) ?? 0;
    const failed = numberValue(model.calls.failed) ?? 0;
    return {
      ...model,
      invoked,
      withResults,
      zeroResults,
      failed,
      invocationSummary: `${withResults} with results · ${zeroResults} zero · ${failed} failed`,
      detectionCount: numberValue(model.detections) ?? 0,
      durationSummary:
        model.mean_duration_ms === undefined
          ? "—"
          : `${numberValue(model.mean_duration_ms)} / ${numberValue(
              model.p95_duration_ms,
            )} ms`,
      runsOn: executionLocation(model),
    };
  });
  const inventoryColumns: DataTableColumnDef<InventoryRow>[] = [
    {
      id: "Model",
      accessorKey: "name",
      header: "Model",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.name}</span>
      ),
    },
    {
      id: "AI model version",
      accessorKey: "version",
      header: "Version",
      cell: ({ row }) => textValue(row.original.version, "—"),
    },
    { id: "Runs on", accessorKey: "runsOn", header: "Runs on" },
    {
      id: "Calls",
      accessorKey: "invoked",
      header: "Calls",
      meta: { align: "right" },
    },
    {
      id: "Invocations",
      accessorKey: "invocationSummary",
      header: "Invocations",
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="min-w-0 tabular-nums shrink-0">
            {row.original.invocationSummary}
          </span>
          {row.original.invoked ? (
            <span className="w-full">
              <Meter
                value={row.original.withResults}
                max={row.original.invoked}
                aria-label="Calls with results"
              >
                <MeterTrack>
                  <MeterIndicator />
                </MeterTrack>
              </Meter>
            </span>
          ) : null}
          {!row.original.invoked ? (
            <Badge
              className="shrink-0 rounded-(--radius)"
              count="Not invoked"
              status="outline"
            />
          ) : null}
        </div>
      ),
    },
    {
      id: "Detections",
      accessorKey: "detectionCount",
      header: "Detections",
      meta: { align: "right" },
    },
    {
      id: "Mean / p95 duration",
      accessorKey: "durationSummary",
      header: "Mean / p95 duration",
      meta: { align: "right" },
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <DetailSection title="Model activity">
        {executionSource.kind === "mission_computer" ? (
          <p className="m-0 text-muted-foreground">
            Execution source:{" "}
            {textValue(executionSource.label, "Mission Computer")}
          </p>
        ) : null}
        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-0">
          <div className="xl:pr-6">
            <CategoryChart
              title="Invocations by result"
              rows={resultRows}
              unit="Invocations"
            />
          </div>
          <div className="xl:border-l xl:border-border xl:pl-6">
            <CategoryChart
              title="Detections by class"
              rows={classRows}
              unit="Detections"
            />
          </div>
        </div>
      </DetailSection>
      <DetailSection
        title="Model inventory"
        toolbar={
          <Badge
            className="rounded-(--radius)"
            count={`${models.length} configured`}
            status="secondary"
          />
        }
      >
        <DataTable
          columns={inventoryColumns}
          data={inventoryRows}
          getRowId={(model) => model.id}
          getRowCanExpand={() => true}
          renderSearch={() => null}
          renderColumnVisibility={() => null}
          renderPagination={() => null}
          emptyMessage="No model records are available for this run."
          tableContainerClassName="overflow-x-hidden [&>table]:!w-full [&>table]:table-fixed [&>table>thead>tr>th]:!whitespace-normal [&>table>tbody>tr>td]:!whitespace-normal [&>table>thead>tr>th:nth-child(2)]:w-[16%] [&>table>thead>tr>th:nth-child(3)]:w-[7%] [&>table>thead>tr>th:nth-child(4)]:w-[11%] [&>table>thead>tr>th:nth-child(5)]:w-[5%] [&>table>thead>tr>th:nth-child(6)]:w-[34%] [&>table>thead>tr>th:nth-child(7)]:w-[9%] [&>table>thead>tr>th:nth-child(8)]:w-[14%]"
          className="min-w-0"
          renderExpandedRow={({ row }) => {
            const model = row.original;
            const invocations = asRecords(report.invocations).filter(
              (item) => item.model_id === model.id,
            );
            const action = modelActions.find(
              (item) => textValue(asRecord(item.inputs).model_id) === model.id,
            );
            return (
              <div className="flex min-w-0 flex-col gap-4">
                <KeyValueList
                  rows={[
                    ["Model ID", <code key="id">{model.id}</code>],
                    ["Task", textValue(model.task)],
                    [
                      "Classes",
                      textValue(
                        Array.isArray(model.classes)
                          ? model.classes.join(", ")
                          : undefined,
                        "Not supplied",
                      ),
                    ],
                    ["Producer", textValue(model.producer_type)],
                    ["Execution location", executionLocation(model)],
                    [
                      "Inputs processed",
                      `${numberValue(model.inputs_processed) ?? 0}`,
                    ],
                    ["Detections", `${numberValue(model.detections) ?? 0}`],
                    [
                      "Mean · p95 duration",
                      model.mean_duration_ms === undefined
                        ? "—"
                        : `${numberValue(
                            model.mean_duration_ms,
                          )} ms · ${numberValue(model.p95_duration_ms)} ms`,
                    ],
                    [
                      "SHA-256",
                      <code key="sha">{textValue(model.sha256)}</code>,
                    ],
                  ]}
                />
                {action ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate("timeline")}
                    >
                      View “{textValue(action.name, textValue(action.type))}” in
                      Timeline
                    </Button>
                  </div>
                ) : null}
                <div className="flex min-w-0 items-center gap-3">
                  <div className="m-0 text-sm font-medium text-foreground">
                    Invocations
                  </div>
                  <Separator className="min-w-0 flex-1" />
                </div>
                <DataTable
                  columns={invocationColumns}
                  data={invocations
                    .map((item) =>
                      invocationRows.find(
                        (row) => row.id === item.invocation_id,
                      ),
                    )
                    .filter((row): row is (typeof invocationRows)[number] =>
                      Boolean(row),
                    )}
                  getRowId={(row) => row.id}
                  pageSize={8}
                  searchPlaceholder={`Search ${model.name} invocations`}
                  emptyMessage="No invocations are recorded for this model."
                  renderSearch={() => null}
                  renderColumnVisibility={() => null}
                  renderPagination={() => null}
                  className="min-w-0 [&>div:first-child>table]:!w-full [&>div:first-child>table]:table-fixed [&>div:first-child>table_th]:!whitespace-normal [&>div:first-child>table_td]:!whitespace-normal [&>div:first-child>table_th:nth-child(1)]:w-[12%] [&>div:first-child>table_th:nth-child(2)]:w-[22%] [&>div:first-child>table_th:nth-child(3)]:w-[22%] [&>div:first-child>table_th:nth-child(4)]:w-[7%] [&>div:first-child>table_th:nth-child(5)]:w-[7%] [&>div:first-child>table_th:nth-child(6)]:w-[11%] [&>div:first-child>table_th:nth-child(7)]:w-[11%] [&>div:first-child>table_th:nth-child(8)]:w-[8%]"
                />
                {model.invoked ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => onNavigate("media-files")}
                  >
                    View captures and detections in Media & Files
                  </Button>
                ) : (
                  <p className="m-0 text-muted-foreground">
                    No invocation output exists for this configured model.
                  </p>
                )}
              </div>
            );
          }}
        />
      </DetailSection>
    </div>
  );
}
