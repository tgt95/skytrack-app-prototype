import {
  rescueLocationsFailed,
  rescueLocationsReal,
  searchImageSet,
  stressedAreaMap,
  surveyImageSet,
} from "./mission-insights-output-data";
import type { InsightOutput } from "./mission-insights-output-data";
import { demoMappedAreaOutputs } from "./mission-insights-output-data";

export type MissionRunType = "Simulation" | "Real" | "HITL";
export type MissionRunStatus = "Succeeded" | "Failed" | "Unknown";

export type MissionReportRun = {
  id: string;
  missionId?: string;
  runName: string;
  project: string;
  world: string;
  type: MissionRunType;
  status: MissionRunStatus;
  startedAt: string;
  startedAtLabel: string;
  durationSeconds: number;
  demoCase?: DemoMissionCase;
};

export type DemoMissionCase =
  | "construction-progress"
  | "flood-impact"
  | "bridge-inspection"
  | "erosion-survey"
  | "interrupted-survey";

export function formatMissionRunLabel(run: Pick<MissionReportRun, "runName">) {
  return run.runName;
}

export type InsightSeverity = "Error" | "Warning" | "Info";

export type InsightIssue = {
  severity: InsightSeverity;
  code: string;
  message: string;
  time: number | null;
};

type EvidenceCompleteness = {
  state: "complete" | "incomplete" | "partial" | "none";
  summary: string;
  detail?: string;
};

type EvidenceAvailability = {
  state: "available" | "partial" | "none";
  files: string;
  integrityState:
    "verified" | "issues" | "not_checked" | "not_provided" | "no_files";
  integrity: string;
};

export type MissionInsightSample = {
  key: "simulation-succeeded" | "simulation-failed" | "real-succeeded";
  missionId?: string;
  demoCase?: DemoMissionCase;
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
  evidenceCompleteness: EvidenceCompleteness;
  evidenceAvailability: EvidenceAvailability;
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
    world: "Angiang",
    date: "Sep 29, 2026 - 14:42",
    duration: "97.1 s",
    vehicle: "sim-drone-01",
    source: "SkyTrack Desktop",
    missionLogicFile: "plan.json",
    missionLogicDescription:
      "26 planned waypoints · 2 scan areas · return home enabled",
    outcomeTitle: "Mission completed",
    outcome: "All 8 waypoints reached · landed 0.04 m from pad",
    evidenceCompleteness: {
      state: "complete",
      summary: "2 of 2 required outputs produced",
      detail: "All required outputs were verified",
    },
    evidenceAvailability: {
      state: "available",
      files: "55 of 55 files are on this device",
      integrityState: "verified",
      integrity: "Manifest signature valid · 55 of 55 files verified",
    },
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
      "96 position samples · 44 airborne depth frames · 86 events",
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
    vehicle: "sim-drone-01",
    source: "SkyTrack Desktop",
    missionLogicFile: "script.py",
    missionLogicDescription: "31 lines · skytrack_autonomy 1.4.0",
    outcomeTitle: "Runtime error · Approach person 2 timed out at 78.2 s",
    outcome:
      "4 of 6 waypoints reached · no touchdown (last position 5.6, 5.1 m)",
    evidenceCompleteness: {
      state: "incomplete",
      summary: "Some required outputs are incomplete",
      detail: "1 of 3 locations saved · 5 of 6 images saved",
    },
    evidenceAvailability: {
      state: "partial",
      files: "14 of 15 files are on this device · 1 file missing",
      integrityState: "issues",
      integrity:
        "Manifest signature valid · 13 files match · 1 file is smaller than recorded · 1 file not found",
    },
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
      "96 position samples · 44 airborne depth frames · 86 events · 14 dropped events",
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
      {
        severity: "Warning",
        code: "VIDEO_TRUNCATED",
        message: "Video stopped at 41.0 s of 72.2 s",
        time: 47.0,
      },
      {
        severity: "Warning",
        code: "EVENTS_DROPPED",
        message: "14 events dropped (sequence 702–715)",
        time: 61.0,
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
    vehicle: "SkyTrack MiniPro A8",
    source: "Mission Computer",
    missionLogicFile: "script.py",
    missionLogicDescription: "33 lines · skytrack_autonomy 1.4.0",
    outcomeTitle: "Mission completed",
    outcome: "All 10 waypoints reached · landed 0.04 m from pad",
    evidenceCompleteness: {
      state: "incomplete",
      summary: "Required output is incomplete",
      detail: "2 of 3 locations saved",
    },
    evidenceAvailability: {
      state: "partial",
      files:
        "10 of 13 files are on this device · 3 remain on the Mission Computer",
      integrityState: "not_checked",
      integrity:
        "Manifest signature not checked · 13 files listed, not verified",
    },
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
      "96 position samples · 44 airborne depth frames · 86 events",
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
  if (run.missionId === "m-local-mwgqzezc-101") {
    return {
      ...missionInsightSamples["simulation-succeeded"],
      missionId: run.missionId,
      runLabel: run.runName,
      world: run.world,
      date: run.startedAtLabel,
      duration: `${run.durationSeconds.toFixed(1)} s`,
      vehicle: "Mini-Pro",
      source: "SkyTrack Mission Studio",
      missionLogicFile: "mission.json",
      missionLogicDescription: "Simulated from Leeville Pike Flight 2",
      outcomeTitle: "Mission completed",
      outcome: "All 26 waypoints reached · landed at pad",
      evidenceCompleteness: {
        state: "complete",
        summary: "11 of 11 planned photos captured",
        detail: "All captures rendered from the Leeville world",
      },
      evidenceAvailability: {
        state: "available",
        files: "11 of 11 images available on this device",
        integrityState: "not_provided",
        integrity: "Capture integrity not checked",
      },
      outputs: [],
      replayStats: [
        ["Duration", "79.8 s"],
        ["Maximum altitude", "12.0 m"],
        ["Maximum speed", "2.0 m/s"],
        ["Distance flown", "159.6 m"],
      ],
      replayDescription: "26 waypoints · 2 survey areas · 11 photo captures",
      issuesSummary: "No issues",
      issueTotal: 0,
      issues: [],
      actions: [
        ["Completed", 3],
        ["Partial", 0],
        ["Failed", 0],
        ["Not started", 0],
      ],
      files: [
        ["Image", 11],
        ["Video", 0],
        ["Detection result", 0],
        ["Telemetry", 0],
        ["Input", 0],
        ["Output", 0],
      ],
    };
  }
  if (run.demoCase) return demoMissionSamples[run.demoCase];
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

const demoMissionSamples: Record<DemoMissionCase, MissionInsightSample> = {
  "construction-progress": {
    key: "simulation-succeeded",
    demoCase: "construction-progress",
    runLabel: "Construction progress mapping",
    type: "Simulation",
    status: "Succeeded",
    world: "Construction site",
    date: "Nov 12, 2026 - 09:00",
    duration: "212.0 s",
    vehicle: "demo-drone-c1",
    source: "SkyTrack Mission Studio",
    missionLogicFile: "construction-survey.json",
    missionLogicDescription:
      "18 waypoints · 3 survey blocks · return home enabled",
    outcomeTitle: "Survey completed",
    outcome: "3 blocks captured · 12 mapped areas · 42 source images",
    evidenceCompleteness: {
      state: "complete",
      summary: "Required result is complete",
      detail: "12 mapped areas included",
    },
    evidenceAvailability: {
      state: "available",
      files: "42 of 42 files are on this device",
      integrityState: "not_provided",
      integrity: "File check data was not included",
    },
    outputs: [demoMappedAreaOutputs["construction-progress"]],
    replayStats: [
      ["Duration", "212.0 s"],
      ["Maximum altitude", "38.0 m"],
      ["Distance flown", "1.42 km"],
      ["Survey blocks", "3"],
      ["Mapped areas", "12"],
    ],
    replayDescription: "Construction survey · replay summary",
    issuesSummary: "No issues",
    issueTotal: 0,
    issues: [],
    actions: [
      ["Completed", 6],
      ["Partial", 0],
      ["Failed", 0],
      ["Not started", 0],
    ],
    files: [
      ["Image", 42],
      ["Video", 1],
      ["Telemetry", 1],
      ["Input", 2],
      ["Output", 1],
    ],
  },
  "flood-impact": {
    key: "simulation-succeeded",
    demoCase: "flood-impact",
    runLabel: "Flood impact survey",
    type: "Simulation",
    status: "Succeeded",
    world: "River basin",
    date: "Nov 11, 2026 - 14:20",
    duration: "186.0 s",
    vehicle: "demo-drone-f2",
    source: "SkyTrack Mission Studio",
    missionLogicFile: "flood-survey.json",
    missionLogicDescription:
      "15 waypoints · 2 banks surveyed · return home enabled",
    outcomeTitle: "Survey completed with gaps",
    outcome:
      "18 impact areas mapped from 40 planned images · 4 images unavailable",
    evidenceCompleteness: {
      state: "partial",
      summary: "Some results are incomplete",
      detail: "18 of 20 areas mapped · 36 of 40 images available",
    },
    evidenceAvailability: {
      state: "partial",
      files: "36 of 40 image files are available",
      integrityState: "not_provided",
      integrity: "File check data was not included",
    },
    outputs: [{ ...demoMappedAreaOutputs["flood-impact"], status: "Partial" }],
    replayStats: [
      ["Duration", "186.0 s"],
      ["Maximum altitude", "46.0 m"],
      ["Distance flown", "1.18 km"],
      ["Mapped areas", "18 of 20"],
      ["Images unavailable", "4"],
    ],
    replayDescription: "Flood impact survey · replay summary",
    issuesSummary: "1 warning · image gap",
    issueTotal: 1,
    issues: [
      {
        severity: "Warning",
        code: "DEMO_IMAGE_GAP",
        message: "4 planned images unavailable",
        time: 151.0,
      },
    ],
    actions: [
      ["Completed", 5],
      ["Partial", 1],
      ["Failed", 0],
      ["Not started", 0],
    ],
    files: [
      ["Image", 36],
      ["Video", 1],
      ["Telemetry", 1],
      ["Input", 2],
      ["Output", 1],
    ],
  },
  "bridge-inspection": {
    key: "simulation-succeeded",
    demoCase: "bridge-inspection",
    runLabel: "Bridge inspection mapping",
    type: "Simulation",
    status: "Succeeded",
    world: "River crossing",
    date: "Nov 10, 2026 - 10:40",
    duration: "248.0 s",
    vehicle: "demo-drone-b3",
    source: "SkyTrack Mission Studio",
    missionLogicFile: "bridge-inspection.json",
    missionLogicDescription:
      "22 waypoints · 2 bridge spans · 4 inspection passes",
    outcomeTitle: "Inspection completed",
    outcome: "8 mapped inspection areas · 64 images · 2 spans covered",
    evidenceCompleteness: {
      state: "complete",
      summary: "All 8 of 8 planned areas were mapped",
    },
    evidenceAvailability: {
      state: "available",
      files: "64 of 64 files are on this device",
      integrityState: "not_provided",
      integrity: "File check data was not included",
    },
    outputs: [demoMappedAreaOutputs["bridge-inspection"]],
    replayStats: [
      ["Duration", "248.0 s"],
      ["Maximum altitude", "31.0 m"],
      ["Distance flown", "1.76 km"],
      ["Bridge spans", "2"],
      ["Mapped areas", "8"],
    ],
    replayDescription: "Bridge inspection · replay summary",
    issuesSummary: "No issues",
    issueTotal: 0,
    issues: [],
    actions: [
      ["Completed", 8],
      ["Partial", 0],
      ["Failed", 0],
      ["Not started", 0],
    ],
    files: [
      ["Image", 64],
      ["Video", 1],
      ["Telemetry", 1],
      ["Input", 2],
      ["Output", 1],
    ],
  },
  "erosion-survey": {
    key: "simulation-succeeded",
    demoCase: "erosion-survey",
    runLabel: "Streambank erosion survey",
    type: "Simulation",
    status: "Succeeded",
    world: "Creek corridor",
    date: "Nov 09, 2026 - 08:30",
    duration: "174.0 s",
    vehicle: "demo-drone-e4",
    source: "SkyTrack Mission Studio",
    missionLogicFile: "erosion-survey.json",
    missionLogicDescription:
      "14 waypoints · 1.1 km corridor · nadir and oblique passes",
    outcomeTitle: "Survey completed",
    outcome: "11 mapped erosion areas · 33 images · 1.1 km corridor covered",
    evidenceCompleteness: {
      state: "complete",
      summary: "All 11 of 11 planned areas were mapped",
    },
    evidenceAvailability: {
      state: "available",
      files: "33 of 33 files are on this device",
      integrityState: "not_provided",
      integrity: "File check data was not included",
    },
    outputs: [demoMappedAreaOutputs["erosion-survey"]],
    replayStats: [
      ["Duration", "174.0 s"],
      ["Maximum altitude", "35.0 m"],
      ["Distance flown", "1.31 km"],
      ["Corridor length", "1.1 km"],
      ["Mapped areas", "11"],
    ],
    replayDescription: "Streambank survey · replay summary",
    issuesSummary: "No issues",
    issueTotal: 0,
    issues: [],
    actions: [
      ["Completed", 5],
      ["Partial", 0],
      ["Failed", 0],
      ["Not started", 0],
    ],
    files: [
      ["Image", 33],
      ["Video", 1],
      ["Telemetry", 1],
      ["Input", 2],
      ["Output", 1],
    ],
  },
  "interrupted-survey": {
    key: "simulation-failed",
    demoCase: "interrupted-survey",
    runLabel: "Interrupted corridor survey",
    type: "Simulation",
    status: "Failed",
    world: "North service corridor",
    date: "Nov 08, 2026 - 16:15",
    duration: "42.0 s",
    vehicle: "demo-drone-i5",
    source: "SkyTrack Mission Studio",
    missionLogicFile: "corridor-survey.json",
    missionLogicDescription:
      "12 waypoints · 3 planned segments · return home enabled",
    outcomeTitle: "Survey interrupted",
    outcome:
      "Run stopped before any mapped areas or output files were produced",
    evidenceCompleteness: {
      state: "none",
      summary: "No mission results were produced before the run stopped",
    },
    evidenceAvailability: {
      state: "none",
      files: "No mission result files were produced",
      integrityState: "no_files",
      integrity: "No files available to check",
    },
    outputs: [],
    replayStats: [
      ["Duration", "42.0 s"],
      ["Waypoints reached", "2 of 12"],
      ["Distance flown", "86 m"],
      ["Mapped areas", "0"],
      ["Output files", "0"],
    ],
    replayDescription: "Interrupted run · no output artifacts",
    issuesSummary: "1 error · control link loss",
    issueTotal: 1,
    issues: [
      {
        severity: "Error",
        code: "DEMO_LINK_INTERRUPTED",
        message: "Control link loss stopped the run before output generation",
        time: 42.0,
      },
    ],
    actions: [
      ["Completed", 1],
      ["Partial", 0],
      ["Failed", 1],
      ["Not started", 4],
    ],
    files: [
      ["Image", 0],
      ["Video", 0],
      ["Telemetry", 1],
      ["Input", 2],
      ["Output", 0],
    ],
  },
};
