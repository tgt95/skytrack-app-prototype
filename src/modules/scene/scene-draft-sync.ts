/* scene-draft-sync.ts — draft overlay synchroniser (T-217 / W04).
   Extracted from mission-scene.tsx: rebuilds the draft layer only
   (`ms-draw-plane`, `ms-pending-*`) so ruler ticks and draft hovers never
   rebuild the committed geometry. The function owns nothing long-lived: it
   relies on the caller's layer-scoped removal and adds only draft entities
   (classified in scene-entity-ownership.ts). Viewer lifecycle stays with
   MissionScene.

   Inputs are fully explicit — no closure over component state. `origin` is
   the mission's ENU anchor (missionOrigin(missionSnap)); at effect time it is
   identical to the origin the inline body resolved through missionRef. */

import type { Viewer } from 'cesium'
import {
  circleFootprint, generateAreaScan, generateAreaTraversal, isValidRing, missionOrigin,
  type AvoidZone, type MissionArea, type SceneTool, type StudioMission
} from '../../domain/mission-model'
import { checkMarkerImage, enuToLngLat, plusMarkerImage, safeColor, themeColor, type SceneToken } from './mission-scene-helpers'

type CesiumNS = typeof import('cesium')

export function syncDraftOverlay(
  viewer: Viewer,
  Cesium: CesiumNS,
  missionSnap: StudioMission,
  draftPoints: { x: number; y: number; z?: number }[],
  draftTool: SceneTool,
  shape: 'polygon' | 'cylinder',
  cursor: { x: number; y: number } | null,
  closeAtStart: boolean,
  areaSettings: Pick<MissionArea, 'lineSpacingM' | 'orientationDeg' | 'paddingM'>,
  avoidSettings: Pick<AvoidZone, 'type' | 'heightM' | 'clearanceM'>,
  rulerAlt: number,
  showPlane: boolean
) {
  const origin = missionOrigin(missionSnap)
  const cssColor = (varName: SceneToken, alpha: number): import('cesium').Color =>
    safeColor(Cesium, themeColor(varName), varName, alpha)
  /* Called separately by mission-scene.tsx (draft effect): the draft effect
     removes the draft layer right before this call, so this function only
     re-adds its own entities. */
  if (showPlane) {
    const pts = missionSnap.waypoints.map((w) => ({ x: w.x, y: w.y }))
    if (pts.length === 0) pts.push({ x: missionSnap.spawn.x, y: missionSnap.spawn.y })
    for (const a of missionSnap.areas) for (const p of a.points) pts.push(p)
    for (const a of missionSnap.avoids) for (const p of a.points) pts.push(p)
    let cx = 0
    let cy = 0
    for (const p of pts) {
      cx += p.x
      cy += p.y
    }
    if (pts.length > 0) {
      cx /= pts.length
      cy /= pts.length
    }
    const half = 60
    const corners = [
      enuToLngLat(cx - half, cy - half, origin),
      enuToLngLat(cx + half, cy - half, origin),
      enuToLngLat(cx + half, cy + half, origin),
      enuToLngLat(cx - half, cy + half, origin)
    ]
    viewer.entities.add({
      id: 'ms-draw-plane',
      name: 'Drawing plane',
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(corners.flatMap((g) => [g.lng, g.lat])),
        height: Math.max(0, rulerAlt),
        material: cssColor('--primary', 0.1),
        outline: true,
        outlineColor: cssColor('--primary', 0.5),
        outlineWidth: 2
      }
    })
  }
  if (draftPoints.length > 0) {
    const defaultDraftAlt = draftTool === 'route'
      ? Math.max(rulerAlt, missionSnap.takeoffAltM, 0.5)
      : Math.max(rulerAlt, 0.2)
    // The transparent drawing plane can depth-occlude preview strokes when
    // they share its height. Lift only temporary Area/Avoid outlines; saved
    // geometry and waypoint elevations keep their authored altitude.
    const draftOutlineAlt = draftTool === 'route' ? defaultDraftAlt : defaultDraftAlt + 1
    draftPoints.forEach((p, index) => {
      const g = enuToLngLat(p.x, p.y, origin)
      const alt = typeof p.z === 'number' ? p.z : defaultDraftAlt
      viewer.entities.add({
        id: `ms-pending-${index}`,
        position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, alt),
        point: (draftTool !== 'route' && shape === 'polygon' && closeAtStart && index === 0) ? undefined : {
          pixelSize: 9,
          color: Cesium.Color.WHITE,
          outlineColor: cssColor('--primary', 1),
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: String(index + 1),
          font: '600 10px sans-serif',
          fillColor: Cesium.Color.WHITE,
          pixelOffset: new Cesium.Cartesian2(0, 15),
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      })
    })
    if (draftPoints.length >= 2) {
      const flat: number[] = []
      for (const p of draftPoints) {
        const g = enuToLngLat(p.x, p.y, origin)
        const alt = typeof p.z === 'number' ? p.z : draftOutlineAlt
        flat.push(g.lng, g.lat, alt)
      }
      viewer.entities.add({
        id: 'ms-pending-line',
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights(flat),
          width: 2,
          material: cssColor('--primary', 0.85),
          depthFailMaterial: new Cesium.PolylineDashMaterialProperty({ color: cssColor('--primary', 0.85) }),
          arcType: Cesium.ArcType.NONE
        }
      })
      if (draftTool === 'route') {
        const plusCss = safeColor(Cesium, themeColor('--primary'), '--primary', 1).toCssColorString()
        for (let j = 1; j < draftPoints.length; j += 1) {
          const a = draftPoints[j - 1]
          const b = draftPoints[j]
          const aZ = typeof a.z === 'number' ? a.z : defaultDraftAlt
          const bZ = typeof b.z === 'number' ? b.z : defaultDraftAlt
          const mid = {
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
            z: (aZ + bZ) / 2
          }
          const g = enuToLngLat(mid.x, mid.y, origin)
          viewer.entities.add({
            id: `ms-pending-insert-${j}`,
            show: false,
            position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, mid.z),
            billboard: {
              image: plusMarkerImage(plusCss),
              width: 22,
              height: 22,
              disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
          })
        }
      }
    }

    const checkCss = safeColor(Cesium, themeColor('--primary'), '--primary', 1).toCssColorString()
    const checkPoint = closeAtStart && shape === 'polygon'
      ? draftPoints[0]
      : shape === 'cylinder' && draftPoints.length === 1 && cursor && Math.hypot(cursor.x - draftPoints[0].x, cursor.y - draftPoints[0].y) >= 0.5
        ? cursor
        : null
    if (checkPoint) {
      const g = enuToLngLat(checkPoint.x, checkPoint.y, origin)
      viewer.entities.add({
        id: 'ms-pending-check',
        position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, defaultDraftAlt),
        billboard: { image: checkMarkerImage(checkCss), width: 28, height: 28, disableDepthTestDistance: Number.POSITIVE_INFINITY }
      })
    }

    if (shape === 'polygon' && draftPoints.length >= 3 && cursor) {
      const last = draftPoints[draftPoints.length - 1]
      const a = enuToLngLat(last.x, last.y, origin)
      const b = enuToLngLat(cursor.x, cursor.y, origin)
      viewer.entities.add({
        id: 'ms-pending-preview-edge',
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights([a.lng, a.lat, draftOutlineAlt, b.lng, b.lat, draftOutlineAlt]),
          width: 2,
          material: cssColor('--primary', 0.95),
          depthFailMaterial: new Cesium.PolylineDashMaterialProperty({ color: cssColor('--primary', 0.95) }),
          arcType: Cesium.ArcType.NONE
        }
      })
    } else if (shape === 'cylinder' && draftPoints.length === 1 && cursor) {
      const center = draftPoints[0]
      const radius = Math.hypot(cursor.x - center.x, cursor.y - center.y)
      if (radius >= 0.5) {
        const ring = circleFootprint(center, radius)
        const flat = ring.flatMap((p) => {
          const g = enuToLngLat(p.x, p.y, origin)
          return [g.lng, g.lat, draftOutlineAlt]
        })
        const first = ring[0]
        const fg = enuToLngLat(first.x, first.y, origin)
        flat.push(fg.lng, fg.lat, draftOutlineAlt)
        viewer.entities.add({
          id: 'ms-pending-circle-preview',
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(flat),
            width: 2,
            material: cssColor('--primary', 0.95),
            depthFailMaterial: new Cesium.PolylineDashMaterialProperty({ color: cssColor('--primary', 0.95) }),
            arcType: Cesium.ArcType.NONE
          }
        })
      }
    }

    let ring: { x: number; y: number }[] = []
    if ((draftTool === 'area' || draftTool === 'avoid') && shape === 'polygon' && draftPoints.length >= 3 && isValidRing(draftPoints)) {
      ring = draftPoints.map(({ x, y }) => ({ x, y }))
    } else if ((draftTool === 'area' || draftTool === 'avoid') && shape === 'cylinder' && draftPoints.length === 1 && cursor) {
      const radius = Math.hypot(cursor.x - draftPoints[0].x, cursor.y - draftPoints[0].y)
      if (radius >= 0.5) ring = circleFootprint(draftPoints[0], radius)
    }
    if (ring.length >= 3) {
      const geo = ring.flatMap((p) => {
        const g = enuToLngLat(p.x, p.y, origin)
        return [g.lng, g.lat]
      })
      viewer.entities.add({
        id: 'ms-pending-zone-fill',
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(geo),
          height: draftOutlineAlt,
          extrudedHeight: draftTool === 'avoid' ? draftOutlineAlt + Math.max(1, avoidSettings.heightM ?? 15) : undefined,
          material: cssColor(draftTool === 'avoid' ? '--destructive' : '--primary', 0.1),
          outline: false
        }
      })
      if (draftTool === 'area') {
        const previewArea = { points: ring, ...areaSettings }
        const lanes = generateAreaScan(previewArea)
        const traversal = generateAreaTraversal(previewArea, lanes)
        if (traversal.length >= 2) {
          const flat = traversal.flatMap((point) => {
            const g = enuToLngLat(point.x, point.y, origin)
            return [g.lng, g.lat, draftOutlineAlt + 0.1]
          })
          viewer.entities.add({
            id: 'ms-pending-area-traversal',
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights(flat),
              width: 2,
              material: cssColor('--primary', 0.8),
              depthFailMaterial: new Cesium.PolylineDashMaterialProperty({ color: cssColor('--primary', 0.8) }),
              arcType: Cesium.ArcType.NONE
            }
          })
        }
      }
    }
  }
}
