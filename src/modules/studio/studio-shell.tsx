import { useCallback, useRef } from "react";
import { QuestionIcon, SidebarIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { isValidRing, type StudioMission } from "../../domain/mission-model";
import { clampSnapRuler } from "../design/design-controls";
import type { useAddressSearch } from "../search/use-address-search";
import StudioDialogs from "./studio-dialogs";
import StudioInspector from "./studio-inspector";
import StudioLeftRail from "./studio-left-rail";
import StudioMapOverlays from "./studio-map-overlays";
import StudioSceneViewport from "./studio-scene-viewport";
import StudioTopbar from "./studio-topbar";
import type { useStudioDocumentState } from "./use-studio-document";
import type { useStudioUiState } from "./use-studio-ui-state";
import type { useDrawingSession } from "./use-drawing-session";
import type { useStudioRouting } from "./use-studio-routing";
import type { useStudioSimulationModel } from "./use-studio-simulation-model";
import type { useStudioSceneSession } from "./use-studio-scene-session";
import type { useMissionCommands } from "./use-mission-commands";
import type { useStudioActions } from "./use-studio-actions";
import type { useStudioStageActions } from "./use-studio-stage-actions";
import type { SimEventItem } from "../simulation/simulation";

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
}: StudioShellProps) {
  const { dirty } = document;
  const {
    stage,
    appTab,
    appTabsOrientation,
    selection,
    detailEditActive,
    codeView,
    codeDraft,
    codeLang,
    jsonDraft,
    jsonError,
    rightOpen,
    lidarOn,
    simTab,
    settings,
    editOpen,
    shortcutsOpen,
    simSettingsOpen,
    basemapStyle,
    showPhotoMarkers,
    showCameraFootprint,
    footprintOpacity,
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
    setBasemapStyle,
    setShowPhotoMarkers,
    setShowCameraFootprint,
    setFootprintOpacity,
    setWorldPickerOpen,
    say,
  } = ui;
  const {
    tool,
    pending,
    pendingShape,
    draftCursor,
    closeDraftAtStart,
    drawingAltM,
    draftAreaSettings,
    draftAvoidSettings,
    setPending,
    setDraftCursor,
    setCloseDraftAtStart,
    setDrawingAltM,
    setPendingShape,
    setDraftAreaSettings,
    setDraftAvoidSettings,
    onDraftHover,
    onPendingPositionChange,
    onPendingAltitudeChange,
    onRemovePendingPoint,
    onInsertPendingPoint,
    cancelPending,
  } = drawing;
  const {
    libraryEntry,
    missionWorldOptions,
    availableDrones,
    missionDroneValue,
    missionDroneChoices,
  } = routing;
  const { issues, derivedTransfers, gate, plan, sim, totalT, telemetry } =
    simulation;
  const {
    sceneRef,
    previewPositionRef,
    previewCaptureRef,
    onSceneReadinessChange,
  } = scene;
  const {
    onScenePoint,
    insertWaypointAt,
    removeWaypointById,
    onWaypointAltitudeChange,
    onWaypointPositionChange,
    updateMissionFromPanel,
    previewMissionFromPanel,
    commitPanelPreview,
    cancelPanelPreview,
    onAvoidHeightChange,
    finishPending,
    closePendingShape,
    onMoveWaypoint,
    onReorderWaypoint,
    onMoveAction,
    onSelectVehicle,
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
  const routeDraftActive =
    appTab === "plan" && stage === "design" && tool === "route";
  const zoneDraftActive =
    appTab === "plan" &&
    stage === "design" &&
    (tool === "area" || tool === "avoid");
  const editModeActive =
    stage === "design" && (drawingActive || detailEditActive);
  const routeDraftZ =
    Math.round(Math.max(drawingAltM, mission.takeoffAltM) * 10) / 10;
  const simActive = stage === "simulation";
  const statusLine = `${stage === "design" ? "Design" : "Simulation"} · ${tool} tool${selection ? ` · selected ${selection.kind}` : ""}${pending.length > 0 ? ` · ${pending.length} pts` : ""} · sim ${sim.status}${plan ? ` · t=${sim.simT.toFixed(1)}s/${totalT.toFixed(0)}s` : ""}${telemetry && simActive ? ` · home ${telemetry.homeDistM.toFixed(0)} m · wind ${settings.windMS} m/s · GPS RTK` : ""}${dirty ? " · unsaved" : " · saved"}`;

  const clearPendingDraft = useCallback(() => setPending([]), [setPending]);
  const clearDraftCursor = useCallback(
    () => setDraftCursor(null),
    [setDraftCursor],
  );
  const clearDraftClosure = useCallback(
    () => setCloseDraftAtStart(false),
    [setCloseDraftAtStart],
  );
  const selectPolygonShape = useCallback(
    () => setPendingShape("polygon"),
    [setPendingShape],
  );
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
  const addWaypointToRoute = useCallback(
    (routeId?: string) => onAddWaypointToRoute(routeId ?? ""),
    [onAddWaypointToRoute],
  );
  const collapseInspectorPane = useCallback(
    () => setRightOpen(false),
    [setRightOpen],
  );

  return (
    <div className="ms-root" data-testid="ms-root">
      <p className="ms-sr" role="status" aria-live="polite">
        {announce}
      </p>
      <StudioTopbar
        missionName={mission.name}
        libraryEntry={libraryEntry}
        dirty={dirty}
        onBackToLibrary={backToLibrary}
        onOpenCrumbProject={openCrumbProject}
        onOpenEdit={openEdit}
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
          onClearPending={clearPendingDraft}
          onClearDraftCursor={clearDraftCursor}
          onClearDraftClosure={clearDraftClosure}
          onSetPolygon={selectPolygonShape}
          onAnnounce={say}
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
          <StudioSceneViewport
            mission={mission}
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
              pendingPoints: pending,
              pendingShape,
              draftCursor,
              closeDraftAtStart,
              draftAreaSettings,
              draftAvoidSettings,
              drawingAltM: sceneDrawingAltitudeM,
              planeVisible: drawingActive && stage === "design",
              onPickWaypoint: (id) => {
                setSelection({ kind: "waypoint", id });
                const waypoint = mission.waypoints.find(
                  (item) => item.id === id,
                );
                if (waypoint) say(`Waypoint ${waypoint.seq} selected.`);
              },
              onPickZone: (kind, id) => {
                setSelection({ kind, id });
                say(`${kind === "area" ? "Area" : "Avoid zone"} selected.`);
              },
              onClearSelection: () => setSelection(null),
              onScenePoint,
              onDraftHover,
              onClosePending: closePendingShape,
              onInsertWaypoint: insertWaypointAt,
              onRemoveWaypoint: removeWaypointById,
              onWaypointAltitudeChange,
              onWaypointPositionChange,
              onAvoidHeightChange,
              onPendingPositionChange,
              onPendingAltitudeChange,
              onInsertPendingPoint,
              onRemovePendingPoint,
              onReadinessChange: onSceneReadinessChange,
            }}
            editModeActive={editModeActive}
            drawing={drawingActive}
            stageIsDesign={stage === "design"}
            toolIsArea={tool === "area" && mission.worldType === "2D"}
            simActive={simActive}
            lidarOn={lidarOn}
            plan={plan}
            simClockRef={sim.clockRef}
            reducedMotion={settings.reducedMotion}
            drawingAltM={drawingAltM}
            onDrawingAltitudeCommit={(value) =>
              setDrawingAltM(clampSnapRuler(value))
            }
            onAnnounce={say}
            droneChoices={missionDroneChoices}
            selectedDroneValue={missionDroneValue}
            onSelectVehicle={onSelectVehicle}
            onOpenWorldPicker={() => setWorldPickerOpen(true)}
            addressSearch={addressSearch}
            stage={stage}
            showPhotoMarkers={showPhotoMarkers}
            onShowPhotoMarkersChange={setShowPhotoMarkers}
            showCameraFootprint={showCameraFootprint}
            onShowCameraFootprintChange={setShowCameraFootprint}
            footprintOpacity={footprintOpacity}
            onFootprintOpacityChange={setFootprintOpacity}
            basemapStyle={basemapStyle}
            onBasemapStyleChange={setBasemapStyle}
          />
        </StudioMapOverlays>
        <StudioInspector
          visible={appTab === "plan" && rightOpen}
          stageIsDesign={stage === "design"}
          codeView={codeView}
          routeDraftActive={routeDraftActive}
          zoneDraftActive={zoneDraftActive}
          routeDraft={{
            mission,
            pending,
            routeDraftZ,
            setPending,
            onCancel: cancelPending,
            onCommit: finishPending,
          }}
          zoneDraft={{
            kind: tool === "area" ? "area" : "avoid",
            shape: pendingShape,
            pointCount: pending.length,
            canCommit:
              pendingShape === "polygon"
                ? pending.length >= 3 && isValidRing(pending)
                : pending.length === 1 &&
                  !!draftCursor &&
                  Math.hypot(
                    draftCursor.x - pending[0].x,
                    draftCursor.y - pending[0].y,
                  ) >= 0.5,
            area: draftAreaSettings,
            avoid: draftAvoidSettings,
            className: "m-[0.75rem]",
            onAreaChange: setDraftAreaSettings,
            onAvoidChange: setDraftAvoidSettings,
            onCommit: closePendingShape,
            onCancel: cancelPending,
          }}
          design={{
            mission,
            previewPositionRef,
            previewCaptureRef,
            worldType: mission.worldType ?? "3D",
            issues,
            selection,
            codeView,
            codeDraft,
            codeLang,
            jsonDraft,
            jsonError,
            onCodeViewChange: openCodeView,
            onCodeDraftChange: setCodeDraft,
            onCodeLangChange: handleCodeLangChange,
            onJsonDraftChange: setJsonDraft,
            onApplyJson: handleApplyJson,
            onExportJson: handleExportJson,
            onSelect: setSelection,
            onUpdateMission: updateMissionFromPanel,
            onPreviewMission: previewMissionFromPanel,
            onCommitPreview: commitPanelPreview,
            onCancelPreview: cancelPanelPreview,
            onDetailEditStateChange: setDetailEditActive,
            onAddWaypoint: addWaypointToRoute,
            transfers: derivedTransfers,
            onDeleteRoute,
            onDeleteWaypoint,
            onMoveWaypoint,
            onReorderWaypoint,
            onMoveAction,
            onInsertActionAt,
            onDeleteAction,
            onAddZone,
            onDeleteZone,
            onRenameZone,
            onCollapsePane: collapseInspectorPane,
            onAnnounce: say,
          }}
          simulationSettingsOpen={simSettingsOpen}
          simulationSettings={{
            settings,
            maxSeq: mission.waypoints.length,
            onChange: (nextSettings) => {
              setSettings(nextSettings);
              say("Simulation settings updated.");
            },
            onClose: () => {
              setSimSettingsOpen(false);
              say("Simulation settings closed.");
            },
          }}
          simulation={{
            mission,
            plan,
            gateReason: gate.reason,
            telemetry,
            status: sim.status,
            simT: sim.simT,
            totalT,
            runIndex: sim.runIndex,
            log: sim.log,
            fired: sim.fired,
            settings,
            showConsole: codeView,
            onRun: sim.start,
            onPause: sim.pause,
            onResume: sim.resume,
            onAbort: sim.abort,
            onRestart: sim.restart,
            onSelectEvent,
            tab: simTab,
            onTabChange: setSimTab,
          }}
        />
      </div>
      <footer
        className=" flex-[0_0_auto] flex items-center justify-between gap-[0.625rem] p-[0.25rem_0.75rem] [border-top:0.0625rem_solid_var(--border)] bg-(--card) text-[0.75rem] text-(--muted-foreground)"
        data-testid="ms-status"
      >
        <span
          className="ms-status-line overflow-hidden text-ellipsis whitespace-nowrap"
          data-testid="ms-status-line"
        >
          {statusLine}
        </span>
        <span
          className=" flex gap-[0.25rem] flex-[0_0_auto]"
          data-testid="ms-status-actions"
        >
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShortcutsOpen(true)}
            aria-label="Keyboard shortcuts"
          >
            <QuestionIcon aria-hidden="true" /> Shortcuts
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRightOpen((value) => !value)}
            aria-label="Toggle inspector panel"
          >
            <SidebarIcon aria-hidden="true" />{" "}
            {rightOpen ? "Hide panel (\\)" : "Show panel (\\)"}
          </Button>
        </span>
      </footer>
      <StudioDialogs
        mission={mission}
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
        onSaveEdit={stableSaveEdit}
      />
    </div>
  );
}
