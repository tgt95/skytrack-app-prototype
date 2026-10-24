import { useEffect, useState } from 'react'
import {
  actionLabel,
  DEFAULT_RECON_FLIGHT_SETTINGS,
  getMissionRoutes,
  getMissionSequence,
  uid,
  type AvoidZone,
  type MissionArea,
  type ReconFlightSettings
} from '../../domain/mission-model'
import type { DesignPanelProps } from './design-panel'

type ReconTarget = { kind: 'route' | 'area'; id: string }
type GrabPreview = { id: string; order: string[] }

type Inputs = Pick<DesignPanelProps,
  | 'mission' | 'worldType' | 'transfers' | 'onPreviewMission' | 'onCommitPreview'
  | 'onCancelPreview' | 'onUpdateMission' | 'onAnnounce' | 'onReorderWaypoint'
>

export default function useDesignPanelState({
  mission,
  worldType,
  transfers,
  onPreviewMission,
  onCommitPreview,
  onCancelPreview,
  onUpdateMission,
  onAnnounce,
  onReorderWaypoint
}: Inputs) {
  const routes = getMissionRoutes(mission)
  const missionSequence = getMissionSequence(mission)
  const isFinalSequenceItem = (type: 'route' | 'area', id: string) => {
    const last = missionSequence[missionSequence.length - 1]
    return last?.type === type && last.id === id
  }
  const transferFrom = (fromType: 'route' | 'area', fromId: string) =>
    transfers.find((transfer) => transfer.fromType === fromType && transfer.fromId === fromId)

  const [grab, setGrab] = useState<GrabPreview | null>(null)
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null)
  const [editingAvoidId, setEditingAvoidId] = useState<string | null>(null)
  const [areaDraft, setAreaDraft] = useState<MissionArea | null>(null)
  const [avoidDraft, setAvoidDraft] = useState<AvoidZone | null>(null)
  const [reconTarget, setReconTarget] = useState<ReconTarget | null>(null)
  const [reconDraft, setReconDraft] = useState<ReconFlightSettings>(DEFAULT_RECON_FLIGHT_SETTINGS)

  const isCollapsed = (key: string) => collapsed.includes(key)
  const toggleCollapsed = (key: string) =>
    setCollapsed((previous) => previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key])
  const missionIds = mission.waypoints.map((waypoint) => waypoint.id)
  const grabValid = grab !== null
    && grab.order.length === missionIds.length
    && grab.order.every((id) => missionIds.includes(id))
    ? grab : null
  const orderedWaypoints = grabValid
    ? grabValid.order.flatMap((id) => mission.waypoints.find((waypoint) => waypoint.id === id) ?? [])
    : mission.waypoints

  const defaultRecon = (enabled = false): ReconFlightSettings => ({ ...DEFAULT_RECON_FLIGHT_SETTINGS, enabled })
  const routeRecon = (routeId: string) => routes.find((route) => route.id === routeId)?.reconnaissance ?? defaultRecon(false)
  const areaRecon = (areaId: string) => mission.areas.find((area) => area.id === areaId)?.reconnaissance ?? defaultRecon(true)
  const openReconSettings = (kind: ReconTarget['kind'], id: string, value: ReconFlightSettings) => {
    setReconDraft({ ...value })
    setReconTarget({ kind, id })
  }
  const updateReconDraft = (settings: ReconFlightSettings) => {
    setReconDraft(settings)
    if (!reconTarget) return
    if (reconTarget.kind === 'route') {
      onPreviewMission({ ...mission, routes: (mission.routes ?? []).map((route) => route.id === reconTarget.id ? { ...route, reconnaissance: settings } : route) })
    } else {
      onPreviewMission({ ...mission, areas: mission.areas.map((area) => area.id === reconTarget.id ? { ...area, reconnaissance: settings } : area) })
    }
  }
  const cancelReconSettings = () => {
    onCancelPreview()
    setReconTarget(null)
  }
  const commitReconSettings = () => {
    if (!reconTarget) return
    if (reconTarget.kind === 'route') {
      onCommitPreview({ ...mission, routes: (mission.routes ?? []).map((route) => route.id === reconTarget.id ? { ...route, reconnaissance: reconDraft } : route) }, 'Reconnaissance settings updated.')
    } else {
      onCommitPreview({ ...mission, areas: mission.areas.map((area) => area.id === reconTarget.id ? { ...area, reconnaissance: reconDraft } : area) }, 'Reconnaissance settings updated.')
    }
    setReconTarget(null)
  }
  useEffect(() => {
    if (worldType === '3D' && reconTarget) cancelReconSettings()
  }, [worldType, reconTarget, onCancelPreview])

  const updateActionPitch = (waypointId: string, actionId: string, value: number) => {
    const pitch = Math.min(0, Math.max(-90, value))
    onUpdateMission({
      ...mission,
      waypoints: mission.waypoints.map((waypoint) => waypoint.id !== waypointId ? waypoint : {
        ...waypoint,
        actions: waypoint.actions.map((action) => action.id === actionId ? { ...action, gimbalPitchDeg: pitch } : action)
      })
    }, 'Waypoint camera angle updated.')
  }
  const toggleRouteRecon = (routeId: string, recon: ReconFlightSettings) => {
    const enabled = !recon.enabled
    const firstRouteId = routes[0]?.id
    const waypoints = enabled
      ? mission.waypoints.map((waypoint) => {
        const belongsToRoute = !waypoint.generatedByArea && !waypoint.generatedByAvoid && (waypoint.routeId ?? firstRouteId) === routeId
        if (!belongsToRoute || waypoint.actions.some((action) => action.kind === 'photo')) return waypoint
        return { ...waypoint, actions: [...waypoint.actions, { id: uid('act'), kind: 'photo' as const, label: actionLabel('photo') }] }
      })
      : mission.waypoints
    onUpdateMission({
      ...mission,
      routes: (mission.routes ?? routes).map((route) => route.id === routeId ? { ...route, reconnaissance: { ...recon, enabled } } : route),
      waypoints
    }, `${routes.find((route) => route.id === routeId)?.label ?? 'Route'} reconnaissance ${enabled ? 'on' : 'off'}.`)
  }

  const pickUpWaypoint = (id: string) => {
    if (grabValid && grabValid.id !== id) return
    const waypoint = mission.waypoints.find((item) => item.id === id)
    setGrab({ id, order: mission.waypoints.map((item) => item.id) })
    onAnnounce(`Waypoint ${waypoint?.seq ?? ''} picked up. Use ArrowUp and ArrowDown to reorder, Space to drop, Escape to cancel.`)
  }
  const previewMoveWaypoint = (id: string, direction: -1 | 1) => {
    const preview = grabValid
    if (!preview || preview.id !== id) return
    const currentIndex = preview.order.indexOf(id)
    const nextIndex = currentIndex + direction
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= preview.order.length) return
    const order = [...preview.order]
    const [moved] = order.splice(currentIndex, 1)
    order.splice(nextIndex, 0, moved)
    setGrab({ id, order })
    const waypoint = mission.waypoints.find((item) => item.id === id)
    onAnnounce(`Waypoint ${waypoint?.seq ?? ''} moved to position ${nextIndex + 1} of ${order.length}. Press Space to drop, Escape to cancel.`)
  }
  const dropPreviewWaypoint = (id: string) => {
    const preview = grabValid
    const waypoint = mission.waypoints.find((item) => item.id === id)
    setGrab(null)
    if (!preview || preview.id !== id) return
    const toIndex = preview.order.indexOf(id)
    onReorderWaypoint(id, toIndex)
    onAnnounce(`Waypoint ${waypoint?.seq ?? ''} dropped at position ${toIndex + 1} of ${preview.order.length}.`)
  }
  const cancelPreviewWaypoint = (id: string) => {
    const preview = grabValid
    setGrab(null)
    const waypoint = mission.waypoints.find((item) => item.id === id)
    if (!waypoint) {
      onAnnounce('Reorder cancelled.')
      return
    }
    const originalIndex = mission.waypoints.findIndex((item) => item.id === id)
    const shownIndex = preview?.id === id ? preview.order.indexOf(id) : originalIndex
    onAnnounce(shownIndex !== originalIndex
      ? `Reorder cancelled. Waypoint ${waypoint.seq} restored to position ${originalIndex + 1} of ${mission.waypoints.length}.`
      : 'Reorder cancelled.')
  }

  return {
    routes, missionSequence, isFinalSequenceItem, transferFrom,
    collapsed, isCollapsed, toggleCollapsed,
    editingAreaId, setEditingAreaId, editingAvoidId, setEditingAvoidId,
    areaDraft, setAreaDraft, avoidDraft, setAvoidDraft,
    reconTarget, reconDraft, openReconSettings, updateReconDraft,
    cancelReconSettings, commitReconSettings, routeRecon, areaRecon,
    toggleRouteRecon, updateActionPitch,
    grabValid, orderedWaypoints, pickUpWaypoint, previewMoveWaypoint,
    dropPreviewWaypoint, cancelPreviewWaypoint
  }
}
