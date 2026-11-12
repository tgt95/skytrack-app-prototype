import { Button } from "skytrack-ui/button";
import { Separator } from "skytrack-ui/separator";
import type { InsightMedia, JsonRecord } from "./mission-insights-report-data";
import {
  asRecord,
  numberValue,
  safeArtifactLocation,
  textValue,
} from "./mission-insights-report-data";
import { capturePoseSummary } from "./mission-insights-report-flight-path";
import type { MissionInsightsReportTab } from "@/features/studio/mission-report-url";
import { KeyValueList } from "./mission-insights-report-shared";

export function MediaMetadataPanel({
  selected,
  detectionObjects,
  failedInvocation,
  selectedAction,
  onNavigate,
}: {
  selected: InsightMedia;
  detectionObjects: JsonRecord[];
  failedInvocation: boolean;
  selectedAction: boolean;
  onNavigate: (tab: MissionInsightsReportTab) => void;
}) {
  const file = asRecord(asRecord(selected.artifact.metadata).file);
  const video = selected.kind === "video";
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section
        className="flex min-w-0 flex-col gap-3"
        aria-labelledby="ms-media-information-title"
      >
        <h3
          id="ms-media-information-title"
          className="m-0 text-lg font-medium text-foreground"
        >
          Information
        </h3>
        <KeyValueList
          columns="sm:grid-cols-1"
          rows={[
            [
              "Kind · size",
              selected.syntheticPreview
                ? "Generated JPEG preview · size not supplied"
                : `${textValue(
                    asRecord(asRecord(selected.artifact.metadata).file).kind,
                    selected.kind === "image" ? "JPEG image" : "Video",
                  )} · ${selected.sizeBytes?.toLocaleString() ?? "—"} B`,
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
              selected.syntheticPreview
                ? "Not supplied"
                : textValue(file.modified, "Not supplied"),
            ],
            [
              "Content created",
              selected.syntheticPreview
                ? "Not supplied"
                : textValue(file.content_created, "Not supplied"),
            ],
            [
              "Dimensions",
              selected.syntheticPreview
                ? "Not supplied"
                : `${selected.width ?? "—"} × ${selected.height ?? "—"}`,
            ],
            ...(video
              ? [
                  [
                    "Duration",
                    selected.durationSeconds === null
                      ? "Not supplied"
                      : `${selected.durationSeconds.toFixed(1)} s`,
                  ] as const,
                  ["Codec", textValue(file.codec, "Not supplied")] as const,
                ]
              : [
                  [
                    "Capture time",
                    selected.captureTime === null
                      ? "Not recorded"
                      : `${selected.captureTime.toFixed(1)} s`,
                  ] as const,
                  [
                    "Color space",
                    textValue(file.color_space, "Not supplied"),
                  ] as const,
                  [
                    "Color profile",
                    textValue(file.color_profile, "Not supplied"),
                  ] as const,
                  [
                    "Longitude",
                    textValue(file.longitude_deg, "Not supplied"),
                  ] as const,
                  [
                    "Latitude",
                    textValue(file.latitude_deg, "Not supplied"),
                  ] as const,
                ]),
            ["Device make", textValue(file.device_make, "Not supplied")],
            ["Device model", textValue(file.device_model, "Not supplied")],
            [
              "Content creator",
              textValue(file.content_creator, "Not supplied"),
            ],
            [
              selected.syntheticPreview ? "Preview source" : "Path",
              selected.syntheticPreview ? (
                "Generated frame from the local Leeville contact sheet"
              ) : (
                <code key="path">
                  {safeArtifactLocation(selected.artifact)}
                </code>
              ),
            ],
          ]}
        />
      </section>
      <Separator />
      <section
        className="flex min-w-0 flex-col gap-3"
        aria-labelledby="ms-media-producer-title"
      >
        <h3
          id="ms-media-producer-title"
          className="m-0 text-lg font-medium text-foreground"
        >
          {selected.syntheticPreview
            ? "Preview provenance"
            : "Producer & detections"}
        </h3>
        <KeyValueList
          columns="sm:grid-cols-1"
          rows={[
            [
              selected.syntheticPreview ? "Source" : "Action",
              selected.syntheticPreview
                ? "Generated imagery"
                : selected.actionName,
            ],
            [
              "Producer",
              textValue(asRecord(selected.artifact.created_by).component),
            ],
            [
              "Detections",
              selected.syntheticPreview
                ? "Not supplied; no result is linked to this preview"
                : selected.detectionCount
                  ? `${selected.detectionCount} detections`
                  : failedInvocation
                    ? "No successful result for this capture"
                    : "No detection result recorded",
            ],
          ]}
        />
        {detectionObjects.length ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {detectionObjects.map((item, index) => (
              <li
                key={`${item.class}-${index}`}
                className="flex items-center justify-between gap-3"
              >
                <span>{textValue(item.class)}</span>
                <span className="tabular-nums">
                  {numberValue(item.confidence)?.toFixed(2) ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <Separator />
      <section
        className="flex min-w-0 flex-col gap-3"
        aria-labelledby="ms-media-artifact-title"
      >
        <h3
          id="ms-media-artifact-title"
          className="m-0 text-lg font-medium text-foreground"
        >
          Artifact details
        </h3>
        <KeyValueList
          columns="sm:grid-cols-1"
          rows={[
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
                <code key="det">
                  {textValue(selected.detection.artifact_id)}
                </code>
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
          ]}
        />
      </section>
      {selectedAction ? (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => onNavigate("timeline")}
        >
          View producing action in Timeline
        </Button>
      ) : null}
    </div>
  );
}
