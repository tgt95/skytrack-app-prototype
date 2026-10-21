/* mission-map-2d.tsx — Leaflet 2D basemap and editing surface for Mission Studio.
   Mission coordinates stay in the Studio's local ENU meters; conversion uses
   the mission's own geographic origin (same small-area approximation as the
   Cesium scene). Currently no live route mount renders this surface; it stays
   origin-aware so any future mount places geometry at the mission site. */

import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  getMissionRoutes,
  missionOrigin,
  projectMockReconFootprintToGround,
  type GeoOrigin,
  type SceneSelection,
  type SceneTool,
  type StudioMission
} from '../../domain/mission-model'

const DEG_PER_M_LAT = 1 / 111320

function lonScaleForLat(lat: number): number {
  return 1 / (111320 * Math.cos((lat * Math.PI) / 180))
}

type EnuPoint = { x: number; y: number }
type PendingPoint = EnuPoint & { z?: number }
export type MissionBasemapStyle = 'satellite' | 'basic' | 'light' | 'dark' | 'daybreak' | 'overcast'

export interface MissionMap2DProps {
  mission: StudioMission
  tool: SceneTool
  selection: SceneSelection | null
  pendingPoints: PendingPoint[]
  draftCursor: EnuPoint | null
  zoneShape: 'polygon' | 'cylinder'
  showPhotoMarkers: boolean
  showCameraFootprint: boolean
  basemap: MissionBasemapStyle
  onWaypointSelect: (id: string) => void
  onZoneSelect: (kind: 'area' | 'avoid', id: string) => void
  onDrawingPoint: (point: EnuPoint) => void
  onDrawingHover: (point: EnuPoint | null, nearStart: boolean) => void
  onCloseDrawing: () => void
  onClearSelection: () => void
}

export const BASEMAPS: Record<MissionBasemapStyle, { label: string; url: string; attribution: string; maxNativeZoom?: number; thumbnailUrl: string }> = {
  satellite: {
    label: 'Satellite',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri and its contributors',
    thumbnailUrl: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/4/6/3'
  },
  basic: {
    label: 'Basic',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri, DeLorme, HERE, USGS, Intermap, and contributors',
    thumbnailUrl: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/4/6/3'
  },
  light: {
    label: 'Light',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri, HERE, Garmin, © OpenStreetMap contributors',
    maxNativeZoom: 16,
    thumbnailUrl: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/4/6/3'
  },
  dark: {
    label: 'Dark',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri, HERE, Garmin, © OpenStreetMap contributors',
    maxNativeZoom: 16,
    thumbnailUrl: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/4/6/3'
  },
  daybreak: {
    label: 'Daybreak',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri, HERE, Garmin, Intermap, USGS, and contributors',
    thumbnailUrl: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/4/6/3'
  },
  overcast: {
    label: 'Overcast',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri, USGS, NOAA',
    maxNativeZoom: 13,
    thumbnailUrl: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/4/6/3'
  }
}

const ROUTE_COLORS = ['#7357ff', '#1677ff', '#00a876', '#f08a24']
const AREA_COLOR = '#00b777'
const AVOID_COLOR = '#e5484d'

function enuToLatLng(point: EnuPoint, origin: GeoOrigin): L.LatLngTuple {
  return [origin.lat + point.y * DEG_PER_M_LAT, origin.lng + point.x * lonScaleForLat(origin.lat)]
}

function latLngToEnu(point: L.LatLng, origin: GeoOrigin): EnuPoint {
  const scale = lonScaleForLat(origin.lat)
  return {
    x: (point.lng - origin.lng) / scale,
    y: (point.lat - origin.lat) / DEG_PER_M_LAT
  }
}

function equalSelection(a: SceneSelection | null, kind: SceneSelection['kind'], id: string): boolean {
  return a?.kind === kind && a.id === id
}

function pointDistance(a: EnuPoint, b: EnuPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function waypointForwardDirection(orderedPoints: readonly EnuPoint[], index: number): EnuPoint {
  const current = orderedPoints[index]
  const next = orderedPoints[index + 1]
  const prior = orderedPoints[index - 1]
  const dx = next ? next.x - current.x : prior ? current.x - prior.x : 0
  const dy = next ? next.y - current.y : prior ? current.y - prior.y : 1
  const length = Math.hypot(dx, dy)
  return length > 0.001 ? { x: dx / length, y: dy / length } : { x: 0, y: 1 }
}

function waypointIcon(seq: number, selected: boolean, photo: boolean): L.DivIcon {
  const color = selected ? '#ffffff' : photo ? '#6b4eff' : '#20242d'
  const text = selected ? '#6b4eff' : '#ffffff'
  return L.divIcon({
    className: 'ms-map-waypoint-icon',
    html: `<span role="img" aria-label="Waypoint ${seq}${photo ? ', photo capture' : ''}" style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border:2px solid #fff;border-radius:50%;background:${color};color:${text};box-shadow:0 1px 5px #0008;font:700 12px/1 system-ui">${seq}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    tooltipAnchor: [0, -14]
  })
}

function draftMarkerIcon(index: number): L.DivIcon {
  return L.divIcon({
    className: 'ms-map-draft-icon',
    html: `<span role="img" aria-label="Draft point ${index + 1}" style="display:block;width:12px;height:12px;border:2px solid #fff;border-radius:50%;background:#7357ff;box-shadow:0 1px 4px #0008"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  })
}

export function MissionMap2D({
  mission,
  tool,
  selection,
  pendingPoints,
  draftCursor,
  zoneShape,
  showPhotoMarkers,
  showCameraFootprint,
  basemap,
  onWaypointSelect,
  onZoneSelect,
  onDrawingPoint,
  onDrawingHover,
  onCloseDrawing,
  onClearSelection
}: MissionMap2DProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const baseLayerRef = useRef<L.TileLayer | null>(null)
  const overlaysRef = useRef<L.LayerGroup | null>(null)
  /* Geographic anchor of the local frame: mission site, legacy default when
     absent. New drawing converts through this origin, so it stays within the
     ±2000 m local bounds around the searched site and renders under the click. */
  const origin = useMemo(
    () => missionOrigin(mission),
    [mission]
  )
  const originRef = useRef(origin)
  originRef.current = origin
  const propsRef = useRef({ tool, pendingPoints, onDrawingPoint, onDrawingHover, onCloseDrawing, onClearSelection })
  propsRef.current = { tool, pendingPoints, onDrawingPoint, onDrawingHover, onCloseDrawing, onClearSelection }
  const [tileState, setTileState] = useState<'loading' | 'ready' | 'offline'>('loading')

  useEffect(() => {
    const host = hostRef.current
    if (!host || mapRef.current) return

    const initial = originRef.current
    const map = L.map(host, {
      center: [initial.lat, initial.lng],
      zoom: 18,
      minZoom: 3,
      maxZoom: 20,
      zoomControl: false,
      doubleClickZoom: false,
      attributionControl: true
    })
    mapRef.current = map
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    overlaysRef.current = L.layerGroup().addTo(map)

    const handleClick = (event: L.LeafletMouseEvent) => {
      const current = propsRef.current
      if (current.tool !== 'select') current.onDrawingPoint(latLngToEnu(event.latlng, originRef.current))
      else current.onClearSelection()
    }
    const handleDoubleClick = () => {
      if (propsRef.current.tool !== 'select') propsRef.current.onCloseDrawing()
    }
    const handleMove = (event: L.LeafletMouseEvent) => {
      const current = propsRef.current
      if (current.tool === 'select') return
      const mapOrigin = originRef.current
      const point = latLngToEnu(event.latlng, mapOrigin)
      const first = current.pendingPoints[0]
      const nearStart = !!first && current.pendingPoints.length >= 3 &&
        map.latLngToContainerPoint(event.latlng).distanceTo(map.latLngToContainerPoint(enuToLatLng(first, mapOrigin))) <= 18
      current.onDrawingHover(point, nearStart)
    }
    const handleOut = () => propsRef.current.onDrawingHover(null, false)
    map.on('click', handleClick)
    map.on('dblclick', handleDoubleClick)
    map.on('mousemove', handleMove)
    map.on('mouseout', handleOut)

    return () => {
      map.off('click', handleClick)
      map.off('dblclick', handleDoubleClick)
      map.off('mousemove', handleMove)
      map.off('mouseout', handleOut)
      map.remove()
      mapRef.current = null
      baseLayerRef.current = null
      overlaysRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const spec = BASEMAPS[basemap]
    setTileState('loading')
    if (baseLayerRef.current) map.removeLayer(baseLayerRef.current)
    let errors = 0
    const layer = L.tileLayer(spec.url, {
      attribution: spec.attribution,
      maxZoom: 20,
      maxNativeZoom: spec.maxNativeZoom,
      crossOrigin: true
    })
    layer.on('tileload', () => setTileState('ready'))
    layer.on('tileerror', () => {
      errors += 1
      if (errors >= 4) setTileState('offline')
    })
    layer.addTo(map)
    layer.bringToBack()
    baseLayerRef.current = layer
    return () => {
      layer.off()
      if (map.hasLayer(layer)) map.removeLayer(layer)
    }
  }, [basemap])

  useEffect(() => {
    const map = mapRef.current
    const group = overlaysRef.current
    if (!map || !group) return
    group.clearLayers()

    L.circleMarker(enuToLatLng(mission.spawn, origin), {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: '#6246ea',
      fillOpacity: 1,
      interactive: false
    }).bindTooltip('Drone Home point').addTo(group)

    const routes = getMissionRoutes(mission)
    const firstMissionPoint = mission.waypoints[0]
    if (firstMissionPoint) {
      L.polyline([
        enuToLatLng(mission.spawn, origin),
        enuToLatLng(firstMissionPoint, origin)
      ], { color: '#6246ea', weight: 2, dashArray: '6 5', opacity: 0.8, interactive: false })
        .bindTooltip('Home to mission start')
        .addTo(group)
    }
    routes.forEach((route, routeIndex) => {
      const points = mission.waypoints
        .filter((waypoint) => !waypoint.generatedByArea && !waypoint.generatedByAvoid && (waypoint.routeId ?? routes[0]?.id) === route.id)
        .sort((a, b) => a.seq - b.seq)
      const color = ROUTE_COLORS[routeIndex % ROUTE_COLORS.length]
      if (points.length > 1) {
        L.polyline(points.map((point) => enuToLatLng(point, origin)), { color, weight: 4, opacity: 0.92, bubblingMouseEvents: false })
          .bindTooltip(`${route.label} · ${points.length} waypoints`)
          .addTo(group)
      }
      points.forEach((waypoint, waypointIndex) => {
        const captures = waypoint.actions.some((action) => action.kind === 'photo')
        const marker = L.marker(enuToLatLng(waypoint, origin), {
          icon: waypointIcon(waypoint.seq, equalSelection(selection, 'waypoint', waypoint.id), showPhotoMarkers && captures),
          keyboard: true,
          title: `Waypoint ${waypoint.seq}${captures ? ', photo capture' : ''}`,
          bubblingMouseEvents: false
        })
        marker.bindTooltip(`Waypoint ${waypoint.seq}${captures ? ' · Photo capture' : ''}`)
        marker.on('click keypress', () => onWaypointSelect(waypoint.id))
        marker.addTo(group)
        if (showCameraFootprint && captures) {
          const pitchDeg = waypoint.actions.find((action) => action.kind === 'photo')?.gimbalPitchDeg
            ?? route.reconnaissance?.gimbalPitchDeg
            ?? -65
          const footprint = projectMockReconFootprintToGround(waypoint, waypointForwardDirection(points, waypointIndex), pitchDeg)
          if (footprint) L.polygon(footprint.map((point) => enuToLatLng(point, origin)), {
            color: equalSelection(selection, 'waypoint', waypoint.id) ? '#ff6b35' : color,
            weight: 1.5,
            opacity: 0.9,
            fillColor: color,
            fillOpacity: 0.08,
            interactive: false
          }).bindTooltip('Conceptual mock FOV · flat reference ground; terrain omitted').addTo(group)
        }
      })
    })

    mission.areas.forEach((area) => {
      const selected = equalSelection(selection, 'area', area.id)
      const polygon = L.polygon(area.points.map((point) => enuToLatLng(point, origin)), {
        color: selected ? '#ff6b35' : AREA_COLOR,
        weight: selected ? 3 : 2,
        opacity: 0.95,
        fillColor: AREA_COLOR,
        fillOpacity: 0.12,
        bubblingMouseEvents: false
      })
      polygon.bindTooltip(area.label || 'Area')
      polygon.on('click', () => onZoneSelect('area', area.id))
      polygon.addTo(group)

      // Area-generated waypoints are authored flight geometry too: show their
      // ordered traversal over the AOI so the 2D map previews the actual scan.
      const scanWaypoints = mission.waypoints
        .filter((waypoint) => waypoint.generatedByArea === area.id)
        .sort((a, b) => a.seq - b.seq)
      const scanPath = scanWaypoints.length > 1
        ? scanWaypoints
        : (area.scanLines ?? []).flat().map((point, index) => ({ ...point, z: area.reconnaissance?.altitudeM ?? 0, seq: index, actions: [] }))
      const meterPixels = map.latLngToLayerPoint(enuToLatLng({ x: 1, y: 0 }, origin))
        .distanceTo(map.latLngToLayerPoint(enuToLatLng({ x: 0, y: 0 }, origin)))
      const laneSpacingPixels = Math.max(0.75, (area.lineSpacingM ?? 6) * meterPixels)
      const scanStroke = Math.max(0.75, Math.min(2.25, laneSpacingPixels * 0.42))
      if (scanPath.length > 1) {
        const scanLine = L.polyline(scanPath.map((point) => enuToLatLng(point, origin)), {
          color: selected ? '#ff6b35' : AREA_COLOR,
          weight: scanStroke,
          opacity: 0.92,
          bubblingMouseEvents: false
        })
        scanLine.bindTooltip(`${area.label || 'Area'} · ${scanWaypoints.length || scanPath.length} scan waypoints`)
        scanLine.on('click', () => onZoneSelect('area', area.id))
        scanLine.addTo(group)
      }

      scanWaypoints.forEach((waypoint, waypointIndex) => {
        const captures = waypoint.actions.some((action) => action.kind === 'photo')
        if (!captures) return
        if (showPhotoMarkers) {
          L.circleMarker(enuToLatLng(waypoint, origin), {
            radius: Math.max(1.25, Math.min(3, laneSpacingPixels * 0.42)),
            color: '#ffffff',
            weight: 1,
            fillColor: selected ? '#ff6b35' : '#6246ea',
            fillOpacity: 1,
            interactive: false
          }).addTo(group)
        }
        if (showCameraFootprint) {
          const pitchDeg = waypoint.actions.find((action) => action.kind === 'photo')?.gimbalPitchDeg
            ?? area.reconnaissance?.gimbalPitchDeg
            ?? -65
          const footprint = projectMockReconFootprintToGround(waypoint, waypointForwardDirection(scanWaypoints, waypointIndex), pitchDeg)
          if (footprint) L.polygon(footprint.map((point) => enuToLatLng(point, origin)), {
            color: selected ? '#ff6b35' : AREA_COLOR,
            weight: 1,
            opacity: 0.45,
            fillColor: AREA_COLOR,
            fillOpacity: 0.035,
            interactive: false
          }).bindTooltip('Conceptual mock FOV · flat reference ground; terrain omitted').addTo(group)
        }
      })
    })

    mission.avoids.forEach((avoid) => {
      const selected = equalSelection(selection, 'avoid', avoid.id)
      const polygon = L.polygon(avoid.points.map((point) => enuToLatLng(point, origin)), {
        color: selected ? '#ff6b35' : AVOID_COLOR,
        weight: selected ? 3 : 2,
        opacity: 0.95,
        fillColor: AVOID_COLOR,
        fillOpacity: 0.2,
        dashArray: '5 4',
        bubblingMouseEvents: false
      })
      polygon.bindTooltip(avoid.label || 'Avoid zone')
      polygon.on('click', () => onZoneSelect('avoid', avoid.id))
      polygon.addTo(group)
    })

    const pending = pendingPoints.map((point) => enuToLatLng(point, origin))
    if (tool === 'route') {
      const routeDraft = [...pending]
      if (draftCursor) routeDraft.push(enuToLatLng(draftCursor, origin))
      if (routeDraft.length > 1) {
        L.polyline(routeDraft, { color: '#7357ff', weight: 3, dashArray: '7 5', opacity: 0.95, interactive: false }).addTo(group)
      }
    } else if ((tool === 'area' || tool === 'avoid') && zoneShape === 'cylinder' && pendingPoints.length > 0) {
      const center = pendingPoints[0]
      const radius = draftCursor ? pointDistance(center, draftCursor) : 0
      if (radius > 0) {
        L.circle(enuToLatLng(center, origin), {
          radius,
          color: tool === 'area' ? AREA_COLOR : AVOID_COLOR,
          weight: 2,
          dashArray: '6 5',
          fillOpacity: 0.1,
          interactive: false
        }).addTo(group)
      }
    } else if ((tool === 'area' || tool === 'avoid') && pending.length > 0) {
      const draft = [...pending]
      if (draftCursor) draft.push(enuToLatLng(draftCursor, origin))
      if (draft.length > 1) {
        const color = tool === 'area' ? AREA_COLOR : AVOID_COLOR
        L.polyline(draft, { color, weight: 2, dashArray: '6 5', interactive: false }).addTo(group)
        if (draft.length >= 3) L.polygon(draft, { color, weight: 1, fillOpacity: 0.08, interactive: false }).addTo(group)
      }
    }
    if (tool !== 'select') {
      pendingPoints.forEach((point, index) => {
        L.marker(enuToLatLng(point, origin), { icon: draftMarkerIcon(index), keyboard: false, interactive: false }).addTo(group)
      })
    }
  }, [mission, origin, tool, selection, pendingPoints, draftCursor, zoneShape, showPhotoMarkers, showCameraFootprint, onWaypointSelect, onZoneSelect])

  /* Mission site change (e.g. address search moves the origin): recenter the
     map on the new anchor so relocated overlays and new drawing stay in view.
     User pans never change the origin, so this only fires on site changes. */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setView([origin.lat, origin.lng], Math.max(map.getZoom(), 15), { animate: false })
  }, [origin.lat, origin.lng])

  return (
    <section aria-label="2D mission map" style={{ position: 'relative', width: '100%', height: '100%', minHeight: 320, overflow: 'hidden' }}>
      <div ref={hostRef} style={{ position: 'absolute', inset: 0, background: '#e8ebef' }} />
      {tileState !== 'ready' && (
        <div role="status" aria-live="polite" style={{ position: 'absolute', zIndex: 500, left: 12, bottom: 12, maxWidth: 280, padding: '6px 9px', borderRadius: 5, color: 'var(--foreground)', background: 'var(--card)', boxShadow: '0 1px 5px #0003', font: '12px/1.4 system-ui' }}>
          {tileState === 'offline' ? 'Basemap unavailable. Check the network connection.' : 'Loading basemap…'}
        </div>
      )}
    </section>
  )
}
