import type { useAddressSearch } from "../search/use-address-search";
import type { StudioMission } from "../../domain/mission-model";
import type { MissionWorldModelSource } from "../scene/mission-scene-types";
import type { useMissionCommands } from "./use-mission-commands";
import type { useStudioRouting } from "./use-studio-routing";
import type { useStudioSceneSession } from "./use-studio-scene-session";
import type { useStudioSimulationModel } from "./use-studio-simulation-model";
import type { useStudioUiState } from "./use-studio-ui-state";
import type { useDrawingSession } from "./use-drawing-session";
import { clampSnapRuler } from "../design/drawing/drawing-altitude-utils";
import { useDialogFocusReturn } from "./use-dialog-focus-return";
import StudioSceneViewport from "./studio-scene-viewport";

interface StudioShellSceneViewportProps {
  mission: StudioMission;
  ui: ReturnType<typeof useStudioUiState>;
  drawing: ReturnType<typeof useDrawingSession>;
  routing: ReturnType<typeof useStudioRouting>;
  simulation: ReturnType<typeof useStudioSimulationModel>;
  scene: ReturnType<typeof useStudioSceneSession>;
  addressSearch: ReturnType<typeof useAddressSearch>;
  commands: ReturnType<typeof useMissionCommands>;
  worldModel: MissionWorldModelSource;
  sceneDrawingAltitudeM: number;
  dialogFocus: ReturnType<typeof useDialogFocusReturn>;
}

export function StudioShellSceneViewport({
  mission,
  ui,
  drawing,
  routing,
  simulation,
  scene,
  addressSearch,
  commands,
  worldModel,
  sceneDrawingAltitudeM,
  dialogFocus,
}: StudioShellSceneViewportProps) {
  const { stage, selection, settings, basemapStyle, showPhotoMarkers,
    showCameraFootprint, footprintOpacity } = ui;
  const { tool, pending, pendingShape, draftCursor, closeDraftAtStart,
    drawingAltM, draftAreaSettings, draftAvoidSettings } = drawing;
  const { missionDroneValue, missionDroneChoices } = routing;
  const { plan, sim } = simulation;
  const { sceneRef, previewPositionRef, previewCaptureRef,
    onSceneReadinessChange } = scene;
  const drawingActive = tool === "route" || tool === "area" || tool === "avoid";
  const editModeActive = stage === "design" &&
    (drawingActive || ui.detailEditActive);
  const simActive = stage === "simulation";

  return (
    <StudioSceneViewport
      mission={mission}
      hideContextCards={ui.aiModelsOpen}
      sceneRef={sceneRef}
      sceneProps={{
        mission,
        tool: stage === "design" ? tool : "select",
        selection,
        simActive,
        clockRef: sim.clockRef,
        previewPositionRef,
        previewCaptureRef,
        plan,
        reducedMotion: settings.reducedMotion,
        showPhotoMarkers,
        showCameraFootprint,
        footprintOpacity,
        showAreaSurface: editModeActive,
        basemap: basemapStyle,
        searchMarker: addressSearch.visibleSearchMarker,
        worldModel,
        pendingPoints: pending,
        pendingShape,
        draftCursor,
        closeDraftAtStart,
        draftAreaSettings,
        draftAvoidSettings,
        drawingAltM: sceneDrawingAltitudeM,
        planeVisible: drawingActive && stage === "design",
        onPickWaypoint: (id) => {
          ui.setSelection({ kind: "waypoint", id });
          const waypoint = mission.waypoints.find((item) => item.id === id);
          if (waypoint) ui.say(`Waypoint ${waypoint.seq} selected.`);
        },
        onPickZone: (kind, id) => {
          ui.setSelection({ kind, id });
          ui.say(`${kind === "area" ? "Area" : "Avoid zone"} selected.`);
        },
        onClearSelection: () => ui.setSelection(null),
        onScenePoint: commands.onScenePoint,
        onDraftHover: drawing.onDraftHover,
        onClosePending: commands.closePendingShape,
        onInsertWaypoint: commands.insertWaypointAt,
        onRemoveWaypoint: commands.removeWaypointById,
        onWaypointAltitudeChange: commands.onWaypointAltitudeChange,
        onWaypointPositionChange: commands.onWaypointPositionChange,
        onAvoidHeightChange: commands.onAvoidHeightChange,
        onPendingPositionChange: drawing.onPendingPositionChange,
        onPendingAltitudeChange: drawing.onPendingAltitudeChange,
        onInsertPendingPoint: drawing.onInsertPendingPoint,
        onRemovePendingPoint: drawing.onRemovePendingPoint,
        onReadinessChange: onSceneReadinessChange,
      }}
      editModeActive={editModeActive}
      drawing={drawingActive}
      stageIsDesign={stage === "design"}
      toolIsArea={tool === "area" && mission.worldType === "2D"}
      simActive={simActive}
      lidarOn={ui.lidarOn}
      plan={plan}
      simClockRef={sim.clockRef}
      reducedMotion={settings.reducedMotion}
      drawingAltM={drawingAltM}
      onDrawingAltitudeCommit={(value) =>
        drawing.setDrawingAltM(clampSnapRuler(value))
      }
      onAnnounce={ui.say}
      droneChoices={missionDroneChoices}
      selectedDroneValue={missionDroneValue}
      onSelectVehicle={commands.onSelectVehicle}
      onOpenWorldPicker={() =>
        dialogFocus.openWithFocusReturn(() => ui.setWorldPickerOpen(true))
      }
      addressSearch={addressSearch}
      stage={stage}
      showPhotoMarkers={showPhotoMarkers}
      onShowPhotoMarkersChange={ui.setShowPhotoMarkers}
      showCameraFootprint={showCameraFootprint}
      onShowCameraFootprintChange={ui.setShowCameraFootprint}
      footprintOpacity={footprintOpacity}
      onFootprintOpacityChange={ui.setFootprintOpacity}
      basemapStyle={basemapStyle}
      onBasemapStyleChange={ui.setBasemapStyle}
    />
  );
}
