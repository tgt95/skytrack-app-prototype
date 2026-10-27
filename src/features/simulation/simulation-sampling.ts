/* simulation-sampling.ts — deterministic plan sampling and telemetry. */

import type { EnuVec } from "../../domain/mission-model";
import type { SimPlan, SimStatus, Telemetry } from "./simulation-types";

export function samplePlan(
  plan: SimPlan,
  t: number,
): {
  pos: EnuVec;
  yawDeg: number;
  moving: boolean;
  targetSeq: number | null;
  speedMS: number;
} {
  const clamped = Math.max(0, Math.min(t, plan.duration));
  for (const leg of plan.legs) {
    if (clamped <= leg.t1) {
      const span = leg.t1 - leg.t0;
      const k = span > 1e-9 ? (clamped - leg.t0) / span : 1;
      const pos = {
        x: leg.ax + (leg.bx - leg.ax) * k,
        y: leg.ay + (leg.by - leg.ay) * k,
        z: leg.az + (leg.bz - leg.az) * k,
      };
      const yawDeg =
        (Math.atan2(leg.bx - leg.ax, leg.by - leg.ay) * 180) / Math.PI;
      const speedMS = span > 1e-9 ? leg.len / span : 0;
      return { pos, yawDeg, moving: true, targetSeq: leg.seq, speedMS };
    }
    if (clamped <= leg.t1 + leg.dwell) {
      return {
        pos: { x: leg.bx, y: leg.by, z: leg.bz },
        yawDeg: (Math.atan2(leg.bx - leg.ax, leg.by - leg.ay) * 180) / Math.PI,
        moving: false,
        targetSeq: leg.seq,
        speedMS: 0,
      };
    }
  }
  const last = plan.legs[plan.legs.length - 1];
  return {
    pos: last ? { x: last.bx, y: last.by, z: last.bz } : { x: 0, y: 0, z: 0 },
    yawDeg: 0,
    moving: false,
    targetSeq: null,
    speedMS: 0,
  };
}

export function telemetryAt(
  plan: SimPlan,
  home: { x: number; y: number },
  t: number,
  status: SimStatus,
): Telemetry {
  const s = samplePlan(plan, t);
  const frac = plan.duration > 0 ? Math.min(t / plan.duration, 1) : 0;
  return {
    t,
    pos: s.pos,
    yawDeg: Math.round(s.yawDeg * 10) / 10,
    rollDeg: Math.round(Math.sin(t * 0.7) * 3 * 10) / 10,
    pitchDeg:
      Math.round((Math.sin(t * 0.5 + 1) * 2 + (s.moving ? -4 : 0)) * 10) / 10,
    altM: Math.round(s.pos.z * 10) / 10,
    speedMS: Math.round(s.speedMS * 100) / 100,
    batteryPct: Math.max(0, Math.round((100 - 38 * frac) * 10) / 10),
    homeDistM:
      Math.round(Math.hypot(s.pos.x - home.x, s.pos.y - home.y) * 10) / 10,
    mode:
      status === "running"
        ? "AUTO · MISSION"
        : status === "paused"
          ? "HOLD"
          : status === "completed"
            ? "LANDED"
            : "STANDBY",
    signal: "RTK Fixed",
    moving: s.moving,
    targetSeq: s.targetSeq,
  };
}
