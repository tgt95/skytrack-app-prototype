import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import {
  WORLDS,
  countDetours,
  removeMissionSequenceItem,
  type EnuPoint,
  type SceneSelection,
  type SceneTool,
  type StudioMission,
} from "../../domain/mission-model";
import {
  recomputeGeneratedMission,
  refreshAvoidDetours,
} from "../../domain/mission-generation";
import type { WorkspaceWorldRecord } from "../library/database/workspace-resources-store";
import type { MissionWorldOption } from "./studio-dialogs";
import type {
  DraftAreaSettings,
  DraftAvoidSettings,
  FinishPending,
  PendingMissionPoint,
  PendingMissionShape,
} from "./use-drawing-session";
import { useMissionPanelEdits } from "./use-mission-panel-edits";
import { useMissionWaypointCommands } from "./use-mission-waypoint-commands";
import { useMissionDrawingCommands } from "./use-mission-drawing-commands";
import type { StudioMissionDocumentAction } from "./mission-document";

interface UseMissionCommandsArgs {
  mission: StudioMission;
  stage: "design" | "simulation";
  tool: SceneTool;
  setTool: Dispatch<SetStateAction<SceneTool>>;
  selection: SceneSelection | null;
  setSelection: Dispatch<SetStateAction<SceneSelection | null>>;
  pending: PendingMissionPoint[];
  pendingShape: PendingMissionShape;
  setPendingShape: Dispatch<SetStateAction<PendingMissionShape>>;
  drawingAltM: number;
  draftCursor: EnuPoint | null;
  draftAreaSettings: DraftAreaSettings;
  draftAvoidSettings: DraftAvoidSettings;
  setPending: Dispatch<SetStateAction<PendingMissionPoint[]>>;
  setDraftCursor: Dispatch<SetStateAction<EnuPoint | null>>;
  setCloseDraftAtStart: Dispatch<SetStateAction<boolean>>;
  finishPendingRef: MutableRefObject<FinishPending>;
  commit: (next: StudioMission, label?: string) => void;
  say: (message: string) => void;
  dispatchDocument: Dispatch<StudioMissionDocumentAction>;
  panelPreviewBaseRef: MutableRefObject<StudioMission | null>;
  missionWorldOptions: MissionWorldOption[];
  selectableMissionWorlds: WorkspaceWorldRecord[];
  setWorldPickerOpen: Dispatch<SetStateAction<boolean>>;
}

export function useMissionCommands({
  mission,
  stage,
  tool,
  setTool,
  selection,
  setSelection,
  pending,
  pendingShape,
  setPendingShape,
  drawingAltM,
  draftCursor,
  draftAreaSettings,
  draftAvoidSettings,
  setPending,
  setDraftCursor,
  setCloseDraftAtStart,
  finishPendingRef,
  commit,
  say,
  dispatchDocument,
  panelPreviewBaseRef,
  missionWorldOptions,
  selectableMissionWorlds,
  setWorldPickerOpen,
}: UseMissionCommandsArgs) {
  const detourNote = useCallback((out: StudioMission): string => {
    const count = countDetours(out);
    return count > 0
      ? ` Includes ${count} generated avoid-detour waypoint${count === 1 ? "" : "s"}.`
      : "";
  }, []);

  const panelEdits = useMissionPanelEdits({
    mission,
    selection,
    setSelection,
    commit,
    dispatchDocument,
    panelPreviewBaseRef,
    say,
  });
  const {
    updateMissionFromPanel,
    previewMissionFromPanel,
    commitPanelPreview,
    previewGroupMove,
    commitGroupMove,
    cancelPanelPreview,
  } = panelEdits;
  const waypointCommands = useMissionWaypointCommands({
    mission,
    setSelection,
    commit,
    say,
    detourNote,
  });
  const {
    addWaypointAt,
    insertWaypointAt,
    removeWaypointById,
    onWaypointAltitudeChange,
    onWaypointPositionChange,
    onMoveWaypoint,
    onReorderWaypoint,
    onMoveAction,
    onDeleteAction,
    onAddWaypointToRoute,
    onDeleteRoute,
    onInsertActionAt,
  } = waypointCommands;
  const drawingCommands = useMissionDrawingCommands({
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
  });
  const {
    onScenePoint,
    onAvoidHeightChange,
    finishPending,
    closePendingShape,
  } = drawingCommands;

  const deleteSelection = useCallback(() => {
    if (!selection) return;
    if (selection.kind === "waypoint") {
      removeWaypointById(selection.id);
      return;
    }
    if (selection.kind === "spawn") {
      say("Spawn point is required and cannot be deleted.");
      return;
    }
    if (selection.kind === "area") {
      commit(
        recomputeGeneratedMission(
          {
            ...mission,
            areas: mission.areas.filter((a) => a.id !== selection.id),
            sequenceOrder: removeMissionSequenceItem(mission, {
              type: "area",
              id: selection.id,
            }),
            waypoints: mission.waypoints.filter(
              (wp) => wp.generatedByArea !== selection.id,
            ),
          },
          mission,
        ),
        "Area and generated scan waypoints deleted. Avoid detours recomputed.",
      );
      return;
    }
    const out = refreshAvoidDetours(
      {
        ...mission,
        avoids: mission.avoids.filter((a) => a.id !== selection.id),
      },
      mission,
    );
    commit(out, "Avoid zone deleted. Obsolete detours removed.");
  }, [commit, mission, removeWaypointById, selection, say]);

  const onSelectVehicle = useCallback(
    (droneId: string, label: string) => {
      if (droneId === mission.droneId && label === mission.vehicle) return;
      updateMissionFromPanel(
        { ...mission, vehicle: label, droneId },
        `Drone set to ${label}. Compatibility checks updated.`,
      );
    },
    [mission, updateMissionFromPanel],
  );

  const onSelectWorld = useCallback(
    (worldId: string) => {
      const selected = missionWorldOptions.find(
        (world) => world.id === worldId,
      );
      if (!selected) return;
      const nextWorldId =
        selected.status === "Legacy"
          ? mission.worldId === selected.id
            ? mission.worldId
            : undefined
          : selected.id;
      if (selected.name === mission.world && nextWorldId === mission.worldId)
        return;
      updateMissionFromPanel(
        { ...mission, world: selected.name, worldId: nextWorldId },
        `World set to ${selected.name}.`,
      );
      setWorldPickerOpen(false);
    },
    [mission, missionWorldOptions, setWorldPickerOpen, updateMissionFromPanel],
  );

  const onSelectImportedWorld = useCallback(
    (world: Pick<WorkspaceWorldRecord, "id" | "name">) => {
      const nextMission = recomputeGeneratedMission(
        {
          ...mission,
          worldType: "3D",
          world: world.name,
          worldId: world.id,
        },
        mission,
      );
      updateMissionFromPanel(nextMission, `World set to ${world.name}.`);
      setWorldPickerOpen(false);
    },
    [mission, setWorldPickerOpen, updateMissionFromPanel],
  );

  const onSelectWorldType = useCallback(
    (worldType: "2D" | "3D") => {
      if (worldType === (mission.worldType ?? "3D")) return;
      const nextMissionBase = {
        ...mission,
        worldType,
        ...(worldType === "2D"
          ? { world: WORLDS[0], worldId: undefined }
          : {
              world: selectableMissionWorlds[0]?.name ?? mission.world,
              worldId: selectableMissionWorlds[0]?.id,
            }),
      };
      const nextMission = recomputeGeneratedMission(nextMissionBase, mission);
      updateMissionFromPanel(nextMission, `Mission type set to ${worldType}.`);
    },
    [mission, selectableMissionWorlds, updateMissionFromPanel],
  );

  const onAddZone = useCallback(
    (kind: "area" | "avoid") => {
      setPending([]);
      setPendingShape("polygon");
      setDraftCursor(null);
      setCloseDraftAtStart(false);
      setSelection(null);
      setTool(kind);
      say(
        `${kind === "area" ? "Area" : "Avoid zone"} drawing started. Click the scene to place polygon points.`,
      );
    },
    [say],
  );

  const onDeleteWaypoint = useCallback(
    (id: string) => {
      const waypoint = mission.waypoints.find((item) => item.id === id);
      if (!waypoint) return;
      if (!waypoint.generatedByArea && !waypoint.generatedByAvoid)
        setSelection({ kind: "waypoint", id });
      removeWaypointById(id);
    },
    [mission.waypoints, removeWaypointById, setSelection],
  );

  const onDeleteZone = useCallback(
    (kind: "area" | "avoid", id: string) => {
      if (kind === "area") {
        commit(
          recomputeGeneratedMission(
            {
              ...mission,
              areas: mission.areas.filter((area) => area.id !== id),
              sequenceOrder: removeMissionSequenceItem(mission, {
                type: "area",
                id,
              }),
              waypoints: mission.waypoints.filter(
                (waypoint) => waypoint.generatedByArea !== id,
              ),
            },
            mission,
          ),
          "Area and generated scan waypoints deleted. Avoid detours recomputed.",
        );
      } else {
        commit(
          refreshAvoidDetours(
            {
              ...mission,
              avoids: mission.avoids.filter((zone) => zone.id !== id),
            },
            mission,
          ),
          "Avoid zone deleted. Obsolete detours removed.",
        );
      }
    },
    [commit, mission],
  );

  const onRenameZone = useCallback(
    (kind: "area" | "avoid", id: string, label: string) => {
      if (kind === "area")
        commit({
          ...mission,
          areas: mission.areas.map((area) =>
            area.id === id ? { ...area, label } : area,
          ),
        });
      else
        commit({
          ...mission,
          avoids: mission.avoids.map((zone) =>
            zone.id === id ? { ...zone, label } : zone,
          ),
        });
    },
    [commit, mission],
  );

  return {
    detourNote,
    addWaypointAt,
    onScenePoint,
    insertWaypointAt,
    removeWaypointById,
    onWaypointAltitudeChange,
    onWaypointPositionChange,
    updateMissionFromPanel,
    previewMissionFromPanel,
    commitPanelPreview,
    previewGroupMove,
    commitGroupMove,
    cancelPanelPreview,
    onAvoidHeightChange,
    finishPending,
    closePendingShape,
    deleteSelection,
    onMoveWaypoint,
    onReorderWaypoint,
    onMoveAction,
    onSelectVehicle,
    onSelectWorld,
    onSelectImportedWorld,
    onSelectWorldType,
    onDeleteAction,
    onAddWaypointToRoute,
    onDeleteRoute,
    onInsertActionAt,
    onAddZone,
    onDeleteWaypoint,
    onDeleteZone,
    onRenameZone,
  };
}
