import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import {
  appendMissionSequenceItem,
  circleFootprint,
  generateAreaScan,
  isValidRing,
  renumber,
  uid,
  type EnuPoint,
  type MissionArea,
  type SceneSelection,
  type SceneTool,
  type StudioMission,
} from "../../domain/mission-model";
import { getMissionRoutes } from "../../domain/mission-model";
import {
  recomputeGeneratedMission,
  refreshAvoidDetours,
} from "../../domain/mission-generation";
import type {
  DraftAreaSettings,
  DraftAvoidSettings,
  FinishPending,
  PendingMissionPoint,
  PendingMissionShape,
} from "./use-drawing-session";

interface UseMissionDrawingCommandsArgs {
  mission: StudioMission;
  stage: "design" | "simulation";
  tool: SceneTool;
  setTool: Dispatch<SetStateAction<SceneTool>>;
  drawingAltM: number;
  pending: PendingMissionPoint[];
  pendingShape: PendingMissionShape;
  selection: SceneSelection | null;
  draftCursor: EnuPoint | null;
  draftAreaSettings: DraftAreaSettings;
  draftAvoidSettings: DraftAvoidSettings;
  setPending: Dispatch<SetStateAction<PendingMissionPoint[]>>;
  setDraftCursor: Dispatch<SetStateAction<EnuPoint | null>>;
  setCloseDraftAtStart: Dispatch<SetStateAction<boolean>>;
  setSelection: Dispatch<SetStateAction<SceneSelection | null>>;
  finishPendingRef: MutableRefObject<FinishPending>;
  commit: (next: StudioMission, label?: string) => void;
  say: (message: string) => void;
  detourNote: (mission: StudioMission) => string;
}

export function useMissionDrawingCommands({
  mission,
  stage,
  tool,
  setTool,
  drawingAltM,
  pending,
  pendingShape,
  selection,
  draftCursor,
  draftAreaSettings,
  draftAvoidSettings,
  setPending,
  setDraftCursor,
  setCloseDraftAtStart,
  setSelection,
  finishPendingRef,
  commit,
  say,
  detourNote,
}: UseMissionDrawingCommandsArgs) {
  const onScenePoint = useCallback(
    (p: EnuPoint) => {
      if (stage !== "design") return;
      if (tool === "home") {
        const x = Math.round(p.x * 10) / 10;
        const y = Math.round(p.y * 10) / 10;
        commit(
          { ...mission, spawn: { x, y } },
          `Home point set at ${x.toFixed(1)}, ${y.toFixed(1)} m.`,
        );
        setSelection(null);
        setTool("select");
        return;
      }
      if (tool === "route") {
        const clickZ =
          Math.round(Math.max(drawingAltM, mission.takeoffAltM) * 10) / 10;
        setPending((prev) => [
          ...prev,
          {
            x: Math.round(p.x * 10) / 10,
            y: Math.round(p.y * 10) / 10,
            z: clickZ,
          },
        ]);
      } else if (tool === "area" || tool === "avoid") {
        const point = {
          x: Math.round(p.x * 10) / 10,
          y: Math.round(p.y * 10) / 10,
        };
        if (pendingShape === "cylinder") {
          if (pending.length === 0) {
            setPending([point]);
            setDraftCursor(null);
            return;
          }
          const center = pending[0];
          const radiusM = Math.hypot(point.x - center.x, point.y - center.y);
          if (radiusM < 0.5) {
            say(
              "Move farther from the center to set a cylinder radius of at least 0.5 m.",
            );
            return;
          }
          finishPendingRef.current(
            circleFootprint(center, radiusM),
            "cylinder",
            center,
            radiusM,
          );
          return;
        }
        setPending((prev) => [...prev, point]);
      }
    },
    [commit, drawingAltM, mission, pending, pendingShape, say, stage, tool],
  );

  const onAvoidHeightChange = useCallback(
    (id: string, heightM: number) => {
      const clamped = Math.max(0, Number.isFinite(heightM) ? heightM : 0);
      const next = {
        ...mission,
        avoids: mission.avoids.map((zone) =>
          zone.id === id
            ? { ...zone, heightM: Math.round(clamped * 10) / 10 }
            : zone,
        ),
      };
      const keepSelection = selection;
      const out = refreshAvoidDetours(next, mission);
      commit(
        out,
        `Avoid height set to ${clamped.toFixed(1)} m.${detourNote(out)}`,
      );
      if (keepSelection) setSelection(keepSelection);
      else setSelection({ kind: "avoid", id });
    },
    [commit, detourNote, mission, selection],
  );

  const finishPending = useCallback(
    (
      overridePoints?: (EnuPoint & { z?: number })[],
      overrideShape?: "polygon" | "cylinder",
      circleCenter?: EnuPoint,
      circleRadiusM?: number,
    ) => {
      const points = overridePoints ?? pending;
      const shape = overrideShape ?? pendingShape;
      if (tool === "route") {
        if (points.length < 2) {
          say("Route needs at least 2 waypoints. Add another point or cancel.");
          return;
        }
        const routes = getMissionRoutes(mission);
        const routeId = uid("route");
        const routeLabel = `Route ${routes.length + 1}`;
        const added = points.map((p) => ({
          id: uid("wp"),
          seq: 0,
          x: p.x,
          y: p.y,
          z:
            p.z ??
            Math.round(Math.max(drawingAltM, mission.takeoffAltM) * 10) / 10,
          actions: [],
          routeId,
        }));
        const out = recomputeGeneratedMission(
          {
            ...mission,
            routes: [
              ...(mission.routes ?? routes),
              {
                id: routeId,
                label: routeLabel,
                targetSpeedMS: mission.targetSpeedMS,
              },
            ],
            sequenceOrder: appendMissionSequenceItem(mission, {
              type: "route",
              id: routeId,
            }),
            waypoints: renumber([...mission.waypoints, ...added]),
          },
          mission,
        );
        commit(
          out,
          `${routeLabel} committed: ${added.length} waypoints.${detourNote(out)}`,
        );
        setSelection({ kind: "waypoint", id: added[0].id });
        setPending([]);
        setDraftCursor(null);
        setCloseDraftAtStart(false);
        setTool("select");
        return;
      }
      if (tool === "area" || tool === "avoid") {
        if (points.length < 3) {
          say(
            `${tool === "area" ? "Area" : "Avoid zone"} needs at least 3 points — keep clicking the scene.`,
          );
          return;
        }
        const label =
          tool === "area"
            ? `Area ${mission.areas.length + 1}`
            : `Avoid ${mission.avoids.length + 1}`;
        if (!isValidRing(points)) {
          say(
            `${tool === "area" ? "Area" : "Avoid zone"} outline crosses itself or has zero area. Adjust points and try again.`,
          );
          return;
        }
        if (tool === "area") {
          const baseAltM =
            mission.worldType === "2D"
              ? 0
              : Math.round(Math.max(0, drawingAltM) * 10) / 10;
          const area: MissionArea = {
            id: uid("area"),
            label,
            points,
            shape,
            center: circleCenter,
            radiusM: circleRadiusM,
            ...draftAreaSettings,
            baseAltM,
          };
          area.scanLines = generateAreaScan(area);
          if (area.scanLines.length === 0) {
            say(
              "Area created no scan lanes. Make area larger or reduce spacing/padding.",
            );
            return;
          }
          const next = recomputeGeneratedMission(
            {
              ...mission,
              areas: [...mission.areas, area],
              sequenceOrder: appendMissionSequenceItem(mission, {
                type: "area",
                id: area.id,
              }),
            },
            mission,
          );
          commit(
            next,
            `${label} committed with ${area.scanLines.length} scan lanes.${detourNote(next)}`,
          );
          setSelection({ kind: "area", id: area.id });
        } else {
          const zone = {
            id: uid("avoid"),
            label,
            points,
            shape,
            center: circleCenter,
            radiusM: circleRadiusM,
            ...draftAvoidSettings,
            baseAltM: Math.round(Math.max(0, drawingAltM) * 10) / 10,
          };
          const next = refreshAvoidDetours(
            { ...mission, avoids: [...mission.avoids, zone] },
            mission,
          );
          commit(
            next,
            `${label} added as a 15 m prism with 2 m clearance.${detourNote(next)}`,
          );
          setSelection({ kind: "avoid", id: zone.id });
        }
        setPending([]);
        setDraftCursor(null);
        setCloseDraftAtStart(false);
        setTool("select");
        return;
      }
      setTool("select");
      setPending([]);
    },
    [
      commit,
      detourNote,
      draftAreaSettings,
      draftAvoidSettings,
      drawingAltM,
      mission,
      pending,
      pendingShape,
      tool,
      say,
    ],
  );

  finishPendingRef.current = finishPending;

  const closePendingShape = useCallback(() => {
    if ((tool === "area" || tool === "avoid") && pendingShape === "cylinder") {
      const center = pending[0];
      if (!center || !draftCursor) return;
      const radiusM = Math.hypot(
        draftCursor.x - center.x,
        draftCursor.y - center.y,
      );
      if (radiusM < 0.5) return;
      finishPending(
        circleFootprint(center, radiusM),
        "cylinder",
        center,
        radiusM,
      );
      return;
    }
    finishPending();
  }, [draftCursor, finishPending, pending, pendingShape, tool]);
  return {
    onScenePoint,
    onAvoidHeightChange,
    finishPending,
    closePendingShape,
  };
}
