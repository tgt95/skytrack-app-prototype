import okReport from "./sample-data/ok/report.json";
import failedReport from "./sample-data/fail/report.json";
import realReport from "./sample-data/real/report.json";
import okPlanSource from "./sample-data/ok/plan.json?raw";
import failedScriptSource from "./sample-data/fail/script.py?raw";
import realScriptSource from "./sample-data/real/script.py?raw";
import type { MissionInsightSample } from "./mission-insights-data";
import { missionCapturePreview } from "./mission-insights-simulated-captures";
import {
  findMissionRecord,
  loadProjects,
} from "@/features/library/database/store";
import { loadWorkspaceResources } from "@/features/library/database/workspace-resources-store";

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
  detectionEventsDuringRecording: number;
  detectedAreasDuringRecording: number;
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
  "construction-progress": {
    runId: "demo_construction_20261112",
    startedAt: "2026-11-12T09:00:00+07:00",
  },
  "flood-impact": {
    runId: "demo_flood_20261111",
    startedAt: "2026-11-11T14:20:00+07:00",
  },
  "bridge-inspection": {
    runId: "demo_bridge_20261110",
    startedAt: "2026-11-10T10:40:00+07:00",
  },
  "erosion-survey": {
    runId: "demo_erosion_20261109",
    startedAt: "2026-11-09T08:30:00+07:00",
  },
  "interrupted-survey": {
    runId: "demo_interrupted_20261108",
    startedAt: "2026-11-08T16:15:00+07:00",
  },
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
  if (sample.missionId && typeof window !== "undefined") {
    const savedMission = findMissionRecord(
      loadProjects(),
      sample.missionId,
    )?.mission;
    if (savedMission?.missionData) {
      try {
        const mission = asRecord(JSON.parse(savedMission.missionData));
        const waypoints = asRecords(mission.waypoints)
          .sort((a, b) => (numberValue(a.seq) ?? 0) - (numberValue(b.seq) ?? 0))
          .map((waypoint, index) => ({
            waypoint_id: textValue(waypoint.id, `wp-${index + 1}`),
            index: index + 1,
            x_m: numberValue(waypoint.x) ?? 0,
            y_m: numberValue(waypoint.y) ?? 0,
            z_m: numberValue(waypoint.z) ?? 0,
            reached: true,
            route_id: textValue(waypoint.routeId, ""),
            generated_by_area: textValue(waypoint.generatedByArea, ""),
            actions: asRecords(waypoint.actions),
          }));
        const speed = Math.max(numberValue(mission.targetSpeedMS) ?? 2, 0.5);
        let elapsed = 0;
        let distance = 0;
        const spawn = asRecord(mission.spawn);
        const spawnPoint = {
          x_m: numberValue(spawn.x) ?? 0,
          y_m: numberValue(spawn.y) ?? 0,
          z_m: 0,
        };
        const samples = [{ t_s: 0, ...spawnPoint }];
        const waypointTimes = new Map<string, number>();
        waypoints.forEach((waypoint) => {
          const previous = samples.at(-1)!;
          const segmentDistance = Math.hypot(
            waypoint.x_m - previous.x_m,
            waypoint.y_m - previous.y_m,
            waypoint.z_m - previous.z_m,
          );
          distance += segmentDistance;
          elapsed += segmentDistance / speed;
          samples.push({
            t_s: elapsed,
            x_m: waypoint.x_m,
            y_m: waypoint.y_m,
            z_m: waypoint.z_m,
          });
          waypointTimes.set(waypoint.waypoint_id, elapsed);
        });
        const lastWaypoint = samples.at(-1)!;
        const landingDistance = Math.hypot(
          spawnPoint.x_m - lastWaypoint.x_m,
          spawnPoint.y_m - lastWaypoint.y_m,
          spawnPoint.z_m - lastWaypoint.z_m,
        );
        distance += landingDistance;
        elapsed += landingDistance / speed;
        samples.push({ t_s: elapsed, ...spawnPoint });
        const areas = asRecords(mission.areas);
        const missionAreas = areas.map((area) => ({
          area_id: textValue(area.id),
          label: textValue(area.label, "Survey area"),
          shape: textValue(area.shape, "polygon"),
          polygon_m: (() => {
            const points = asRecords(area.points).map((point) => {
              const value = asRecord(point);
              return [numberValue(value.x) ?? 0, numberValue(value.y) ?? 0];
            });
            const center = asRecord(area.center);
            const radius = numberValue(area.radiusM);
            if (
              points.length > 2 ||
              area.shape !== "cylinder" ||
              radius === null
            )
              return points;
            return Array.from({ length: 48 }, (_, index) => {
              const angle = (index / 48) * Math.PI * 2;
              return [
                (numberValue(center.x) ?? 0) + Math.cos(angle) * radius,
                (numberValue(center.y) ?? 0) + Math.sin(angle) * radius,
              ];
            });
          })(),
        }));
        const missionAvoids = asRecords(mission.avoids).map((avoid) => ({
          avoid_id: textValue(avoid.id),
          label: textValue(avoid.label, "Avoid zone"),
          type: textValue(avoid.type, "obstacle"),
          polygon_m: asRecords(avoid.points).map((point) => {
            const value = asRecord(point);
            return [numberValue(value.x) ?? 0, numberValue(value.y) ?? 0];
          }),
        }));
        const fieldPolygon = missionAreas[0]?.polygon_m ?? [];
        const photoPoints = waypoints.filter((waypoint) =>
          waypoint.actions.some((action) => action.kind === "photo"),
        );
        const recordingFlow = asRecords(mission.aiWorkflows).find((flow) =>
          [...asRecords(flow.ifActions), ...asRecords(flow.elseActions)].some(
            (action) =>
              action.kind === "camera-trigger" &&
              action.mode === "recording-on",
          ),
        );
        const recordingStartWaypoint = waypoints.find(
          (waypoint) =>
            waypoint.waypoint_id ===
            textValue(recordingFlow?.startWaypointId, ""),
        );
        const recordingStart = recordingStartWaypoint
          ? (waypointTimes.get(recordingStartWaypoint.waypoint_id) ?? 0)
          : null;
        const aiSnapshotPoints = asRecords(mission.aiWorkflows).flatMap(
          (flow) => {
            if (flow.objectClass !== "Building" || !textValue(flow.modelId, ""))
              return [];
            const action = asRecords(flow.ifActions).find(
              (item) =>
                item.kind === "camera-trigger" && item.mode === "snapshot",
            );
            const point = waypoints.find(
              (item) =>
                item.waypoint_id === textValue(flow.startWaypointId, ""),
            );
            return action && point ? [{ flow, action, point }] : [];
          },
        );
        const images = photoPoints.map((point, index) => {
          const action =
            point.actions.find((item) => item.kind === "photo") ?? {};
          const area = areas.find(
            (item) => item.id === point.generated_by_area,
          );
          const route = asRecords(mission.routes).find(
            (item) => item.id === point.route_id,
          );
          const gimbalPitch =
            numberValue(action.gimbalPitchDeg) ??
            numberValue(asRecord(area?.reconnaissance).gimbalPitchDeg) ??
            numberValue(asRecord(route?.reconnaissance).gimbalPitchDeg) ??
            -90;
          return {
            artifact_id: `art_leeville_capture_${String(index + 1).padStart(3, "0")}`,
            type: "image",
            role: "observed",
            uri: `sample://leeville/capture-${String(index + 1).padStart(3, "0")}.jpg`,
            media_type: "image/jpeg",
            size_bytes: 0,
            created_by: {
              producer_type: "platform",
              component: "camera-recorder",
            },
            context: {
              action_id: textValue(action.id),
              waypoint_id: point.waypoint_id,
            },
            derived_from: [],
            availability: {
              state: "local",
              location: `sample://leeville/captures/capture-${String(index + 1).padStart(3, "0")}.jpg`,
            },
            metadata: {
              width_px: 1920,
              height_px: 1080,
              preview: "../leeville/survey-image-contact-sheet.jpg",
              capture_time_s: waypointTimes.get(point.waypoint_id) ?? 0,
              capture_pose: {
                frame_id: "world_enu",
                x_m: point.x_m,
                y_m: point.y_m,
                z_m: point.z_m,
              },
              gimbal_pitch_deg: gimbalPitch,
              file: {
                name: `capture-${String(index + 1).padStart(3, "0")}.jpg`,
                kind: "JPEG image",
                device_make: "SkyTrack",
                device_model: "Mini-Pro simulated camera",
              },
            },
            local_path: `sample://leeville/captures/capture-${String(index + 1).padStart(3, "0")}.jpg`,
          };
        });
        const modelId = textValue(aiSnapshotPoints[0]?.flow.modelId, "");
        const workspaceModel = loadWorkspaceResources().aiModels.find(
          (model) => model.id === modelId,
        );
        const configuredModels = workspaceModel
          ? loadWorkspaceResources()
              .aiModels.filter(
                (model) =>
                  model.workspaceId === workspaceModel.workspaceId &&
                  model.id !== modelId &&
                  model.status !== "Archived",
              )
              .map((model) => ({
                model_id: model.id,
                name: model.name,
                version: model.version,
                task: model.task || "Not supplied",
                producer_type: model.origin ?? "workspace",
                classes: [],
                invocations: {
                  total: 0,
                  with_results: 0,
                  zero_results: 0,
                  failed: 0,
                },
                inputs_processed: 0,
                detections: 0,
                status: "configured_not_invoked",
              }))
          : [];
        const demoInvocationDurationMs = 100;
        const aiModel = {
          model_id: modelId,
          name: workspaceModel?.name ?? "Roof inspection v1",
          version: workspaceModel?.version || "",
          task: workspaceModel?.task || "detection",
          producer_type: workspaceModel?.origin ?? "workspace",
          classes: ["Building"],
          invocations: {
            total: aiSnapshotPoints.length,
            with_results: aiSnapshotPoints.length,
            zero_results: 0,
            failed: 0,
          },
          inputs_processed: aiSnapshotPoints.length,
          detections: aiSnapshotPoints.length,
          mean_duration_ms: demoInvocationDurationMs,
          p95_duration_ms: demoInvocationDurationMs,
          status: "demo results",
        };
        const aiSnapshotImages = aiSnapshotPoints.map(
          ({ flow, action, point }, index) => {
            const artifactId = `art_leeville_ai_snapshot_${textValue(flow.id)}`;
            const sequence = String(index + 1).padStart(3, "0");
            const captureTime = waypointTimes.get(point.waypoint_id) ?? 0;
            const area = areas.find(
              (item) => item.id === point.generated_by_area,
            );
            return {
              artifact_id: artifactId,
              type: "image",
              role: "observed",
              uri: `sample://leeville/ai-capture-${sequence}.jpg`,
              media_type: "image/jpeg",
              size_bytes: 0,
              created_by: {
                producer_type: "platform",
                component: "camera-recorder",
              },
              context: {
                action_id: textValue(action.id),
                workflow_id: textValue(flow.id),
                waypoint_id: point.waypoint_id,
              },
              derived_from: [],
              availability: {
                state: "local",
                location: `sample://leeville/captures/ai-capture-${sequence}.jpg`,
              },
              metadata: {
                width_px: 1920,
                height_px: 1080,
                preview: "../leeville/survey-image-contact-sheet.jpg",
                capture_time_s: captureTime,
                capture_pose: {
                  frame_id: "world_enu",
                  x_m: point.x_m,
                  y_m: point.y_m,
                  z_m: point.z_m,
                },
                gimbal_pitch_deg:
                  numberValue(asRecord(area?.reconnaissance).gimbalPitchDeg) ??
                  -90,
                file: {
                  name: `ai-capture-${sequence}.jpg`,
                  kind: "JPEG image",
                  device_make: "SkyTrack",
                  device_model: "Mini-Pro simulated camera",
                },
              },
              local_path: `sample://leeville/captures/ai-capture-${sequence}.jpg`,
            };
          },
        );
        const detectionRecords = aiSnapshotImages.map((image, index) => {
          const confidence = [0.94, 0.88][index] ?? 0.85;
          return {
            artifact_id: `art_leeville_detection_${String(index + 1).padStart(3, "0")}`,
            type: "detection_result",
            role: "submitted",
            uri: `sample://leeville/detections/building-${String(index + 1).padStart(3, "0")}.json`,
            media_type: "application/json",
            size_bytes: 0,
            created_by: {
              producer_type: "participant_code",
              component: "ai-workflow",
              software: { name: aiModel.name, version: aiModel.version },
            },
            context: {
              action_id: `action_leeville_detect_${String(index + 1).padStart(3, "0")}`,
              workflow_id: textValue(aiSnapshotPoints[index]?.flow.id),
            },
            derived_from: [textValue(image.artifact_id)],
            availability: {
              state: "local",
              location: `sample://leeville/detections/building-${String(index + 1).padStart(3, "0")}.json`,
            },
            metadata: {
              object_count: 1,
              classes: { Building: 1 },
              format: "skytrack.detection.v1",
              geometry: {
                type: "polygon",
                coordinate_space: "image_normalized",
              },
              objects: [
                {
                  class: "Building",
                  confidence,
                  polygon: [
                    [0.26 + index * 0.12, 0.28],
                    [0.53 + index * 0.08, 0.3],
                    [0.55 + index * 0.08, 0.68],
                    [0.28 + index * 0.12, 0.66],
                  ],
                },
              ],
            },
            local_path: `sample://leeville/detections/building-${String(index + 1).padStart(3, "0")}.json`,
          };
        });
        const detectionsGeo = aiSnapshotPoints.map(
          ({ flow, point }, index) => ({
            class: "Building",
            confidence: [0.94, 0.88][index] ?? 0.85,
            x_m: point.x_m,
            y_m: point.y_m,
            z_m: point.z_m,
            source_artifact_id: `art_leeville_ai_snapshot_${textValue(flow.id)}`,
            workflow_id: textValue(flow.id),
            model_id: modelId,
          }),
        );
        const aiActions = aiSnapshotPoints.flatMap(
          ({ flow, action, point }, index) => {
            const sequence = String(index + 1).padStart(3, "0");
            const captureTime = waypointTimes.get(point.waypoint_id) ?? 0;
            return [
              {
                action_id: textValue(action.id),
                type: "capture.image",
                name: `${textValue(flow.label, "AI Flow")} snapshot`,
                status: "completed",
                t0_s: captureTime,
                t1_s: captureTime,
                inputs: { workflow_id: textValue(flow.id) },
                outputs: {
                  image_artifact_id: `art_leeville_ai_snapshot_${textValue(flow.id)}`,
                },
              },
              {
                action_id: `action_leeville_detect_${sequence}`,
                type: "perception.detect",
                name: `Detect Building · ${textValue(flow.label, "AI Flow")}`,
                status: "completed",
                t0_s: captureTime,
                t1_s: captureTime + 0.1,
                inputs: {
                  workflow_id: textValue(flow.id),
                  model_id: modelId,
                  object_class: "Building",
                },
                outputs: {
                  detection_artifact_id: `art_leeville_detection_${sequence}`,
                },
              },
            ];
          },
        );
        const aiInvocations = aiSnapshotPoints.map(({ flow, point }, index) => {
          const sequence = String(index + 1).padStart(3, "0");
          return {
            invocation_id: `inv_leeville_building_${sequence}`,
            model_id: modelId,
            input_artifact_id: `art_leeville_ai_snapshot_${textValue(flow.id)}`,
            output_artifact_id: `art_leeville_detection_${sequence}`,
            workflow_id: textValue(flow.id),
            started_s: waypointTimes.get(point.waypoint_id) ?? 0,
            duration_ms: demoInvocationDurationMs,
            result: "with_results",
            result_count: 1,
          };
        });
        const source = reports["simulation-succeeded"];
        const takeoffSeconds =
          waypointTimes.get(waypoints[0]?.waypoint_id) ?? 0;
        const lastWaypointSeconds =
          waypointTimes.get(waypoints.at(-1)?.waypoint_id ?? "") ?? 0;
        const takeoffAltitude = numberValue(mission.takeoffAltM) ?? 12;
        const videoArtifactId = "art_leeville_recording_001";
        const recordingActionId = "action_leeville_recording_001";
        const video =
          recordingFlow && recordingStart !== null && elapsed > recordingStart
            ? {
                artifact_id: videoArtifactId,
                type: "video",
                role: "observed",
                uri: "sample://leeville/flight-recording-001.mp4",
                media_type: "video/mp4",
                size_bytes: 0,
                created_by: {
                  producer_type: "platform",
                  component: "camera-recorder",
                },
                context: {
                  action_id: recordingActionId,
                  workflow_id: textValue(recordingFlow.id),
                },
                derived_from: [],
                availability: {
                  state: "local",
                  location:
                    "sample://leeville/recordings/flight-recording-001.mp4",
                },
                metadata: {
                  start_time_s: recordingStart,
                  duration_ms: (elapsed - recordingStart) * 1000,
                  codec: "h264",
                  width_px: 1920,
                  height_px: 1080,
                  poster:
                    "sample://leeville/recordings/flight-recording-001.jpg",
                  file: {
                    name: "flight-recording-001.mp4",
                    kind: "MPEG-4 movie",
                    device_make: "SkyTrack",
                    device_model: "Mini-Pro simulated camera",
                    duration_ms: (elapsed - recordingStart) * 1000,
                    codec: "H.264",
                  },
                },
                local_path:
                  "sample://leeville/recordings/flight-recording-001.mp4",
              }
            : null;
        return {
          ...source,
          report_id: `rpt_${sample.missionId}_simulated`,
          source: { kind: "simulation", label: "SkyTrack Mission Studio" },
          run: {
            ...asRecord(source.run),
            run_id: `sim_${sample.missionId}`,
            run_name: sample.runLabel,
            status: "completed",
            duration_ms: elapsed * 1000,
          },
          ai_models: aiSnapshotPoints.length
            ? [aiModel, ...configuredModels]
            : [],
          diagnostics: { items: [] },
          event_streams: [],
          invocations: aiInvocations,
          outputs: [],
          expected_outputs: [],
          executions: [
            {
              execution_id: `exec_${sample.missionId}_simulated`,
              status: "completed",
              actions: [
                {
                  action_id: `action_${sample.missionId}_takeoff`,
                  type: "navigation.takeoff",
                  name: "Take off",
                  status: "completed",
                  t0_s: 0,
                  t1_s: takeoffSeconds,
                  inputs: { target_altitude_m: takeoffAltitude },
                },
                {
                  action_id: `action_${sample.missionId}_waypoints`,
                  type: "navigation.waypoints",
                  name: `Fly mission path (${waypoints.length} waypoints)`,
                  status: "completed",
                  t0_s: takeoffSeconds,
                  t1_s: lastWaypointSeconds,
                  inputs: {
                    waypoints: waypoints.length,
                    speed_mps: speed,
                  },
                },
                ...(video
                  ? [
                      {
                        action_id: recordingActionId,
                        type: "capture.video",
                        name: "Record flight video",
                        status: "completed",
                        t0_s: recordingStart,
                        t1_s: elapsed,
                        inputs: {
                          workflow_id: textValue(recordingFlow?.id),
                          trigger: "camera recording-on",
                        },
                        outputs: { video_artifact_id: videoArtifactId },
                      },
                    ]
                  : []),
                ...aiActions,
                {
                  action_id: `action_${sample.missionId}_land`,
                  type: "navigation.land",
                  name: "Return and land",
                  status: "completed",
                  t0_s: lastWaypointSeconds,
                  t1_s: elapsed,
                  inputs: {},
                },
              ],
            },
          ],
          scenario: { world_id: textValue(mission.worldId, sample.world) },
          field: {
            label: sample.world,
            polygon_m: fieldPolygon,
            areas: missionAreas,
            avoids: missionAvoids,
            routes: asRecords(mission.routes).map((route) => ({
              route_id: textValue(route.id),
              label: textValue(route.label, "Route"),
              waypoint_ids: waypoints
                .filter((waypoint) => waypoint.route_id === route.id)
                .map((waypoint) => waypoint.waypoint_id),
            })),
            pad: {
              x_m: numberValue(spawn.x) ?? 0,
              y_m: numberValue(spawn.y) ?? 0,
              z_m: 0,
            },
          },
          waypoints,
          detections_geo: detectionsGeo,
          flight_path: {
            samples,
            distance_m: distance,
            max_altitude_m: Math.max(0, ...waypoints.map((point) => point.z_m)),
            touchdown: {
              x_m: spawnPoint.x_m,
              y_m: spawnPoint.y_m,
              z_m: 0,
              distance_from_pad_m: 0,
            },
            last_position: samples.at(-1) ?? {},
          },
          artifacts: [
            ...images,
            ...aiSnapshotImages,
            ...detectionRecords,
            ...(video ? [video] : []),
          ],
        };
      } catch {
        return reports["simulation-succeeded"];
      }
    }
  }
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
        definition_file: {
          name: sample.missionLogicFile,
          uri: `sample://demo/${sample.missionLogicFile}`,
          local_path: "sample://demo/illustrative-only",
        },
      },
      vehicles: [
        {
          vehicle_id: `demo_vehicle_${sample.demoCase}`,
          name: sample.vehicle,
          vehicle_type: "illustrative multirotor",
          payloads: [],
        },
      ],
      diagnostics: {
        items: sample.issues.map((issue) => ({
          severity: issue.severity.toLowerCase(),
          code: issue.code,
          message: issue.message,
          time_s: issue.time,
        })),
      },
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
  const imageCaptureTimes = new Map(
    artifacts
      .filter((artifact) => artifact.type === "image")
      .map((artifact) => [
        textValue(artifact.artifact_id),
        numberValue(asRecord(artifact.metadata).capture_time_s),
      ]),
  );
  const invocations = asRecords(report.invocations);

  return artifacts
    .filter(
      (artifact) => artifact.type === "image" || artifact.type === "video",
    )
    .map((artifact) => {
      const metadata = asRecord(artifact.metadata);
      const file = asRecord(metadata.file);
      const availability = asRecord(artifact.availability);
      const captureTime = numberValue(
        metadata.capture_time_s ?? metadata.start_time_s,
      );
      const durationMs = numberValue(metadata.duration_ms);
      const recordingEnd =
        captureTime !== null && durationMs !== null
          ? captureTime + durationMs / 1000
          : null;
      const recordingDetectionInvocations =
        artifact.type === "video" &&
        captureTime !== null &&
        recordingEnd !== null
          ? invocations.filter((invocation) => {
              if (invocation.result !== "with_results") return false;
              const sourceCaptureTime = imageCaptureTimes.get(
                textValue(invocation.input_artifact_id),
              );
              const invocationTime = numberValue(invocation.started_s);
              return (
                sourceCaptureTime !== undefined &&
                sourceCaptureTime !== null &&
                sourceCaptureTime >= captureTime &&
                sourceCaptureTime <= recordingEnd &&
                invocationTime !== null &&
                invocationTime >= captureTime &&
                invocationTime <= recordingEnd
              );
            })
          : [];
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
      const previewPath = textValue(metadata.preview, "");
      const previewName = previewPath.split("/").at(-1) ?? "";
      const staticPreview =
        availability.state === "local"
          ? (imageAssets[`./sample-data/${folder}/${previewName}`] ??
            imageAssets[`./sample-data/${folder}/${assetName}`] ??
            null)
          : null;
      const imageUrl = sample.missionId
        ? (missionCapturePreview(textValue(artifact.artifact_id)) ??
          staticPreview)
        : staticPreview;
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
        detectionEventsDuringRecording: recordingDetectionInvocations.length,
        detectedAreasDuringRecording: recordingDetectionInvocations.reduce(
          (total, invocation) =>
            total + (numberValue(invocation.result_count) ?? 0),
          0,
        ),
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
  if (sample.missionId)
    return (
      imageAssets["./sample-data/leeville/stressed-area-map-preview.jpg"] ??
      null
    );
  if (sample.demoCase) return null;
  const folder = sampleFolder[sample.key];
  return imageAssets[`./sample-data/world/${folder}-top.jpg`] ?? null;
}

export function missionLogicSource(sample: MissionInsightSample): string {
  if (sample.demoCase) {
    return JSON.stringify(
      {
        demo_fixture: true,
        scenario: sample.runLabel,
        mission: sample.missionLogicDescription,
        outcome: sample.outcome,
        evidence: evidenceCompletenessCopy(sample),
      },
      null,
      2,
    );
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
