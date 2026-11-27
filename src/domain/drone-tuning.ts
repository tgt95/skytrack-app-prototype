export const DRONE_RATE_PID_GROUPS = [
  {
    label: "ROLL",
    fields: [
      {
        key: "MC_ROLLRATE_P",
        label: "Rate P",
        defaultValue: 0.15,
        initialValue: 0.1572,
      },
      {
        key: "MC_ROLLRATE_I",
        label: "Rate I",
        defaultValue: 0.2,
        initialValue: 0.2096,
      },
      {
        key: "MC_ROLLRATE_D",
        label: "Rate D",
        defaultValue: 0.003,
        initialValue: 0.0031,
      },
      {
        key: "MC_ROLL_P",
        label: "Attitude P",
        defaultValue: 4,
        initialValue: 4,
      },
    ],
  },
  {
    label: "PITCH",
    fields: [
      {
        key: "MC_PITCHRATE_P",
        label: "Rate P",
        defaultValue: 0.15,
        initialValue: 0.1729,
      },
      {
        key: "MC_PITCHRATE_I",
        label: "Rate I",
        defaultValue: 0.2,
        initialValue: 0.2305,
      },
      {
        key: "MC_PITCHRATE_D",
        label: "Rate D",
        defaultValue: 0.003,
        initialValue: 0.0035,
      },
      {
        key: "MC_PITCH_P",
        label: "Attitude P",
        defaultValue: 4,
        initialValue: 4,
      },
    ],
  },
  {
    label: "YAW",
    fields: [
      {
        key: "MC_YAWRATE_P",
        label: "Rate P",
        defaultValue: 0.2,
        initialValue: 0.2083,
      },
      {
        key: "MC_YAWRATE_I",
        label: "Rate I",
        defaultValue: 0.1,
        initialValue: 0.1042,
      },
      {
        key: "MC_YAWRATE_D",
        label: "Rate D",
        defaultValue: 0,
        initialValue: 0,
      },
      {
        key: "MC_YAW_P",
        label: "Attitude P",
        defaultValue: 2.8,
        initialValue: 2.8,
      },
    ],
  },
] as const;

export const DRONE_POSITION_VELOCITY_PID_GROUPS = [
  {
    label: "Position",
    fields: [
      { key: "MPC_XY_P", label: "Horizontal XY · P", value: 0.95 },
      { key: "MPC_Z_P", label: "Altitude Z · P", value: 1 },
    ],
  },
  {
    label: "Velocity · Horizontal XY",
    fields: [
      { key: "MPC_XY_VEL_P_ACC", label: "Velocity XY · P", value: 1.8 },
      { key: "MPC_XY_VEL_I_ACC", label: "Velocity XY · I", value: 0.4 },
      { key: "MPC_XY_VEL_D_ACC", label: "Velocity XY · D", value: 0.2 },
    ],
  },
  {
    label: "Velocity · Vertical Z",
    fields: [
      { key: "MPC_Z_VEL_P_ACC", label: "Velocity Z · P", value: 4 },
      { key: "MPC_Z_VEL_I_ACC", label: "Velocity Z · I", value: 2 },
      { key: "MPC_Z_VEL_D_ACC", label: "Velocity Z · D", value: 0 },
    ],
  },
] as const;

export type DronePidGainKey =
  | (typeof DRONE_RATE_PID_GROUPS)[number]["fields"][number]["key"]
  | (typeof DRONE_POSITION_VELOCITY_PID_GROUPS)[number]["fields"][number]["key"];

export type DronePidGains = Record<DronePidGainKey, number>;

export const DEFAULT_DRONE_PID_GAINS: DronePidGains = {
  MC_ROLLRATE_P: 0.1572,
  MC_ROLLRATE_I: 0.2096,
  MC_ROLLRATE_D: 0.0031,
  MC_ROLL_P: 4,
  MC_PITCHRATE_P: 0.1729,
  MC_PITCHRATE_I: 0.2305,
  MC_PITCHRATE_D: 0.0035,
  MC_PITCH_P: 4,
  MC_YAWRATE_P: 0.2083,
  MC_YAWRATE_I: 0.1042,
  MC_YAWRATE_D: 0,
  MC_YAW_P: 2.8,
  MPC_XY_P: 0.95,
  MPC_Z_P: 1,
  MPC_XY_VEL_P_ACC: 1.8,
  MPC_XY_VEL_I_ACC: 0.4,
  MPC_XY_VEL_D_ACC: 0.2,
  MPC_Z_VEL_P_ACC: 4,
  MPC_Z_VEL_I_ACC: 2,
  MPC_Z_VEL_D_ACC: 0,
};

export const DEFAULT_DRONE_PID_GAINS_RESET: DronePidGains = {
  MC_ROLLRATE_P: 0.15,
  MC_ROLLRATE_I: 0.2,
  MC_ROLLRATE_D: 0.003,
  MC_ROLL_P: 4,
  MC_PITCHRATE_P: 0.15,
  MC_PITCHRATE_I: 0.2,
  MC_PITCHRATE_D: 0.003,
  MC_PITCH_P: 4,
  MC_YAWRATE_P: 0.2,
  MC_YAWRATE_I: 0.1,
  MC_YAWRATE_D: 0,
  MC_YAW_P: 2.8,
  MPC_XY_P: 0.95,
  MPC_Z_P: 1,
  MPC_XY_VEL_P_ACC: 1.8,
  MPC_XY_VEL_I_ACC: 0.4,
  MPC_XY_VEL_D_ACC: 0.2,
  MPC_Z_VEL_P_ACC: 4,
  MPC_Z_VEL_I_ACC: 2,
  MPC_Z_VEL_D_ACC: 0,
};

export function normalizeDronePidGains(value: unknown): DronePidGains {
  const candidate =
    typeof value === "object" && value !== null
      ? (value as Partial<DronePidGains>)
      : {};
  return Object.fromEntries(
    Object.entries(DEFAULT_DRONE_PID_GAINS).map(([key, fallback]) => {
      const current = candidate[key as keyof DronePidGains];
      return [
        key,
        typeof current === "number" && Number.isFinite(current)
          ? current
          : fallback,
      ];
    }),
  ) as DronePidGains;
}
