import type { ReactNode } from "react";
import {
  PackageIcon,
  CameraIcon,
  CaretRightIcon,
  FileImageIcon,
  FileVideoIcon,
  FolderSimpleIcon,
  ScanIcon,
} from "@phosphor-icons/react";
import { Separator } from "skytrack-ui/separator";
import type { InsightMedia, JsonRecord } from "./mission-insights-report-data";
import {
  asRecord,
  asRecords,
  modelForId,
  numberValue,
  sampleActions,
  textValue,
} from "./mission-insights-report-data";
import {
  copyableArtifactPath,
  displayLocalPath,
} from "./mission-insights-report-media-path";
import { MediaPathActions } from "./mission-insights-report-media-path-actions";
import { capturePoseSummary } from "./mission-insights-report-flight-path";
import type { MissionInsightsReportTab } from "@/features/studio/mission-report-url";

export type MetadataRow = readonly [label: string, value: ReactNode];

export function MetadataSection({
  title,
  rows,
  labelWidth = "default",
}: {
  title: string;
  rows: readonly MetadataRow[];
  labelWidth?: "default" | "compact";
}) {
  return (
    <section className="flex min-w-0 flex-col" aria-label={title}>
      <h3 className="m-0 pb-2 text-base font-medium text-foreground">
        {title}
      </h3>
      <dl className="m-0 grid min-w-0 grid-cols-1">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className={`grid min-w-0 gap-3 border-b border-border/70 py-2.5 last:border-b-0 ${
              labelWidth === "compact"
                ? "grid-cols-[minmax(6rem,0.45fr)_minmax(0,1.55fr)] sm:grid-cols-[minmax(7rem,0.45fr)_minmax(0,1.55fr)]"
                : "grid-cols-[minmax(6.5rem,0.8fr)_minmax(0,1.2fr)] sm:grid-cols-[minmax(8rem,0.85fr)_minmax(0,1.15fr)]"
            }`}
          >
            <dt className="min-w-0 text-sm text-muted-foreground">{label}</dt>
            <dd className="m-0 min-w-0 break-words text-sm text-foreground">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function MediaMetadataPanel({
  selected,
  report,
  detectionObjects,
  failedInvocation,
  onNavigate,
}: {
  selected: InsightMedia;
  report: JsonRecord;
  detectionObjects: JsonRecord[];
  failedInvocation: boolean;
  onNavigate: (tab: MissionInsightsReportTab) => void;
}) {
  const metadata = asRecord(selected.artifact.metadata);
  const file = asRecord(metadata.file);
  const video = selected.kind === "video";
  const localPath = selected.syntheticPreview
    ? ""
    : displayLocalPath(selected.artifact);
  const supplied = (key: string) => textValue(file[key], "Not supplied");
  const FileIcon = video ? FileVideoIcon : FileImageIcon;
  const actions = sampleActions(report);
  const selectedActionId = textValue(
    asRecord(selected.artifact.context).action_id,
    "",
  );
  const detectionActionId = textValue(
    asRecord(selected.detection?.context).action_id,
    "",
  );
  const videoStart = numberValue(metadata.start_time_s);
  const videoEnd =
    videoStart === null || selected.durationSeconds === null
      ? null
      : videoStart + selected.durationSeconds;
  const producingActions = new Map<string, JsonRecord>();
  const directAction = actions.find(
    (action) => action.action_id === selectedActionId,
  );
  const detectionAction = actions.find(
    (action) => action.action_id === detectionActionId,
  );
  if (directAction) producingActions.set(selectedActionId, directAction);
  if (detectionAction) producingActions.set(detectionActionId, detectionAction);
  if (
    video &&
    selected.detectionEventsDuringRecording > 0 &&
    videoStart !== null &&
    videoEnd !== null
  ) {
    actions.forEach((action) => {
      if (
        action.type !== "capture.image" &&
        action.type !== "perception.detect"
      )
        return;
      const actionStart = numberValue(action.t0_s);
      const actionEnd = numberValue(action.t1_s);
      if (
        actionStart !== null &&
        actionEnd !== null &&
        actionStart <= videoEnd &&
        actionEnd >= videoStart
      ) {
        producingActions.set(textValue(action.action_id), action);
      }
    });
  }
  const detectionInvocations = asRecords(report.invocations).filter(
    (invocation) => {
      if (invocation.result !== "with_results") return false;
      const invocationTime = numberValue(invocation.started_s);
      if (video) {
        return (
          invocationTime !== null &&
          videoStart !== null &&
          videoEnd !== null &&
          invocationTime >= videoStart &&
          invocationTime <= videoEnd
        );
      }
      return (
        textValue(invocation.output_artifact_id, "") ===
        textValue(selected.detection?.artifact_id, "")
      );
    },
  );
  const modelIds = new Set(
    detectionInvocations.map((invocation) =>
      textValue(invocation.model_id, ""),
    ),
  );
  const producingModels = [...modelIds]
    .map((modelId) => modelForId(report, modelId))
    .filter((model): model is JsonRecord => Boolean(model));
  const modelSoftware = asRecord(
    asRecord(selected.detection?.created_by).software,
  );
  if (producingModels.length === 0 && modelSoftware.name) {
    producingModels.push(modelSoftware);
  }
  const captureActions = [...producingActions.values()].filter((action) =>
    textValue(action.type).startsWith("capture."),
  );
  const analysisActions = [...producingActions.values()].filter((action) =>
    textValue(action.type).startsWith("perception."),
  );
  const informationRows: MetadataRow[] = [
    [
      "Location",
      <span className="flex min-w-0 items-center gap-2">
        <FolderSimpleIcon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <code
          className="min-w-0 flex-1 truncate"
          title={selected.syntheticPreview ? "Generated preview" : localPath}
        >
          {selected.syntheticPreview ? "Generated preview" : localPath}
        </code>
        {!selected.syntheticPreview ? (
          <MediaPathActions
            value={localPath}
            copyValue={copyableArtifactPath(selected.artifact)}
          />
        ) : null}
      </span>,
    ],
    [
      "Format",
      <span className="inline-flex items-center gap-2">
        <FileIcon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        {selected.syntheticPreview
          ? "JPEG image"
          : textValue(
              file.kind,
              selected.kind === "image" ? "JPEG image" : "Video",
            )}
      </span>,
    ],
    [
      "File size",
      selected.syntheticPreview
        ? "Not supplied"
        : `${selected.sizeBytes?.toLocaleString() ?? "—"} B`,
    ],
    [
      "Dimensions",
      selected.syntheticPreview
        ? "Not supplied"
        : `${selected.width ?? "—"} × ${selected.height ?? "—"}`,
    ],
    [
      "Created",
      selected.syntheticPreview
        ? "Not supplied"
        : textValue(
            file.created,
            textValue(selected.artifact.created_at, "Not supplied"),
          ),
    ],
    [
      "Modified",
      selected.syntheticPreview ? "Not supplied" : supplied("modified"),
    ],
    [
      "Content created",
      selected.syntheticPreview ? "Not supplied" : supplied("content_created"),
    ],
    ...(video
      ? [
          [
            "Duration",
            selected.durationSeconds === null
              ? "Not supplied"
              : `${selected.durationSeconds.toFixed(1)} s`,
          ] as const,
          ["Codec", supplied("codec")] as const,
        ]
      : [
          [
            "Capture time",
            selected.captureTime === null
              ? "Not recorded"
              : `${selected.captureTime.toFixed(1)} s`,
          ] as const,
          ["Color space", supplied("color_space")] as const,
          ["Color profile", supplied("color_profile")] as const,
          ["Longitude", supplied("longitude_deg")] as const,
          ["Latitude", supplied("latitude_deg")] as const,
        ]),
  ];

  const productionRows: MetadataRow[] = [
    [
      "Device make",
      selected.syntheticPreview ? "Not supplied" : supplied("device_make"),
    ],
    [
      "Device model",
      selected.syntheticPreview ? "Not supplied" : supplied("device_model"),
    ],
    [
      "Content creator",
      selected.syntheticPreview ? "Not supplied" : supplied("content_creator"),
    ],
  ];

  const artifactRows: MetadataRow[] = [
    [
      selected.syntheticPreview ? "Preview ID" : "Artifact ID",
      <code key="id">{selected.id}</code>,
    ],
    [
      "Role · media type",
      `${textValue(selected.artifact.role)} · ${textValue(
        selected.artifact.media_type,
      )}`,
    ],
    [
      "SHA-256",
      <code key="sha">
        {selected.syntheticPreview
          ? "Not supplied"
          : textValue(selected.artifact.sha256)}
      </code>,
    ],
    [
      selected.syntheticPreview
        ? "Capture pose"
        : "Capture pose · local position",
      selected.syntheticPreview
        ? "Not supplied"
        : capturePoseSummary(selected.artifact),
    ],
    [
      "Related detection artifact",
      selected.detection ? (
        <code key="det">{textValue(selected.detection.artifact_id)}</code>
      ) : (
        "—"
      ),
    ],
    [
      "Derived from",
      selected.syntheticPreview
        ? "Generated contact-sheet preview · not a camera capture"
        : Array.isArray(selected.artifact.derived_from) &&
            selected.artifact.derived_from.length
          ? selected.artifact.derived_from
              .map((item) => String(item))
              .join(", ")
          : "Camera capture",
    ],
  ];

  const provenanceRows: MetadataRow[] = [
    [
      "Source",
      captureActions.length ? (
        <span className="flex min-w-0 items-center gap-2">
          <CameraIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <button
            type="button"
            className="flex min-w-0 cursor-pointer items-center gap-1 text-left text-foreground transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onNavigate("timeline")}
          >
            {captureActions
              .map((action) => textValue(action.name, "Capture"))
              .join(" · ")}
          </button>
          <CaretRightIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </span>
      ) : (
        "Source details unavailable"
      ),
    ],
    [
      "Analysis",
      analysisActions.length ? (
        <span className="flex min-w-0 items-center gap-2">
          <ScanIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <button
            type="button"
            className="flex min-w-0 cursor-pointer items-center gap-1 text-left text-foreground transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onNavigate("timeline")}
          >
            {analysisActions
              .map((action) => textValue(action.name, "Detection action"))
              .join(" · ")}
          </button>
          <CaretRightIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </span>
      ) : (
        "Not recorded"
      ),
    ],
    [
      "Model",
      producingModels.length ? (
        <span className="flex min-w-0 items-center gap-2">
          <PackageIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <button
            type="button"
            className="flex min-w-0 cursor-pointer items-center gap-1 text-left text-foreground transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onNavigate("ai-models")}
          >
            {producingModels
              .map((model) =>
                [
                  textValue(model.name, "AI model"),
                  textValue(model.version, ""),
                ]
                  .filter(Boolean)
                  .join(" "),
              )
              .join(" · ")}
          </button>
          <CaretRightIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </span>
      ) : (
        "Not recorded"
      ),
    ],
    ...(detectionObjects.length
      ? [
          [
            "Detections",
            <div className="flex min-w-0 flex-col gap-1">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm text-muted-foreground">
                <span>Class</span>
                <span>Confidence</span>
              </div>
              {detectionObjects.map((item, index) => (
                <div
                  key={`${item.class}-${index}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-3"
                >
                  <span className="min-w-0 break-words">
                    {textValue(item.class)}
                  </span>
                  <span className="tabular-nums">
                    {numberValue(item.confidence)?.toFixed(2) ?? "—"}
                  </span>
                </div>
              ))}
            </div>,
          ] as const,
        ]
      : selected.kind === "video" && selected.detectionEventsDuringRecording > 0
        ? [
            [
              "Detections",
              `${selected.detectionEventsDuringRecording} events · ${selected.detectedAreasDuringRecording} areas found during recording`,
            ] as const,
          ]
        : failedInvocation
          ? [
              [
                "Detections",
                "No successful detection result for this capture.",
              ] as const,
            ]
          : []),
  ];

  return (
    // flex min-w-0 flex-col gap-4
    <div className="grid grid-cols-1 min-w-0 gap-4">
      {!selected.syntheticPreview ? (
        <>
          <MetadataSection
            title="Provenance"
            rows={provenanceRows}
            labelWidth="compact"
          />
          <Separator />
        </>
      ) : null}
      <MetadataSection
        title="Information"
        rows={informationRows}
        labelWidth="compact"
      />
      <Separator />
      <MetadataSection
        title={
          selected.syntheticPreview ? "Preview provenance" : "Source details"
        }
        rows={productionRows}
        labelWidth="compact"
      />
      <Separator />
      <MetadataSection
        title="Artifact details"
        rows={artifactRows}
        labelWidth="compact"
      />
    </div>
  );
}
