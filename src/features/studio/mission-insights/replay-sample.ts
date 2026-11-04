// Local, illustrative replay data from the supplied Mission Insights prototype.
// N/E/down values are relative metres; no geographic coordinates or host paths are included.
import replayData from "./replay-sample.json";

export type ReplayPosition = {
  t: number;
  n: number;
  e: number;
  d: number;
  spd: number;
  seg: string;
  vn: number;
  ve: number;
  vd: number;
  mode: string;
  armed: boolean;
  tn: number;
  te: number;
  td: number;
};
export type ReplayAttitude = {
  t: number;
  roll: number;
  pitch: number;
  yaw: number;
};
export type ReplayDepthFrame = {
  t: number;
  n_pts: number;
  cx: number;
  cy: number;
  cz: number;
  zlo: number;
  zmed: number;
  zhi: number;
  dz: number;
  az05: number;
  az95: number;
  near: number | null;
  hist: number[];
  yaw: number;
};
export type ReplayEvent = {
  t: number;
  lvl: string;
  seg: string;
  tag: string;
  msg: string;
};
export type ReplayReport = {
  t: number;
  dist: number;
  kind: string;
  n: number;
  e: number;
  d: number;
};
export type ReplayTimeline = {
  run: string;
  log: string;
  startClock: string;
  durationSeconds: number;
  samples: ReplayPosition[];
  attitude: ReplayAttitude[];
  depth: ReplayDepthFrame[];
  events: ReplayEvent[];
  reports: ReplayReport[];
};

export const replayTimeline = replayData as ReplayTimeline;
