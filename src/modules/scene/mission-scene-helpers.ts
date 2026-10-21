/* Pure/local helpers for Cesium overlays and coordinate conversion. Viewer lifecycle stays in mission-scene.tsx. */

import type { Viewer } from 'cesium'
import { missionOrigin, type GeoOrigin } from '../../domain/mission-model'

type CesiumNS = typeof import('cesium')

const DEG_PER_M_LAT = 1 / 111320
export const MOCK_FOOTPRINT_RENDER_LIFT_M = 2

function lonScaleForLat(lat: number): number {
  return 1 / (111320 * Math.cos((lat * Math.PI) / 180))
}

/* ENU-to-geodetic conversion is always origin-aware: every scene placement
   and pick resolves through the mission's own anchor (`missionOrigin`),
   never a fixed global site. The default keeps legacy callers working. */
export function enuToLngLat(x: number, y: number, origin: GeoOrigin = missionOrigin({})): { lng: number; lat: number } {
  return { lng: origin.lng + x * lonScaleForLat(origin.lat), lat: origin.lat + y * DEG_PER_M_LAT }
}

export function lngLatToEnu(lng: number, lat: number, origin: GeoOrigin = missionOrigin({})): { x: number; y: number } {
  const scale = lonScaleForLat(origin.lat)
  return { x: (lng - origin.lng) / scale, y: (lat - origin.lat) / DEG_PER_M_LAT }
}

/* Scene color tokens — single source of truth for 3D canvas colors.
   Every color resolves from a skytrack-ui CSS var at runtime via themeColor().
   Hex fallbacks below apply ONLY when the var resolves empty (token missing or
   unset) or when Cesium cannot parse the token value (Tailwind v4 tokens are
   oklch(), which Cesium.Color.fromCssColorString rejects — safeColor then
   falls back to the listed hex). The scene background is temporarily fixed to
   light; live Cesium theme switching is not wired yet. Documented vars (all present in
   skytrack-ui/dist-lib/styles.css :root): --muted (globe base and scene clear
   color), --primary (route/markers/zones), --destructive (avoid
   zones), --muted-foreground (grid), and --warning (vehicle marker; orange
   fallback because the shared token is not exposed in this version).
   Owner-directed Planner-match exceptions: photo frustum cyan #68d7e2
   (Planner photoCamera) and hover emphasis red #ea4335
   (Planner footprintSelected). Existing camera footprint greens and the
   orange/white high-visibility vehicle marker are intentional. */
const SCENE_FALLBACKS = {
  '--muted': '#f5f6f8',
  '--primary': '#7357FF',
  '--destructive': '#e5484d',
  '--muted-foreground': '#667085',
  '--warning': '#c2410c'
} as const

export type SceneToken = keyof typeof SCENE_FALLBACKS

export function themeColor(varName: SceneToken): string {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    if (raw) return raw
  } catch {
    /* ignore */
  }
  return SCENE_FALLBACKS[varName]
}

/** Parse a theme token for Cesium; falls back to the SCENE_FALLBACKS hex for
    varName when the token is empty or unparsable (e.g. oklch()). */
export function safeColor(Cesium: CesiumNS, raw: string, varName: SceneToken, alpha: number): import('cesium').Color {
  try {
    if (raw) return Cesium.Color.fromCssColorString(raw).withAlpha(alpha)
  } catch {
    /* fall through to hex fallback */
  }
  return Cesium.Color.fromCssColorString(SCENE_FALLBACKS[varName]).withAlpha(alpha)
}

export function waypointId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const m = /^ms-wp-(.+)$/.exec(raw)
  return m ? m[1] : null
}

export const WAYPOINT_GROUND_GUIDE_ID = 'ms-waypoint-ground-guide'
export const WAYPOINT_GROUND_ARROW_WAYPOINT_ID = 'ms-waypoint-ground-arrow-waypoint'
export const WAYPOINT_GROUND_ARROW_SURFACE_ID = 'ms-waypoint-ground-arrow-surface'
export const WAYPOINT_GROUND_LABEL_ID = 'ms-waypoint-ground-label'

export function isWaypointGroundGuideEntity(raw: unknown): boolean {
  return raw === WAYPOINT_GROUND_GUIDE_ID
    || raw === WAYPOINT_GROUND_ARROW_WAYPOINT_ID
    || raw === WAYPOINT_GROUND_ARROW_SURFACE_ID
    || raw === WAYPOINT_GROUND_LABEL_ID
}

export function photoWaypointId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  for (const prefix of ['ms-photo-base-', 'ms-photo-rays-']) {
    if (raw.startsWith(prefix)) return raw.slice(prefix.length)
  }
  const indexedEntity = /^ms-photo-(?:face|focus-ray|focus-face)-(.+)-\d+$/.exec(raw)
  if (indexedEntity) return indexedEntity[1]
  const groundProjection = /^ms-photo-focus-ground-(.+)$/.exec(raw)
  return groundProjection ? groundProjection[1] : null
}

export function zoneId(raw: unknown): { kind: 'area' | 'avoid'; id: string } | null {
  if (typeof raw !== 'string') return null
  const m = /^ms-(area|avoid)-(.+)$/.exec(raw)
  if (!m) return null
  return { kind: m[1] as 'area' | 'avoid', id: m[2] }
}

export function avoidHandleId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const m = /^ms-avoid-height-(.+)$/.exec(raw)
  return m?.[1] ?? null
}

export function routeInsertIndex(raw: unknown): number | null {
  if (typeof raw !== 'string') return null
  const m = /^ms-route-insert-(\d+)$/.exec(raw)
  return m ? Number(m[1]) : null
}

export function pendingPointIndex(raw: unknown): number | null {
  if (typeof raw !== 'string') return null
  const m = /^ms-pending-(\d+)$/.exec(raw)
  return m ? Number(m[1]) : null
}

export function pendingInsertIndex(raw: unknown): number | null {
  if (typeof raw !== 'string') return null
  const m = /^ms-pending-insert-(\d+)$/.exec(raw)
  return m ? Number(m[1]) : null
}

/* Segment midpoint marker image (T-016): a white disc with the `+` glyph
   baked in, so the glyph can never slip behind point geometry. Cached per
   resolved primary color; billboards keep constant screen size. */
const plusMarkerCache = new Map<string, string>()
export function plusMarkerImage(primaryCss: string): string {
  const hit = plusMarkerCache.get(primaryCss)
  if (hit) return hit
  const s = 44
  const canvas = document.createElement('canvas')
  canvas.width = s
  canvas.height = s
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const c = s / 2
    ctx.beginPath()
    ctx.arc(c, c, 19, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.lineWidth = 4
    ctx.strokeStyle = primaryCss
    ctx.stroke()
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.strokeStyle = primaryCss
    ctx.beginPath()
    ctx.moveTo(c - 8, c)
    ctx.lineTo(c + 8, c)
    ctx.moveTo(c, c - 8)
    ctx.lineTo(c, c + 8)
    ctx.stroke()
  }
  const url = canvas.toDataURL()
  plusMarkerCache.set(primaryCss, url)
  return url
}

const checkMarkerCache = new Map<string, string>()
export function checkMarkerImage(primaryCss: string): string {
  const hit = checkMarkerCache.get(primaryCss)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 44
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.beginPath()
    ctx.arc(22, 22, 19, 0, Math.PI * 2)
    ctx.fillStyle = primaryCss
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#ffffff'
    ctx.beginPath()
    ctx.moveTo(13, 22)
    ctx.lineTo(19, 28)
    ctx.lineTo(31, 16)
    ctx.stroke()
  }
  const url = canvas.toDataURL()
  checkMarkerCache.set(primaryCss, url)
  return url
}

const droneMarkerCache = new Map<string, string>()
export function droneMarkerImage(accentCss: string): string {
  const hit = droneMarkerCache.get(accentCss)
  if (hit) return hit
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="${accentCss}" stroke="#fff" stroke-width="3"/><g fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M18 18l12 12M30 18L18 30"/><circle cx="16" cy="16" r="4"/><circle cx="32" cy="16" r="4"/><circle cx="16" cy="32" r="4"/><circle cx="32" cy="32" r="4"/></g><circle cx="24" cy="24" r="3" fill="#fff"/></svg>`
  const image = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  droneMarkerCache.set(accentCss, image)
  return image
}

/** Hover minus badge removed (T-016): click-again on a selected authored
   waypoint deletes via the LEFT_CLICK handler below. `ms-wp-remove-<id>`
   entities no longer exist; waypointId matching needs no ordering guard. */

const SEARCH_RESULT_ENTITY_ID = 'ms-search-result'

/* Search-result pin: a camera aid, never mission geometry. Idempotent —
   always removes the previous pin first. Callers must keep it out of camera
   pivots, fits, and mission state; the mission entity sync re-adds it after
   its removeAll wipe. */
export function syncSearchMarkerEntities(
  viewer: Viewer,
  Cesium: CesiumNS,
  marker: { latitude: number; longitude: number; label: string } | null | undefined
): void {
  if (viewer.isDestroyed()) return
  viewer.entities.removeById(SEARCH_RESULT_ENTITY_ID)
  if (!marker) return
  viewer.entities.add({
    id: SEARCH_RESULT_ENTITY_ID,
    position: Cesium.Cartesian3.fromDegrees(marker.longitude, marker.latitude, 1.5),
    point: {
      pixelSize: 13,
      color: safeColor(Cesium, themeColor('--primary'), '--primary', 1),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2.5,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    },
    label: {
      text: marker.label,
      font: '600 12px system-ui, sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK.withAlpha(0.75),
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -24),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      showBackground: true,
      backgroundColor: Cesium.Color.BLACK.withAlpha(0.55)
    }
  })
  viewer.scene.requestRender()
}
