import { useCallback } from "react";
import { isValidRing, type StudioMission } from "../../domain/mission-model";
import type { SimEventItem } from "../simulation/simulation";
import type { useMissionCommands } from "./use-mission-commands";
import type { useDrawingSession } from "./use-drawing-session";
import type { useStudioActions } from "./use-studio-actions";
import type { useStudioSceneSession } from "./use-studio-scene-session";
import type { useStudioSimulationModel } from "./use-studio-simulation-model";
import type { useStudioUiState } from "./use-studio-ui-state";
import StudioInspector from "./studio-inspector";
import type { AIModelCardModel } from "../../ui/components/ai-model-card";

type InspectorUiState = Pick<
  ReturnType<typeof useStudioUiState>,
  | "appTab"
  | "stage"
  | "selection"
  | "codeView"
  | "previewView"
  | "codeDraft"
  | "codeLang"
  | "aiModelsOpen"
  | "selectedAIModelId"
  | "jsonDraft"
  | "jsonError"
  | "rightOpen"
  | "simTab"
  | "settings"
  | "simSettingsOpen"
  | "setSelection"
  | "setDetailEditActive"
  | "setCodeDraft"
  | "setPreviewView"
  | "setAIModelsOpen"
  | "setSelectedAIModelId"
  | "setJsonDraft"
  | "setRightOpen"
  | "setSimTab"
  | "setSettings"
  | "setSimSettingsOpen"
  | "say"
>;

type InspectorDrawingState = Pick<
  ReturnType<typeof useDrawingSession>,
  | "tool"
  | "pending"
  | "pendingShape"
  | "draftCursor"
  | "drawingAltM"
  | "draftAreaSettings"
  | "draftAvoidSettings"
  | "setPending"
  | "setDraftAreaSettings"
  | "setDraftAvoidSettings"
  | "cancelPending"
>;

type InspectorSimulationState = Pick<
  ReturnType<typeof useStudioSimulationModel>,
  | "issues"
  | "derivedTransfers"
  | "gate"
  | "plan"
  | "sim"
  | "totalT"
  | "telemetry"
>;

type InspectorSceneState = Pick<
  ReturnType<typeof useStudioSceneSession>,
  "previewPositionRef" | "previewCaptureRef"
>;

type InspectorCommands = Pick<
  ReturnType<typeof useMissionCommands>,
  | "finishPending"
  | "closePendingShape"
  | "updateMissionFromPanel"
  | "previewMissionFromPanel"
  | "commitPanelPreview"
  | "cancelPanelPreview"
  | "onMoveWaypoint"
  | "onReorderWaypoint"
  | "onMoveAction"
  | "onDeleteAction"
  | "onAddWaypointToRoute"
  | "onDeleteRoute"
  | "onInsertActionAt"
  | "onAddZone"
  | "onDeleteWaypoint"
  | "onDeleteZone"
  | "onRenameZone"
>;

type InspectorActions = Pick<
  ReturnType<typeof useStudioActions>,
  | "openCodeView"
  | "handleCodeLangChange"
  | "handleApplyJson"
  | "handleExportJson"
>;

interface StudioInspectorContainerProps {
  mission: StudioMission;
  ui: InspectorUiState;
  drawing: InspectorDrawingState;
  simulation: InspectorSimulationState;
  scene: InspectorSceneState;
  commands: InspectorCommands;
  actions: InspectorActions;
  onSelectEvent: (event: SimEventItem) => void;
  aiModels: AIModelCardModel[];
  onImportAIModel: () => void;
  inspectorWidth: number | null;
  onInspectorWidthChange: (width: number) => void;
}

export default function StudioInspectorContainer({
  mission,
  ui,
  drawing,
  simulation,
  scene,
  commands,
  actions,
  onSelectEvent,
  aiModels,
  onImportAIModel,
  inspectorWidth,
  onInspectorWidthChange,
}: StudioInspectorContainerProps) {
  const routeDraftActive =
    ui.appTab === "plan" && ui.stage === "design" && drawing.tool === "route";
  const zoneDraftActive =
    ui.appTab === "plan" &&
    ui.stage === "design" &&
    (drawing.tool === "area" || drawing.tool === "avoid");
  const routeDraftZ =
    Math.round(Math.max(drawing.drawingAltM, mission.takeoffAltM) * 10) / 10;
  const addWaypointToRoute = useCallback(
    (routeId?: string) => commands.onAddWaypointToRoute(routeId ?? ""),
    [commands.onAddWaypointToRoute],
  );
  const collapseInspectorPane = useCallback(
    () => ui.setRightOpen(false),
    [ui.setRightOpen],
  );

  return (
    <StudioInspector
      visible={ui.appTab === "plan" && ui.rightOpen}
      stageIsDesign={ui.stage === "design"}
      codeView={ui.codeView}
      routeDraftActive={routeDraftActive}
      zoneDraftActive={zoneDraftActive}
      routeDraft={{
        mission,
        pending: drawing.pending,
        routeDraftZ,
        setPending: drawing.setPending,
        onCancel: drawing.cancelPending,
        onCommit: commands.finishPending,
      }}
      zoneDraft={{
        kind: drawing.tool === "area" ? "area" : "avoid",
        shape: drawing.pendingShape,
        pointCount: drawing.pending.length,
        canCommit:
          drawing.pendingShape === "polygon"
            ? drawing.pending.length >= 3 && isValidRing(drawing.pending)
            : drawing.pending.length === 1 &&
              !!drawing.draftCursor &&
              Math.hypot(
                drawing.draftCursor.x - drawing.pending[0].x,
                drawing.draftCursor.y - drawing.pending[0].y,
              ) >= 0.5,
        area: drawing.draftAreaSettings,
        avoid: drawing.draftAvoidSettings,
        className: "m-[0.75rem]",
        onAreaChange: drawing.setDraftAreaSettings,
        onAvoidChange: drawing.setDraftAvoidSettings,
        onCommit: commands.closePendingShape,
        onCancel: drawing.cancelPending,
      }}
      design={{
        mission,
        previewPositionRef: scene.previewPositionRef,
        previewCaptureRef: scene.previewCaptureRef,
        worldType: mission.worldType ?? "3D",
        issues: simulation.issues,
        selection: ui.selection,
        codeView: ui.codeView,
        previewView: ui.previewView,
        codeDraft: ui.codeDraft,
        codeLang: ui.codeLang,
        aiModels,
        aiModelsOpen: ui.aiModelsOpen,
        selectedAIModelId: ui.selectedAIModelId,
        jsonDraft: ui.jsonDraft,
        jsonError: ui.jsonError,
        onCodeViewChange: actions.openCodeView,
        onPreviewViewChange: ui.setPreviewView,
        onCodeDraftChange: ui.setCodeDraft,
        onCodeLangChange: actions.handleCodeLangChange,
        onAIModelsOpenChange: ui.setAIModelsOpen,
        onSelectAIModel: ui.setSelectedAIModelId,
        onImportAIModel,
        onJsonDraftChange: ui.setJsonDraft,
        onApplyJson: actions.handleApplyJson,
        onExportJson: actions.handleExportJson,
        onSelect: ui.setSelection,
        onUpdateMission: commands.updateMissionFromPanel,
        onPreviewMission: commands.previewMissionFromPanel,
        onCommitPreview: commands.commitPanelPreview,
        onCancelPreview: commands.cancelPanelPreview,
        onDetailEditStateChange: ui.setDetailEditActive,
        onAddWaypoint: addWaypointToRoute,
        transfers: simulation.derivedTransfers,
        onDeleteRoute: commands.onDeleteRoute,
        onDeleteWaypoint: commands.onDeleteWaypoint,
        onMoveWaypoint: commands.onMoveWaypoint,
        onReorderWaypoint: commands.onReorderWaypoint,
        onMoveAction: commands.onMoveAction,
        onInsertActionAt: commands.onInsertActionAt,
        onDeleteAction: commands.onDeleteAction,
        onAddZone: commands.onAddZone,
        onDeleteZone: commands.onDeleteZone,
        onRenameZone: commands.onRenameZone,
        onCollapsePane: collapseInspectorPane,
        onAnnounce: ui.say,
      }}
      simulationSettingsOpen={ui.simSettingsOpen}
      inspectorWidth={inspectorWidth}
      onInspectorWidthChange={onInspectorWidthChange}
      simulationSettings={{
        settings: ui.settings,
        maxSeq: mission.waypoints.length,
        onChange: (nextSettings) => {
          ui.setSettings(nextSettings);
          ui.say("Simulation settings updated.");
        },
        onClose: () => {
          ui.setSimSettingsOpen(false);
          ui.say("Simulation settings closed.");
        },
      }}
      simulation={{
        mission,
        plan: simulation.plan,
        gateReason: simulation.gate.reason,
        telemetry: simulation.telemetry,
        status: simulation.sim.status,
        simT: simulation.sim.simT,
        totalT: simulation.totalT,
        runIndex: simulation.sim.runIndex,
        log: simulation.sim.log,
        fired: simulation.sim.fired,
        settings: ui.settings,
        showConsole: ui.codeView,
        onRun: simulation.sim.start,
        onPause: simulation.sim.pause,
        onResume: simulation.sim.resume,
        onAbort: simulation.sim.abort,
        onRestart: simulation.sim.restart,
        onSelectEvent,
        tab: ui.simTab,
        onTabChange: ui.setSimTab,
      }}
    />
  );
}
