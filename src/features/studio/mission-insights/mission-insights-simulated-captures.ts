import { useEffect, useState } from "react";
import type * as Three from "three";
import {
  findMissionRecord,
  loadProjects,
} from "@/features/library/database/store";
import { loadWorkspaceResources } from "@/features/library/database/workspace-resources-store";
import { loadWorldGlbModel } from "@/features/library/database/world-glb-asset-access";
import type { MissionInsightSample } from "./mission-insights-data";

const BUNDLED_LEEVILLE_ASSET_ID = "bundled-world-leeville-pike-roof-assessment";
const renderedCaptures = new Map<string, string>();
const pendingRenders = new Map<string, Promise<void>>();

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function textValue(value: unknown, fallback = "—"): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function missionCapturePreview(artifactId: string): string | null {
  return renderedCaptures.get(artifactId) ?? null;
}

function missionSnapshot(missionId: string) {
  const savedMission = findMissionRecord(loadProjects(), missionId)?.mission;
  if (!savedMission?.missionData) return null;
  try {
    return asRecord(JSON.parse(savedMission.missionData));
  } catch {
    return null;
  }
}

function capturePitch(
  mission: Record<string, unknown>,
  waypoint: Record<string, unknown>,
  action: Record<string, unknown>,
) {
  const actionPitch = numberValue(action.gimbalPitchDeg);
  if (actionPitch !== null) return actionPitch;
  const areas = asRecords(mission.areas);
  const area = areas.find((item) => item.id === waypoint.generatedByArea);
  const routes = asRecords(mission.routes);
  const route = routes.find((item) => item.id === waypoint.routeId);
  return (
    numberValue(asRecord(area?.reconnaissance).gimbalPitchDeg) ??
    numberValue(asRecord(route?.reconnaissance).gimbalPitchDeg) ??
    -90
  );
}

async function renderMissionCaptures(missionId: string) {
  if (typeof window === "undefined") return;
  const mission = missionSnapshot(missionId);
  if (!mission) return;
  const waypoints = asRecords(mission.waypoints).sort(
    (a, b) => (numberValue(a.seq) ?? 0) - (numberValue(b.seq) ?? 0),
  );
  const capturePoints = waypoints.flatMap((waypoint) =>
    asRecords(waypoint.actions)
      .filter((action) => action.kind === "photo")
      .map((action) => ({
        waypoint,
        action,
        artifactId: null as string | null,
      })),
  );
  const recordingFlow = asRecords(mission.aiWorkflows).find((flow) =>
    [...asRecords(flow.ifActions), ...asRecords(flow.elseActions)].some(
      (action) =>
        action.kind === "camera-trigger" && action.mode === "recording-on",
    ),
  );
  const recordingWaypoint = waypoints.find(
    (waypoint) => waypoint.id === textValue(recordingFlow?.startWaypointId, ""),
  );
  const aiSnapshotRequests = asRecords(mission.aiWorkflows).flatMap((flow) => {
    if (flow.objectClass !== "Building" || !textValue(flow.modelId, ""))
      return [];
    const snapshotAction = [
      ...asRecords(flow.ifActions),
      ...asRecords(flow.elseActions),
    ].find(
      (action) =>
        action.kind === "camera-trigger" && action.mode === "snapshot",
    );
    const waypoint = waypoints.find(
      (item) => item.id === textValue(flow.startWaypointId, ""),
    );
    if (!snapshotAction || !waypoint) return [];
    return [
      {
        waypoint,
        action: {},
        artifactId: `art_leeville_ai_snapshot_${textValue(flow.id)}`,
      },
    ];
  });
  const renderRequests = [
    ...capturePoints,
    ...aiSnapshotRequests,
    ...(recordingWaypoint
      ? waypoints.map((waypoint, index) => ({
          waypoint,
          action: { gimbalPitchDeg: -30 },
          artifactId: `art_leeville_video_frame_${String(index + 1).padStart(3, "0")}`,
        }))
      : []),
    ...(recordingWaypoint
      ? [
          {
            waypoint: recordingWaypoint,
            action: {},
            artifactId: "art_leeville_recording_001",
          },
        ]
      : []),
  ];
  if (!renderRequests.length) return;

  const worldId = textValue(mission.worldId, "");
  const worldName = textValue(mission.world, "");
  const world = loadWorkspaceResources().worlds.find(
    (item) => item.id === worldId || item.name === worldName,
  );
  const assetId = world?.glbAssetId ?? BUNDLED_LEEVILLE_ASSET_ID;
  const model = await loadWorldGlbModel(assetId);
  if (!model) return;

  const [THREE, { GLTFLoader }] = await Promise.all([
    import("three"),
    import("three/addons/loaders/GLTFLoader.js"),
  ]);
  const gltf = await new GLTFLoader().parseAsync(await model.arrayBuffer(), "");
  const root = gltf.scene ?? gltf.scenes[0];
  if (!root) return;
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) return;
  const modelCenter = bounds.getCenter(new THREE.Vector3());
  const modelSize = bounds.getSize(new THREE.Vector3());
  const modelContainer = new THREE.Group();
  modelContainer.add(root);
  modelContainer.position.sub(modelCenter);
  modelContainer.updateMatrixWorld(true);

  const missionXs = waypoints.map((point) => numberValue(point.x) ?? 0);
  const missionYs = waypoints.map((point) => numberValue(point.y) ?? 0);
  const minMissionX = Math.min(...missionXs);
  const maxMissionX = Math.max(...missionXs);
  const minMissionY = Math.min(...missionYs);
  const maxMissionY = Math.max(...missionYs);
  const missionXSpan = Math.max(maxMissionX - minMissionX, 1);
  const missionYSpan = Math.max(maxMissionY - minMissionY, 1);
  const marginX = modelSize.x * 0.08;
  const marginZ = modelSize.z * 0.08;
  const sizeX = Math.max(modelSize.x - marginX * 2, 1);
  const sizeZ = Math.max(modelSize.z - marginZ * 2, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#dce5d5");
  scene.add(modelContainer);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x53644e, 1.8));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(4, 8, 5);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));

  const width = 640;
  const height = 360;
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "low-power",
  });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const raycaster = new THREE.Raycaster();
  const photoAltitude = numberValue(mission.takeoffAltM) ?? 12;

  try {
    let photoIndex = 0;
    for (const request of renderRequests) {
      const { waypoint, action } = request;
      const artifactId =
        request.artifactId ??
        `art_leeville_capture_${String(++photoIndex).padStart(3, "0")}`;
      if (renderedCaptures.has(artifactId)) continue;

      const missionX = numberValue(waypoint.x) ?? 0;
      const missionY = numberValue(waypoint.y) ?? 0;
      const normalizedX = (missionX - minMissionX) / missionXSpan;
      const normalizedY = (missionY - minMissionY) / missionYSpan;
      const x = -modelSize.x / 2 + marginX + normalizedX * sizeX;
      const z = modelSize.z / 2 - marginZ - normalizedY * sizeZ;
      raycaster.set(
        new THREE.Vector3(x, modelSize.y / 2 + modelSize.length() + 500, z),
        new THREE.Vector3(0, -1, 0),
      );
      const ground = raycaster.intersectObject(modelContainer, true)[0]?.point;
      const groundY = ground?.y ?? -modelSize.y / 2;
      const cameraHeight = Math.max(
        2,
        Math.min(photoAltitude, modelSize.length() * 0.12),
      );
      const cameraPosition = new THREE.Vector3(x, groundY + cameraHeight, z);
      const pitch = THREE.MathUtils.degToRad(
        Math.min(-1, Math.max(-90, capturePitch(mission, waypoint, action))),
      );
      const next =
        waypoints[
          Math.min(waypoints.indexOf(waypoint) + 1, waypoints.length - 1)
        ];
      const nextX = numberValue(next?.x) ?? missionX;
      const nextY = numberValue(next?.y) ?? missionY;
      const heading = Math.atan2(nextX - missionX, nextY - missionY);
      const horizontalDistance = cameraHeight / Math.tan(Math.abs(pitch));
      const target = new THREE.Vector3(
        x + Math.sin(heading) * horizontalDistance,
        groundY,
        z - Math.cos(heading) * horizontalDistance,
      );
      const camera = new THREE.PerspectiveCamera(
        58,
        width / height,
        0.1,
        10000,
      );
      camera.position.copy(cameraPosition);
      camera.up.set(0, 0, -1);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.88),
      );
      if (blob) renderedCaptures.set(artifactId, URL.createObjectURL(blob));
    }
  } finally {
    renderer.dispose();
    root.traverse((object) => {
      const mesh = object as typeof object & {
        isMesh?: boolean;
        geometry?: { dispose: () => void };
        material?: Three.Material | Three.Material[];
      };
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : mesh.material
          ? [mesh.material]
          : [];
      materials.forEach((material) => material.dispose());
    });
  }
}

export function useMissionCapturePreviews(
  sample: MissionInsightSample | null,
  enabled: boolean,
) {
  const [, setRevision] = useState(0);
  useEffect(() => {
    const missionId = sample?.missionId;
    if (!enabled || !missionId) return;
    let active = true;
    let pending = pendingRenders.get(missionId);
    if (!pending) {
      pending = renderMissionCaptures(missionId).finally(() => {
        pendingRenders.delete(missionId);
      });
      pendingRenders.set(missionId, pending);
    }
    void pending
      .then(() => {
        if (active) setRevision((revision) => revision + 1);
      })
      .catch(() => {
        if (active) setRevision((revision) => revision + 1);
      });
    return () => {
      active = false;
    };
  }, [enabled, sample?.missionId]);
}
