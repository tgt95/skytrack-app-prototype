import {
  rescueLocationsFailed,
  rescueLocationsReal,
  searchImageSet,
  stressedAreaMap,
  surveyImageSet,
} from "./mission-insights-output-data";
import type { InsightOutput } from "./mission-insights-output-data";

export type MissionRunType = "Simulation" | "Real" | "HITL";
export type MissionRunStatus = "Succeeded" | "Failed";

export const MISSION_INSIGHTS_SAMPLE_DISCLOSURE =
  "Sample report values, the shared replay, and generated roof-image previews are illustrative prototype data, not linked to the selected row. They are not live telemetry, mission files, or verified roof conditions for this world.";

export type MissionReportRun = {
  id: string;
  project: string;
  type: MissionRunType;
  status: MissionRunStatus;
  startedAt: string;
  startedAtLabel: string;
  durationSeconds: number;
  reports: string[];
};

export function formatMissionRunLabel(
  run: Pick<MissionReportRun, "project" | "startedAt">,
) {
  const [date, timestamp] = run.startedAt.split("T");
  const [year, month, day] = date.split("-");
  return `${run.project} - ${timestamp}-${day}${month}${year.slice(-2)}`;
}

export type InsightSeverity = "Error" | "Warning" | "Info";

export type InsightIssue = {
  severity: InsightSeverity;
  code: string;
  message: string;
  time: number | null;
};

export type MissionInsightSample = {
  key: "simulation-succeeded" | "simulation-failed" | "real-succeeded";
  runLabel: string;
  type: Exclude<MissionRunType, "HITL">;
  status: MissionRunStatus;
  world: string;
  date: string;
  duration: string;
  vehicle: string;
  source: string;
  missionLogicFile: string;
  missionLogicDescription: string;
  outcomeTitle: string;
  outcome: string;
  evidenceCompleteness: string;
  evidenceAvailability: string;
  evidenceSignature: string;
  outputs: InsightOutput[];
  replayStats: ReadonlyArray<readonly [string, string]>;
  replayDescription: string;
  issuesSummary: string;
  issueTotal: number;
  issues: InsightIssue[];
  actions: ReadonlyArray<readonly [string, number]>;
  files: ReadonlyArray<readonly [string, number]>;
};

export const missionInsightSamples: Record<
  MissionInsightSample["key"],
  MissionInsightSample
> = {
  "simulation-succeeded": {
    key: "simulation-succeeded",
    runLabel: "Sim run - 09292026-144239",
    type: "Simulation",
    status: "Succeeded",
    world: "Leeville Pike roof assessment",
    date: "Sep 29, 2026 - 14:42",
    duration: "97.1 s",
    vehicle: "Mini-Pro",
    source: "SkyTrack Desktop",
    missionLogicFile: "plan.json",
    missionLogicDescription:
      "26 planned waypoints · 2 scan areas · return home enabled",
    outcomeTitle: "Illustrative mission completion",
    outcome:
      "Leeville Pike roof assessment · planned route covers 2 scan areas",
    evidenceCompleteness: "Demo only · 2 illustrative output previews",
    evidenceAvailability:
      "Prototype sample assets bundled locally · not mission-run files",
    evidenceSignature: "Not supplied · no verified run-artifact signature",
    outputs: [stressedAreaMap, surveyImageSet],
    replayStats: [
      ["Duration", "60.8 s"],
      ["Maximum altitude", "1.98 m"],
      ["Maximum speed", "2.12 m/s"],
      ["Distance flown", "20.4 m"],
      ["Obstacle encounters", "4"],
      ["Closest stop to obstacle", "0.59 m"],
      ["Replay-recorded warnings", "8"],
    ],
    replayDescription:
      "Shared prototype replay · 96 position samples · 44 airborne depth frames · 86 events",
    issuesSummary: "1 warning",
    issueTotal: 1,
    issues: [
      {
        severity: "Warning",
        code: "POSITIONING_REF_STALE",
        message: "GPS reference age 1.2 s exceeded the 1.0 s limit",
        time: 41.3,
      },
    ],
    actions: [
      ["Completed", 7],
      ["Partial", 0],
      ["Failed", 0],
      ["Not started", 0],
    ],
    files: [
      ["Image", 24],
      ["Video", 1],
      ["Detection result", 24],
      ["Telemetry", 1],
      ["Input", 4],
      ["Output", 1],
    ],
  },
  "simulation-failed": {
    key: "simulation-failed",
    runLabel: "Sim run - 10062026-152739",
    type: "Simulation",
    status: "Failed",
    world: "Grandfinale",
    date: "Oct 06, 2026 - 15:27",
    duration: "78.2 s",
    vehicle: "x500 · Mono camera",
    source: "SkyTrack Desktop",
    missionLogicFile: "script.py",
    missionLogicDescription: "31 lines · skytrack_autonomy 1.4.0",
    outcomeTitle: "Runtime error · Approach person 2 timed out at 78.2 s",
    outcome:
      "4 of 6 waypoints reached · no touchdown (last position 5.6, 5.1 m)",
    evidenceCompleteness:
      "Incomplete · 0 of 2 expected outputs complete · rescue locations 1 of 3 · search images 5 of 6",
    evidenceAvailability:
      "Partially available · 14 of 15 files on this computer · 1 file missing",
    evidenceSignature: "13 verified · 1 mismatch · 1 unavailable",
    outputs: [rescueLocationsFailed, searchImageSet],
    replayStats: [
      ["Duration", "60.8 s"],
      ["Maximum altitude", "1.98 m"],
      ["Maximum speed", "2.12 m/s"],
      ["Distance flown", "20.4 m"],
      ["Obstacle encounters", "4"],
      ["Closest stop to obstacle", "0.59 m"],
      ["Replay-recorded warnings", "8"],
    ],
    replayDescription:
      "Shared prototype replay · 96 position samples · 44 airborne depth frames · 86 events · 14 dropped events",
    issuesSummary:
      "2 errors · 3 warnings · 14 dropped events · top 3 of 5 shown",
    issueTotal: 5,
    issues: [
      {
        severity: "Error",
        code: "ACTION_TIMEOUT",
        message: "Action server did not respond within 10 s · person 2 unsaved",
        time: 78.2,
      },
      {
        severity: "Error",
        code: "MODEL_INVOCATION_FAILED",
        message:
          "yolo-person 2.1.0 · CUDA out of memory (requested 512 MiB) on image 6",
        time: 58.2,
      },
      {
        severity: "Warning",
        code: "ARTIFACT_NOT_WRITTEN",
        message: "Image 5 was not written (disk write error)",
        time: 49.0,
      },
    ],
    actions: [
      ["Completed", 3],
      ["Partial", 4],
      ["Failed", 1],
      ["Not started", 1],
    ],
    files: [
      ["Image", 6],
      ["Video", 1],
      ["Detection result", 2],
      ["Telemetry", 1],
      ["Input", 4],
      ["Output", 1],
    ],
  },
  "real-succeeded": {
    key: "real-succeeded",
    runLabel: "Flight - 10072026-091502",
    type: "Real",
    status: "Succeeded",
    world: "EVA floor",
    date: "Oct 07, 2026 - 09:15",
    duration: "164.0 s",
    vehicle: "SkyTrack MiniPro A8 · SIYI A8",
    source: "Mission Computer",
    missionLogicFile: "script.py",
    missionLogicDescription: "33 lines · skytrack_autonomy 1.4.0",
    outcomeTitle: "Mission completed",
    outcome: "All 10 waypoints reached · landed 0.04 m from pad",
    evidenceCompleteness:
      "Incomplete · rescue locations 2 of 3 · 0 of 1 expected outputs complete",
    evidenceAvailability:
      "Partially available · 10 of 13 files on this computer · 3 on the Mission Computer",
    evidenceSignature: "Declared (not checked) · 13 of 13 artifacts declared",
    outputs: [rescueLocationsReal],
    replayStats: [
      ["Duration", "60.8 s"],
      ["Maximum altitude", "1.98 m"],
      ["Maximum speed", "2.12 m/s"],
      ["Distance flown", "20.4 m"],
      ["Obstacle encounters", "4"],
      ["Closest stop to obstacle", "0.59 m"],
      ["Replay-recorded warnings", "8"],
    ],
    replayDescription:
      "Shared prototype replay · 96 position samples · 44 airborne depth frames · 86 events",
    issuesSummary: "1 warning · 3 files on the Mission Computer",
    issueTotal: 1,
    issues: [
      {
        severity: "Warning",
        code: "MEDIA_REMOTE_ONLY",
        message: "3 files remain on the Mission Computer (2 images, 1 video)",
        time: null,
      },
    ],
    actions: [
      ["Completed", 7],
      ["Partial", 0],
      ["Failed", 0],
      ["Not started", 0],
    ],
    files: [
      ["Image", 4],
      ["Video", 1],
      ["Detection result", 2],
      ["Telemetry", 1],
      ["Input", 4],
      ["Output", 1],
    ],
  },
};

export function sampleForRun(
  run: MissionReportRun,
): MissionInsightSample | null {
  if (run.type === "Simulation" && run.status === "Succeeded") {
    return missionInsightSamples["simulation-succeeded"];
  }
  if (run.type === "Simulation" && run.status === "Failed") {
    return missionInsightSamples["simulation-failed"];
  }
  if (run.type === "Real" && run.status === "Succeeded") {
    return missionInsightSamples["real-succeeded"];
  }
  return null;
}
