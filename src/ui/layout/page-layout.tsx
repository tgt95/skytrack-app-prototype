import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Tabs, TabsPanel } from "skytrack-ui/tabs";
import type { StudioMission } from "../../domain/mission-model";
import type { useAddressSearch } from "../../features/search/use-address-search";
import StudioDialogs from "../../features/studio/studio-dialogs";
import StudioLeftRail from "../../features/studio/studio-left-rail";
import StudioMapOverlays from "../../features/studio/studio-map-overlays";
import { StudioShellInspectorHost } from "./studio-shell-inspector-host";
import { parseMissionInsightsRoute } from "../../features/studio/mission-report-url";
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

function ReportViewTabsShell({
  active,
  header,
  children,
}: {
  active: boolean;
  header: ReactNode;
  children: ReactNode;
}) {
  if (!active)
    return (
      <>
        {header}
        {children}
      </>
    );

  return (
    <Tabs
      value="insights"
      className="min-h-0 flex-[1_1_auto] gap-0"
      data-testid="ms-report-view-tabs"
    >
      {header}
      <TabsPanel
        value="insights"
        className="flex min-h-0 flex-[1_1_auto] flex-col p-0"
        data-testid="ms-report-view-panel"
      >
        {children}
      </TabsPanel>
    </Tabs>
  );
}

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
  onDeleteAIModel: (modelId: string) => boolean;
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
  onDeleteAIModel,
  account,
}: StudioShellProps) {
  const [reportSubpageOpen, setReportSubpageOpen] = useState(
    () => parseMissionInsightsRoute(window.location.search) !== null,
  );
  const { dirty } = document;
  const {
    stage,
    appTab,
    appTabsOrientation,
    selection,
    rightOpen,
    settings,
    editOpen,
    shortcutsOpen,
    worldPickerOpen,
    setRightOpen,
    setEditOpen,
    setShortcutsOpen,
    setSimSettingsOpen,
    setWorldPickerOpen,
    say,
  } = ui;
  const { tool, pending, pendingShape, setPendingShape } = drawing;
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
  const { gate, plan, sim, totalT, telemetry } = simulation;
  const { onSelectWorld, onSelectWorldType } = commands;
  const { saveLocal, openEdit, saveEdit } = actions;
  const {
    backToLibrary,
    openCrumbProject,
    gotoAppTab,
    gotoStage,
    onSelectEvent,
  } = handlers;

  const drawingActive = tool === "route" || tool === "area" || tool === "avoid";
  const simActive = stage === "simulation";
  const hideStudioChrome = false;

  const openMissionDesignFromReport = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete("tab");
    params.delete("report");
    params.delete("runId");
    params.delete("stage");
    params.delete("view");
    const search = params.toString();
    const nextUrl = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
    window.history.pushState(window.history.state, "", nextUrl);
    gotoAppTab("plan");
  }, [gotoAppTab]);

  useEffect(() => {
    if (appTab !== "report") setReportSubpageOpen(false);
  }, [appTab]);

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
    <div
      className="ms-root flex flex-col h-[calc(100dvh-3.125rem)] min-h-140 bg-(--background) text-(--foreground) text-sm [@media_(max-width:_61.25rem)]:h-auto [@media_(max-width:_61.25rem)]:min-h-0 ms-route-content [view-transition-name:ms-route-content]"
      data-testid="ms-root"
      data-report-subpage={reportSubpageOpen}
    >
      <p
        className="ms-sr absolute w-px h-px overflow-hidden [clip:rect(0_0_0_0)] whitespace-nowrap"
        role="status"
        aria-live="polite"
      >
        {announce}
      </p>
      <ReportViewTabsShell
        active={reportSubpageOpen}
        header={
          !hideStudioChrome ? (
            <StudioTopbar
              missionName={mission.name}
              libraryEntry={libraryEntry}
              dirty={dirty}
              reportSubpageOpen={reportSubpageOpen}
              onBackToLibrary={backToLibrary}
              onOpenCrumbProject={openCrumbProject}
              onOpenCrumbMission={openMissionDesignFromReport}
              onOpenEdit={() => dialogFocus.openWithFocusReturn(openEdit)}
              onSaveLocal={saveLocal}
            />
          ) : null
        }
      >
        <div
          className=" [@media_(max-width:_61.25rem)]:flex-col flex flex-[1_1_auto] min-h-0"
          data-testid="ms-body"
        >
          {!hideStudioChrome && !reportSubpageOpen ? (
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
          ) : null}
          <StudioMapOverlays
            appTab={appTab}
            onReportSubpageChange={setReportSubpageOpen}
            onOpenMissionDesign={openMissionDesignFromReport}
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
          <StudioShellInspectorHost
            mission={mission}
            aiModels={aiModels}
            onImportAIModel={onImportAIModel}
            onDeleteAIModel={onDeleteAIModel}
            ui={ui}
            drawing={drawing}
            simulation={simulation}
            scene={scene}
            commands={commands}
            actions={actions}
            onSelectEvent={onSelectEvent}
          />
        </div>
      </ReportViewTabsShell>
      {!hideStudioChrome && !reportSubpageOpen ? (
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
      ) : null}
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
