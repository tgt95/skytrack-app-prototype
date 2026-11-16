import {
  type JsonRecord,
  sampleActions,
  asRecord,
  asRecords,
  reportArtifacts,
  textValue,
  numberValue,
} from "./mission-insights-report-data";
import {
  formatValue,
  statusLabel,
  recordDuration,
} from "./mission-insights-report-shared.tsx";

export type ActionRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  start: string;
  duration: string;
  summary: string;
  artifactCount: number;
  action: JsonRecord;
};

export function actionRows(report: JsonRecord): ActionRow[] {
  const artifacts = reportArtifacts(report);
  const models = asRecords(report.ai_models);

  function inputSummary(key: string, value: unknown): string {
    const model =
      key === "model_id"
        ? models.find((candidate) => candidate.model_id === value)
        : undefined;
    if (key === "model_id") {
      return `Model ${textValue(model?.name, formatValue(value))}`;
    }
    if (key === "target_altitude_m") {
      return `Target altitude ${numberValue(value)?.toFixed(1) ?? formatValue(value)} m`;
    }
    if (key === "speed_mps") {
      return `Speed ${numberValue(value)?.toFixed(1) ?? formatValue(value)} m/s`;
    }
    if (key === "interval_s") {
      return `Interval ${numberValue(value)?.toFixed(1) ?? formatValue(value)} s`;
    }
    if (key === "waypoints") return `Waypoints ${formatValue(value)}`;
    return `${key.replaceAll("_", " ")} ${formatValue(value)}`;
  }

  return sampleActions(report).map((action) => {
    const inputs = asRecord(action.inputs);
    const outputs = asRecord(action.outputs);
    const inputSummaries = Object.entries(inputs)
      .filter(([key]) => key !== "x_m" && key !== "y_m")
      .map(([key, value]) => inputSummary(key, value));
    const targetPosition = ["x_m", "y_m"]
      .filter((key) => numberValue(inputs[key]) !== null)
      .map((key) => `${key[0]}: ${numberValue(inputs[key])} m`);
    if (targetPosition.length) {
      inputSummaries.push(`Target ${targetPosition.join(", ")}`);
    }
    const outputSummary = Object.entries(outputs).flatMap(([key, value]) => {
      const artifactId = typeof value === "string" ? value : "";
      const artifact = artifacts.find(
        (item) => item.artifact_id === artifactId,
      );
      if (!artifact) return [];
      const artifactMetadata = asRecord(artifact.metadata);
      const fileMetadata = asRecord(artifactMetadata.file);
      const outputFileName = textValue(
        fileMetadata.name,
        textValue(artifact.uri, "").split("/").at(-1) ?? "",
      );
      if (!outputFileName) return [];
      if (key === "video_artifact_id") return [`Video ${outputFileName}`];
      if (key === "map_artifact_id") return [`Map ${outputFileName}`];
      return [outputFileName];
    });
    const error = asRecord(action.error);
    const actionId = textValue(action.action_id);
    const artifactCount = artifacts.filter(
      (artifact) =>
        textValue(asRecord(artifact.context).action_id) === actionId,
    ).length;
    return {
      id: textValue(action.action_id),
      name: textValue(action.name),
      type: textValue(action.type),
      status: statusLabel(action.status),
      start:
        numberValue(action.t0_s) === null
          ? "—"
          : `${numberValue(action.t0_s)!.toFixed(1)} s`,
      duration: recordDuration(action),
      summary:
        [...inputSummaries, ...outputSummary, textValue(error.code, "")]
          .filter(Boolean)
          .join(" · ") || "No input or output summary is recorded.",
      artifactCount,
      action,
    };
  });
}

export type TimelineEventRow = {
  id: string;
  sequence: number;
  time: number;
  timeLabel: string;
  type: string;
  component: string;
  status: "secondary" | "success" | "warning" | "error";
};

export type TimelineEventSampleKey =
  "simulation-succeeded" | "simulation-failed" | "real-succeeded";

type EventSample = Omit<TimelineEventRow, "id" | "timeLabel">;

// These are the exact preview rows embedded in the selected source prototype.
// The full events.jsonl stream is not included in the report fixtures.
const eventSamples: Record<TimelineEventSampleKey, EventSample[]> = {
  "simulation-succeeded": [
    {
      sequence: 1,
      time: 0,
      type: "run.started",
      component: "mission-runtime",
      status: "secondary",
    },
    {
      sequence: 12,
      time: 0.1,
      type: "action.started navigation.takeoff",
      component: "mission-runtime",
      status: "secondary",
    },
    {
      sequence: 211,
      time: 8.4,
      type: "action.completed navigation.takeoff",
      component: "mission-runtime",
      status: "success",
    },
    {
      sequence: 260,
      time: 10.2,
      type: "capture.image.saved",
      component: "camera-recorder",
      status: "success",
    },
    {
      sequence: 268,
      time: 10.6,
      type: "model.invocation.completed",
      component: "stress_detector",
      status: "success",
    },
    {
      sequence: 640,
      time: 41.3,
      type: "diagnostic.warning POSITIONING_REF_STALE",
      component: "positioning",
      status: "warning",
    },
    {
      sequence: 1190,
      time: 88,
      type: "action.started navigation.land",
      component: "mission-runtime",
      status: "secondary",
    },
    {
      sequence: 1248,
      time: 97.1,
      type: "run.completed",
      component: "mission-runtime",
      status: "success",
    },
  ],
  "simulation-failed": [
    {
      sequence: 1,
      time: 0,
      type: "run.started",
      component: "mission-runtime",
      status: "secondary",
    },
    {
      sequence: 410,
      time: 47,
      type: "diagnostic.warning VIDEO_TRUNCATED",
      component: "camera-recorder",
      status: "warning",
    },
    {
      sequence: 455,
      time: 49,
      type: "diagnostic.warning ARTIFACT_NOT_WRITTEN",
      component: "camera-recorder",
      status: "warning",
    },
    {
      sequence: 512,
      time: 58.2,
      type: "model.invocation.failed",
      component: "person_detector",
      status: "error",
    },
    {
      sequence: 716,
      time: 68.2,
      type: "action.started navigation.goto",
      component: "mission-runtime",
      status: "secondary",
    },
    {
      sequence: 977,
      time: 78.2,
      type: "run.failed ACTION_TIMEOUT",
      component: "mission-runtime",
      status: "error",
    },
  ],
  "real-succeeded": [
    {
      sequence: 1,
      time: 0,
      type: "run.started",
      component: "mission-computer",
      status: "secondary",
    },
    {
      sequence: 802,
      time: 44.2,
      type: "model.invocation.completed",
      component: "person_detector",
      status: "success",
    },
    {
      sequence: 1630,
      time: 128.6,
      type: "model.invocation.completed",
      component: "person_detector",
      status: "success",
    },
    {
      sequence: 2210,
      time: 164,
      type: "run.completed",
      component: "mission-computer",
      status: "success",
    },
  ],
};

export type SequenceGapSample = {
  id: string;
  from: number;
  to: number;
  missing: number;
  time: number;
  type: "Sequence gap";
  component: "event-bridge";
};

export function eventRows(
  sampleKey: TimelineEventSampleKey,
): TimelineEventRow[] {
  return eventSamples[sampleKey].map((event) => ({
    ...event,
    id: `${sampleKey}-${event.sequence}`,
    timeLabel: `${event.time.toFixed(1)} s`,
  }));
}

export function sequenceGapRows(
  report: JsonRecord,
  sampleKey: TimelineEventSampleKey,
): SequenceGapSample[] {
  if (sampleKey !== "simulation-failed") return [];

  const stream = asRecords(report.event_streams)[0] ?? {};
  return asRecords(stream.sequence_gaps).flatMap((gap, index) => {
    const from = numberValue(gap.from);
    const to = numberValue(gap.to);
    const missing = numberValue(gap.missing);
    if (from === null || to === null || missing === null) return [];

    return [
      {
        id: `sequence-gap-${index}`,
        from,
        to,
        missing,
        time: 61,
        type: "Sequence gap" as const,
        component: "event-bridge" as const,
      },
    ];
  });
}
