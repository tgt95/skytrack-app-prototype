/* index.tsx — SkyTrack Mission Studio standalone route and page coordinator.
   Full-height desktop shell: top bar + stage switch, left rail, center 3D scene,
   right inspector, bottom status strip. Design + deterministic mock Simulation. */

import { SkyTooltip } from './shared/sky-tooltip'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react'
import {
  CaretDownIcon,
  ChartPieIcon,
  CrosshairIcon,
  HandIcon,
  DroneIcon,
  AirplaneTakeoffIcon,
  MapTrifoldIcon,
  FloppyDiskIcon,
  GearIcon,
  ListChecksIcon,
  MagnifyingGlassIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  PathIcon,
  PauseIcon,
  PencilSimpleIcon,
  PlayIcon,
  PlusIcon,
  QuestionIcon,
  SidebarIcon,
  StackIcon,
  SquareIcon,
  XIcon
} from '@phosphor-icons/react'
import { Button } from 'skytrack-ui/button'
import { Badge } from 'skytrack-ui/badge'
import { CheckboxIndicator, CheckboxRoot } from 'skytrack-ui/checkbox'
import {
  Popover,
  PopoverArrow,
  PopoverClose,
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverTitle,
  PopoverTrigger
} from 'skytrack-ui/popover'
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogPortal,
  DialogTitle
} from 'skytrack-ui/dialog'
import { FieldControl, FieldLabel, FieldRoot } from 'skytrack-ui/field'
import {
  Select,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue
} from 'skytrack-ui/select'
import { Toggle } from 'skytrack-ui/toggle'
import { ToggleGroup } from 'skytrack-ui/toggle-group'
import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack } from 'skytrack-ui/slider'
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from 'skytrack-ui/tabs'
import { Toolbar, ToolbarButton, ToolbarGroup, ToolbarSeparator } from 'skytrack-ui/toolbar'
import { Input } from 'skytrack-ui/input'
import {
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipProvider,
  TooltipTrigger
} from 'skytrack-ui/tooltip'
import MissionScene, { type MissionSceneHandle, type SceneReadiness } from './modules/scene/mission-scene'
import { BasemapPickerGrid, clampSnapRuler, DraftAxisInput, DrawingAltitudeRuler, ToolButton } from './modules/design/design-controls'
import { type MissionBasemapStyle } from './modules/scene/mission-map-2d'
import { geocoderAttribution, searchGeocoder, suggestGeocoder, type GeocodeResult } from './modules/search/geocoder'
import DesignPanel, { ZoneDraftPanel } from './modules/design/design-panel'
import { PYTHON_SAMPLE } from './modules/design/python-editor'
import SimulationPanel, { SimulationSettingsForm } from './modules/simulation/simulation-panel'
import LidarPreview from './modules/scene/lidar-preview'
import {
  VEHICLES,
  WORLDS,
  DEFAULT_RECON_FLIGHT_SETTINGS,
  actionLabel,
  countDetours,
  circleFootprint,
  emptyMission,
  generateAreaCapturePath,
  generateAreaScan,
  getAreaFlightAltitudeM,
  getMissionSequence,
  getMissionRoutes,
  getMissionStart,
  isValidRing,
  missionOrigin,
  missionFromCode,
  missionFromSnapshot,
  missionToCode,
  normalizeMissionRoutes,
  renumber,
  reorderWaypoints,
  appendMissionSequenceItem,
  removeMissionSequenceItem,
  snapshotOf,
  uid,
  validateMission,
  withAvoidDetours,
  withMissionOrigin,
  type CameraActionKind,
  type EnuPoint,
  type MissionArea,
  type SceneSelection,
  type SceneTool,
  type StudioMission
} from './domain/mission-model'
import { computeDerivedTransfers, validateTransfers } from './domain/transfer-planner'
import { seedMission } from './domain/mission-data'
import skytrackLogo from './assets/skytrack-logo.svg'
import StudioLibrary, { type LibraryEntry, type LibrarySection } from './modules/library/library'
import { findMissionRecord, loadProjects, saveMissionSnapshot, seedTemplates } from './modules/library/database/store'
import { loadDroneProfiles, type WorkspaceDroneProfile } from './modules/library/database/drone-store'
import { selectableWorldsForWorkspace } from './modules/library/database/workspace-resources-store'
import { getSharedProject } from './modules/library/workspace-data'
import { missionStudioRoutePath, parseMissionStudioRoute, type MissionStudioRoute } from './modules/library/router'
import { AreaIcon, AvoidZoneIcon } from './shared/icons'
import {
  DEFAULT_SIM_SETTINGS,
  applyMockFailure,
  buildSimPlan,
  telemetryAt,
  useSimulation,
  type SimEventItem,
  type SimSettings
} from './modules/simulation/simulation'
import './index.css'

type Stage = 'design' | 'simulation'

type AppTab = 'plan' | 'fly' | 'report'

const APP_TABS: { id: AppTab; label: string; hint: string }[] = [
  { id: 'plan', label: 'Plan', hint: 'Mission planner' },
  { id: 'fly', label: 'Fly', hint: 'Placeholder' },
  { id: 'report', label: 'Report', hint: 'Placeholder' }
]

const APP_TAB_ICONS = {
  plan: ListChecksIcon,
  fly: DroneIcon,
  report: ChartPieIcon
} as const

const LIBRARY_PAGE_TITLES: Record<LibrarySection, string> = {
  home: 'Home',
  recent: 'Recent',
  projects: 'Projects',
  worlds: 'Worlds',
  drones: 'Drones',
  starred: 'Starred missions',
  shared: 'Shared with me',
  learn: 'Learn',
  templates: 'Mission templates',
  docs: 'Documentation',
  aimodels: 'AI models',
  logs: 'Logs',
  notifications: 'Notifications'
}

function sceneGateReason(readiness: SceneReadiness): string | null {
  if (readiness === 'loading') return '3D scene loading. Wait until ready.'
  if (readiness === 'error') return '3D scene unavailable. Retry 3D or continue editing in Design.'
  if (readiness === 'without-3d') return '3D is off. Retry 3D to enable Simulation.'
  return null
}

function MapControlTooltip({ label, trigger, children }: { label: string; trigger: ReactElement; children?: ReactNode }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={trigger}>{children}</TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner side='left' sideOffset={8}>
            <TooltipPopup><TooltipArrow />{label}</TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  )
}

const SHORTCUT_GROUPS: { title: string; shortcuts: { keys: string; what: string }[] }[] = [
  {
    title: 'Workspace & tools',
    shortcuts: [
      { keys: '1 / 2', what: 'Design / Simulation stage' },
      { keys: 'A / R / N / H', what: 'Area / Route / Avoid-zone / Home tool (Design)' },
      { keys: 'C', what: 'Toggle Design / Code view (Design)' },
      { keys: 'Esc', what: 'Close settings, cancel drawing, then clear selection' }
    ]
  },
  {
    title: 'Simulation',
    shortcuts: [
      { keys: 'Space', what: 'Start / Abort mock simulation' },
      { keys: 'P', what: 'Pause / Resume mock simulation' },
      { keys: 'D / E', what: 'Mission details / Events tab' },
      { keys: 'L', what: 'Go to Console tab, Code mode only' },
      { keys: 'V', what: 'Toggle mock LiDAR preview' }
    ]
  },
  {
    title: 'Scene & view',
    shortcuts: [
      { keys: '+ / −', what: 'Zoom 3D scene' },
      { keys: '0', what: 'Reset camera' },
      { keys: 'F', what: 'Focus vehicle / selected point' },
      { keys: '\\', what: 'Collapse / expand inspector' }
    ]
  },
  {
    title: 'Editing & history',
    shortcuts: [
      { keys: 'Delete', what: 'Delete selection (Design)' },
      { keys: 'Z + drag · ⇧ + drag · drag', what: 'Waypoint altitude (Z or Shift, ground-clamped) · move waypoint, Z kept (Design)' },
      { keys: 'Ctrl/⌘+S', what: 'Save local state' },
      { keys: 'Ctrl/⌘+Z · ⇧+Ctrl/⌘+Z', what: 'Undo / redo design edit' }
    ]
  }
]

export default function MissionStudio({ onLogout }: { onLogout: () => void }) {
  const [mission, setMission] = useState<StudioMission>(() => emptyMission())
  const missionRef = useRef(mission)
  missionRef.current = mission
  const [savedSnap, setSavedSnap] = useState(() => '')
  const [past, setPast] = useState<string[]>([])
  const [future, setFuture] = useState<string[]>([])
  const [stage, setStage] = useState<Stage>('design')
  const [appTab, setAppTab] = useState<AppTab>('plan')
  const [appTabsOrientation, setAppTabsOrientation] = useState<'horizontal' | 'vertical'>(() =>
    window.matchMedia('(max-width: 980px)').matches ? 'horizontal' : 'vertical'
  )
  useEffect(() => {
    const compactViewport = window.matchMedia('(max-width: 980px)')
    const syncOrientation = () => setAppTabsOrientation(compactViewport.matches ? 'horizontal' : 'vertical')
    syncOrientation()
    compactViewport.addEventListener('change', syncOrientation)
    return () => compactViewport.removeEventListener('change', syncOrientation)
  }, [])
  const [tool, setTool] = useState<SceneTool>('select')
  const [selection, setSelection] = useState<SceneSelection | null>(null)
  const [pending, setPending] = useState<(EnuPoint & { z?: number })[]>([])
  const [pendingShape, setPendingShape] = useState<'polygon' | 'cylinder'>('polygon')
  const [draftCursor, setDraftCursor] = useState<EnuPoint | null>(null)
  const [closeDraftAtStart, setCloseDraftAtStart] = useState(false)
  const finishPendingRef = useRef<(points?: (EnuPoint & { z?: number })[], shape?: 'polygon' | 'cylinder', center?: EnuPoint, radiusM?: number) => void>(() => undefined)
  /* Draft drawing altitude (m) for the ruler: 0–50 in 0.5 steps, starts at
     2.0. Draft-only state — moving it never mutates the saved mission; only
     finishPending reads it for newly drawn geometry. */
  const [drawingAltM, setDrawingAltM] = useState(2.0)
  const photogrammetryAreaAltitudeM = mission.worldType === '2D'
    ? DEFAULT_RECON_FLIGHT_SETTINGS.altitudeM
    : drawingAltM
  const sceneDrawingAltitudeM = tool === 'area' && mission.worldType === '2D'
    ? photogrammetryAreaAltitudeM
    : drawingAltM
  const [draftAreaSettings, setDraftAreaSettings] = useState({ lineSpacingM: 6, orientationDeg: 0, paddingM: 0 })
  const [draftAvoidSettings, setDraftAvoidSettings] = useState<{ type: 'obstacle' | 'privacy'; heightM: number; clearanceM: number }>({ type: 'obstacle', heightM: 15, clearanceM: 2 })
  const panelPreviewBaseRef = useRef<StudioMission | null>(null)
  const [detailEditActive, setDetailEditActive] = useState(false)
  const [codeView, setCodeView] = useState(false)
  const [codeDraft, setCodeDraft] = useState(PYTHON_SAMPLE)
  const [codeLang, setCodeLang] = useState<'python' | 'json'>('python')
  const [jsonDraft, setJsonDraft] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [rightOpen, setRightOpen] = useState(true)
  const [lidarOn, setLidarOn] = useState(true)
  const [simTab, setSimTab] = useState('details')
  const [settings, setSettings] = useState<SimSettings>(() => ({
    ...DEFAULT_SIM_SETTINGS,
    reducedMotion:
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }))
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editWorld, setEditWorld] = useState<string>(WORLDS[0])
  const [editWorldId, setEditWorldId] = useState('')
  const [editVehicle, setEditVehicle] = useState<string>(VEHICLES[0].label)
  const [editDroneId, setEditDroneId] = useState('')
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [simSettingsOpen, setSimSettingsOpen] = useState(false)
  const [announce, setAnnounce] = useState('Mission Studio ready. New empty mission.')
  const [sceneReadiness, setSceneReadiness] = useState<SceneReadiness>('loading')
  const [basemapStyle, setBasemapStyle] = useState<MissionBasemapStyle>('basic')
  const [showPhotoMarkers, setShowPhotoMarkers] = useState(true)
  const [showCameraFootprint, setShowCameraFootprint] = useState(false)
  const [footprintOpacity, setFootprintOpacity] = useState(2)
  const [addressSearchOpen, setAddressSearchOpen] = useState(false)
  const [addressQuery, setAddressQuery] = useState('')
  const [addressSearchStatus, setAddressSearchStatus] = useState('')
  const [addressSearching, setAddressSearching] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState<GeocodeResult[]>([])
  const [addressSuggestionBusy, setAddressSuggestionBusy] = useState(false)
  const [addressSuggestionsOpen, setAddressSuggestionsOpen] = useState(false)
  const [activeAddressSuggestionIndex, setActiveAddressSuggestionIndex] = useState(-1)
  const [addressSuggestionResolvedQuery, setAddressSuggestionResolvedQuery] = useState<string | null>(null)
  const [addressIsComposing, setAddressIsComposing] = useState(false)
  /* Search-result pin (label aid at the selected site): selecting an address
     moves the mission origin to the result, so overlays relocate there too
     and the pin marks the same site. Cleared when the search closes or the
     mission leaves 2D. */
  const [searchMarker, setSearchMarker] = useState<{ latitude: number; longitude: number; label: string } | null>(null)
  const [worldPickerOpen, setWorldPickerOpen] = useState(false)
  /* The standalone app owns browser-history routes so every Library surface
     and each saved mission can open from a direct URL. */
  const [route, setRoute] = useState<MissionStudioRoute>(() =>
    parseMissionStudioRoute(window.location.pathname, import.meta.env.BASE_URL)
  )
  const section = route.kind === 'mission' ? 'studio' : 'library'
  const libNav = route.kind === 'library'
    ? { section: route.section, projectId: route.projectId ?? null }
    : { section: 'home' as LibrarySection, projectId: null }
  const [libraryEntry, setLibraryEntry] = useState<LibraryEntry | null>(null)
  const [workspaceDroneProfiles, setWorkspaceDroneProfiles] = useState<WorkspaceDroneProfile[]>(loadDroneProfiles)
  const selectableMissionWorlds = useMemo(
    () => selectableWorldsForWorkspace(libraryEntry?.workspaceId ?? 'tuan-workspace'),
    [libraryEntry?.workspaceId, route]
  )
  const missionWorldOptions = useMemo(() => {
    if (!mission.world || selectableMissionWorlds.some((world) => world.id === mission.worldId || world.name === mission.world)) {
      return selectableMissionWorlds
    }
    return [...selectableMissionWorlds, {
      id: mission.worldId ?? `legacy-world:${encodeURIComponent(mission.world)}`,
      workspaceId: libraryEntry?.workspaceId ?? 'tuan-workspace',
      name: mission.world,
      location: '',
      status: 'Legacy' as const,
      sourceType: 'none' as const,
      sourceMissionId: '',
      sourceMissionLabel: '',
      sourceFlightReference: '',
      reconstructionReference: '',
      note: ''
    }]
  }, [libraryEntry?.workspaceId, mission.world, mission.worldId, selectableMissionWorlds])
  const availableDrones = useMemo(
    () => workspaceDroneProfiles.filter((profile) => profile.workspaceId === (libraryEntry?.workspaceId ?? 'tuan-workspace')),
    [libraryEntry?.workspaceId, workspaceDroneProfiles]
  )
  const selectedManagedDrone = availableDrones.find((profile) => profile.id === mission.droneId) ??
    availableDrones.find((profile) => profile.name === mission.vehicle)
  const missionDroneValue = selectedManagedDrone?.id ?? `legacy:${mission.vehicle}`
  const missionDroneChoices = [
    ...availableDrones.map((profile) => ({ value: profile.id, label: profile.name })),
    ...(!selectedManagedDrone && mission.vehicle ? [{ value: missionDroneValue, label: `${mission.vehicle} (legacy)` }] : [])
  ]
  const editManagedDrone = availableDrones.find((profile) => profile.id === editDroneId) ??
    availableDrones.find((profile) => profile.name === editVehicle)
  const editDroneValue = editManagedDrone?.id ?? `legacy:${editVehicle}`
  const editDroneChoices = [
    ...availableDrones.map((profile) => ({ value: profile.id, label: profile.name })),
    ...(!editManagedDrone && editVehicle ? [{ value: editDroneValue, label: `${editVehicle} (legacy)` }] : [])
  ]
  const documentTitle = useMemo(() => {
    const appName = 'SkyTrack Mission Studio'
    if (route.kind === 'not-found') return `Page not found · ${appName}`
    if (route.kind === 'mission') {
      const missionName = libraryEntry?.missionId === route.missionId ? libraryEntry.mission : 'Mission'
      return `${missionName} · ${appName}`
    }
    if (route.sharedMissionId) {
      const record = findMissionRecord(loadProjects(), route.sharedMissionId)
      return record ? `${record.mission.name} · Shared accounts · ${appName}` : `Shared accounts · ${appName}`
    }
    if (route.sharedProjectId) {
      return `${getSharedProject(route.sharedProjectId)?.name ?? 'Shared project'} · Shared with me · ${appName}`
    }
    if (route.templateId) {
      const template = seedTemplates().find((item) => item.id === route.templateId)
      return `${template?.title ?? 'Mission template'} · ${appName}`
    }
    if (route.projectId) {
      const project = loadProjects().find((item) => item.id === route.projectId)
      return `${project?.name ?? 'Project'} · ${appName}`
    }
    return `${LIBRARY_PAGE_TITLES[route.section]} · ${appName}`
  }, [libraryEntry, route])

  useEffect(() => {
    document.title = documentTitle
  }, [documentTitle])

  const sceneRef = useRef<MissionSceneHandle>(null)
  const synchronizedOriginRef = useRef(missionOrigin(mission))
  const addressCompositionRef = useRef(false)
  const addressTriggerRef = useRef<HTMLButtonElement>(null)
  const restoreAddressFocusRef = useRef(false)
  /* In-flight search lifecycle: AbortController cancels the fetch, and the
     sequence guard invalidates stale callbacks (close, 2D→3D, unmount) that
     abort alone cannot cover. */
  const addressAbortRef = useRef<AbortController | null>(null)
  const addressSeqRef = useRef(0)
  const suggestionAbortRef = useRef<AbortController | null>(null)
  const suggestionSeqRef = useRef(0)
  const selectedSuggestionQueryRef = useRef<string | null>(null)
  const addressMissionIdRef = useRef(mission.id)
  const previewPositionRef = useRef<{ x: number; y: number; z: number } | null>(null)
  const previewCaptureRef = useRef<string | null>(null)
  const sceneReadinessRef = useRef<SceneReadiness>('loading')
  const onSceneReadinessChange = useCallback((readiness: SceneReadiness) => {
    sceneReadinessRef.current = readiness
    setSceneReadiness(readiness)
  }, [])

  const issues = useMemo(
    () => [...validateMission(mission), ...validateTransfers(mission)],
    [mission]
  )
  const currentGeoOrigin = missionOrigin(mission)
  const visibleSearchMarker = searchMarker &&
    Math.abs(searchMarker.latitude - currentGeoOrigin.lat) < 1e-9 &&
    Math.abs(searchMarker.longitude - currentGeoOrigin.lng) < 1e-9
    ? searchMarker
    : null
  const providerCredit = geocoderAttribution()
  const originCredit = mission.origin?.attribution
  const addressCredits = addressSearchOpen
    ? [
      ...(originCredit && !originCredit.label.includes('OpenStreetMap contributors') ? [originCredit] : []),
      ...(!providerCredit.label.includes('OpenStreetMap contributors') ? [providerCredit] : []),
      { label: 'Search by Photon · © OpenStreetMap contributors', href: 'https://www.openstreetmap.org/copyright' }
    ].filter((credit, index, credits) => credits.findIndex((candidate) => candidate.href === credit.href && candidate.label === credit.label) === index)
    : [originCredit ?? providerCredit]
  const derivedTransfers = useMemo(() => computeDerivedTransfers(mission), [mission])
  const gate = useMemo(() => {
    const errors = issues.filter((i) => i.level === 'error')
    const missionGate = {
      ok: errors.length === 0,
      reason: errors.length > 0 ? errors[0].message : null
    }
    return {
      ok: missionGate.ok && sceneReadiness === 'ready',
      reason: [missionGate.reason, sceneGateReason(sceneReadiness)].filter(Boolean).join(' ') || null
    }
  }, [issues, sceneReadiness])
  const dirty = useMemo(() => savedSnap !== '' && snapshotOf(mission) !== savedSnap, [mission, savedSnap])

  useEffect(() => {
    // Capture the pristine seed once for dirty tracking.
    setSavedSnap((prev) => (prev === '' ? snapshotOf(mission) : prev))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const basePlan = useMemo(() => buildSimPlan(mission), [mission])
  const plan = useMemo(
    () => (basePlan ? applyMockFailure(basePlan, settings.mockFailureAtSeq) : null),
    [basePlan, settings.mockFailureAtSeq]
  )
  const sim = useSimulation(plan, settings)
  const simRef = useRef(sim)
  simRef.current = sim
  const totalT = useMemo(
    () => (plan ? plan.duration * Math.max(1, Math.floor(settings.runTimes) || 1) : 0),
    [plan, settings.runTimes]
  )
  const runT = useMemo(() => {
    if (!plan) return 0
    const runLen = plan.duration || 1
    return Math.max(0, Math.min(sim.simT - sim.runIndex * runLen, runLen))
  }, [plan, sim.simT, sim.runIndex])
  const telemetry = useMemo(
    () => (plan ? telemetryAt(plan, { x: mission.spawn.x, y: mission.spawn.y }, runT, sim.status) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, mission.waypoints, mission.areas, mission.spawn, mission.takeoffAltM, runT, sim.status]
  )

  const say = useCallback((text: string) => setAnnounce(text), [])

  const navigateRoute = useCallback((nextRoute: MissionStudioRoute, replace = false) => {
    const nextPath = missionStudioRoutePath(nextRoute, import.meta.env.BASE_URL)
    if (window.location.pathname !== nextPath) {
      if (replace) window.history.replaceState({}, '', nextPath)
      else window.history.pushState({}, '', nextPath)
    }
    setRoute(nextRoute)
  }, [])

  useEffect(() => {
    const onPopState = () => setRoute(parseMissionStudioRoute(window.location.pathname, import.meta.env.BASE_URL))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (route.kind !== 'not-found') return
    setAnnounce(`Page ${route.pathname} was not found. Returned to Library Home.`)
    navigateRoute({ kind: 'library', section: 'home' }, true)
  }, [navigateRoute, route])

  useEffect(() => {
    if (route.kind !== 'mission') return
    const canonicalPath = missionStudioRoutePath(route, import.meta.env.BASE_URL)
    if (window.location.pathname !== canonicalPath) {
      window.history.replaceState({}, '', canonicalPath)
    }
  }, [route])

  useEffect(() => {
    if (route.kind !== 'mission') return

    const record = findMissionRecord(loadProjects(), route.missionId)
    if (!record) {
      setLibraryEntry(null)
      setAnnounce(`Mission ${route.missionId} was not found. Returned to Library Home.`)
      navigateRoute({ kind: 'library', section: 'home' }, true)
      return
    }

    const entry: LibraryEntry = {
      missionId: record.mission.id,
      projectId: record.project.id,
      project: record.project.name,
      mission: record.mission.name,
      world: record.mission.world,
      worldType: record.mission.worldType,
      worldId: record.mission.worldId,
      vehicle: record.mission.vehicle,
      droneId: record.mission.droneId,
      workspaceId: record.project.workspaceId ?? 'tuan-workspace'
    }
    let restored: StudioMission
    let snapshotWarning = ''
    try {
      restored = record.mission.missionData
        ? missionFromSnapshot(record.mission.missionData)
        : emptyMission()
    } catch {
      restored = emptyMission()
      snapshotWarning = ' Saved mission data could not be read; a blank mission is open.'
    }
    restored = {
      ...restored,
      id: record.mission.id,
      name: record.mission.name,
      ...(record.mission.world ? { world: record.mission.world } : {}),
      ...(record.mission.worldType ? { worldType: record.mission.worldType } : {}),
      ...(record.mission.worldId ? { worldId: record.mission.worldId } : {}),
      ...(record.mission.vehicle ? { vehicle: record.mission.vehicle } : {}),
      ...(record.mission.droneId ? { droneId: record.mission.droneId } : {})
    }

    setLibraryEntry(entry)
    setWorkspaceDroneProfiles(loadDroneProfiles().filter((profile) => profile.workspaceId === entry.workspaceId))
    setMission(restored)
    setSavedSnap(snapshotOf(restored))
    setPast([])
    setFuture([])
    setSelection(null)
    setPending([])
    setTool('select')
    setStage('design')
    setCodeView(false)
    setCodeDraft(PYTHON_SAMPLE)
    setJsonError(null)
    setSimSettingsOpen(false)
    setSimTab('details')
    simRef.current.reset()
    setAnnounce(`Mission ${record.mission.name} opened from ${record.project.name}.${snapshotWarning}`)
  }, [navigateRoute, route])

  /* History commit: single undo entry per design change. Defined before the
     address-search submit so a site move commits through the same path. */
  const commit = useCallback(
    (next: StudioMission, label?: string) => {
      setPast((p) => [...p.slice(-49), snapshotOf(missionRef.current)])
      setFuture([])
      setMission(next)
      setSelection(null)
      if (sim.status === 'running' || sim.status === 'paused') {
        sim.abort()
        say(`${label ?? 'Design updated.'} Simulation aborted — design changed (mock).`)
      } else if (label) {
        say(label)
      }
    },
    [say, sim]
  )

  /* Closing the search invalidates any in-flight request, drops the result
     pin, and optionally returns focus to the trigger. */
  const closeAddressSearch = useCallback((options?: { focusTrigger?: boolean }) => {
    addressSeqRef.current += 1
    addressAbortRef.current?.abort()
    addressAbortRef.current = null
    suggestionSeqRef.current += 1
    suggestionAbortRef.current?.abort()
    suggestionAbortRef.current = null
    setAddressSuggestions([])
    setAddressSuggestionsOpen(false)
    setAddressSuggestionBusy(false)
    setAddressSuggestionResolvedQuery(null)
    setAddressSearchOpen(false)
    setAddressSearching(false)
    setSearchMarker(null)
    if (options?.focusTrigger) restoreAddressFocusRef.current = true
  }, [])

  useEffect(() => {
    suggestionAbortRef.current?.abort()
    suggestionAbortRef.current = null
    if (addressIsComposing || addressCompositionRef.current) {
      suggestionSeqRef.current += 1
      setAddressSuggestionBusy(false)
      return
    }
    const query = addressQuery.trim()
    setAddressSuggestionResolvedQuery(null)
    setAddressSuggestions([])
    setAddressSuggestionsOpen(false)
    setActiveAddressSuggestionIndex(-1)
    if (!addressSearchOpen || query.length < 3 || selectedSuggestionQueryRef.current === query) {
      selectedSuggestionQueryRef.current = null
      setAddressSuggestions([])
      setAddressSuggestionsOpen(false)
      setAddressSuggestionBusy(false)
      return
    }
    const requestId = suggestionSeqRef.current + 1
    suggestionSeqRef.current = requestId
    const controller = new AbortController()
    suggestionAbortRef.current = controller
    const timer = window.setTimeout(() => {
      setAddressSuggestionBusy(true)
      void suggestGeocoder(query, { signal: controller.signal, near: { lat: currentGeoOrigin.lat, lon: currentGeoOrigin.lng } })
        .then(({ results }) => {
          if (controller.signal.aborted || suggestionSeqRef.current !== requestId) return
          setAddressSuggestions(results)
          setAddressSuggestionResolvedQuery(query)
          setAddressSuggestionsOpen(true)
          setActiveAddressSuggestionIndex(-1)
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || suggestionSeqRef.current !== requestId) return
          setAddressSuggestions([])
          setAddressSuggestionsOpen(false)
          setActiveAddressSuggestionIndex(-1)
          setAddressSearchStatus(error instanceof Error ? error.message : 'Address suggestions are unavailable. Try again.')
        })
        .finally(() => {
          if (suggestionSeqRef.current === requestId) {
            suggestionAbortRef.current = null
            setAddressSuggestionBusy(false)
          }
        })
    }, 450)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [addressQuery, addressIsComposing, addressSearchOpen, currentGeoOrigin.lat, currentGeoOrigin.lng])

  useEffect(() => {
    if (!addressSearchOpen) return
    /* The toolbar trigger can reclaim focus at the end of its click. Focus
       after that event settles so the first typed character reaches the input. */
    const timer = window.setTimeout(() => document.getElementById('ms-address-search-input')?.focus({ preventScroll: true }), 0)
    return () => window.clearTimeout(timer)
  }, [addressSearchOpen])

  useEffect(() => {
    if (addressSearchOpen || addressSearching || !restoreAddressFocusRef.current) return
    restoreAddressFocusRef.current = false
    addressTriggerRef.current?.focus()
  }, [addressSearchOpen, addressSearching])

  /* Keep camera context aligned with the mission's geographic anchor when
     history restores or reapplies a searched site. Defer until Cesium is
     ready so an early geocode result is not lost during scene startup. */
  useEffect(() => {
    if (mission.worldType !== '2D' || sceneReadiness !== 'ready') return
    const nextOrigin = missionOrigin(mission)
    const previousOrigin = synchronizedOriginRef.current
    if (nextOrigin.lat === previousOrigin.lat && nextOrigin.lng === previousOrigin.lng) return
    synchronizedOriginRef.current = nextOrigin
    sceneRef.current?.flyToLocation({ latitude: nextOrigin.lat, longitude: nextOrigin.lng })
  }, [mission, sceneReadiness])

  useEffect(() => {
    if (addressMissionIdRef.current === mission.id) return
    addressMissionIdRef.current = mission.id
    closeAddressSearch()
  }, [closeAddressSearch, mission.id])

  useEffect(() => {
    if (section !== 'studio') closeAddressSearch()
  }, [closeAddressSearch, section])

  /* Leaving 2D photogrammetry invalidates any in-flight search (the search UI
     unmounts with it); a stale result must not move the camera afterwards.
     Unmount aborts as well. */
  useEffect(() => {
    if ((mission.worldType ?? '3D') !== '2D') {
      addressSeqRef.current += 1
      addressAbortRef.current?.abort()
      addressAbortRef.current = null
      setAddressSearchOpen(false)
      setAddressSearching(false)
      setSearchMarker(null)
    }
  }, [mission.worldType])
  useEffect(
    () => () => {
      addressSeqRef.current += 1
      addressAbortRef.current?.abort()
      addressAbortRef.current = null
    },
    []
  )

  /* Explicit-submit only (no autocomplete): fires solely from the search
     button or Enter. Rate limiting + result caching live in the shared
     geocoder helper; the sequence guard + AbortController keep stale
     callbacks from moving the camera or overwriting status.
     Selecting an address moves the mission site: the mission origin updates
     to the result while every local x/y coordinate stays unchanged, so the
     whole plan (routes, areas, avoids) relocates as one unit and new drawing
     converts through the new origin (within ±2000 m local bounds, rendering
     under the clicked position). Undoable via the normal history. */
  const searchAddress = useCallback(async () => {
    const query = addressQuery.trim()
    if (!query || addressSearching) return
    suggestionSeqRef.current += 1
    suggestionAbortRef.current?.abort()
    suggestionAbortRef.current = null
    setAddressSuggestionsOpen(false)
    setAddressSuggestions([])
    setAddressSuggestionBusy(false)
    const requestedMissionId = missionRef.current.id
    const requestId = addressSeqRef.current + 1
    addressSeqRef.current = requestId
    addressAbortRef.current?.abort()
    const controller = new AbortController()
    addressAbortRef.current = controller
    setAddressSearching(true)
    setAddressSearchStatus('Searching address…')
    try {
      const { results, attribution } = await searchGeocoder(query, { signal: controller.signal })
      if (controller.signal.aborted || addressSeqRef.current !== requestId) return
      const currentMission = missionRef.current
      if (section !== 'studio' || currentMission.id !== requestedMissionId || (currentMission.worldType ?? '3D') !== '2D' || !addressSearchOpen) return
      const result = results[0]
      if (!result) {
        setAddressSearchStatus('No matching address found.')
        say('No matching address found.')
        return
      }
      const name = result.displayName.split(',').slice(0, 3).join(',')
      // Site move: keep local coordinates, re-anchor the mission origin.
      commit(
        withMissionOrigin(currentMission, { lat: result.lat, lng: result.lon }, attribution),
        `Mission site moved to ${name}. Existing geometry moved with it.`
      )
      setSearchMarker({ latitude: result.lat, longitude: result.lon, label: name })
      setAddressSearchStatus(`Found ${name}. Mission site moved here; existing geometry moved with it.`)
    } catch (error) {
      if (controller.signal.aborted || addressSeqRef.current !== requestId) return
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Address search failed. Try again.'
      setAddressSearchStatus(message)
      say(message)
    } finally {
      if (addressSeqRef.current === requestId) {
        addressAbortRef.current = null
        setAddressSearching(false)
      }
    }
  }, [addressQuery, addressSearching, addressSearchOpen, commit, say, section])
  const selectAddressSuggestion = useCallback((result: GeocodeResult | null) => {
    if (!result) return
    const name = result.displayName.split(',').slice(0, 3).join(',')
    selectedSuggestionQueryRef.current = result.displayName
    setAddressQuery(result.displayName)
    setAddressSuggestionsOpen(false)
    setAddressSuggestions([])
    setAddressSuggestionResolvedQuery(null)
    setAddressSearchStatus(`Found ${name}. Mission site moved here; existing geometry moved with it.`)
    commit(
      withMissionOrigin(missionRef.current, { lat: result.lat, lng: result.lon }, {
        label: '© OpenStreetMap contributors · Photon',
        href: 'https://www.openstreetmap.org/copyright'
      }),
      `Mission site moved to ${name}. Existing geometry moved with it.`
    )
    setSearchMarker({ latitude: result.lat, longitude: result.lon, label: name })
  }, [commit])
  const openLibraryMission = useCallback((entry: LibraryEntry) => {
    navigateRoute({ kind: 'mission', missionId: entry.missionId })
  }, [navigateRoute])
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
  useEffect(() => {
    if (sceneReadiness === 'ready' || stage !== 'simulation') return
    if (sim.status === 'running' || sim.status === 'paused') sim.abort()
    setStage('design')
    say('Simulation stopped. 3D scene unavailable; retry 3D from Design.')
  }, [sceneReadiness, stage, sim, say])

  const undo = useCallback(() => {
    if (past.length === 0) return
    const prev = past[past.length - 1]
    setFuture((f) => [snapshotOf(mission), ...f].slice(0, 50))
    let restored: StudioMission | null = null
    try {
      restored = missionFromSnapshot(prev)
      setMission(restored)
    } catch {
      /* keep current */
    }
    setPast((p) => p.slice(0, -1))
    // (T-016) one click-again delete is one undo entry: when the undone
    // state resurrects exactly one authored waypoint, restore its selection.
    const resurrected = restored
      ? restored.waypoints.filter(
        (w) =>
          !w.generatedByArea &&
          !w.generatedByAvoid &&
          !mission.waypoints.some((c) => c.id === w.id)
      )
      : []
    if (resurrected.length === 1) setSelection({ kind: 'waypoint', id: resurrected[0].id })
    else setSelection(null)
    say('Undone.')
  }, [mission, past, say])

  const redo = useCallback(() => {
    if (future.length === 0) return
    const [next, ...rest] = future
    setPast((p) => [...p.slice(-49), snapshotOf(mission)])
    try {
      setMission(missionFromSnapshot(next))
    } catch {
      /* keep current */
    }
    setFuture(rest)
    setSelection(null)
    say('Redone.')
  }, [future, mission, say])

  /* ------------------------- app tabs (Plan / Fly / Report) ------------------------- */
  const gotoAppTab = useCallback(
    (next: AppTab) => {
      setAppTab(next)
      if (next === 'plan') say('Plan tab. Mission planner.')
      else if (next === 'fly') say('Fly tab, placeholder. Flight execution is not implemented in this prototype.')
      else say('Report tab, placeholder. Mission reports are not implemented in this prototype.')
    },
    [say]
  )

  /* ------------------------- stage ------------------------- */
  const gotoStage = useCallback(
    (next: Stage) => {
      setAppTab('plan')
      if (next === 'simulation' && (!gate.ok || sceneReadinessRef.current !== 'ready')) {
        say(`Simulation locked. ${gate.reason ?? sceneGateReason(sceneReadinessRef.current) ?? '3D scene is not ready.'}`)
        return
      }
      setStage(next)
      setTool('select')
      setPending([])
      setSimSettingsOpen(false)
      say(next === 'simulation' ? 'Simulation stage (mock). Design preserved.' : 'Design stage.')
    },
    [gate, say]
  )

  /* ------------------------- generated route (Area scan + Avoid detours) ------------------------- */
  const regenerateAreaWaypoints = useCallback((next: StudioMission): StudioMission => {
    const areas = next.areas.map((area) => ({ ...area, scanLines: generateAreaScan(area) }))
    const routeBase = normalizeMissionRoutes({ ...next, areas })
    const authored = routeBase.waypoints.filter((wp) => !wp.generatedByArea && !wp.generatedByAvoid)
    const generatedByArea = new Map(areas.map((area) => {
      const lines = area.scanLines ?? []
      const prior = next.waypoints.filter((wp) => wp.generatedByArea === area.id)
      const points = generateAreaCapturePath(area, lines)
      const reusedPriorIds = new Set<string>()
      const priorByCell = new Map<string, typeof prior>()
      for (const waypoint of prior) {
        const key = `${Math.floor(waypoint.x * 10)}:${Math.floor(waypoint.y * 10)}`
        const cell = priorByCell.get(key) ?? []
        cell.push(waypoint)
        priorByCell.set(key, cell)
      }
      const findPriorAt = (x: number, y: number) => {
        const cellX = Math.floor(x * 10)
        const cellY = Math.floor(y * 10)
        for (let dx = -1; dx <= 1; dx += 1) {
          for (let dy = -1; dy <= 1; dy += 1) {
            const candidates = priorByCell.get(`${cellX + dx}:${cellY + dy}`) ?? []
            const match = candidates.find((waypoint) =>
              !reusedPriorIds.has(waypoint.id) && Math.abs(waypoint.x - x) <= 0.05 && Math.abs(waypoint.y - y) <= 0.05
            )
            if (match) return match
          }
        }
        return undefined
      }
      const areaFlightAltM = getAreaFlightAltitudeM(area, routeBase.takeoffAltM, routeBase.worldType ?? '3D')
      const waypoints = points.map((p, index) => {
        const x = Math.round(p.x * 100) / 100
        const y = Math.round(p.y * 100) / 100
        const matchedPrior = findPriorAt(x, y)
        const indexedPrior = prior[index] && !reusedPriorIds.has(prior[index].id) ? prior[index] : undefined
        const reusedId = matchedPrior?.id ?? indexedPrior?.id
        if (reusedId) reusedPriorIds.add(reusedId)
        const altitudeOverrideM = matchedPrior?.altitudeOverrideM
        const matchedActions = matchedPrior?.actions ?? []
        const photoActions = matchedActions.filter((action) => action.kind === 'photo')
        const actions = p.capturePhoto
          ? photoActions.length > 0
            ? matchedActions
            : [...matchedActions, { id: uid('act'), kind: 'photo' as const, label: actionLabel('photo') }]
          : matchedActions.filter((action) => action.kind !== 'photo')
        return {
          id: reusedId ?? uid('wp'), seq: 0, x, y,
          z: Number.isFinite(altitudeOverrideM) ? altitudeOverrideM as number : areaFlightAltM,
          ...(Number.isFinite(altitudeOverrideM) ? { altitudeOverrideM } : {}),
          actions,
          generatedByArea: area.id
        }
      })
      return [area.id, waypoints] as const
    }))
    const authoredByRoute = new Map(getMissionRoutes(routeBase).map((route, index) => [
      route.id,
      authored.filter((waypoint) => waypoint.routeId === route.id || (!waypoint.routeId && index === 0))
    ]))
    const ordered = getMissionSequence({ ...routeBase, areas }).flatMap((item) =>
      item.type === 'route'
        ? authoredByRoute.get(item.id) ?? []
        : generatedByArea.get(item.id) ?? []
    )
    return { ...routeBase, areas, waypoints: renumber(ordered) }
  }, [])

  /** Strip obsolete Avoid detours and deterministically regenerate them from
      the current authored + Area route, reusing prior detour IDs per Avoid. */
  const refreshDetours = useCallback((next: StudioMission, priors: StudioMission): StudioMission => {
    return withAvoidDetours(next, priors.waypoints.filter((wp) => wp.generatedByAvoid))
  }, [])

  /** Full generated-route recompute: Area scan waypoints first, then Avoid
      detours around the resulting effective route. Authored waypoints untouched. */
  const recomputeGenerated = useCallback((next: StudioMission, priors: StudioMission): StudioMission => {
    return refreshDetours(regenerateAreaWaypoints(next), priors)
  }, [refreshDetours, regenerateAreaWaypoints])

  const detourNote = useCallback((out: StudioMission): string => {
    const n = countDetours(out)
    return n > 0 ? ` Includes ${n} generated avoid-detour waypoint${n === 1 ? '' : 's'} (mock geometry).` : ''
  }, [])

  /* ------------------------- scene input ------------------------- */
  const addWaypointAt = useCallback(
    (p: EnuPoint, requestedRouteId?: string) => {
      const routes = getMissionRoutes(mission)
      const routeId = requestedRouteId ?? routes[0]?.id ?? 'route-1'
      const route = routes.find((item) => item.id === routeId)
      const nextRoutes = route
        ? (mission.routes?.length ? mission.routes : routes)
        : [...(mission.routes ?? routes), { id: routeId, label: `Route ${routes.length + 1}`, targetSpeedMS: mission.targetSpeedMS }]
      const wp = {
        id: uid('wp'),
        seq: mission.waypoints.length + 1,
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        z: mission.takeoffAltM,
        actions: route?.reconnaissance?.enabled ? [{ id: uid('act'), kind: 'photo' as const, label: actionLabel('photo') }] : [],
        routeId
      }
      const out = refreshDetours({
        ...mission,
        routes: nextRoutes,
        sequenceOrder: appendMissionSequenceItem(mission, { type: 'route', id: routeId }),
        waypoints: [...mission.waypoints, wp]
      }, mission)
      commit(
        out,
        `Waypoint ${wp.seq} added at ${wp.x}, ${wp.y} (mock altitude ${wp.z} m).${detourNote(out)}`
      )
      setSelection({ kind: 'waypoint', id: wp.id })
    },
    [commit, detourNote, mission, refreshDetours]
  )

  const onScenePoint = useCallback(
    (p: EnuPoint) => {
      if (stage !== 'design') return
      if (tool === 'home') {
        const x = Math.round(p.x * 10) / 10
        const y = Math.round(p.y * 10) / 10
        commit({ ...mission, spawn: { x, y } }, `Home point set at ${x.toFixed(1)}, ${y.toFixed(1)} m.`)
        setSelection(null)
        setTool('select')
        return
      }
      if (tool === 'route') {
        const clickZ = Math.round(Math.max(drawingAltM, mission.takeoffAltM) * 10) / 10
        setPending((prev) => [
          ...prev,
          {
            x: Math.round(p.x * 10) / 10,
            y: Math.round(p.y * 10) / 10,
            z: clickZ
          }
        ])
      } else if (tool === 'area' || tool === 'avoid') {
        const point = { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }
        if (pendingShape === 'cylinder') {
          if (pending.length === 0) {
            setPending([point])
            setDraftCursor(null)
            return
          }
          const center = pending[0]
          const radiusM = Math.hypot(point.x - center.x, point.y - center.y)
          if (radiusM < 0.5) {
            say('Move farther from the center to set a cylinder radius of at least 0.5 m.')
            return
          }
          finishPendingRef.current(circleFootprint(center, radiusM), 'cylinder', center, radiusM)
          return
        }
        setPending((prev) => [...prev, point])
      }
    },
    [commit, drawingAltM, mission, pending, pendingShape, say, stage, tool]
  )

  const onDraftHover = useCallback((point: EnuPoint | null, nearStart: boolean) => {
    setDraftCursor((current) => {
      if (!point) return null
      const next = { x: Math.round(point.x * 10) / 10, y: Math.round(point.y * 10) / 10 }
      return current && Math.abs(current.x - next.x) < 0.2 && Math.abs(current.y - next.y) < 0.2 ? current : next
    })
    setCloseDraftAtStart(nearStart && isValidRing(pending))
  }, [pending])

  const onPendingPositionChange = useCallback((index: number, x: number, y: number) => {
    setPending((prev) => {
      if (index < 0 || index >= prev.length) return prev
      const next = [...prev]
      const cur = next[index]
      next[index] = {
        ...cur,
        x: Math.round(Math.max(-2000, Math.min(2000, x)) * 10) / 10,
        y: Math.round(Math.max(-2000, Math.min(2000, y)) * 10) / 10
      }
      return next
    })
  }, [])

  const onPendingAltitudeChange = useCallback((index: number, z: number) => {
    setPending((prev) => {
      if (index < 0 || index >= prev.length) return prev
      const next = [...prev]
      const cur = next[index]
      next[index] = {
        ...cur,
        z: Math.round(Math.max(0, z) * 100) / 100
      }
      return next
    })
  }, [])

  const onRemovePendingPoint = useCallback((index: number) => {
    setPending((prev) => {
      if (index < 0 || index >= prev.length) return prev
      return prev.filter((_, pointIndex) => pointIndex !== index)
    })
    say(`Draft waypoint ${index + 1} removed.`)
  }, [say])

  const onInsertPendingPoint = useCallback((index: number, point: { x: number; y: number; z: number }) => {
    setPending((prev) => {
      const clampedPoint = {
        x: Math.round(Math.max(-2000, Math.min(2000, point.x)) * 10) / 10,
        y: Math.round(Math.max(-2000, Math.min(2000, point.y)) * 10) / 10,
        z: Math.round(Math.max(0, point.z) * 100) / 100
      }
      return [...prev.slice(0, index), clampedPoint, ...prev.slice(index)]
    })
  }, [])

  const insertWaypointAt = useCallback((beforeIndex: number, p: EnuPoint, z: number) => {
    const routeId = mission.waypoints[beforeIndex]?.routeId ?? mission.waypoints[beforeIndex - 1]?.routeId ?? getMissionRoutes(mission)[0]?.id
    const routeReconEnabled = getMissionRoutes(mission).find((route) => route.id === routeId)?.reconnaissance?.enabled
    const actions = routeReconEnabled ? [{ id: uid('act'), kind: 'photo' as const, label: actionLabel('photo') }] : []
    const wp = { id: uid('wp'), seq: 0, x: p.x, y: p.y, z, actions, ...(routeId ? { routeId } : {}) }
    const waypoints = [...mission.waypoints]
    waypoints.splice(Math.max(0, Math.min(beforeIndex, waypoints.length)), 0, wp)
    const out = refreshDetours({ ...mission, waypoints: renumber(waypoints) }, mission)
    commit(out, `Waypoint inserted into route.${detourNote(out)}`)
    setSelection({ kind: 'waypoint', id: wp.id })
  }, [commit, detourNote, mission, refreshDetours])

  const removeWaypointById = useCallback((id: string) => {
    const wp = mission.waypoints.find((w) => w.id === id)
    if (!wp || wp.generatedByArea || wp.generatedByAvoid) {
      say('Generated waypoints cannot be removed individually (mock).')
      return
    }
    const routes = getMissionRoutes(mission)
    const routeId = wp.routeId ?? routes[0]?.id
    const waypoints = renumber(mission.waypoints.filter((w) => w.id !== id))
    const routeStillHasWaypoints = routeId !== undefined && waypoints.some((waypoint) =>
      !waypoint.generatedByArea && !waypoint.generatedByAvoid &&
      (waypoint.routeId === routeId || (!waypoint.routeId && routes[0]?.id === routeId))
    )
    const removeEmptyRoute = routeId !== undefined && !routeStillHasWaypoints
    const nextRoutes = removeEmptyRoute ? routes.filter((route) => route.id !== routeId) : routes
    const out = refreshDetours({
      ...mission,
      routes: nextRoutes.length > 0 ? nextRoutes : undefined,
      sequenceOrder: removeEmptyRoute
        ? removeMissionSequenceItem(mission, { type: 'route', id: routeId })
        : mission.sequenceOrder,
      waypoints
    }, mission)
    commit(out, `Waypoint ${wp.seq} deleted.${removeEmptyRoute ? ' Empty Route removed from sequence.' : ''}${detourNote(out)}`)
  }, [commit, detourNote, mission, refreshDetours, say])

  const onWaypointAltitudeChange = useCallback((id: string, z: number) => {
    const wp = mission.waypoints.find((w) => w.id === id)
    if (!wp) return
    const clamped = Math.max(0, Number.isFinite(z) ? z : wp.z)
    const rounded = Math.round(clamped * 100) / 100
    const changedWaypoints = mission.waypoints.map((w) => w.id === id ? { ...w, z: rounded, ...((w.generatedByArea || w.generatedByAvoid) ? { altitudeOverrideM: rounded } : {}) } : w)
    const changedMission = { ...mission, waypoints: changedWaypoints }
    const out = refreshDetours(changedMission, changedMission)
    commit(out, `Waypoint ${wp.seq} altitude set to ${rounded.toFixed(1)} m.${detourNote(out)}`)
    setSelection({ kind: 'waypoint', id })
  }, [commit, detourNote, mission, refreshDetours])

  const onWaypointPositionChange = useCallback((id: string, x: number, y: number) => {
    const wp = mission.waypoints.find((w) => w.id === id)
    if (!wp || wp.generatedByArea || wp.generatedByAvoid) return
    const nx = Math.round(Math.max(-2000, Math.min(2000, Number.isFinite(x) ? x : wp.x)) * 10) / 10
    const ny = Math.round(Math.max(-2000, Math.min(2000, Number.isFinite(y) ? y : wp.y)) * 10) / 10
    // No-op drag (released where it started): keep selection, no history.
    if (nx === wp.x && ny === wp.y) {
      setSelection({ kind: 'waypoint', id })
      return
    }
    const out = refreshDetours({ ...mission, waypoints: mission.waypoints.map((w) => w.id === id ? { ...w, x: nx, y: ny } : w) }, mission)
    commit(out, `Waypoint ${wp.seq} moved to ${nx}, ${ny}; altitude kept at ${wp.z.toFixed(1)} m.${detourNote(out)}`)
    setSelection({ kind: 'waypoint', id })
  }, [commit, detourNote, mission, refreshDetours])

  const updateMissionFromPanel = useCallback((next: StudioMission, label?: string) => {
    const areasChanged = JSON.stringify(mission.areas) !== JSON.stringify(next.areas)
    const routingChanged =
      areasChanged ||
      JSON.stringify(mission.avoids) !== JSON.stringify(next.avoids) ||
      JSON.stringify(mission.waypoints) !== JSON.stringify(next.waypoints) ||
      mission.takeoffAltM !== next.takeoffAltM
    const takeoffDelta = next.takeoffAltM - mission.takeoffAltM
    const shiftGeneratedAlt = next.worldType !== '2D' && Number.isFinite(takeoffDelta) && takeoffDelta !== 0
    const priorGeneratedIds = shiftGeneratedAlt
      ? new Set(mission.waypoints.filter((wp) => wp.generatedByArea).map((wp) => wp.id))
      : null
    const keepSelection = selection
    let out = next
    if (areasChanged) out = regenerateAreaWaypoints(out)
    if (shiftGeneratedAlt && priorGeneratedIds) {
      out = {
        ...out,
        waypoints: out.waypoints.map((wp) =>
          wp.generatedByArea && priorGeneratedIds.has(wp.id) && !Number.isFinite(wp.altitudeOverrideM) && Number.isFinite(wp.z)
            ? { ...wp, z: Math.round((wp.z + takeoffDelta) * 100) / 100 }
            : wp
        )
      }
    }
    if (routingChanged) out = refreshDetours(out, mission)
    commit(out, label)
    if (keepSelection) setSelection(keepSelection)
  }, [commit, mission, refreshDetours, regenerateAreaWaypoints, selection])

  const preparePanelPreview = useCallback((next: StudioMission, base: StudioMission): StudioMission => {
    const areasChanged = JSON.stringify(base.areas) !== JSON.stringify(next.areas)
    const routingChanged = areasChanged
      || JSON.stringify(base.avoids) !== JSON.stringify(next.avoids)
      || JSON.stringify(base.waypoints) !== JSON.stringify(next.waypoints)
      || base.takeoffAltM !== next.takeoffAltM
    let out = areasChanged ? regenerateAreaWaypoints(next) : next
    if (routingChanged) out = refreshDetours(out, base)
    return out
  }, [refreshDetours, regenerateAreaWaypoints])

  const previewMissionFromPanel = useCallback((next: StudioMission) => {
    const base = panelPreviewBaseRef.current ?? mission
    panelPreviewBaseRef.current ??= mission
    setMission(preparePanelPreview(next, base))
  }, [mission, preparePanelPreview])

  const commitPanelPreview = useCallback((next: StudioMission, label?: string) => {
    const base = panelPreviewBaseRef.current ?? mission
    const out = preparePanelPreview(next, base)
    panelPreviewBaseRef.current = null
    if (snapshotOf(base) === snapshotOf(out)) {
      setMission(out)
      return
    }
    const keepSelection = selection
    setPast((prev) => [...prev.slice(-49), snapshotOf(base)])
    setFuture([])
    setMission(out)
    if (keepSelection) setSelection(keepSelection)
    if (label) say(label)
  }, [mission, preparePanelPreview, say, selection])

  const cancelPanelPreview = useCallback(() => {
    const base = panelPreviewBaseRef.current
    panelPreviewBaseRef.current = null
    if (base) setMission(base)
  }, [])

  useEffect(() => {
    if (tool === 'area') setDraftAreaSettings({ lineSpacingM: 6, orientationDeg: 0, paddingM: 0 })
    if (tool === 'avoid') setDraftAvoidSettings({ type: 'obstacle', heightM: 15, clearanceM: 2 })
    if ((tool !== 'select' || stage !== 'design') && panelPreviewBaseRef.current) {
      cancelPanelPreview()
      setDetailEditActive(false)
    }
  }, [cancelPanelPreview, stage, tool])

  const onAvoidHeightChange = useCallback((id: string, heightM: number) => {
    const clamped = Math.max(0, Number.isFinite(heightM) ? heightM : 0)
    const next = { ...mission, avoids: mission.avoids.map((zone) => zone.id === id ? { ...zone, heightM: Math.round(clamped * 10) / 10 } : zone) }
    const keepSelection = selection
    const out = refreshDetours(next, mission)
    commit(out, `Avoid height set to ${clamped.toFixed(1)} m (mock).${detourNote(out)}`)
    if (keepSelection) setSelection(keepSelection)
    else setSelection({ kind: 'avoid', id })
  }, [commit, detourNote, mission, refreshDetours, selection])

  const finishPending = useCallback((
    overridePoints?: (EnuPoint & { z?: number })[],
    overrideShape?: 'polygon' | 'cylinder',
    circleCenter?: EnuPoint,
    circleRadiusM?: number
  ) => {
    const points = overridePoints ?? pending
    const shape = overrideShape ?? pendingShape
    if (tool === 'route') {
      if (points.length < 2) {
        say('Route needs at least 2 waypoints. Add another point or cancel.')
        return
      }
      const routes = getMissionRoutes(mission)
      const routeId = uid('route')
      const routeLabel = `Route ${routes.length + 1}`
      const added = points.map((p) => ({
        id: uid('wp'),
        seq: 0,
        x: p.x,
        y: p.y,
        z: p.z ?? Math.round(Math.max(drawingAltM, mission.takeoffAltM) * 10) / 10,
        actions: [],
        routeId
      }))
      const out = recomputeGenerated({
        ...mission,
        routes: [...(mission.routes ?? routes), { id: routeId, label: routeLabel, targetSpeedMS: mission.targetSpeedMS }],
        sequenceOrder: appendMissionSequenceItem(mission, { type: 'route', id: routeId }),
        waypoints: renumber([...mission.waypoints, ...added])
      }, mission)
      commit(out, `${routeLabel} committed: ${added.length} waypoints.${detourNote(out)}`)
      setSelection({ kind: 'waypoint', id: added[0].id })
      setPending([])
      setDraftCursor(null)
      setCloseDraftAtStart(false)
      setTool('select')
      return
    }
    if (tool === 'area' || tool === 'avoid') {
      if (points.length < 3) {
        say(`${tool === 'area' ? 'Area' : 'Avoid zone'} needs at least 3 points — keep clicking the scene.`)
        return
      }
      const label = tool === 'area' ? `Area ${mission.areas.length + 1}` : `Avoid ${mission.avoids.length + 1}`
      if (!isValidRing(points)) {
        say(`${tool === 'area' ? 'Area' : 'Avoid zone'} outline crosses itself or has zero area. Adjust points and try again.`)
        return
      }
      if (tool === 'area') {
        const baseAltM = mission.worldType === '2D'
          ? 0
          : Math.round(Math.max(0, drawingAltM) * 10) / 10
        const area: MissionArea = {
          id: uid('area'), label, points, shape, center: circleCenter, radiusM: circleRadiusM,
          ...draftAreaSettings,
          baseAltM
        }
        area.scanLines = generateAreaScan(area)
        if (area.scanLines.length === 0) {
          say('Area created no scan lanes. Make area larger or reduce spacing/padding.')
          return
        }
        const next = recomputeGenerated({
          ...mission,
          areas: [...mission.areas, area],
          sequenceOrder: appendMissionSequenceItem(mission, { type: 'area', id: area.id })
        }, mission)
        commit(next, `${label} committed with ${area.scanLines.length} scan lanes.${detourNote(next)}`)
        setSelection({ kind: 'area', id: area.id })
      } else {
        const zone = { id: uid('avoid'), label, points, shape, center: circleCenter, radiusM: circleRadiusM, ...draftAvoidSettings, baseAltM: Math.round(Math.max(0, drawingAltM) * 10) / 10 }
        const next = refreshDetours({ ...mission, avoids: [...mission.avoids, zone] }, mission)
        commit(next, `${label} added as a 15 m prism with 2 m clearance.${detourNote(next)}`)
        setSelection({ kind: 'avoid', id: zone.id })
      }
      setPending([])
      setDraftCursor(null)
      setCloseDraftAtStart(false)
      setTool('select')
      return
    }
    setTool('select')
    setPending([])
  }, [commit, detourNote, draftAreaSettings, draftAvoidSettings, drawingAltM, mission, pending, pendingShape, recomputeGenerated, refreshDetours, tool, say])

  finishPendingRef.current = finishPending

  const closePendingShape = useCallback(() => {
    if ((tool === 'area' || tool === 'avoid') && pendingShape === 'cylinder') {
      const center = pending[0]
      if (!center || !draftCursor) return
      const radiusM = Math.hypot(draftCursor.x - center.x, draftCursor.y - center.y)
      if (radiusM < 0.5) return
      finishPending(circleFootprint(center, radiusM), 'cylinder', center, radiusM)
      return
    }
    finishPending()
  }, [draftCursor, finishPending, pending, pendingShape, tool])

  const cancelPending = useCallback(() => {
    setPending([])
    setDraftCursor(null)
    setCloseDraftAtStart(false)
    setTool('select')
    say('Drawing cancelled.')
  }, [say])

  /* ------------------------- design ops ------------------------- */
  const deleteSelection = useCallback(() => {
    if (!selection) return
    if (selection.kind === 'waypoint') {
      removeWaypointById(selection.id)
      return
    }
    if (selection.kind === 'spawn') {
      say('Spawn point is required and cannot be deleted (mock).')
      return
    }
    if (selection.kind === 'area') {
      commit(recomputeGenerated({
        ...mission,
        areas: mission.areas.filter((a) => a.id !== selection.id),
        sequenceOrder: removeMissionSequenceItem(mission, { type: 'area', id: selection.id }),
        waypoints: mission.waypoints.filter((wp) => wp.generatedByArea !== selection.id)
      }, mission), 'Area and generated scan waypoints deleted. Avoid detours recomputed.')
      return
    }
    const out = refreshDetours({ ...mission, avoids: mission.avoids.filter((a) => a.id !== selection.id) }, mission)
    commit(out, 'Avoid zone deleted. Obsolete detours removed.')
  }, [commit, mission, recomputeGenerated, refreshDetours, removeWaypointById, selection, say])

  const onMoveWaypoint = useCallback(
    (id: string, dir: -1 | 1) => {
      const idx = mission.waypoints.findIndex((w) => w.id === id)
      const j = idx + dir
      if (idx < 0 || j < 0 || j >= mission.waypoints.length) return
      const list = [...mission.waypoints]
      const [moved] = list.splice(idx, 1)
      list.splice(j, 0, moved)
      const out = refreshDetours({ ...mission, waypoints: renumber(list) }, mission)
      commit(out, `Waypoint moved to position ${j + 1}.${detourNote(out)}`)
      setSelection({ kind: 'waypoint', id })
    },
    [commit, detourNote, mission, refreshDetours]
  )

  const onReorderWaypoint = useCallback(
    (id: string, toIndex: number) => {
      const list = reorderWaypoints(mission.waypoints, id, toIndex)
      if (list === mission.waypoints) return
      const out = refreshDetours({ ...mission, waypoints: list }, mission)
      const position = list.findIndex((w) => w.id === id) + 1
      commit(out, `Waypoint reordered to position ${position} of ${list.length}.${detourNote(out)}`)
      setSelection({ kind: 'waypoint', id })
    },
    [commit, detourNote, mission, refreshDetours]
  )

  const onMoveAction = useCallback(
    (fromWpId: string, actionId: string, toWpId: string, toActionId?: string, position: 'before' | 'after' = 'after') => {
      const sourceWaypoint = mission.waypoints.find((waypoint) => waypoint.id === fromWpId)
      const targetWaypoint = mission.waypoints.find((waypoint) => waypoint.id === toWpId)
      if (!sourceWaypoint || !targetWaypoint) return
      const routes = getMissionRoutes(mission)
      const sourceRouteId = sourceWaypoint.routeId ?? routes[0]?.id
      const targetRouteId = targetWaypoint.routeId ?? routes[0]?.id
      if (sourceRouteId !== targetRouteId) return

      const sourceActions = [...sourceWaypoint.actions]
      const sourceIndex = sourceActions.findIndex((action) => action.id === actionId)
      if (sourceIndex < 0) return
      const [movingAction] = sourceActions.splice(sourceIndex, 1)
      const targetActions = fromWpId === toWpId ? sourceActions : [...targetWaypoint.actions]
      let insertionIndex = targetActions.length

      if (toActionId) {
        if (toActionId === actionId) return
        insertionIndex = targetActions.findIndex((action) => action.id === toActionId)
        if (insertionIndex < 0) return
        if (position === 'after') insertionIndex += 1
      }
      targetActions.splice(insertionIndex, 0, movingAction)

      if (
        fromWpId === toWpId
        && sourceWaypoint.actions.every((action, index) => action.id === targetActions[index]?.id)
      ) return

      const waypoints = mission.waypoints.map((waypoint) => {
        if (fromWpId === toWpId && waypoint.id === fromWpId) return { ...waypoint, actions: targetActions }
        if (waypoint.id === fromWpId) return { ...waypoint, actions: sourceActions }
        if (waypoint.id === toWpId) return { ...waypoint, actions: targetActions }
        return waypoint
      })
      commit(
        { ...mission, waypoints },
        `${movingAction.label} moved to waypoint ${targetWaypoint.seq}.`
      )
    },
    [commit, mission]
  )

  /* Context-bar selectors: change only the selected mission value through the
     established update path. Geometry, undo history, selection and camera are
     untouched; dirty tracking and validation behave like any other edit. */
  const onSelectVehicle = useCallback(
    (droneId: string, label: string) => {
      if (droneId === mission.droneId && label === mission.vehicle) return
      updateMissionFromPanel(
        { ...mission, vehicle: label, droneId },
        `Drone set to ${label} (mock). Compatibility checks updated.`
      )
    },
    [mission, updateMissionFromPanel]
  )

  const onSelectWorld = useCallback(
    (worldId: string) => {
      const selected = missionWorldOptions.find((world) => world.id === worldId)
      if (!selected) return
      const nextWorldId = selected.status === 'Legacy'
        ? (mission.worldId === selected.id ? mission.worldId : undefined)
        : selected.id
      if (selected.name === mission.world && nextWorldId === mission.worldId) return
      updateMissionFromPanel({ ...mission, world: selected.name, worldId: nextWorldId }, `World set to ${selected.name}.`)
      setWorldPickerOpen(false)
    },
    [mission, missionWorldOptions, updateMissionFromPanel]
  )

  const onSelectWorldType = useCallback(
    (worldType: '2D' | '3D') => {
      if (worldType === (mission.worldType ?? '3D')) return
      const nextMissionBase = {
        ...mission,
        worldType,
        ...(worldType === '2D'
          ? { world: WORLDS[0], worldId: undefined }
          : {
            world: selectableMissionWorlds[0]?.name ?? mission.world,
            worldId: selectableMissionWorlds[0]?.id
          })
      }
      const nextMission = recomputeGenerated(nextMissionBase, mission)
      updateMissionFromPanel(nextMission, `Mission type set to ${worldType}.`)
    },
    [mission, recomputeGenerated, selectableMissionWorlds, updateMissionFromPanel]
  )

  const onDeleteAction = useCallback(
    (wpId: string, actionId: string) => {
      commit(
        {
          ...mission,
          waypoints: mission.waypoints.map((w) =>
            w.id === wpId ? { ...w, actions: w.actions.filter((a) => a.id !== actionId) } : w
          )
        },
        'Action removed.'
      )
    },
    [commit, mission]
  )

  const onAddWaypointToRoute = useCallback(
    (routeId: string) => {
      const routes = getMissionRoutes(mission)
      const targetRouteId = routeId || routes[0]?.id || 'route-1'
      const routeWps = mission.waypoints.filter(
        (w) => !w.generatedByArea && !w.generatedByAvoid && (w.routeId === targetRouteId || (!w.routeId && targetRouteId === routes[0]?.id))
      )
      const lastWp = routeWps[routeWps.length - 1]
      const anchor = getMissionStart(mission)
      const basePos = lastWp ? { x: lastWp.x + 5, y: lastWp.y + 5 } : { x: anchor.x + 5, y: anchor.y + 5 }
      addWaypointAt(basePos, targetRouteId)
    },
    [addWaypointAt, mission]
  )

  const onDeleteRoute = useCallback(
    (routeId: string) => {
      const routes = getMissionRoutes(mission)
      const remainingRoutes = routes.filter((r) => r.id !== routeId)
      const remainingWaypoints = mission.waypoints.filter((w) => {
        if (w.generatedByArea || w.generatedByAvoid) return true
        const wRouteId = w.routeId ?? routes[0]?.id
        return wRouteId !== routeId
      })
      const out = refreshDetours(
        {
          ...mission,
          routes: remainingRoutes,
          sequenceOrder: removeMissionSequenceItem(mission, { type: 'route', id: routeId }),
          waypoints: renumber(remainingWaypoints)
        },
        mission
      )
      commit(out, `Route deleted.${detourNote(out)}`)
      setSelection(null)
    },
    [commit, detourNote, mission, refreshDetours]
  )

  const onInsertActionAt = useCallback(
    (wpId: string, actionIndex: number, kind: CameraActionKind) => {
      commit(
        {
          ...mission,
          waypoints: mission.waypoints.map((w) => {
            if (w.id !== wpId) return w
            const actions = [...w.actions]
            actions.splice(actionIndex, 0, { id: uid('act'), kind, label: actionLabel(kind) })
            return { ...w, actions }
          })
        },
        `${actionLabel(kind)} added.`
      )
    },
    [commit, mission]
  )

  const onAddZone = useCallback(
    (kind: 'area' | 'avoid') => {
      setPending([])
      setPendingShape('polygon')
      setDraftCursor(null)
      setCloseDraftAtStart(false)
      setSelection(null)
      setTool(kind)
      say(`${kind === 'area' ? 'Area' : 'Avoid zone'} drawing started. Click the scene to place polygon points.`)
    },
    [say]
  )

  const openCodeView = useCallback((code: boolean) => {
    if (code && codeLang === 'json') {
      setJsonDraft(missionToCode(mission))
      setJsonError(null)
    }
    setCodeView(code)
  }, [codeLang, mission])

  const handleCodeLangChange = useCallback(
    (lang: 'python' | 'json') => {
      setCodeLang(lang)
      if (lang === 'json') {
        setJsonDraft(missionToCode(mission))
        setJsonError(null)
        say('Mission JSON mode. Draft refreshed from the current mission.')
      } else {
        say('Python draft mode. Local draft only; visual route unchanged.')
      }
    },
    [mission, say]
  )

  const handleExportJson = useCallback(() => {
    setJsonDraft(missionToCode(mission))
    setJsonError(null)
    say('Mission JSON refreshed from the current mission.')
  }, [mission, say])

  const handleApplyJson = useCallback(() => {
    const { mission: next, error } = missionFromCode(jsonDraft, mission)
    if (!next || error) {
      setJsonError(error ?? 'Mission JSON could not be applied.')
      say(`Mission JSON not applied. ${error ?? 'Fix the JSON and try again.'}`)
      return
    }
    setJsonError(null)
    const resolved = next.worldType === '2D' ? recomputeGenerated(next, next) : next
    commit(resolved, 'Mission JSON applied to the visual mission.')
  }, [commit, jsonDraft, mission, recomputeGenerated, say])

  const saveLocal = useCallback(() => {
    if (!libraryEntry) {
      say('This mission is not linked to a Library record and could not be saved.')
      return
    }
    const savedMission = { ...mission, id: libraryEntry.missionId }
    const snapshot = snapshotOf(savedMission)
    const stored = saveMissionSnapshot(libraryEntry.missionId, snapshot, {
      name: savedMission.name,
      world: savedMission.world,
      worldType: savedMission.worldType,
      worldId: savedMission.worldId,
      vehicle: savedMission.vehicle,
      droneId: savedMission.droneId
    })
    if (!stored) {
      say('Mission could not be saved. Check browser storage and try again.')
      return
    }
    setMission(savedMission)
    setSavedSnap(snapshot)
    setLibraryEntry({
      ...libraryEntry,
      mission: savedMission.name,
      world: savedMission.world,
      worldType: savedMission.worldType,
      worldId: savedMission.worldId,
      vehicle: savedMission.vehicle,
      droneId: savedMission.droneId
    })
    say(`Saved ${savedMission.name} in this browser.`)
  }, [libraryEntry, mission, say])

  const resetToSeed = useCallback(() => {
    const seed = seedMission()
    commit(recomputeGenerated(seed, seed), 'Seed mission restored: Building Facade Inspection (mock).')
    sim.reset()
    setStage('design')
    setPending([])
    setTool('select')
    setSimSettingsOpen(false)
    setCodeView(false)
    setCodeDraft(PYTHON_SAMPLE)
    setJsonError(null)
  }, [commit, recomputeGenerated, sim])

  const newMission = useCallback(() => {
    const abortedPreviousRun = sim.status === 'running' || sim.status === 'paused'
    const fresh = emptyMission()
    setPast((p) => [...p.slice(-49), snapshotOf(mission)])
    setFuture([])
    setMission(fresh)
    setSelection(null)
    sim.reset()
    if (abortedPreviousRun) {
      say('New empty mission. Simulation aborted — design changed (mock). Add mission logic to unlock Simulation.')
    } else {
      say('New empty mission. Add mission logic to unlock Simulation.')
    }
    setStage('design')
    setCodeView(false)
    setCodeDraft(PYTHON_SAMPLE)
    setJsonError(null)
    setPending([])
    setTool('select')
    setSimSettingsOpen(false)
    setSimTab('details')
  }, [mission, say, sim])

  /* ------------------------- edit mission dialog ------------------------- */
  const openEdit = useCallback(() => {
    setEditName(mission.name)
    setEditWorld(mission.world)
    const selectedWorld = missionWorldOptions.find((world) => world.id === mission.worldId) ?? missionWorldOptions.find((world) => world.name === mission.world)
    setEditWorldId(selectedWorld?.id ?? '')
    setEditVehicle(mission.vehicle)
    setEditDroneId(mission.droneId ?? availableDrones.find((profile) => profile.name === mission.vehicle)?.id ?? '')
    setEditOpen(true)
  }, [availableDrones, mission, missionWorldOptions])

  const saveEdit = useCallback(() => {
    const selectedWorld = missionWorldOptions.find((world) => world.id === editWorldId)
    const nextWorldId = selectedWorld?.status === 'Legacy'
      ? (mission.worldId === selectedWorld.id ? mission.worldId : undefined)
      : selectedWorld?.id
    commit({ ...mission, name: editName || mission.name, world: selectedWorld?.name ?? editWorld, worldId: nextWorldId, vehicle: editVehicle, ...(editDroneId ? { droneId: editDroneId } : { droneId: undefined }) }, 'Mission properties saved locally.')
    setEditOpen(false)
  }, [commit, editDroneId, editName, editVehicle, editWorld, editWorldId, mission, missionWorldOptions])

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

  /* ------------------------- keyboard ------------------------- */
  useEffect(() => {
    /* Drawing cancellation must survive focused buttons/toolbars preventing
       Escape in their own handlers. Capture only Escape here; dialogs, menus,
       pickers and form controls keep their local Escape behavior. */
    const onEscapeCapture = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      const target = e.target as HTMLElement | null
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      if (typing) return
      if (target?.closest('[role="dialog"], [role="menu"], [role="listbox"], [role="option"], [role="combobox"], [data-slot="dialog-popup"], [data-slot="popover-popup"]')) return
      if (document.querySelector('[role="dialog"], [role="menu"], [role="listbox"]')) return
      if (tool === 'select' && pending.length === 0) return
      e.preventDefault()
      e.stopPropagation()
      cancelPending()
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const target = e.target as HTMLElement | null
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      const nativeInteractive = !!target?.closest(
        'a[href], button, input, textarea, select, option, summary, [contenteditable=""], [contenteditable="true"], [role="button"], [role="tab"], [role="slider"], [role="link"], [role="textbox"], [role="combobox"], [role="checkbox"], [role="radio"], [role="switch"], [role="menuitem"], [role="spinbutton"], [role="listbox"], [role="option"]'
      )
      const canCommitDraft = tool === 'route'
        ? pending.length >= 2
        : (tool === 'area' || tool === 'avoid') && pendingShape === 'polygon'
          ? pending.length >= 3 && isValidRing(pending)
          : (tool === 'area' || tool === 'avoid') && pendingShape === 'cylinder'
            ? pending.length === 1 && !!draftCursor && Math.hypot(draftCursor.x - pending[0].x, draftCursor.y - pending[0].y) >= 0.5
            : false
      if (
        e.key === 'Enter' &&
        stage === 'design' &&
        appTab === 'plan' &&
        (tool === 'route' || tool === 'area' || tool === 'avoid') &&
        !e.isComposing &&
        e.keyCode !== 229 &&
        !e.repeat &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.shiftKey &&
        !typing &&
        !nativeInteractive &&
        canCommitDraft
      ) {
        e.preventDefault()
        if ((tool === 'area' || tool === 'avoid') && pendingShape === 'cylinder') closePendingShape()
        else finishPending()
        return
      }
      if (e.key === 'Escape') {
        if (typing) return // let fields/dialogs handle Esc natively
        e.preventDefault()
        if (sceneRef.current?.isZdragActive()) {
          sceneRef.current.abortZdrag()
          say('Altitude edit cancelled.')
          return
        }
        if (simSettingsOpen) {
          setSimSettingsOpen(false)
          say('Simulation settings closed.')
          return
        }
        if (tool !== 'select' || pending.length > 0) {
          cancelPending()
          return
        }
        if (selection) {
          setSelection(null)
          say('Selection cleared.')
        }
        return
      }
      if (typing) return
      const mod = e.ctrlKey || e.metaKey
      if (mod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        saveLocal()
        return
      }
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod) return
      switch (e.key) {
        case '1':
          gotoStage('design')
          break
        case '2':
          gotoStage('simulation')
          break
        case 'a':
        case 'A':
          if (stage === 'design') {
            setTool('area')
            setPending([])
            setPendingShape('polygon')
            setDraftCursor(null)
            setCloseDraftAtStart(false)
            say('Area tool — click the scene to add polygon vertices, or choose Cylinder.')
          }
          break
        case 'h':
        case 'H':
          if (stage === 'design') {
            setTool('home')
            setPending([])
            setDraftCursor(null)
            setCloseDraftAtStart(false)
            say('Home tool — click the scene to place the drone Home point.')
          }
          break
        case 'r':
        case 'R':
          if (stage === 'design') {
            setTool('route')
            setPending([])
            setDraftCursor(null)
            setCloseDraftAtStart(false)
            say('Route tool — click the scene to add waypoints.')
          }
          break
        case 'n':
        case 'N':
          if (stage === 'design') {
            setTool('avoid')
            setPending([])
            setPendingShape('polygon')
            setDraftCursor(null)
            setCloseDraftAtStart(false)
            say('Avoid-zone tool — click the scene to add polygon vertices, or choose Cylinder.')
          }
          break
        case 'c':
        case 'C':
          if (stage === 'design') openCodeView(!codeView)
          break
        case ' ':
          if (stage === 'simulation' && plan) {
            e.preventDefault()
            if (sim.status === 'running' || sim.status === 'paused') {
              sim.abort()
              say('Simulation aborted — design preserved (mock).')
            } else if (sim.status === 'idle') {
              sim.start()
              say('Simulation started (mock).')
            } else {
              sim.restart()
              say('Simulation restarted (mock).')
            }
          }
          break
        case 'p':
        case 'P':
          if (stage === 'simulation' && plan) {
            if (sim.status === 'running') {
              sim.pause()
              say('Simulation paused (mock).')
            } else if (sim.status === 'paused') {
              sim.resume()
              say('Simulation resumed (mock).')
            }
          }
          break
        case 'd':
        case 'D':
          if (stage === 'simulation') setSimTab('details')
          break
        case 'e':
        case 'E':
          if (stage === 'simulation') setSimTab('events')
          break
        case 'l':
        case 'L':
          if (stage === 'simulation') {
            if (codeView) {
              setSimTab('console')
              say('Console tab (mock).')
            } else {
              say('Console needs Code mode — enable Code view in Design first (mock).')
            }
          }
          break
        case 'v':
        case 'V':
          if (stage === 'simulation') {
            setLidarOn((v) => !v)
            say(lidarOn ? 'LiDAR preview hidden (mock).' : 'LiDAR preview shown (mock).')
          }
          break
        case '+':
        case '=':
          sceneRef.current?.zoomBy(1)
          break
        case '-':
        case '_':
          sceneRef.current?.zoomBy(-1)
          break
        case '0':
          sceneRef.current?.resetCamera()
          say('Camera reset.')
          break
        case 'f':
        case 'F':
          if (stage === 'simulation') sceneRef.current?.focusVehicle()
          else if (selection?.kind === 'waypoint') {
            const wp = mission.waypoints.find((w) => w.id === selection.id)
            if (wp) sceneRef.current?.focusPoint(wp)
            else sceneRef.current?.focusVehicle()
          } else {
            sceneRef.current?.focusVehicle()
          }
          break
        case '\\':
          setRightOpen((v) => !v)
          break
        case 'Delete':
        case 'Backspace':
          if (stage === 'design' && selection) {
            e.preventDefault()
            deleteSelection()
          }
          break
        default:
          break
      }
    }
    document.addEventListener('keydown', onEscapeCapture, true)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onEscapeCapture, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [
    cancelPending,
    appTab,
    closePendingShape,
    codeView,
    deleteSelection,
    draftCursor,
    finishPending,
    gotoStage,
    lidarOn,
    mission.waypoints,
    mission.worldType,
    openCodeView,
    pending.length,
    pendingShape,
    plan,
    redo,
    saveLocal,
    selection,
    sim,
    simSettingsOpen,
    stage,
    tool,
    undo,
    say
  ])

  /* ------------------------- test hook ------------------------- */
  useEffect(() => {
    window.__missionStudio = {
      ...(window.__missionStudio || {}),
      stage: () => stage,
      appTab: () => appTab,
      tool: () => tool,
      simStatus: () => sim.status,
      simTime: () => sim.simT,
      waypointCount: () => mission.waypoints.length,
      waypointIds: () => mission.waypoints.map((w) => w.id),
      waypointSeqs: () => mission.waypoints.map((w) => `${w.id}:${w.seq}:${w.x},${w.y},${w.z}`),
      waypointFlags: () => mission.waypoints.map((w) => `${w.id}:${w.generatedByArea ? 'A' : w.generatedByAvoid ? 'V' : '-'}`),
      selection: () => selection,
      vehicle: () => mission.vehicle,
      world: () => mission.world,
      announce: () => announce,
      issueCount: () => issues.length,
      gateOk: () => gate.ok,
      dirty: () => dirty,
      canUndo: () => past.length > 0,
      canRedo: () => future.length > 0,
      // Preserved mission-data handlers (rail controls removed in F007 shell):
      // the regression script drives New/Reset through these hooks.
      newMission: () => newMission(),
      resetToSeed: () => resetToSeed()
    }
  })

  const drawing = tool === 'route' || tool === 'area' || tool === 'avoid'
  const routeDraftActive = appTab === 'plan' && stage === 'design' && tool === 'route'
  const zoneDraftActive = appTab === 'plan' && stage === 'design' && (tool === 'area' || tool === 'avoid')
  const editModeActive = stage === 'design' && (drawing || detailEditActive)
  const routeDraftZ = Math.round(Math.max(drawingAltM, mission.takeoffAltM) * 10) / 10
  const simActive = stage === 'simulation'
  const statusLine = `${stage === 'design' ? 'Design' : 'Simulation (mock)'} · ${tool} tool${selection ? ` · selected ${selection.kind}` : ''
    }${pending.length > 0 ? ` · ${pending.length} pts` : ''} · sim ${sim.status}${plan ? ` · t=${sim.simT.toFixed(1)}s/${totalT.toFixed(0)}s` : ''
    }${telemetry && simActive ? ` · home ${telemetry.homeDistM.toFixed(0)} m · wind ${settings.windMS} m/s · GPS RTK (mock)` : ''}${dirty ? ' · unsaved' : ' · saved'
    }`

  if (section === 'library') {
    return (
      <div className='ms-root' data-testid='ms-root'>
        <p className='ms-sr' role='status' aria-live='polite'>
          {announce}
        </p>
        <StudioLibrary
          section={libNav.section}
          projectId={libNav.projectId}
          templateId={route.kind === 'library' ? route.templateId ?? null : null}
          sharedMissionId={route.kind === 'library' ? route.sharedMissionId ?? null : null}
          sharedProjectId={route.kind === 'library' ? route.sharedProjectId ?? null : null}
          current={libraryEntry}
          onNavigate={(next, nextProjectId) => navigateRoute({
            kind: 'library',
            section: next,
            ...(nextProjectId ? { projectId: nextProjectId } : {})
          })}
          onOpenTemplate={(templateId) => navigateRoute({
            kind: 'library',
            section: 'templates',
            ...(templateId ? { templateId } : {})
          })}
          onOpenSharedAccounts={(missionId) => navigateRoute(missionId
            ? { kind: 'library', section: 'home', sharedMissionId: missionId }
            : { kind: 'library', section: 'home' })}
          onOpenSharedProject={(sharedProjectId) => navigateRoute(sharedProjectId
            ? { kind: 'library', section: 'shared', sharedProjectId }
            : { kind: 'library', section: 'shared' })}
          onOpenMission={openLibraryMission}
          onAnnounce={say}
          onLogout={onLogout}
        />
      </div>
    )
  }

  return (
    <div className='ms-root' data-testid='ms-root'>
      <p className='ms-sr' role='status' aria-live='polite'>
        {announce}
      </p>

      {/* ------------------------- top bar ------------------------- */}
      <header className='ms-top'>
        <nav className='ms-crumb' aria-label='Breadcrumb'>
          <SkyTooltip><button
            type='button'
            className='ms-crumb-btn ms-crumb-home'
            data-testid='ms-crumb-home'
            onClick={backToLibrary}
            aria-label='Back to library home'
            title='Back to library home'
          >
            <img src={skytrackLogo} alt='SkyTrack' className='ms-crumb-logo' />
          </button></SkyTooltip>
          <span aria-hidden='true' className='ms-crumb-separator'> / </span>
          {libraryEntry ? (
            <>
              <button
                type='button'
                className='ms-crumb-btn ms-crumb-dim'
                data-testid='ms-crumb-project'
                onClick={openCrumbProject}
                aria-label={`Open project ${libraryEntry.project} with its missions`}
                title={`Open project ${libraryEntry.project} with its missions`}
              >
                {libraryEntry.project}
              </button>
              <span aria-hidden='true' className='ms-crumb-separator'> / </span>
              <span className='ms-crumb-name'>{libraryEntry.mission}</span>
            </>
          ) : (
            <>
              <span className='ms-crumb-dim'>Missions</span>
              <span aria-hidden='true' className='ms-crumb-separator'> / </span>
              <span className='ms-crumb-name'>{mission.name}</span>
            </>
          )}
        </nav>
        <div className='ms-top-actions'>
          <Button size='sm' variant='outline' onClick={openEdit}>
            <PencilSimpleIcon aria-hidden='true' /> Edit Mission
          </Button>
          <Button size='sm' variant='ghost' onClick={saveLocal} disabled={!dirty} aria-label='Save local state (Ctrl+S)'>
            <FloppyDiskIcon aria-hidden='true' /> Save
          </Button>
        </div>
      </header>

      <div className='ms-body'>
        {/* ------------------------- persistent sidebar ------------------------- */}
        <aside className='ms-rail' aria-label='Mission navigation and tools'>
          <Tabs
            value={appTab}
            onValueChange={(v: unknown) => {
              const next = String(v) as AppTab
              if (next !== appTab) gotoAppTab(next)
            }}
            orientation={appTabsOrientation}
          >
            <TabsList className='ms-apptabs' aria-label='Mission workspace'>
              {APP_TABS.map((tab) => {
                const TabIcon = APP_TAB_ICONS[tab.id]
                const selected = appTab === tab.id
                return (
                  <TabsTab
                    key={tab.id}
                    value={tab.id}
                    id={`ms-apptab-${tab.id}`}
                    aria-label={`${tab.label} — ${tab.hint}`}
                    data-testid={`ms-apptab-${tab.id}`}
                    variant='standard'
                    className='ms-apptab'
                  >
                    <TabIcon weight={selected ? 'fill' : 'regular'} aria-hidden='true' />
                    <span className='ms-apptab-label'>{tab.label}</span>
                  </TabsTab>
                )
              })}
              <TabsIndicator variant='underline' />
            </TabsList>
          </Tabs>
          <Toolbar orientation='vertical' aria-label='Mission tools' className='ms-rail-bottom'>
            <ToolbarGroup aria-label='Draw tools' className='ms-rail-group'>
              <ToolButton label='Cursor' hint='Select · Esc' active={tool === 'select'} testid='ms-tool-select'
                onClick={() => { setTool('select'); setPending([]); setDraftCursor(null); setCloseDraftAtStart(false) }} disabled={stage !== 'design'}>
                <HandIcon weight={tool === 'select' ? 'fill' : 'regular'} aria-hidden='true' />
              </ToolButton>
              <ToolButton label='Home point' hint='H · Click map to place drone Home' active={tool === 'home'} testid='ms-tool-home'
                onClick={() => { setPending([]); setDraftCursor(null); setCloseDraftAtStart(false); setTool('home'); say('Click the map to place the drone Home point.') }} disabled={stage !== 'design'}>
                <AirplaneTakeoffIcon weight={tool === 'home' ? 'fill' : 'regular'} aria-hidden='true' />
              </ToolButton>
              <ToolButton label='Route' hint='R' active={tool === 'route'} testid='ms-tool-route'
                onClick={() => { setPending([]); setDraftCursor(null); setCloseDraftAtStart(false); setTool('route') }} disabled={stage !== 'design'}>
                <PathIcon weight={tool === 'route' ? 'fill' : 'regular'} aria-hidden='true' />
              </ToolButton>
              <ToolButton label='Area' hint='A' active={tool === 'area'} testid='ms-tool-area'
                onClick={() => { setPending([]); setPendingShape('polygon'); setDraftCursor(null); setCloseDraftAtStart(false); setTool('area') }} disabled={stage !== 'design'}>
                <AreaIcon aria-hidden='true' />
              </ToolButton>
              <ToolButton label='Avoid zone' hint='N' active={tool === 'avoid'} testid='ms-tool-avoid'
                onClick={() => { setPending([]); setPendingShape('polygon'); setDraftCursor(null); setCloseDraftAtStart(false); setTool('avoid') }} disabled={stage !== 'design'}>
                <AvoidZoneIcon aria-hidden='true' />
              </ToolButton>
            </ToolbarGroup>
          </Toolbar>
        </aside>

        {/* ------------------------- center scene ------------------------- */}
        {appTab === 'plan' ? (
          <section className='ms-center' aria-label='3D scene and run controls'>
            {/* Stage minibar (T-015): anchored full-width band at the top of the
              center column, not a floating map overlay. Same stage state, gate,
              labels, and keyboard shortcuts as the T-012 minibar. */}
            <div className='ms-stage-minibar' data-testid='ms-stage-minibar'>
              <ToggleGroup
                className='ms-stage'
                value={[stage]}
                onValueChange={(next: string[]) => {
                  const first = next[0]
                  if (first === 'design' || first === 'simulation') gotoStage(first)
                }}
                aria-label='Mission stage'
              >
                <Toggle value='design' aria-label='Design stage (1)' aria-current={stage === 'design' ? 'step' : undefined}>
                  <span className='ms-stage-num' aria-hidden='true'>1</span>
                  <span className='ms-stage-label'>Design</span>
                </Toggle>
                <span className='ms-stage-link' aria-hidden='true' />
                {gate.ok ? (
                  <Toggle
                    value='simulation'
                    aria-label='Simulation stage (2)'
                    aria-current={stage === 'simulation' ? 'step' : undefined}
                  >
                    <span className='ms-stage-num' aria-hidden='true'>2</span>
                    <span className='ms-stage-label'>Simulation</span>
                  </Toggle>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Toggle
                            value='simulation'
                            aria-label='Simulation stage (2)'
                            aria-current={stage === 'simulation' ? 'step' : undefined}
                            aria-disabled='true'
                            tabIndex={0}
                            onClick={(e) => {
                              e.preventDefault()
                              say(`Simulation locked. ${gate.reason ?? 'Mission is not valid.'}`)
                            }}
                            title={gate.reason ? `Simulation locked — ${gate.reason}` : 'Simulation locked'}
                          />
                        }
                      >
                        <span className='ms-stage-num' aria-hidden='true'>2</span>
                        <span className='ms-stage-label'>Simulation</span>
                      </TooltipTrigger>
                      <TooltipPortal>
                        <TooltipPositioner side='bottom' sideOffset={8}>
                          <TooltipPopup>
                            <TooltipArrow />
                            {gate.reason ? `Simulation locked — ${gate.reason}` : 'Simulation locked'}
                          </TooltipPopup>
                        </TooltipPositioner>
                      </TooltipPortal>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </ToggleGroup>
            </div>
            {drawing && stage === 'design' && tool !== 'route' ? (
              <div className='ms-drawbar' role='status'>
                <div className='ms-drawbar-copy'>
                  <Toolbar orientation='horizontal' aria-label='Footprint shape' className='ms-zone-shape-toolbar'>
                    <ToolbarGroup>
                      <ToolbarButton type='button' size='sm' isActivated={pendingShape === 'polygon'} aria-pressed={pendingShape === 'polygon'} disabled={pending.length > 0} onClick={() => setPendingShape('polygon')}>
                        <AreaIcon aria-hidden='true' className='ms-fill-icon' /> Polygon
                      </ToolbarButton>
                      <ToolbarButton type='button' size='sm' isActivated={pendingShape === 'cylinder'} aria-pressed={pendingShape === 'cylinder'} disabled={pending.length > 0} onClick={() => setPendingShape('cylinder')}>
                        <svg viewBox='0 0 20 20' aria-hidden='true'><ellipse cx='10' cy='4' rx='6.5' ry='2.5' /><path d='M3.5 4v11.5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V4' /><path d='M3.5 15.5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5' /></svg> Cylinder
                      </ToolbarButton>
                    </ToolbarGroup>
                  </Toolbar>
                  <span>{pendingShape === 'cylinder'
                    ? (pending.length === 0 ? 'Click the scene to place the center; move and click the check to set radius.' : 'Move the pointer to set the radius, then click the check to finish.')
                    : `${tool === 'area' ? 'Area' : 'Avoid-zone'} — ${pending.length} point${pending.length === 1 ? '' : 's'} placed. Close the outline at point 1.`}</span>
                </div>
              </div>
            ) : null}
            {simActive ? (
              <div className='ms-simbar' role='status'>
                <span className='ms-simbar-state' data-testid='ms-sim-state'>
                  {sim.status === 'idle' && 'Ready — Run Simulation to play the mock clock.'}
                  {sim.status === 'running' && `Running mock… t=${sim.simT.toFixed(1)}s / ${totalT.toFixed(0)}s (Space aborts · P pauses).`}
                  {sim.status === 'paused' && `Paused at t=${sim.simT.toFixed(1)}s (Space aborts · P resumes).`}
                  {sim.status === 'completed' && 'Completed (mock).'}
                  {sim.status === 'aborted' && 'Aborted — design preserved.'}
                  {sim.status === 'failed' && 'Failed (mock fault) — design preserved.'}
                </span>
                <span className='ms-simbar-actions'>
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={() => {
                      setSimSettingsOpen(true)
                      say('Simulation settings (mock).')
                    }}
                    aria-label='Open simulation settings'
                  >
                    Settings
                  </Button>
                  {sim.status === 'idle' && (
                    <Button size='sm' variant='default' onClick={sim.start} disabled={!plan}>
                      <PlayIcon aria-hidden='true' /> Run
                    </Button>
                  )}
                  {sim.status === 'running' && (
                    <Button size='sm' variant='secondary' onClick={sim.pause}>
                      <PauseIcon aria-hidden='true' /> Pause
                    </Button>
                  )}
                  {sim.status === 'paused' && (
                    <Button size='sm' variant='default' onClick={sim.resume}>
                      <PlayIcon aria-hidden='true' /> Resume
                    </Button>
                  )}
                  {(sim.status === 'completed' || sim.status === 'aborted' || sim.status === 'failed') && (
                    <Button size='sm' variant='default' onClick={sim.restart}>
                      <PlayIcon aria-hidden='true' /> Restart
                    </Button>
                  )}
                  {(sim.status === 'running' || sim.status === 'paused') && (
                    <Button size='sm' variant='outline' onClick={sim.abort}>
                      <SquareIcon aria-hidden='true' /> Abort
                    </Button>
                  )}
                </span>
              </div>
            ) : null}
            <div className={`ms-scene-wrap${drawing && stage === 'design' ? ' has-alt-ruler' : ''}${editModeActive ? ' is-editing-mode' : ''}`}>
              {/* Map overlays (T-015): World/Map field + selectable drone card with
                a disabled plus placeholder, top-left. The overlay layer is
                pointer-transparent so map drag, waypoint picking, and the
                orientation cube stay interactive; only the controls themselves
                take pointer hits. */}
              {!editModeActive ? <div className='ms-map-overlays'>
                <div className='ms-map-context' role='group' aria-label='Mission context'>
                  <div className='ms-drone-card' data-testid='ms-drone-card'>
                    <Select<string>
                      items={missionDroneChoices}
                      value={missionDroneValue}
                      onValueChange={(value: unknown) => {
                        const profile = availableDrones.find((item) => item.id === String(value))
                        if (profile) onSelectVehicle(profile.id, profile.name)
                      }}
                    >
                      {/* The whole card/name region is the single vehicle trigger;
                        thumbnail, caret, and All routes are not separate targets. */}
                      <SelectTrigger className='ms-drone-trigger' data-testid='ms-drone-select' aria-label={`Vehicle: ${mission.vehicle}`}>
                        <span className='ms-drone-thumb' aria-hidden='true'>
                          <DroneIcon />
                        </span>
                        <span className='ms-drone-meta'>
                          <span className='ms-drone-name-row'>
                            <span className='ms-drone-name' title={mission.vehicle}>{mission.vehicle}</span>
                            <CaretDownIcon aria-hidden='true' className='ms-drone-caret' />
                          </span>
                          <span className='ms-drone-routes'>All routes</span>
                        </span>
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectPositioner side='bottom' align='start' sideOffset={4}>
                          <SelectPopup>
                            <SelectList>
                              {missionDroneChoices.map((drone) => (
                                <SelectItem key={drone.value} value={drone.value}>
                                  <SelectItemIndicator />
                                  <SelectItemText>{drone.label}</SelectItemText>
                                </SelectItem>
                              ))}
                            </SelectList>
                          </SelectPopup>
                        </SelectPositioner>
                      </SelectPortal>
                    </Select>
                    <span className='ms-drone-divider' aria-hidden='true' />
                    <SkyTooltip><button
                      type='button'
                      className='ms-drone-add'
                      data-testid='ms-drone-add'
                      disabled
                      aria-label='Add drone (unavailable in prototype)'
                      title='Add drone (unavailable in prototype)'
                    >
                      <PlusIcon aria-hidden='true' />
                    </button></SkyTooltip>
                  </div>
                  {/* World trigger opens one picker for mission type + world. */}
                  <div className='ms-drone-card ms-world-card' data-testid='ms-drone-card'>
                    <Button type='button' variant='ghost' className='ms-drone-trigger ms-world-trigger' data-testid='ms-world-select' aria-label={`Choose world and mission type; current world ${mission.world}, ${mission.worldType ?? '3D'}`} onClick={() => setWorldPickerOpen(true)}>
                      <span className='ms-drone-thumb' aria-hidden='true'><MapTrifoldIcon /></span>
                      <span className='ms-drone-meta'>
                        <span className='ms-drone-name-row'>
                          <span className='ms-drone-name' title={mission.world}>{mission.world}</span>
                          <CaretDownIcon aria-hidden='true' className='ms-drone-caret' />
                        </span>
                        <span className='ms-drone-routes'>{mission.worldType ?? '3D'}</span>
                      </span>
                    </Button>
                  </div>
                </div>
              </div> : null}
              <div className='ms-3d-layer'>
                {mission.worldType !== '2D' && mission.origin?.attribution ? (
                  <a
                    className='ms-geocoded-origin-credit'
                    href={mission.origin.attribution.href}
                    target='_blank'
                    rel='noreferrer'
                    aria-label={`Geocoded origin attribution: ${mission.origin.attribution.label}`}
                  >
                    {mission.origin.attribution.label}
                  </a>
                ) : null}
                <MissionScene
                  ref={sceneRef}
                  mission={mission}
                  tool={stage === 'design' ? tool : 'select'}
                  selection={selection}
                  simActive={simActive}
                  clockRef={sim.clockRef}
                  previewPositionRef={previewPositionRef}
                  previewCaptureRef={previewCaptureRef}
                  plan={plan}
                  reducedMotion={settings.reducedMotion}
                  showPhotoMarkers={showPhotoMarkers}
                  showCameraFootprint={showCameraFootprint}
                  footprintOpacity={footprintOpacity}
                  showAreaSurface={editModeActive}
                  basemap={basemapStyle}
                  searchMarker={visibleSearchMarker}
                  pendingPoints={pending}
                  pendingShape={pendingShape}
                  draftCursor={draftCursor}
                  closeDraftAtStart={closeDraftAtStart}
                  draftAreaSettings={draftAreaSettings}
                  draftAvoidSettings={draftAvoidSettings}
                  drawingAltM={sceneDrawingAltitudeM}
                  planeVisible={drawing && stage === 'design'}
                  onPickWaypoint={(id) => {
                    setSelection({ kind: 'waypoint', id })
                    const wp = mission.waypoints.find((w) => w.id === id)
                    if (wp) say(`Waypoint ${wp.seq} selected.`)
                  }}
                  onPickZone={(kind, id) => {
                    setSelection({ kind, id })
                    say(`${kind === 'area' ? 'Area' : 'Avoid zone'} selected.`)
                  }}
                  onClearSelection={() => setSelection(null)}
                  onScenePoint={onScenePoint}
                  onDraftHover={onDraftHover}
                  onClosePending={closePendingShape}
                  onInsertWaypoint={(index, point, z) => insertWaypointAt(index, point, z)}
                  onRemoveWaypoint={removeWaypointById}
                  onWaypointAltitudeChange={onWaypointAltitudeChange}
                  onWaypointPositionChange={onWaypointPositionChange}
                  onAvoidHeightChange={onAvoidHeightChange}
                  onPendingPositionChange={onPendingPositionChange}
                  onPendingAltitudeChange={onPendingAltitudeChange}
                  onInsertPendingPoint={onInsertPendingPoint}
                  onRemovePendingPoint={onRemovePendingPoint}
                  onReadinessChange={onSceneReadinessChange}
                />
              </div>
              {simActive && lidarOn && plan ? (
                <LidarPreview plan={plan} clockRef={sim.clockRef} reducedMotion={settings.reducedMotion} />
              ) : null}
              {drawing && stage === 'design' && !(tool === 'area' && mission.worldType === '2D') ? (
                <DrawingAltitudeRuler
                  value={drawingAltM}
                  onCommit={(v) => setDrawingAltM(clampSnapRuler(v))}
                  onAnnounce={say}
                />
              ) : null}
              <div className='ms-control-groups'>
                {mission.worldType === '2D' ? (
                  <div className='ms-address-search-group'>
                    <Toolbar orientation='horizontal' aria-label='Address search' className={`ms-address-search-toolbar${addressSearchOpen ? ' is-open' : ''}`}>
                      <ToolbarGroup className='ms-address-search-items'>
                        <MapControlTooltip
                          label={addressSearchOpen ? 'Search address' : 'Search map by address'}
                          trigger={(
                            <ToolbarButton
                              ref={addressTriggerRef}
                              type='button'
                              size='icon'
                              aria-label={addressSearchOpen ? 'Search address' : 'Open address search'}
                              aria-expanded={addressSearchOpen}
                              aria-controls={addressSearchOpen ? 'ms-address-search-input' : undefined}
                              disabled={addressSearching}
                              onClick={() => {
                                if (addressSearchOpen) {
                                  if (addressQuery.trim()) void searchAddress()
                                }
                                else {
                                  setAddressSearchStatus('')
                                  setAddressSearchOpen(true)
                                }
                              }}
                            />
                          )}
                        >
                          <MagnifyingGlassIcon aria-hidden='true' />
                        </MapControlTooltip>
                        {addressSearchOpen ? (
                          <div className='ms-address-search-input-wrap is-open'>
                            <Input
                              id='ms-address-search-input'
                              role='combobox'
                              aria-autocomplete='list'
                              aria-expanded={addressSuggestionsOpen}
                              aria-controls={addressSuggestionsOpen ? 'ms-address-suggestions-list' : undefined}
                              aria-activedescendant={activeAddressSuggestionIndex >= 0 ? `ms-address-suggestion-${activeAddressSuggestionIndex}` : undefined}
                              autoFocus
                              type='text'
                              inputMode='search'
                              autoComplete='off'
                              aria-label='Search map by address'
                              placeholder='Search address'
                              value={addressQuery}
                              onChange={(event) => {
                                setAddressQuery(event.currentTarget.value)
                                setAddressSearchStatus('')
                              }}
                              onCompositionStart={() => {
                                addressCompositionRef.current = true
                                setAddressIsComposing(true)
                              }}
                              onCompositionEnd={(event) => {
                                addressCompositionRef.current = false
                                setAddressIsComposing(false)
                                setAddressQuery(event.currentTarget.value)
                                setAddressSearchStatus('')
                              }}
                              onKeyDown={(event) => {
                                if (addressCompositionRef.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
                                if (event.key === 'ArrowDown' && addressSuggestions.length) {
                                  event.preventDefault()
                                  setAddressSuggestionsOpen(true)
                                  setActiveAddressSuggestionIndex((index) => (index + 1) % addressSuggestions.length)
                                } else if (event.key === 'ArrowUp' && addressSuggestions.length) {
                                  event.preventDefault()
                                  setAddressSuggestionsOpen(true)
                                  setActiveAddressSuggestionIndex((index) => index <= 0 ? addressSuggestions.length - 1 : index - 1)
                                } else if (event.key === 'Enter') {
                                  event.preventDefault()
                                  if (addressSuggestionsOpen && activeAddressSuggestionIndex >= 0) selectAddressSuggestion(addressSuggestions[activeAddressSuggestionIndex])
                                  else void searchAddress()
                                } else if (event.key === 'Escape') {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  if (addressSuggestionsOpen) setAddressSuggestionsOpen(false)
                                  else {
                                    closeAddressSearch({ focusTrigger: true })
                                    say('Address search closed.')
                                  }
                                }
                              }}
                              className='ms-address-search-input'
                            />
                          </div>
                        ) : null}
                        {addressSearchOpen ? (
                          <MapControlTooltip label='Close address search' trigger={(
                            <ToolbarButton
                              type='button'
                              size='icon'
                              aria-label='Close address search'
                              onClick={() => {
                                closeAddressSearch({ focusTrigger: true })
                                say('Address search closed.')
                              }}
                            />
                          )}>
                            <XIcon aria-hidden='true' />
                          </MapControlTooltip>
                        ) : null}
                      </ToolbarGroup>
                    </Toolbar>
                    {addressSearchOpen && addressSuggestionsOpen ? (
                      <div className='ms-address-suggestions' aria-busy={addressSuggestionBusy || undefined}>
                        {addressSuggestionBusy ? <div className='ms-address-suggestions-status' role='status'>Searching places…</div> : null}
                        {addressSuggestions.length ? (
                          <div id='ms-address-suggestions-list' role='listbox'>
                            {addressSuggestions.map((item, index) => (
                              <button
                                key={`${item.lat},${item.lon}`}
                                id={`ms-address-suggestion-${index}`}
                                type='button'
                                role='option'
                                aria-selected={index === activeAddressSuggestionIndex}
                                className={`ms-address-suggestion-item${index === activeAddressSuggestionIndex ? ' is-active' : ''}`}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => selectAddressSuggestion(item)}
                              >
                                <span>{item.displayName}</span>
                              </button>
                            ))}
                          </div>
                        ) : addressSuggestionResolvedQuery === addressQuery.trim() && addressQuery.trim().length >= 3 && !addressSuggestionBusy ? (
                          <div className='ms-address-suggestions-status'>No matching places.</div>
                        ) : null}
                        <div className='ms-address-suggestions-credits' aria-label='Search attribution'>
                          {addressCredits.map((credit, index) => (
                            <a key={`${credit.href}-${index}`} href={credit.href} target='_blank' rel='noreferrer'>{credit.label}</a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {/* Out-of-flow panel: status + attribution overlay above the
                      toolbar and never shift the zoom/map toolbars below. */}
                    {addressSearchOpen && !addressSuggestionsOpen ? (
                      <div className='ms-address-search-pop'>
                        {addressSearchStatus ? <span className='ms-address-search-status' role='status'>{addressSearchStatus}</span> : null}
                        {addressCredits.map((credit, index) => (
                          <a key={`${credit.href}-${index}`} className='ms-address-search-credit' href={credit.href} target='_blank' rel='noreferrer'>{credit.label}</a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <Toolbar orientation='vertical' aria-label='Camera controls'>
                  <MapControlTooltip label='Zoom in' trigger={<ToolbarButton type='button' size='icon' aria-label='Zoom in' onClick={() => sceneRef.current?.zoomBy(1)} />}>
                    <MagnifyingGlassPlusIcon aria-hidden='true' />
                  </MapControlTooltip>
                  <MapControlTooltip label='Zoom out' trigger={<ToolbarButton type='button' size='icon' aria-label='Zoom out' onClick={() => sceneRef.current?.zoomBy(-1)} />}>
                    <MagnifyingGlassMinusIcon aria-hidden='true' />
                  </MapControlTooltip>
                  <MapControlTooltip label='Reset camera' trigger={<ToolbarButton type='button' size='icon' aria-label='Reset camera' onClick={() => sceneRef.current?.resetCamera()} />}>
                    <CrosshairIcon aria-hidden='true' />
                  </MapControlTooltip>
                  <ToolbarSeparator className='mx-0' />
                  <MapControlTooltip label='Top-down 2D view' trigger={<ToolbarButton type='button' size='icon' aria-label='Top-down 2D view' onClick={() => { sceneRef.current?.snapTopDown(); say('Top-down 2D view.') }} />}>
                    <span className='ms-2d-label' aria-hidden='true'>2D</span>
                  </MapControlTooltip>
                </Toolbar>
                {stage === 'design' ? (
                  <Toolbar orientation='vertical' aria-label='Map settings'>
                    <Popover>
                    <MapControlTooltip label='Map display settings' trigger={(
                      <PopoverTrigger
                        aria-label='Map display settings'
                        data-testid='ms-map-gear-trigger'
                        render={<ToolbarButton type='button' size='icon'><GearIcon aria-hidden='true' /></ToolbarButton>}
                      />
                    )} />
                      <PopoverPortal>
                        <PopoverPositioner side='left' align='end' sideOffset={8}>
                          <PopoverPopup className='ms-map-gear-popup'>
                            <PopoverArrow />
                            <div className='ms-map-gear-head'>
                              <PopoverTitle className='ms-basemap-title'>Map display</PopoverTitle>
                            </div>
                            <label className='ms-map-check-row'>
                              <CheckboxRoot checked={showPhotoMarkers} onCheckedChange={(checked) => setShowPhotoMarkers(checked === true)} data-testid='ms-photo-markers-toggle'>
                                <CheckboxIndicator aria-hidden='true'>✓</CheckboxIndicator>
                              </CheckboxRoot>
                              <span>Photo capture markers</span>
                            </label>
                            <label className='ms-map-check-row'>
                              <CheckboxRoot checked={showCameraFootprint} onCheckedChange={(checked) => setShowCameraFootprint(checked === true)} data-testid='ms-camera-footprint-toggle'>
                                <CheckboxIndicator aria-hidden='true'>✓</CheckboxIndicator>
                              </CheckboxRoot>
                              <span>Camera capture footprint</span>
                            </label>
                            {showCameraFootprint ? (
                              <div className='ms-footprint-opacity' data-testid='ms-footprint-opacity'>
                                <div className='ms-footprint-opacity-head'>
                                  <span>Footprint opacity</span>
                                  <strong>{footprintOpacity}%</strong>
                                </div>
                                <Slider value={footprintOpacity} min={10} max={80} step={1} onValueChange={(value: number | readonly number[]) => {
                                  const next = Array.isArray(value) ? value[0] : value
                                  if (typeof next === 'number' && Number.isFinite(next)) setFootprintOpacity(next)
                                }}>
                                  <SliderControl>
                                    <SliderTrack><SliderIndicator /><SliderThumb aria-label='Camera footprint opacity' /></SliderTrack>
                                  </SliderControl>
                                </Slider>
                              </div>
                            ) : null}
                          </PopoverPopup>
                        </PopoverPositioner>
                      </PopoverPortal>
                    </Popover>
                    {mission.worldType === '2D' || mission.world !== 'Blank space' ? (
                      <Popover>
                        <MapControlTooltip label='Basemap settings' trigger={(
                          <PopoverTrigger
                            aria-label='Basemap settings'
                            data-testid='ms-basemap-trigger'
                            render={<ToolbarButton type='button' size='icon'><StackIcon aria-hidden='true' /></ToolbarButton>}
                          />
                        )} />
                        <PopoverPortal>
                          <PopoverPositioner side='left' align='end' sideOffset={8}>
                            <PopoverPopup className='ms-basemap-popup' data-testid='ms-basemap-popup'>
                              <PopoverArrow />
                              <div className='ms-basemap-heading'>
                                <PopoverTitle className='ms-basemap-title'>Basemap</PopoverTitle>
                                <SkyTooltip><PopoverClose aria-label='Close basemap settings' title='Close' className='ms-basemap-close'>×</PopoverClose></SkyTooltip>
                              </div>
                              <BasemapPickerGrid value={basemapStyle} onChange={setBasemapStyle} testidPrefix='ms-basemap' />
                            </PopoverPopup>
                          </PopoverPositioner>
                        </PopoverPortal>
                      </Popover>
                    ) : null}
                  </Toolbar>
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          <div className='ms-body-placeholder'>
            {appTab === 'fly' ? (
              <section className='ms-placeholder' role='region' aria-label='Fly placeholder' data-testid='ms-fly-placeholder'>
                <h2 className='ms-placeholder-title'>Fly</h2>
                <p className='ms-hint'>Placeholder — flight execution is not implemented in this prototype. Plan holds the current mission planner.</p>
              </section>
            ) : (
              <section className='ms-placeholder' role='region' aria-label='Report placeholder' data-testid='ms-report-placeholder'>
                <h2 className='ms-placeholder-title'>Report</h2>
                <p className='ms-hint'>Placeholder — mission reports are not implemented in this prototype. Plan holds the current mission planner.</p>
              </section>
            )}
          </div>
        )}

        {/* ------------------------- right inspector ------------------------- */}
        {appTab === 'plan' && rightOpen ? (
          <aside className={`ms-inspector-wrap${stage === 'design' && codeView && !routeDraftActive ? ' is-code-view' : ''}`} aria-label='Inspector'>
            {routeDraftActive ? (
              <section className='ms-route-draft' aria-label='Route draft'>
                <header className='ms-route-draft-head'>
                  <div>
                    <h2 className='ms-inspector-title'>Route draft</h2>
                    <p className='ms-inspector-sub'>Click the scene to add waypoints. Add at least 2, then press Enter to commit. Press Escape to cancel.</p>
                  </div>
                </header>
                <p className='ms-route-draft-count' role='status' aria-live='polite'>
                  {pending.length < 2
                    ? `${pending.length} of 2 minimum waypoints. Add ${2 - pending.length} more to commit.`
                    : `${pending.length} waypoints ready to commit.`}
                </p>
                {pending.length > 0 ? (
                  <ol className='ms-route-draft-list' aria-label='Pending route waypoints'>
                    {pending.map((point, index) => {
                      const pointZ = point.z ?? routeDraftZ
                      return (
                        <li className='ms-route-draft-row' key={`route-draft-${mission.waypoints.length + index + 1}`}>
                          <span className='ms-route-draft-seq'>{mission.waypoints.length + index + 1}</span>
                          <span className='ms-route-draft-coords'>
                            <DraftAxisInput
                              label={`Pending waypoint ${mission.waypoints.length + index + 1} X`}
                              axis='X'
                              value={point.x}
                              min={-2000}
                              max={2000}
                              precision={0.1}
                              onChange={(v) => {
                                setPending((prev) => {
                                  const next = [...prev]
                                  next[index] = { ...next[index], x: v }
                                  return next
                                })
                              }}
                            />
                            <DraftAxisInput
                              label={`Pending waypoint ${mission.waypoints.length + index + 1} Y`}
                              axis='Y'
                              value={point.y}
                              min={-2000}
                              max={2000}
                              precision={0.1}
                              onChange={(v) => {
                                setPending((prev) => {
                                  const next = [...prev]
                                  next[index] = { ...next[index], y: v }
                                  return next
                                })
                              }}
                            />
                            <DraftAxisInput
                              label={`Pending waypoint ${mission.waypoints.length + index + 1} altitude`}
                              axis='Z'
                              value={pointZ}
                              min={0}
                              max={Number.POSITIVE_INFINITY}
                              precision={0.01}
                              onChange={(v) => {
                                setPending((prev) => {
                                  const next = [...prev]
                                  next[index] = { ...next[index], z: v }
                                  return next
                                })
                              }}
                            />
                          </span>
                        </li>
                      )
                    })}
                  </ol>
                ) : null}
                <div className='ms-route-draft-actions'>
                  <Button size='sm' variant='outline' onClick={cancelPending}>Cancel</Button>
                  <Button size='sm' variant='default' onClick={() => finishPending()} disabled={pending.length < 2}>Commit route</Button>
                </div>
              </section>
            ) : zoneDraftActive ? (
              <ZoneDraftPanel
                kind={tool === 'area' ? 'area' : 'avoid'}
                shape={pendingShape}
                pointCount={pending.length}
                canCommit={pendingShape === 'polygon'
                  ? pending.length >= 3 && isValidRing(pending)
                  : pending.length === 1 && !!draftCursor && Math.hypot(draftCursor.x - pending[0].x, draftCursor.y - pending[0].y) >= 0.5}
                area={draftAreaSettings}
                avoid={draftAvoidSettings}
                className='ms-zone-draft-wrap'
                onAreaChange={setDraftAreaSettings}
                onAvoidChange={setDraftAvoidSettings}
                onCommit={closePendingShape}
                onCancel={cancelPending}
              />
            ) : stage === 'design' ? (
              <DesignPanel
                mission={mission}
                previewPositionRef={previewPositionRef}
                previewCaptureRef={previewCaptureRef}
                worldType={mission.worldType ?? '3D'}
                issues={issues}
                selection={selection}
                codeView={codeView}
                codeDraft={codeDraft}
                codeLang={codeLang}
                jsonDraft={jsonDraft}
                jsonError={jsonError}
                onCodeViewChange={openCodeView}
                onCodeDraftChange={setCodeDraft}
                onCodeLangChange={handleCodeLangChange}
                onJsonDraftChange={(text) => setJsonDraft(text)}
                onApplyJson={handleApplyJson}
                onExportJson={handleExportJson}
                onSelect={setSelection}
                onUpdateMission={updateMissionFromPanel}
                onPreviewMission={previewMissionFromPanel}
                onCommitPreview={commitPanelPreview}
                onCancelPreview={cancelPanelPreview}
                onDetailEditStateChange={setDetailEditActive}
                onAddWaypoint={(routeId) => onAddWaypointToRoute(routeId ?? '')}
                transfers={derivedTransfers}
                onDeleteRoute={onDeleteRoute}
                onDeleteWaypoint={(id) => {
                  const wp = mission.waypoints.find((w) => w.id === id)
                  if (!wp) return
                  if (wp.generatedByArea || wp.generatedByAvoid) {
                    removeWaypointById(id)
                    return
                  }
                  setSelection({ kind: 'waypoint', id })
                  removeWaypointById(id)
                }}
                onMoveWaypoint={onMoveWaypoint}
                onReorderWaypoint={onReorderWaypoint}
                onMoveAction={onMoveAction}
                onInsertActionAt={onInsertActionAt}
                onDeleteAction={onDeleteAction}
                onAddZone={onAddZone}
                onDeleteZone={(kind, id) => {
                  if (kind === 'area') commit(recomputeGenerated({
                    ...mission,
                    areas: mission.areas.filter((a) => a.id !== id),
                    sequenceOrder: removeMissionSequenceItem(mission, { type: 'area', id }),
                    waypoints: mission.waypoints.filter((wp) => wp.generatedByArea !== id)
                  }, mission), 'Area and generated scan waypoints deleted. Avoid detours recomputed.')
                  else commit(refreshDetours({ ...mission, avoids: mission.avoids.filter((a) => a.id !== id) }, mission), 'Avoid zone deleted. Obsolete detours removed.')
                }}
                onRenameZone={(kind, id, label) => {
                  if (kind === 'area') {
                    commit({ ...mission, areas: mission.areas.map((a) => (a.id === id ? { ...a, label } : a)) })
                  } else {
                    commit({ ...mission, avoids: mission.avoids.map((a) => (a.id === id ? { ...a, label } : a)) })
                  }
                }}
                onCollapsePane={() => setRightOpen(false)}
                onAnnounce={say}
              />
            ) : simSettingsOpen ? (
              <div className='ms-inspector' data-testid='ms-sim-settings'>
                <div className='ms-inspector-head'>
                  <div>
                    <h2 className='ms-inspector-title'>Simulation settings</h2>
                    <p className='ms-inspector-sub'>Local mock run only — no aircraft, no cloud.</p>
                  </div>
                </div>
                <SimulationSettingsForm
                  settings={settings}
                  maxSeq={mission.waypoints.length}
                  onChange={(s) => {
                    setSettings(s)
                    say('Simulation settings updated (mock).')
                  }}
                  onClose={() => {
                    setSimSettingsOpen(false)
                    say('Simulation settings closed.')
                  }}
                />
              </div>
            ) : (
              <SimulationPanel
                mission={mission}
                plan={plan}
                gateReason={gate.reason}
                telemetry={telemetry}
                status={sim.status}
                simT={sim.simT}
                totalT={totalT}
                runIndex={sim.runIndex}
                log={sim.log}
                fired={sim.fired}
                settings={settings}
                showConsole={codeView}
                onRun={sim.start}
                onPause={sim.pause}
                onResume={sim.resume}
                onAbort={sim.abort}
                onRestart={sim.restart}
                onSelectEvent={onSelectEvent}
                tab={simTab}
                onTabChange={setSimTab}
              />
            )}
          </aside>
        ) : null}
      </div>

      {/* ------------------------- bottom strip ------------------------- */}
      <footer className='ms-status'>
        <span className='ms-status-line' data-testid='ms-status-line'>
          {statusLine}
        </span>
        <span className='ms-status-actions'>
          <Button size='sm' variant='ghost' onClick={() => setShortcutsOpen(true)} aria-label='Keyboard shortcuts'>
            <QuestionIcon aria-hidden='true' /> Shortcuts
          </Button>
          <Button size='sm' variant='ghost' onClick={() => setRightOpen((v) => !v)} aria-label='Toggle inspector panel'>
            <SidebarIcon aria-hidden='true' /> {rightOpen ? 'Hide panel (\\)' : 'Show panel (\\)'}
          </Button>
        </span>
      </footer>

      {/* ------------------------- dialogs ------------------------- */}
      <Dialog open={worldPickerOpen} onOpenChange={setWorldPickerOpen}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup aria-label={mission.worldType === '2D' ? 'Choose mission type' : 'Choose mission type and world'} data-testid='ms-world-picker'>
            <DialogHeader>
              <DialogTitle>{mission.worldType === '2D' ? 'Choose mission type' : 'Choose mission type and world'}</DialogTitle>
              <DialogDescription>Photogrammetry missions use reconnaissance planning. Legacy 3D missions keep the original design flow.</DialogDescription>
            </DialogHeader>
            <FieldRoot className='ms-field'>
              <FieldLabel>Mission type</FieldLabel>
              <Tabs
                value={mission.worldType ?? '3D'}
                onValueChange={(value) => {
                  if (value === '2D' || value === '3D') onSelectWorldType(value)
                }}
                className='ms-world-type-tabs gap-4'
              >
                <TabsList variant='filled' className='ms-world-type-list' aria-label='Mission type'>
                  <TabsTab value='2D' variant='filled' className='ms-world-type-tab'>
                    2D Photogrammetry
                  </TabsTab>
                  <TabsTab value='3D' variant='filled' className='ms-world-type-tab'>
                    3D Mission
                  </TabsTab>
                </TabsList>
                <TabsPanel value='2D' className='ms-world-type-panel pb-2'>
                  <span className='text-sm text-muted-foreground'>Photogrammetry missions use reconnaissance planning</span>
                  <span className='ms-sr'>2D photogrammetry does not require selecting a World.</span>
                </TabsPanel>
                <TabsPanel value='3D' className='ms-world-type-panel  pb-2'>
                  <FieldRoot className='ms-field'>
                    <FieldLabel>World</FieldLabel>
                    <Select<string>
                      items={missionWorldOptions.map((world) => ({ value: world.id, label: `${world.name}${world.status === 'Sample' ? ' · Sample' : world.status === 'Legacy' ? ' · Legacy selection' : ''}` }))}
                      value={missionWorldOptions.find((world) => world.id === mission.worldId || world.name === mission.world)?.id ?? ''}
                      onValueChange={(value: unknown) => onSelectWorld(String(value))}
                    >
                      <SelectTrigger data-testid='ms-world-picker-select'>
                        <SelectValue />
                        <SelectIcon />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectPositioner side='bottom' align='start' sideOffset={4}>
                          <SelectPopup>
                            <SelectList>
                              {missionWorldOptions.map((world) => (
                                <SelectItem key={world.id} value={world.id}>
                                  <SelectItemIndicator />
                                  <SelectItemText>{world.name}{world.status === 'Sample' ? ' · Sample' : world.status === 'Legacy' ? ' · Legacy selection' : ''}</SelectItemText>
                                </SelectItem>
                              ))}
                            </SelectList>
                          </SelectPopup>
                        </SelectPositioner>
                      </SelectPortal>
                    </Select>
                  </FieldRoot>
                </TabsPanel>
              </Tabs>
            </FieldRoot>
            <DialogFooter>
              <DialogClose>Done</DialogClose>
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(v: boolean) => setEditOpen(v)}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup aria-label='Edit mission'>
            <DialogHeader>
              <DialogTitle>Edit Mission</DialogTitle>
              <DialogDescription>World and vehicle (mock configuration).</DialogDescription>
            </DialogHeader>
            <FieldRoot className='ms-field'>
              <FieldLabel>Mission name</FieldLabel>
              <FieldControl value={editName} onValueChange={(v: unknown) => setEditName(String(v))} placeholder='Mission name' />
            </FieldRoot>
            <FieldRoot className='ms-field'>
              <FieldLabel>World</FieldLabel>
              <Select<string>
                items={missionWorldOptions.map((world) => ({ value: world.id, label: `${world.name}${world.status === 'Sample' ? ' · Sample' : world.status === 'Legacy' ? ' · Legacy selection' : ''}` }))}
                value={editWorldId}
                onValueChange={(v: unknown) => {
                  const id = String(v)
                  const selected = missionWorldOptions.find((world) => world.id === id)
                  setEditWorldId(id)
                  if (selected) setEditWorld(selected.name)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                  <SelectIcon />
                </SelectTrigger>
                <SelectPortal>
                  <SelectPositioner side='bottom' align='start' sideOffset={4}>
                    <SelectPopup>
                      <SelectList>
                        {missionWorldOptions.map((world) => (
                          <SelectItem key={world.id} value={world.id}>
                            <SelectItemIndicator />
                            <SelectItemText>{world.name}{world.status === 'Sample' ? ' · Sample' : world.status === 'Legacy' ? ' · Legacy selection' : ''}</SelectItemText>
                          </SelectItem>
                        ))}
                      </SelectList>
                    </SelectPopup>
                  </SelectPositioner>
                </SelectPortal>
              </Select>
            </FieldRoot>
            <FieldRoot className='ms-field'>
              <FieldLabel>Vehicle</FieldLabel>
              <Select<string>
                items={editDroneChoices}
                value={editDroneValue}
                onValueChange={(value: unknown) => {
                  const profile = availableDrones.find((item) => item.id === String(value))
                  if (profile) {
                    setEditDroneId(profile.id)
                    setEditVehicle(profile.name)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                  <SelectIcon />
                </SelectTrigger>
                <SelectPortal>
                  <SelectPositioner side='bottom' align='start' sideOffset={4}>
                    <SelectPopup>
                      <SelectList>
                        {editDroneChoices.map((drone) => (
                          <SelectItem key={drone.value} value={drone.value}>
                            <SelectItemIndicator />
                            <SelectItemText>{drone.label}</SelectItemText>
                          </SelectItem>
                        ))}
                      </SelectList>
                    </SelectPopup>
                  </SelectPositioner>
                </SelectPortal>
              </Select>
            </FieldRoot>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <Button onClick={saveEdit}>Save</Button>
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>

      <Dialog open={shortcutsOpen} onOpenChange={(v: boolean) => setShortcutsOpen(v)}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup aria-label='Keyboard shortcuts' className='ms-shortcuts-dialog'>
            <DialogHeader>
              <DialogTitle>Keyboard shortcuts</DialogTitle>
              <DialogDescription>Shortcuts are ignored while typing in fields or the code editor.</DialogDescription>
            </DialogHeader>
            <div className='ms-shortcut-groups'>
              {SHORTCUT_GROUPS.map((group) => (
                <section key={group.title} className='ms-shortcut-group' aria-labelledby={`ms-shortcuts-${group.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}>
                  <h3 id={`ms-shortcuts-${group.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`} className='ms-shortcut-group-title'>{group.title}</h3>
                  <ul className='ms-shortcuts'>
                    {group.shortcuts.map((s) => (
                      <li key={s.keys} className='ms-shortcut-row'>
                        <span>{s.what}</span>
                        <Badge count={s.keys} status='outline' />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <DialogFooter>
              <DialogClose>Close</DialogClose>
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </div>
  )
}
