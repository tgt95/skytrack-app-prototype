import {
  DEFAULT_WORKSPACE_ID,
  WORKSPACES,
} from "@/features/library/workspace/workspace-data.ts";
import { DEFAULT_DRONE_GEOMETRY } from "@/domain/drone-geometry";
import { DEFAULT_DRONE_ONBOARDING_DATA } from "@/domain/drone-onboarding";
import type {
  DroneComponentGroup,
  DroneHardwareComponent,
  DroneHardwareSpecification,
  WorkspaceDroneProfile,
} from "./drone-store-types";

function specification(
  id: string,
  label: string,
  value: string,
): DroneHardwareSpecification {
  return { id, label, value };
}

function component(
  id: string,
  group: DroneComponentGroup,
  name: string,
  purpose = "",
  specifications: DroneHardwareSpecification[] = [],
): DroneHardwareComponent {
  return {
    id,
    group,
    name,
    purpose,
    manufacturer: "",
    model: "",
    partNumber: "",
    revision: "",
    installState: "Unspecified",
    sourceType: "Owner provided",
    sourceLabel: "Owner-provided hardware list",
    sourceUrl: "",
    sourceDate: "",
    specifications,
  };
}

export function newDroneHardwareComponent(id: string): DroneHardwareComponent {
  return {
    id,
    group: "Other",
    name: "",
    purpose: "",
    manufacturer: "",
    model: "",
    partNumber: "",
    revision: "",
    installState: "Unspecified",
    sourceType: "Unverified",
    sourceLabel: "",
    sourceUrl: "",
    sourceDate: "",
    specifications: [],
  };
}

const MINI_PRO_COMPONENTS: DroneHardwareComponent[] = [
  component(
    "mini-pro-jetson",
    "Companion Computer",
    "NVIDIA Jetson Orin Nano",
    "Edge AI, obstacle avoidance",
  ),
  component(
    "mini-pro-pixhawk",
    "Flight Control",
    "Pixhawk 6C Mini",
    "Flight controller",
  ),
  component(
    "mini-pro-stereo-camera",
    "Imaging & Sensing",
    "IMX219-83 stereo camera",
  ),
  component("mini-pro-battery", "Battery", "4S 5300mAh battery", "", [
    specification("mini-pro-battery-cells", "Cell count", "4S"),
    specification("mini-pro-battery-capacity", "Capacity", "5300 mAh"),
  ]),
  component("mini-pro-motors", "Motor", "900kV X3115 motor", "", [
    specification("mini-pro-motor-size", "Motor size", "X3115"),
    specification("mini-pro-motor-kv", "KV", "900 kV"),
  ]),
  component(
    "mini-pro-escs",
    "Electronic Speed Controller (ESC)",
    "4-in-1 50A ESCs",
    "",
    [
      specification("mini-pro-esc-config", "Configuration", "4-in-1"),
      specification(
        "mini-pro-esc-current",
        "Current rating",
        "50 A; rating type unspecified",
      ),
    ],
  ),
  component("mini-pro-frame", "Frame Kit", "F450 or X450 frame"),
  component("mini-pro-props", "Propeller", "Gemfan 9045 propellers", "", [
    specification("mini-pro-prop-designation", "Model designation", "9045"),
  ]),
  component("mini-pro-radio", "Radio Control", "Radiomaster Pocket ELRS"),
  component("mini-pro-receiver", "Radio Control", "Radiomaster RP3 V2 ELRS"),
  component("mini-pro-gimbal", "Payload", "SIYI A8 Mini gimbal"),
  component(
    "mini-pro-optical-flow",
    "Imaging & Sensing",
    "Optical Flow MTF-01p",
  ),
  component("mini-pro-data-link", "Communications & Telemetry", "OpenDataLink"),
  component("mini-pro-ubec", "Power Regulation", "UBEC"),
];

const MINI_BASE_COMPONENTS: DroneHardwareComponent[] = [
  component(
    "mini-base-pi",
    "Companion Computer",
    "Raspberry Pi 5 8GB",
    "Mission logic, lighter models",
  ),
  component(
    "mini-base-pixhawk",
    "Flight Control",
    "Pixhawk 6C Mini",
    "Flight controller",
  ),
  component(
    "mini-base-stereo-camera",
    "Imaging & Sensing",
    "IMX219-83 stereo camera",
  ),
  component("mini-base-battery", "Battery", "4S 5300mAh battery", "", [
    specification("mini-base-battery-cells", "Cell count", "4S"),
    specification("mini-base-battery-capacity", "Capacity", "5300 mAh"),
  ]),
  component("mini-base-motors", "Motor", "900kV X3115 motor", "", [
    specification("mini-base-motor-size", "Motor size", "X3115"),
    specification("mini-base-motor-kv", "KV", "900 kV"),
  ]),
  component(
    "mini-base-escs",
    "Electronic Speed Controller (ESC)",
    "4-in-1 50A ESCs",
    "",
    [
      specification("mini-base-esc-config", "Configuration", "4-in-1"),
      specification(
        "mini-base-esc-current",
        "Current rating",
        "50 A; rating type unspecified",
      ),
    ],
  ),
  component("mini-base-frame", "Frame Kit", "F450 or X450 frame"),
  component("mini-base-props", "Propeller", "Gemfan 9045 propellers", "", [
    specification("mini-base-prop-designation", "Model designation", "9045"),
  ]),
  component("mini-base-radio", "Radio Control", "Radiomaster Pocket ELRS"),
  component("mini-base-receiver", "Radio Control", "Radiomaster RP3 V2 ELRS"),
  component("mini-base-gimbal", "Payload", "SIYI A8 Mini gimbal"),
  component(
    "mini-base-optical-flow",
    "Imaging & Sensing",
    "Optical Flow MTF-01p",
  ),
  component(
    "mini-base-data-link",
    "Communications & Telemetry",
    "OpenDataLink",
  ),
  component("mini-base-ubec", "Power Regulation", "UBEC"),
];

export function blankProfileFromFixture(
  workspaceId: string,
  fixture: { id: string; name: string },
  legacyLabels: string[] = [],
): WorkspaceDroneProfile {
  return {
    id: fixture.id,
    workspaceId,
    name: fixture.name,
    profileCode: "",
    missionUseCase: "",
    profileSourceType: "Unverified",
    profileSourceLabel: "",
    profileSourceUrl: "",
    profileSourceDate: "",
    firmwareFamily: "Unspecified",
    flightControllerModel: "",
    firmwareVersion: "",
    airframe: "",
    frameSizeMm: null,
    maxPropDiameterIn: null,
    motorMountPatternMm: "",
    stackMountPatternMm: "",
    frameWeightG: null,
    maxFlightTimeMin: null,
    maxSpeedMps: null,
    maxTakeoffWeightKg: null,
    maxPayloadKg: null,
    referenceBuildNote: "",
    legacyLabels,
    components: [],
    geometry: { ...DEFAULT_DRONE_GEOMETRY },
    onboarding: structuredClone(DEFAULT_DRONE_ONBOARDING_DATA),
  };
}

export function seedDroneProfiles(): WorkspaceDroneProfile[] {
  const profiles = WORKSPACES.flatMap((workspace) =>
    workspace.drones.map((drone) =>
      blankProfileFromFixture(workspace.id, drone),
    ),
  );
  const miniPro = profiles.find((profile) => profile.id === "mini-pro-v6");
  if (miniPro) {
    Object.assign(miniPro, {
      name: "Mini-Pro",
      firmwareFamily: "PX4" as const,
      flightControllerModel: "Pixhawk 6C Mini",
      airframe: "F450 or X450 frame",
      profileSourceType: "Owner provided" as const,
      profileSourceLabel: "Owner-provided drone profile",
      referenceBuildNote: "Reference build: Mini Pro",
      legacyLabels: ["Mini Pro V6"],
      components: MINI_PRO_COMPONENTS,
    });
  }

  profiles.push({
    ...blankProfileFromFixture(DEFAULT_WORKSPACE_ID, {
      id: "mini-base",
      name: "Mini-Base",
    }),
    firmwareFamily: "PX4",
    flightControllerModel: "Pixhawk 6C Mini",
    airframe: "F450 or X450 frame",
    profileSourceType: "Owner provided",
    profileSourceLabel: "Owner-provided drone profile",
    components: MINI_BASE_COMPONENTS,
  });
  return profiles;
}
