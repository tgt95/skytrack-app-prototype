/* scene-hover-guide.ts — hover affordance writers for capture frustums and the
   waypoint ground guide (T-224 / W13a).

   Owns no listeners and no Viewer lifecycle. The only entities it creates are
   the four idempotent `ms-waypoint-ground-*` guide entities; capture-frustum
   entities are owned by the capture layer and are only restyled here. Reads
   live state through the ref objects its caller passes in. */

import type { Cartesian3, Viewer } from 'cesium'
import { missionOrigin, type StudioMission } from '../../domain/mission-model'
import {
  enuToLngLat, safeColor, themeColor,
  WAYPOINT_GROUND_ARROW_SURFACE_ID, WAYPOINT_GROUND_ARROW_WAYPOINT_ID, WAYPOINT_GROUND_GUIDE_ID, WAYPOINT_GROUND_LABEL_ID
} from './mission-scene-helpers'

type CesiumNS = typeof import('cesium')
type MutableRef<T> = { current: T }

export interface SceneFrustumGeometry {
  compactBase: Cartesian3[]
  expandedBase: Cartesian3[]
  compactRays: Cartesian3[]
  expandedRays: Cartesian3[]
}

export interface HoverGuideDeps {
  viewer: Viewer
  Cesium: CesiumNS
  state: {
    missionRef: MutableRef<StudioMission>
    hoveredWaypointRef: MutableRef<string | null>
    hoveredPhotoRef: MutableRef<string | null>
    selectedPhotoRef: MutableRef<string | null>
    frustumGeomRef: MutableRef<Map<string, SceneFrustumGeometry>>
  }
  visibleGroundHeightAt: (point: Cartesian3) => number
}

export interface HoverGuide {
  setPhotoEmphasis(wpid: string | null, emphasized: boolean): void
  clearPhotoHover(): void
  hideWaypointGroundGuide(): void
  updateWaypointGroundGuide(id: string | null): void
  clearWaypointHover(): void
}

export function createHoverGuide(deps: HoverGuideDeps): HoverGuide {
  const { viewer, Cesium, state, visibleGroundHeightAt } = deps
  const { missionRef, hoveredWaypointRef, hoveredPhotoRef, selectedPhotoRef, frustumGeomRef } = state

  /* Shared frustum emphasis writer for the hover and pointer-exit paths
     (Planner setCaptureFrustumEmphasis pattern). Only refs + arguments are
     touched, so long-lived canvas handlers stay fresh. */
  const setPhotoEmphasis = (wpid: string | null, emphasized: boolean) => {
    if (!wpid || viewer.isDestroyed()) return
    const geom = frustumGeomRef.current.get(wpid)
    const base = viewer.entities.getById(`ms-photo-base-${wpid}`)
    const rays = viewer.entities.getById(`ms-photo-rays-${wpid}`)
    if (!geom || !base?.polyline || !rays?.polyline) return
    const highlighted = emphasized || selectedPhotoRef.current === wpid
    const depth = highlighted
      ? { base: geom.expandedBase, rays: geom.expandedRays }
      : { base: geom.compactBase, rays: geom.compactRays }
    const color = Cesium.Color.fromCssColorString(highlighted ? '#ea4335' : '#68d7e2').withAlpha(0.92)
    base.polyline.positions = new Cesium.ConstantProperty(depth.base)
    base.polyline.material = new Cesium.ColorMaterialProperty(color)
    base.polyline.width = new Cesium.ConstantProperty(highlighted ? 2.4 : 1.8)
    rays.polyline.positions = new Cesium.ConstantProperty(depth.rays)
    rays.polyline.material = new Cesium.ColorMaterialProperty(color)
    rays.polyline.width = new Cesium.ConstantProperty(highlighted ? 2.4 : 1.8)
  }

  const clearPhotoHover = () => {
    const wpid = hoveredPhotoRef.current
    if (!wpid) return
    setPhotoEmphasis(wpid, false)
    hoveredPhotoRef.current = null
    if (!viewer.isDestroyed()) viewer.scene.requestRender()
  }

  const hideWaypointGroundGuide = () => {
    hoveredWaypointRef.current = null
    const guide = viewer.entities.getById(WAYPOINT_GROUND_GUIDE_ID)
    const waypointArrow = viewer.entities.getById(WAYPOINT_GROUND_ARROW_WAYPOINT_ID)
    const surfaceArrow = viewer.entities.getById(WAYPOINT_GROUND_ARROW_SURFACE_ID)
    const label = viewer.entities.getById(WAYPOINT_GROUND_LABEL_ID)
    if (guide) guide.show = false
    if (waypointArrow) waypointArrow.show = false
    if (surfaceArrow) surfaceArrow.show = false
    if (label) label.show = false
    viewer.scene.requestRender()
  }
  const updateWaypointGroundGuide = (id: string | null) => {
    if (!id || viewer.isDestroyed()) {
      hideWaypointGroundGuide()
      return
    }
    const waypoint = missionRef.current.waypoints.find((item) => item.id === id)
    if (!waypoint) {
      hideWaypointGroundGuide()
      return
    }
    hoveredWaypointRef.current = id
    const marker = viewer.entities.getById(`ms-wp-${id}`)
    const markerPosition = marker?.position?.getValue(viewer.clock.currentTime) as unknown as Cartesian3 | undefined
    const point = markerPosition ?? (() => {
      const geo = enuToLngLat(waypoint.x, waypoint.y, missionOrigin(missionRef.current))
      return Cesium.Cartesian3.fromDegrees(geo.lng, geo.lat, waypoint.z)
    })()
    const cartographic = Cesium.Cartographic.fromCartesian(point)
    if (!cartographic || !Number.isFinite(cartographic.longitude) || !Number.isFinite(cartographic.latitude) || !Number.isFinite(cartographic.height)) {
      hideWaypointGroundGuide()
      return
    }
    const groundHeight = visibleGroundHeightAt(point)
    const surface = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, groundHeight)
    const linePositions = [point, surface]
    const guideColor = safeColor(Cesium, themeColor('--primary'), '--primary', 0.9)
    const arrowColor = safeColor(Cesium, themeColor('--destructive'), '--destructive', 0.96)
    const guide = viewer.entities.getById(WAYPOINT_GROUND_GUIDE_ID) ?? viewer.entities.add({
      id: WAYPOINT_GROUND_GUIDE_ID,
      show: false,
      polyline: {
        positions: linePositions,
        width: 2,
        arcType: Cesium.ArcType.NONE,
        clampToGround: false,
        material: new Cesium.PolylineDashMaterialProperty({
          color: guideColor,
          dashLength: 12
        }),
        depthFailMaterial: new Cesium.PolylineDashMaterialProperty({
          color: guideColor,
          dashLength: 12
        })
      }
    })
    const guideLine = guide.polyline
    if (guideLine) {
      guideLine.positions = new Cesium.ConstantProperty(linePositions)
      guide.show = true
    }
    const height = Math.abs(cartographic.height - groundHeight)
    const centerHeight = (cartographic.height + groundHeight) / 2
    const arrowHalfLength = Math.min(height / 2, Math.min(15, Math.max(6, height * 0.25)))
    const waypointDirection = Math.sign(cartographic.height - groundHeight)
    const arrowCenter = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, centerHeight)
    const waypointArrowEnd = Cesium.Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      centerHeight + waypointDirection * arrowHalfLength
    )
    const surfaceArrowEnd = Cesium.Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      centerHeight - waypointDirection * arrowHalfLength
    )
    const arrowMaterial = new Cesium.PolylineArrowMaterialProperty(arrowColor)
    const waypointArrowPositions = [arrowCenter, waypointArrowEnd]
    const surfaceArrowPositions = [arrowCenter, surfaceArrowEnd]
    const waypointArrow = viewer.entities.getById(WAYPOINT_GROUND_ARROW_WAYPOINT_ID) ?? viewer.entities.add({
      id: WAYPOINT_GROUND_ARROW_WAYPOINT_ID,
      show: false,
      polyline: {
        positions: waypointArrowPositions,
        width: 12,
        material: arrowMaterial,
        depthFailMaterial: arrowMaterial,
        arcType: Cesium.ArcType.NONE
      }
    })
    const surfaceArrow = viewer.entities.getById(WAYPOINT_GROUND_ARROW_SURFACE_ID) ?? viewer.entities.add({
      id: WAYPOINT_GROUND_ARROW_SURFACE_ID,
      show: false,
      polyline: {
        positions: surfaceArrowPositions,
        width: 12,
        material: arrowMaterial,
        depthFailMaterial: arrowMaterial,
        arcType: Cesium.ArcType.NONE
      }
    })
    if (waypointArrow.polyline) {
      waypointArrow.polyline.positions = new Cesium.ConstantProperty(waypointArrowPositions)
      waypointArrow.show = height > 0.5
    }
    if (surfaceArrow.polyline) {
      surfaceArrow.polyline.positions = new Cesium.ConstantProperty(surfaceArrowPositions)
      surfaceArrow.show = height > 0.5
    }
    const label = viewer.entities.getById(WAYPOINT_GROUND_LABEL_ID) ?? viewer.entities.add({
      id: WAYPOINT_GROUND_LABEL_ID,
      show: false,
      position: arrowCenter,
      label: {
        text: `${Math.round(height)} m`,
        font: '700 14px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        showBackground: true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.88),
        backgroundPadding: new Cesium.Cartesian2(6, 3),
        pixelOffset: new Cesium.Cartesian2(18, 0),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    })
    const heightLabel = label.label
    if (heightLabel) {
      // Keep the AGL readout beside the midpoint arrow so it stays
      // aligned with the editable ground-to-waypoint height affordance.
      label.position = new Cesium.ConstantPositionProperty(arrowCenter)
      heightLabel.text = new Cesium.ConstantProperty(`${Math.round(height)} m`)
      label.show = true
    }
    viewer.scene.requestRender()
  }
  const clearWaypointHover = () => hideWaypointGroundGuide()

  return {
    setPhotoEmphasis,
    clearPhotoHover,
    hideWaypointGroundGuide,
    updateWaypointGroundGuide,
    clearWaypointHover
  }
}
