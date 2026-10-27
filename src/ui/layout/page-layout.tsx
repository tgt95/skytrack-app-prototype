import { useCallback, useRef } from "react";
import type { StudioMission } from "../../domain/mission-model";
import type { useAddressSearch } from "../../features/search/use-address-search";
import StudioDialogs from "../../features/studio/studio-dialogs";
import StudioInspectorContainer from "../../features/studio/studio-inspector-container";
import StudioLeftRail from "../../features/studio/studio-left-rail";
import StudioMapOverlays from "../../features/studio/studio-map-overlays";
import { StudioShellSceneViewport } from "../../features/studio/studio-shell-scene-viewport";
import StudioStatusFooter from "./footer";
import StudioTopbar from "./header";
import { useDialogFocusReturn } from "../../features/studio/use-dialog-focus-return";
import type { useStudioDocumentState } from "../../features/studio/use-studio-document";
import type { useStudioUiState } from "../../features/studio/use-studio-ui-state";
import type { useDrawingSession } from "../../features/studio/use-drawing-session";
import type { useStudioRouting } from "../../features/studio/use-studio-routing";
import type { useStudioSimulationModel } from "../../features/studio/use-studio-simulation-model";
import type { useStudioSceneSession } from "../../features/studio/use-studio-scene-session";
import type { useMissionCommands } from "../../features/studio/use-mission-commands";
import { useStudioWorldGlb } from "../../features/studio/use-studio-world-glb";
import type { useStudioActions } from "../../features/studio/use-studio-actions";
import type { useStudioStageActions } from "../../features/studio/use-studio-stage-actions";
import type { SimEventItem } from "../../features/simulation/simulation";
import type { AIModelCardModel } from "../components/ai-model-card";
import type {
  AccountMenuPanel,
  AccountMenuProfile,
} from "../components/account-menu";
import type { ThemePreference } from "../../shared/theme-preference";

type DocumentState = Pick<
  ReturnType<typeof useStudioDocumentState>,
  "dirty" | "past" | "future"
>;

export interface StudioShellProps {
  announce: string;
  mission: StudioMission;
  sceneDrawingAltitudeM: number;
  document: DocumentState;
  ui: ReturnType<typeof useStudioUiState>;
  drawing: ReturnType<typeof useDrawingSession>;
  routing: ReturnType<typeof useStudioRouting>;
  simulation: ReturnType<typeof useStudioSimulationModel>;
  scene: ReturnType<typeof useStudioSceneSession>;
  addressSearch: ReturnType<typeof useAddressSearch>;
  commands: ReturnType<typeof useMissionCommands>;
  actions: ReturnType<typeof useStudioActions>;
  handlers: ReturnType<typeof useStudioStageActions> & {
    backToLibrary: () => void;
    openCrumbProject: () => void;
    onSelectEvent: (event: SimEventItem) => void;
  };
  aiModels: AIModelCardModel[];
  onImportAIModel: () => void;
  account: {
    profile: AccountMenuProfile;
    themePreference: ThemePreference;
    onOpenPanel: (panel: AccountMenuPanel) => void;
    onUpdateThemePreference: (preference: ThemePreference) => void;
  };
}

export default function StudioShell({
  announce,
  mission,
  sceneDrawingAltitudeM,
  document,
  ui,
  drawing,
  routing,
  simulation,
  scene,
  addressSearch,
  commands,
  actions,
  handlers,
  aiModels,
  onImportAIModel,
  account,
}: StudioShellProps) {
  const { dirty } = document;
  const {
    stage,
    appTab,
    appTabsOrientation,
    selection,
    codeView,
    codeDraft,
    codeLang,
    jsonDraft,
    jsonError,
    rightOpen,
    simTab,
    settings,
    editOpen,
    shortcutsOpen,
    simSettingsOpen,
    worldPickerOpen,
    setSelection,
    setDetailEditActive,
    setCodeDraft,
    setJsonDraft,
    setRightOpen,
    setSimTab,
    setSettings,
    setEditOpen,
    setShortcutsOpen,
    setSimSettingsOpen,
    setWorldPickerOpen,
    say,
  } = ui;
  const {
    tool,
    pending,
    pendingShape,
    draftCursor,
    drawingAltM,
    draftAreaSettings,
    draftAvoidSettings,
    setPending,
    setPendingShape,
    setDraftAreaSettings,
    setDraftAvoidSettings,
    cancelPending,
  } = drawing;
  const draftActions = drawing.draftActions;
  const { libraryEntry, missionWorldOptions, availableDrones } = routing;
  const worldGlb = useStudioWorldGlb({
    mission,
    worldOptions: missionWorldOptions,
    workspaceId: libraryEntry?.workspaceId ?? "tuan-workspace",
    persistWorld: routing.persistImportedWorld,
    onSelectImportedWorld: commands.onSelectImportedWorld,
    announce: say,
  });
  const { issues, derivedTransfers, gate, plan, sim, totalT, telemetry } =
    simulation;
  const { previewPositionRef, previewCaptureRef } = scene;
  const {
    updateMissionFromPanel,
    previewMissionFromPanel,
    commitPanelPreview,
    cancelPanelPreview,
    finishPending,
    closePendingShape,
    onMoveWaypoint,
    onReorderWaypoint,
    onMoveAction,
    onSelectWorld,
    onSelectWorldType,
    onDeleteAction,
    onAddWaypointToRoute,
    onDeleteRoute,
    onInsertActionAt,
    onAddZone,
    onDeleteWaypoint,
    onDeleteZone,
    onRenameZone,
  } = commands;
  const {
    openCodeView,
    handleCodeLangChange,
    handleExportJson,
    handleApplyJson,
    saveLocal,
    openEdit,
    saveEdit,
  } = actions;
  const {
    backToLibrary,
    openCrumbProject,
    gotoAppTab,
    gotoStage,
    onSelectEvent,
  } = handlers;

  const drawingActive = tool === "route" || tool === "area" || tool === "avoid";
  const simActive = stage === "simulation";

  const dialogFocus = useDialogFocusReturn();

  const selectWorldRef = useRef(onSelectWorld);
  selectWorldRef.current = onSelectWorld;
  const stableSelectWorld = useCallback(
    (worldId: string) => selectWorldRef.current(worldId),
    [],
  );
  const selectWorldTypeRef = useRef(onSelectWorldType);
  selectWorldTypeRef.current = onSelectWorldType;
  const stableSelectWorldType = useCallback(
    (worldType: "2D" | "3D") => selectWorldTypeRef.current(worldType),
    [],
  );
  const saveEditRef = useRef(saveEdit);
  saveEditRef.current = saveEdit;
  const stableSaveEdit = useCallback(
    (draft: Parameters<typeof saveEdit>[0]) => saveEditRef.current(draft),
    [],
  );
  return (
    <div className="ms-root ms-route-content" data-testid="ms-root">
      <p className="ms-sr" role="status" aria-live="polite">
        {announce}
      </p>
      <StudioTopbar
        missionName={mission.name}
        libraryEntry={libraryEntry}
        dirty={dirty}
        onBackToLibrary={backToLibrary}
        onOpenCrumbProject={openCrumbProject}
        onOpenEdit={() => dialogFocus.openWithFocusReturn(openEdit)}
        onSaveLocal={saveLocal}
      />
      <div
        className=" [@media_(max-width:_61.25rem)]:flex-col flex flex-[1_1_auto] min-h-0"
        data-testid="ms-body"
      >
        <StudioLeftRail
          appTab={appTab}
          orientation={appTabsOrientation}
          stageIsDesign={stage === "design"}
          tool={tool}
          onAppTabChange={gotoAppTab}
          onToolChange={drawing.setTool}
          onClearPending={draftActions.clearPending}
          onClearDraftCursor={draftActions.clearCursor}
          onClearDraftClosure={draftActions.clearClosure}
          onSetPolygon={draftActions.selectPolygon}
          onAnnounce={say}
          accountProfile={account.profile}
          themePreference={account.themePreference}
          onOpenAccountPanel={account.onOpenPanel}
          onUpdateThemePreference={account.onUpdateThemePreference}
        />
        <StudioMapOverlays
          appTab={appTab}
          stage={stage}
          gate={gate}
          drawing={drawingActive}
          tool={tool}
          pendingCount={pending.length}
          pendingShape={pendingShape}
          simActive={simActive}
          sim={sim}
          totalT={totalT}
          plan={plan}
          onStageChange={gotoStage}
          onPendingShapeChange={setPendingShape}
          onOpenSimulationSettings={() => {
            setSimSettingsOpen(true);
            say("Simulation settings.");
          }}
          onAnnounce={say}
        >
          <StudioShellSceneViewport
            mission={mission}
            ui={ui}
            drawing={drawing}
            routing={routing}
            simulation={simulation}
            scene={scene}
            addressSearch={addressSearch}
            commands={commands}
            worldModel={worldGlb.sceneWorld}
            sceneDrawingAltitudeM={sceneDrawingAltitudeM}
            dialogFocus={dialogFocus}
          />
        </StudioMapOverlays>
        <StudioInspectorContainer
          mission={mission}
          aiModels={aiModels}
          onImportAIModel={onImportAIModel}
          inspectorWidth={ui.inspectorWidth}
          onInspectorWidthChange={ui.setInspectorWidth}
          ui={{
            appTab,
            stage,
            selection,
            codeView,
            previewView: ui.previewView,
            codeDraft,
            codeLang,
            aiModelsOpen: ui.aiModelsOpen,
            selectedAIModelId: ui.selectedAIModelId,
            jsonDraft,
            jsonError,
            rightOpen,
            simTab,
            settings,
            simSettingsOpen,
            setSelection,
            setDetailEditActive,
            setCodeDraft,
            setPreviewView: ui.setPreviewView,
            setAIModelsOpen: ui.setAIModelsOpen,
            setSelectedAIModelId: ui.setSelectedAIModelId,
            setJsonDraft,
            setRightOpen,
            setSimTab,
            setSettings,
            setSimSettingsOpen,
            say,
          }}
          drawing={{
            tool,
            pending,
            pendingShape,
            setPendingShape,
            draftCursor,
            drawingAltM,
            draftAreaSettings,
            draftAvoidSettings,
            setPending,
            setDraftAreaSettings,
            setDraftAvoidSettings,
            cancelPending,
          }}
          simulation={{
            issues,
            derivedTransfers,
            gate,
            plan,
            sim,
            totalT,
            telemetry,
          }}
          scene={{ previewPositionRef, previewCaptureRef }}
          commands={{
            finishPending,
            closePendingShape,
            updateMissionFromPanel,
            previewMissionFromPanel,
            commitPanelPreview,
            cancelPanelPreview,
            onMoveWaypoint,
            onReorderWaypoint,
            onMoveAction,
            onDeleteAction,
            onAddWaypointToRoute,
            onDeleteRoute,
            onInsertActionAt,
            onAddZone,
            onDeleteWaypoint,
            onDeleteZone,
            onRenameZone,
          }}
          actions={{
            openCodeView,
            handleCodeLangChange,
            handleApplyJson,
            handleExportJson,
          }}
          onSelectEvent={onSelectEvent}
        />
      </div>
      <StudioStatusFooter
        dirty={dirty}
        ui={{ stage, selection, settings, rightOpen }}
        drawing={{ tool, pending }}
        simulation={{ plan, sim, totalT, telemetry }}
        onOpenShortcuts={() =>
          dialogFocus.openWithFocusReturn(() => setShortcutsOpen(true))
        }
        onToggleInspector={() => setRightOpen((value) => !value)}
      />
      <StudioDialogs
        mission={mission}
        restoreDialogFocus={dialogFocus.restoreFocus}
        worldOptions={missionWorldOptions}
        droneProfiles={availableDrones}
        worldPickerOpen={worldPickerOpen}
        onWorldPickerOpenChange={setWorldPickerOpen}
        editOpen={editOpen}
        onEditOpenChange={setEditOpen}
        shortcutsOpen={shortcutsOpen}
        onShortcutsOpenChange={setShortcutsOpen}
        onSelectWorld={stableSelectWorld}
        onSelectWorldType={stableSelectWorldType}
        onImportWorld={worldGlb.onImportWorld}
        onSaveEdit={stableSaveEdit}
      />
    </div>
  );
}
