import okReport from "./sample-data/ok/report.json";
import failedReport from "./sample-data/fail/report.json";
import realReport from "./sample-data/real/report.json";
import okPlanSource from "./sample-data/ok/plan.json?raw";
import failedScriptSource from "./sample-data/fail/script.py?raw";
import realScriptSource from "./sample-data/real/script.py?raw";
import type { MissionInsightSample } from "./mission-insights-data";

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

function evidenceCompletenessCopy(sample: MissionInsightSample) {
  const { summary, detail } = sample.evidenceCompleteness;
  return detail ? `${summary} · ${detail}` : summary;
}

const demoRunIdentity: Record<string, { runId: string; startedAt: string }> = {
  "construction-progress": { runId: "demo_construction_20261112", startedAt: "2026-11-12T09:00:00+07:00" },
  "flood-impact": { runId: "demo_flood_20261111", startedAt: "2026-11-11T14:20:00+07:00" },
  "bridge-inspection": { runId: "demo_bridge_20261110", startedAt: "2026-11-10T10:40:00+07:00" },
  "erosion-survey": { runId: "demo_erosion_20261109", startedAt: "2026-11-09T08:30:00+07:00" },
  "interrupted-survey": { runId: "demo_interrupted_20261108", startedAt: "2026-11-08T16:15:00+07:00" },
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
  if (sample.demoCase) {
    const source = reports[sample.key];
    const identity = demoRunIdentity[sample.demoCase];
    return {
      ...source,
      report_id: `rpt_demo_${sample.demoCase}`,
      created_at: identity.startedAt,
      source: { kind: "demo_fixture", label: "SkyTrack Demo Fixture" },
      run: {
        ...asRecord(source.run),
        run_id: identity.runId,
        run_name: sample.runLabel,
        status: sample.status === "Failed" ? "failed" : "completed",
        started_at: identity.startedAt,
        duration_ms: Number.parseFloat(sample.duration) * 1000,
        local_folder: `sample://demo/${sample.demoCase}`,
      },
      scenario: { world_id: sample.world.toLowerCase().replaceAll(" ", "_") },
      mission_definition: {
        authoring_mode: "demo_fixture",
        definition_artifact_id: `demo_${sample.demoCase}_mission`,
        definition_file: { name: sample.missionLogicFile, uri: `sample://demo/${sample.missionLogicFile}`, local_path: "sample://demo/illustrative-only" },
      },
      vehicles: [{ vehicle_id: `demo_vehicle_${sample.demoCase}`, name: sample.vehicle, vehicle_type: "illustrative multirotor", payloads: [] }],
      diagnostics: { items: sample.issues.map((issue) => ({ severity: issue.severity.toLowerCase(), code: issue.code, message: issue.message, time_s: issue.time })) },
      waypoints: [],
      flight_path: {},
      demo_fixture: {
        illustrative_only: true,
        case: sample.demoCase,
        outcome: sample.outcome,
        evidence_completeness: evidenceCompletenessCopy(sample),
        source_files_are_reference_images: true,
      },
      executions: [],
      artifacts: [],
      invocations: [],
      ai_models: [],
    };
  }
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
  return sampleMedia(sample);
}

export function sampleWorldImage(sample: MissionInsightSample): string | null {
  if (sample.demoCase) return null;
  const folder = sampleFolder[sample.key];
  return imageAssets[`./sample-data/world/${folder}-top.jpg`] ?? null;
}

export function missionLogicSource(sample: MissionInsightSample): string {
  if (sample.demoCase) {
    return JSON.stringify({
      demo_fixture: true,
      scenario: sample.runLabel,
      mission: sample.missionLogicDescription,
      outcome: sample.outcome,
      evidence: evidenceCompletenessCopy(sample),
    }, null, 2);
  }
  if (sample.key === "simulation-succeeded") return okPlanSource;
  if (sample.key === "simulation-failed") return failedScriptSource;
  return realScriptSource;
}

export function missionLogicLanguage(sample: MissionInsightSample) {
  if (sample.demoCase) return "JSON";
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
