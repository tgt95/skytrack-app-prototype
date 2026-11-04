import okReport from "./sample-data/ok/report.json";
import failedReport from "./sample-data/fail/report.json";
import realReport from "./sample-data/real/report.json";
import okPlanSource from "./sample-data/ok/plan.json?raw";
import failedScriptSource from "./sample-data/fail/script.py?raw";
import realScriptSource from "./sample-data/real/script.py?raw";
import type { MissionInsightSample } from "./mission-insights-data";
import {
  surveyImageFrames,
  surveyImageSet,
} from "./mission-insights-output-data";

export type JsonRecord = Record<string, unknown>;

export type InsightMedia = {
  artifact: JsonRecord;
  detection: JsonRecord | null;
  id: string;
  name: string;
  kind: "image" | "video";
  actionName: string;
  availability: string;
  captureTime: number | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  imageUrl: string | null;
  detectionCount: number;
  processingError: string;
  syntheticPreview?: boolean;
  previewFrameIndex?: number;
  previewAlt?: string;
};

const imageAssets = import.meta.glob("./sample-data/**/*.{jpg,png}", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

const reports: Record<MissionInsightSample["key"], JsonRecord> = {
  "simulation-succeeded": okReport as unknown as JsonRecord,
  "simulation-failed": failedReport as unknown as JsonRecord,
  "real-succeeded": realReport as unknown as JsonRecord,
};

const sampleFolder: Record<MissionInsightSample["key"], string> = {
  "simulation-succeeded": "ok",
  "simulation-failed": "fail",
  "real-succeeded": "real",
};

export function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

export function asRecords(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

export function textValue(value: unknown, fallback = "—"): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function reportForSample(sample: MissionInsightSample): JsonRecord {
  return reports[sample.key];
}

export function reportArtifacts(report: JsonRecord): JsonRecord[] {
  return asRecords(report.artifacts);
}

export function sampleActions(report: JsonRecord): JsonRecord[] {
  return asRecords(report.executions).flatMap((execution) =>
    asRecords(asRecord(execution).actions),
  );
}

export function sampleMedia(sample: MissionInsightSample): InsightMedia[] {
  const report = reportForSample(sample);
  const artifacts = reportArtifacts(report);
  const actions = new Map(
    sampleActions(report).map((action) => [
      textValue(action.action_id),
      textValue(action.name),
    ]),
  );
  const detections = artifacts.filter(
    (artifact) => artifact.type === "detection_result",
  );

  return artifacts
    .filter(
      (artifact) => artifact.type === "image" || artifact.type === "video",
    )
    .map((artifact) => {
      const metadata = asRecord(artifact.metadata);
      const file = asRecord(metadata.file);
      const availability = asRecord(artifact.availability);
      const captureTime = numberValue(metadata.capture_time_s);
      const durationMs = numberValue(metadata.duration_ms);
      const detection =
        detections.find((item) =>
          (Array.isArray(item.derived_from) ? item.derived_from : []).some(
            (source) => source === artifact.artifact_id,
          ),
        ) ?? null;
      const detectionMetadata = detection ? asRecord(detection.metadata) : {};
      const name = textValue(file.name, textValue(metadata.name));
      const folder = sampleFolder[sample.key];
      const numberedCapture = name.match(/^(\d{6})\.(?:jpe?g|png)$/i);
      const normalizedCaptureName = numberedCapture
        ? `img_${numberedCapture[1].slice(-4)}.jpg`
        : name;
      const assetName =
        artifact.type === "video"
          ? "video_0001_poster.jpg"
          : normalizedCaptureName;
      const imageUrl =
        availability.state === "local"
          ? (imageAssets[`./sample-data/${folder}/${assetName}`] ?? null)
          : null;
      const context = asRecord(artifact.context);
      const failedInvocation = asRecords(report.invocations).find(
        (invocation) =>
          invocation.input_artifact_id === artifact.artifact_id &&
          invocation.result === "failed",
      );

      return {
        artifact,
        detection,
        id: textValue(artifact.artifact_id),
        name,
        kind: artifact.type as "image" | "video",
        actionName:
          actions.get(textValue(context.action_id, "")) ?? "Mission artifact",
        availability: textValue(availability.state, "unknown"),
        captureTime,
        durationSeconds: durationMs === null ? null : durationMs / 1000,
        width: numberValue(metadata.width_px),
        height: numberValue(metadata.height_px),
        sizeBytes: numberValue(artifact.size_bytes),
        imageUrl,
        detectionCount: numberValue(detectionMetadata.object_count) ?? 0,
        processingError: failedInvocation
          ? textValue(
              asRecord(failedInvocation.error).code,
              "Invocation failed",
            )
          : "",
      } satisfies InsightMedia;
    });
}

export function sampleGalleryMedia(
  sample: MissionInsightSample,
): InsightMedia[] {
  const surveyPreview = surveyImageSet.preview;
  if (sample.key !== "simulation-succeeded" || !surveyPreview) {
    return sampleMedia(sample);
  }

  return surveyImageFrames.map((frame) => {
    const id = `leeville-survey-preview-${String(frame.index + 1).padStart(2, "0")}`;

    return {
      artifact: {
        artifact_id: id,
        role: "synthetic_survey_preview",
        media_type: "image/jpeg",
        uri: `sample://leeville/${id}`,
        availability: { state: "local" },
        metadata: {
          file: { name: frame.name, kind: "Generated preview frame" },
        },
        created_by: { component: "Generated demo preview" },
      },
      detection: null,
      id,
      name: frame.name,
      kind: "image",
      actionName: "Leeville survey preview frames",
      availability: "local",
      captureTime: null,
      durationSeconds: null,
      width: null,
      height: null,
      sizeBytes: null,
      imageUrl: surveyPreview.src,
      detectionCount: 0,
      processingError: "",
      syntheticPreview: true,
      previewFrameIndex: frame.index,
      previewAlt: frame.alt,
    } satisfies InsightMedia;
  });
}

export function sampleWorldImage(sample: MissionInsightSample): string | null {
  const folder = sampleFolder[sample.key];
  return imageAssets[`./sample-data/world/${folder}-top.jpg`] ?? null;
}

export function missionLogicSource(sample: MissionInsightSample): string {
  if (sample.key === "simulation-succeeded") return okPlanSource;
  if (sample.key === "simulation-failed") return failedScriptSource;
  return realScriptSource;
}

export function missionLogicLanguage(sample: MissionInsightSample) {
  return sample.key === "simulation-succeeded" ? "JSON" : "Python";
}

export function missionLogicLineCount(sample: MissionInsightSample) {
  return missionLogicSource(sample)
    .replace(/\r?\n$/, "")
    .split(/\r?\n/).length;
}

export function safeArtifactLocation(artifact: JsonRecord): string {
  const uri = textValue(artifact.uri, "sample://artifact");
  return uri.startsWith("sample://") ? uri : `sample://${uri.split("/").pop()}`;
}

export function modelForId(report: JsonRecord, modelId: string) {
  return asRecords(report.ai_models).find(
    (model) => model.model_id === modelId,
  );
}

export function actionForId(report: JsonRecord, actionId: string) {
  return sampleActions(report).find((action) => action.action_id === actionId);
}
