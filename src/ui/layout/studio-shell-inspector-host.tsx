import StudioInspectorContainer from "../../features/studio/studio-inspector-container";
import type { useStudioActions } from "../../features/studio/use-studio-actions";
import type { useDrawingSession } from "../../features/studio/use-drawing-session";
import type { useMissionCommands } from "../../features/studio/use-mission-commands";
import type { useStudioSceneSession } from "../../features/studio/use-studio-scene-session";
import type { useStudioSimulationModel } from "../../features/studio/use-studio-simulation-model";
import type { useStudioUiState } from "../../features/studio/use-studio-ui-state";
import type { SimEventItem } from "../../features/simulation/simulation";
import type { StudioMission } from "../../domain/mission-model";
import type { AIModelCardModel } from "../components/ai-model-card";

export function StudioShellInspectorHost({
  mission,
  aiModels,
  onImportAIModel,
  onDeleteAIModel,
  ui,
  drawing,
  simulation,
  scene,
  commands,
  actions,
  onSelectEvent,
}: {
  mission: StudioMission;
  aiModels: AIModelCardModel[];
  onImportAIModel: () => void;
  onDeleteAIModel: (modelId: string) => boolean;
  ui: ReturnType<typeof useStudioUiState>;
  drawing: ReturnType<typeof useDrawingSession>;
  simulation: ReturnType<typeof useStudioSimulationModel>;
  scene: ReturnType<typeof useStudioSceneSession>;
  commands: ReturnType<typeof useMissionCommands>;
  actions: ReturnType<typeof useStudioActions>;
  onSelectEvent: (event: SimEventItem) => void;
}) {
  return (
    <StudioInspectorContainer
      mission={mission}
      aiModels={aiModels}
      onImportAIModel={onImportAIModel}
      onDeleteAIModel={onDeleteAIModel}
      inspectorWidth={ui.inspectorWidth}
      onInspectorWidthChange={ui.setInspectorWidth}
      ui={{
        appTab: ui.appTab,
        stage: ui.stage,
        selection: ui.selection,
        codeView: ui.codeView,
        previewView: ui.previewView,
        codeDraft: ui.codeDraft,
        codeLang: ui.codeLang,
        aiModelsOpen: ui.aiModelsOpen,
        selectedAIModelId: ui.selectedAIModelId,
        jsonDraft: ui.jsonDraft,
        jsonError: ui.jsonError,
        rightOpen: ui.rightOpen,
        simTab: ui.simTab,
        settings: ui.settings,
        simSettingsOpen: ui.simSettingsOpen,
        setSelection: ui.setSelection,
        setDetailEditActive: ui.setDetailEditActive,
        setCodeDraft: ui.setCodeDraft,
        setPreviewView: ui.setPreviewView,
        setAIModelsOpen: ui.setAIModelsOpen,
        setSelectedAIModelId: ui.setSelectedAIModelId,
        setJsonDraft: ui.setJsonDraft,
        setRightOpen: ui.setRightOpen,
        setSimTab: ui.setSimTab,
        setSettings: ui.setSettings,
        setSimSettingsOpen: ui.setSimSettingsOpen,
        say: ui.say,
      }}
      drawing={{
        tool: drawing.tool,
        pending: drawing.pending,
        pendingShape: drawing.pendingShape,
        setPendingShape: drawing.setPendingShape,
        draftCursor: drawing.draftCursor,
        drawingAltM: drawing.drawingAltM,
        draftAreaSettings: drawing.draftAreaSettings,
        draftAvoidSettings: drawing.draftAvoidSettings,
        setPending: drawing.setPending,
        setDraftAreaSettings: drawing.setDraftAreaSettings,
        setDraftAvoidSettings: drawing.setDraftAvoidSettings,
        cancelPending: drawing.cancelPending,
      }}
      simulation={{
        issues: simulation.issues,
        derivedTransfers: simulation.derivedTransfers,
        gate: simulation.gate,
        plan: simulation.plan,
        sim: simulation.sim,
        totalT: simulation.totalT,
        telemetry: simulation.telemetry,
      }}
      scene={{
        previewPositionRef: scene.previewPositionRef,
        previewCaptureRef: scene.previewCaptureRef,
      }}
      commands={{
        finishPending: commands.finishPending,
        closePendingShape: commands.closePendingShape,
        updateMissionFromPanel: commands.updateMissionFromPanel,
        previewMissionFromPanel: commands.previewMissionFromPanel,
        commitPanelPreview: commands.commitPanelPreview,
        cancelPanelPreview: commands.cancelPanelPreview,
        onMoveWaypoint: commands.onMoveWaypoint,
        onReorderWaypoint: commands.onReorderWaypoint,
        onMoveAction: commands.onMoveAction,
        onDeleteAction: commands.onDeleteAction,
        onAddWaypointToRoute: commands.onAddWaypointToRoute,
        onDeleteRoute: commands.onDeleteRoute,
        onInsertActionAt: commands.onInsertActionAt,
        onAddZone: commands.onAddZone,
        onDeleteWaypoint: commands.onDeleteWaypoint,
        onDeleteZone: commands.onDeleteZone,
        onRenameZone: commands.onRenameZone,
      }}
      actions={{
        openCodeView: actions.openCodeView,
        handleCodeLangChange: actions.handleCodeLangChange,
        handleApplyJson: actions.handleApplyJson,
        handleExportJson: actions.handleExportJson,
      }}
      onSelectEvent={onSelectEvent}
    />
  );
}
