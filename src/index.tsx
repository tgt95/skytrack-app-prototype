/* index.tsx — SkyTrack Mission Studio standalone route and page coordinator.
   Full-height desktop shell: top bar + stage switch, left rail, center 3D scene,
   right inspector, bottom status strip. Design + deterministic mock Simulation. */

import { useCallback, useEffect, useRef } from 'react'

import { useAddressSearch } from './modules/search/use-address-search'
import { PYTHON_SAMPLE } from './modules/design/python-editor'
import {
  DEFAULT_RECON_FLIGHT_SETTINGS,
  type StudioMission
} from './domain/mission-model'
import {
  useMissionHistoryActions,
  useStudioDocumentState
} from './modules/studio/use-studio-document'
import { useMissionKeyboard } from './modules/studio/use-mission-keyboard'
import { useDrawingSession } from './modules/studio/use-drawing-session'
import { useMissionCommands } from './modules/studio/use-mission-commands'
import { useStudioRouting } from './modules/studio/use-studio-routing'
import { useStudioActions } from './modules/studio/use-studio-actions'
import { useStudioSimulationModel } from './modules/studio/use-studio-simulation-model'
import { useStudioSceneSession } from './modules/studio/use-studio-scene-session'
import { useStudioUiState } from './modules/studio/use-studio-ui-state'
import { useStudioStageActions } from './modules/studio/use-studio-stage-actions'
import { useMissionStudioTestBridge } from './modules/studio/use-mission-studio-test-bridge'
import StudioLibraryRoute from './modules/studio/studio-library-route'
import StudioShell from './modules/studio/studio-shell'
import type { SimEventItem } from './modules/simulation/simulation'
import './index.css'

export default function MissionStudio({ onLogout }: { onLogout: () => void }) {
  const { mission, past, future, missionRef, dispatchDocument, dirty } = useStudioDocumentState()
  const uiState = useStudioUiState()
  const {
    stage, setStage, appTab, setAppTab, selection, setSelection,
    announce, setAnnounce, say, setDetailEditActive,
    codeView, setCodeView, setCodeDraft, codeLang, setCodeLang,
    jsonDraft, setJsonDraft, setJsonError, setRightOpen, lidarOn,
    setLidarOn, setSimTab, simSettingsOpen,
    settings, setEditOpen, setSimSettingsOpen, sceneReadiness, setSceneReadiness,
    setWorldPickerOpen
  } = uiState
  const drawingSession = useDrawingSession({ say })
  const {
    tool,
    setTool,
    pending,
    setPending,
    pendingShape,
    setPendingShape,
    setDraftCursor,
    setCloseDraftAtStart,
    finishPendingRef,
    drawingAltM,
    draftAreaSettings,
    setDraftAreaSettings,
    draftAvoidSettings,
    setDraftAvoidSettings,
    draftCursor,
    cancelPending
  } = drawingSession
  /* Draft drawing altitude (m) for the ruler: 0–50 in 0.5 steps, starts at
     2.0. Draft-only state — moving it never mutates the saved mission; only
     finishPending reads it for newly drawn geometry. */
  const photogrammetryAreaAltitudeM = mission.worldType === '2D'
    ? DEFAULT_RECON_FLIGHT_SETTINGS.altitudeM
    : drawingAltM
  const sceneDrawingAltitudeM = tool === 'area' && mission.worldType === '2D'
    ? photogrammetryAreaAltitudeM
    : drawingAltM
  const panelPreviewBaseRef = useRef<StudioMission | null>(null)
  const simResetRef = useRef<{ reset: () => void } | null>(null)
  const routing = useStudioRouting({
    mission,
    say,
    dispatchDocument,
    setSelection,
    setPending,
    setTool,
    setStage,
    setCodeView,
    setCodeDraft,
    setJsonError,
    setSimSettingsOpen,
    setSimTab,
    simResetRef,
    pythonSample: PYTHON_SAMPLE
  })
  const { route, section, libNav, libraryEntry, setLibraryEntry, navigateRoute, openLibraryMission,
    selectableMissionWorlds, missionWorldOptions } = routing

  const simulation = useStudioSimulationModel(mission, sceneReadiness, settings)
  const { issues, gate, plan, sim } = simulation
  const { commit, undo, redo } = useMissionHistoryActions({ mission, missionRef, past, future, dispatchDocument, setSelection, sim, say })
  simResetRef.current = sim
  const sceneSession = useStudioSceneSession({ mission, stage, sceneReadiness, setSceneReadiness, setStage, sim, say })
  const { sceneRef, sceneReadinessRef } = sceneSession

  const addressSearch = useAddressSearch({ mission, missionRef, section, commit, say })
  const { closeAddressSearch } = addressSearch

  const backToLibrary = useCallback(() => {
    closeAddressSearch()
    navigateRoute({ kind: 'library', section: 'home' })
    setAnnounce('Library home. Local preview.')
  }, [closeAddressSearch, navigateRoute])
  const openCrumbProject = useCallback(() => {
    closeAddressSearch()
    navigateRoute({ kind: 'library', section: 'projects', ...(libraryEntry?.projectId ? { projectId: libraryEntry.projectId } : {}) })
    setAnnounce(`Project ${libraryEntry?.project ?? ''} opened with its missions.`)
  }, [closeAddressSearch, libraryEntry, navigateRoute])
  const { gotoAppTab, gotoStage } = useStudioStageActions({
    gate, sceneReadinessRef, say, setStage, setAppTab, setTool, setPending, setSimSettingsOpen
  })

  const missionCommands = useMissionCommands({
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
    setWorldPickerOpen
  })
  const { finishPending, closePendingShape, deleteSelection, cancelPanelPreview } = missionCommands

  useEffect(() => {
    if (tool === 'area') setDraftAreaSettings({ lineSpacingM: 6, orientationDeg: 0, paddingM: 0 })
    if (tool === 'avoid') setDraftAvoidSettings({ type: 'obstacle', heightM: 15, clearanceM: 2 })
    if ((tool !== 'select' || stage !== 'design') && panelPreviewBaseRef.current) {
      cancelPanelPreview()
      setDetailEditActive(false)
    }
  }, [cancelPanelPreview, stage, tool])

  const studioActions = useStudioActions({
    mission,
    libraryEntry,
    setLibraryEntry,
    missionWorldOptions,
    codeLang,
    jsonDraft,
    setCodeDraft,
    setCodeLang,
    setJsonDraft,
    setJsonError,
    setCodeView,
    setEditOpen,
    setSelection,
    setStage,
    setPending,
    setTool,
    setSimSettingsOpen,
    setSimTab,
    dispatchDocument,
    commit,
    sim,
    say,
    pythonSample: PYTHON_SAMPLE
  })
  const {
    openCodeView,
    saveLocal,
    resetToSeed,
    newMission
  } = studioActions

  /* ------------------------- events ------------------------- */
  const onSelectEvent = useCallback(
    (ev: SimEventItem) => {
      if (typeof ev.seq === 'number') {
        const wp = mission.waypoints.find((w) => w.seq === ev.seq)
        if (wp) {
          setSelection({ kind: 'waypoint', id: wp.id })
          sceneRef.current?.focusPoint(wp)
          say(`Event focused: waypoint ${wp.seq}.`)
        }
      }
    },
    [mission.waypoints, say]
  )

  useMissionKeyboard({
    appTab,
    codeView,
    draftCursor,
    hasPlan: !!plan,
    lidarOn,
    mission,
    pending,
    pendingShape,
    sceneRef,
    selection,
    sim,
    simSettingsOpen,
    stage,
    tool
  }, {
    cancelPending,
    closePendingShape,
    deleteSelection,
    finishPending,
    gotoStage,
    openCodeView,
    redo,
    saveLocal,
    say,
    setCloseDraftAtStart,
    setDraftCursor,
    setLidarOn,
    setPending,
    setPendingShape,
    setRightOpen,
    setSelection,
    setSimSettingsOpen,
    setSimTab,
    setTool,
    undo
  })

  useMissionStudioTestBridge({
    stage, appTab, tool, sim, mission, selection, announce,
    issueCount: issues.length, gateOk: gate.ok, dirty,
    canUndo: past.length > 0, canRedo: future.length > 0,
    newMission, resetToSeed
  })

  if (section === 'library') {
    return (
      <StudioLibraryRoute
        announce={announce}
        section={libNav.section}
        projectId={libNav.projectId}
        templateId={route.kind === 'library' ? route.templateId ?? null : null}
        sharedMissionId={route.kind === 'library' ? route.sharedMissionId ?? null : null}
        sharedProjectId={route.kind === 'library' ? route.sharedProjectId ?? null : null}
        current={libraryEntry}
        onNavigate={routing.onLibraryNavigate}
        onOpenTemplate={routing.onOpenTemplate}
        onOpenSharedAccounts={routing.onOpenSharedAccounts}
        onOpenSharedProject={routing.onOpenSharedProject}
        onOpenMission={openLibraryMission}
        onAnnounce={say}
        onLogout={onLogout}
      />
    )
  }

  return (
    <StudioShell
      announce={announce}
      mission={mission}
      sceneDrawingAltitudeM={sceneDrawingAltitudeM}
      document={{ dirty, past, future }}
      ui={uiState}
      drawing={drawingSession}
      routing={routing}
      simulation={simulation}
      scene={sceneSession}
      addressSearch={addressSearch}
      commands={missionCommands}
      actions={studioActions}
      handlers={{ backToLibrary, openCrumbProject, gotoAppTab, gotoStage, onSelectEvent }}
    />
  )
}
