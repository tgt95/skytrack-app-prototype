import type { AvoidZone, MissionArea, SceneSelection, SceneTool, StudioMission } from '../../domain/mission-model'
import type { MissionBasemapStyle } from './basemaps'
import type { SimPlan } from '../simulation/simulation'

export interface MissionSceneHandle {
  resetCamera: () => void
  focusVehicle: () => void
  focusPoint: (p: { x: number; y: number; z: number }) => void
  flyToLocation: (location: { latitude: number; longitude: number }) => void
  zoomBy: (factor: number) => void
  /** Snap to a top-down view preserving the current scene center and range. */
  snapTopDown: () => void
  isEditDragActive: () => boolean
  cancelEditDrag: () => void
}

export type SceneReadiness = 'loading' | 'ready' | 'error' | 'without-3d'

export interface MissionSceneProps {
  mission: StudioMission
  tool: SceneTool
  selection: SceneSelection | null
  simActive: boolean
  clockRef: { current: number }
  previewPositionRef: { current: { x: number; y: number; z: number } | null }
  previewCaptureRef: { current: string | null }
  plan: SimPlan | null
  reducedMotion: boolean
  showPhotoMarkers?: boolean
  showCameraFootprint?: boolean
  footprintOpacity?: number
  /** Show photogrammetry Area floor while its geometry is being edited. */
  showAreaSurface?: boolean
  /** Search-result pin (label aid at the selected site): rendered at the
      geocoder result after the mission origin moves there. Must not feed
      camera pivots, fits, or mission state. */
  searchMarker?: { latitude: number; longitude: number; label: string } | null
  /** Active basemap style for Photogrammetry 2D and non-blank legacy 3D Worlds. */
  basemap?: MissionBasemapStyle
  pendingPoints: { x: number; y: number; z?: number }[]
  pendingShape: 'polygon' | 'cylinder'
  draftCursor: { x: number; y: number } | null
  closeDraftAtStart: boolean
  draftAreaSettings: Pick<MissionArea, 'lineSpacingM' | 'orientationDeg' | 'paddingM'>
  draftAvoidSettings: Pick<AvoidZone, 'type' | 'heightM' | 'clearanceM'>
  /** Draft drawing altitude in meters (ruler value). Draft-only: never written
      to the mission until a draw commits. */
  drawingAltM: number
  /** Show the translucent drawing plane at drawingAltM (draw tools only). */
  planeVisible: boolean
  onPickWaypoint: (id: string) => void
  onPickZone: (kind: 'area' | 'avoid', id: string) => void
  onClearSelection: () => void
  onScenePoint: (p: { x: number; y: number }) => void
  onDraftHover: (p: { x: number; y: number } | null, nearStart: boolean) => void
  onClosePending: () => void
  onInsertWaypoint: (beforeIndex: number, point: { x: number; y: number }, z: number) => void
  onRemoveWaypoint: (id: string) => void
  onWaypointAltitudeChange: (id: string, z: number) => void
  onWaypointPositionChange: (id: string, x: number, y: number) => void
  onAvoidHeightChange: (id: string, heightM: number) => void
  onPendingPositionChange?: (index: number, x: number, y: number) => void
  onPendingAltitudeChange?: (index: number, z: number) => void
  onInsertPendingPoint?: (index: number, point: { x: number; y: number; z: number }) => void
  onRemovePendingPoint?: (index: number) => void
  onReadinessChange: (readiness: SceneReadiness) => void
}

declare global {
  interface Window {
    CESIUM_BASE_URL: string
    __missionStudio?: Record<string, unknown>
  }
}

