/* simulation-types.ts — deterministic simulation contracts and settings. */

import type { EnuVec } from "../../domain/mission-model";

export type SimStatus =
  "idle" | "running" | "paused" | "completed" | "aborted" | "failed";

export interface SimSettings {
  runTimes: number;
  speedFactor: number;
  reducedMotion: boolean;
  windMS: number;
  mockFailureAtSeq: number;
}

export const DEFAULT_SIM_SETTINGS: SimSettings = {
  runTimes: 1,
  speedFactor: 1,
  reducedMotion: false,
  windMS: 2.5,
  mockFailureAtSeq: 0,
};

export const SIM_RUN_TIMES_MIN = 1;
export const SIM_RUN_TIMES_MAX = 20;

/** Clamp run times to the source range 1–20 (integers). */
export function clampRunTimes(v: number): number {
  if (!Number.isFinite(v)) return SIM_RUN_TIMES_MIN;
  return Math.min(
    SIM_RUN_TIMES_MAX,
    Math.max(SIM_RUN_TIMES_MIN, Math.floor(v)),
  );
}

export type SimEventKind =
  | "takeoff"
  | "waypoint"
  | "action"
  | "rtl"
  | "land"
  | "complete"
  | "failure"
  | "info";

export interface SimEventItem {
  t: number;
  kind: SimEventKind;
  label: string;
  seq?: number;
  waypointId?: string;
  actionKind?: string;
}

export interface SimLogLine {
  t: number;
  kind: SimEventKind | "system";
  text: string;
}

export interface Telemetry {
  t: number;
  pos: EnuVec;
  yawDeg: number;
  rollDeg: number;
  pitchDeg: number;
  altM: number;
  speedMS: number;
  batteryPct: number;
  homeDistM: number;
  mode: string;
  signal: string;
  moving: boolean;
  targetSeq: number | null;
}

export interface SimLeg {
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  len: number;
  t0: number;
  t1: number;
  dwell: number;
  seq: number | null;
}

export interface SimPlan {
  legs: SimLeg[];
  events: SimEventItem[];
  duration: number;
  totalDist: number;
  failedAtSeq: number;
}
