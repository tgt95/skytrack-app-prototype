import type { Viewer } from 'cesium'
import { getMissionRouteWaypoints, getMissionRoutes, missionOrigin, MOCK_RECON_CAMERA_PROFILE, projectMockReconFootprintToGround, type StudioMission } from '@/domain/mission-model'
import { MOCK_FOOTPRINT_RENDER_LIFT_M, enuToLngLat } from './mission-scene-helpers'
import { removeSceneEntitiesInLayer } from './scene-entity-ownership'

type CesiumNS = typeof import('cesium')
export type FrustumGeometry = {
  compactBase: import('cesium').Cartesian3[]
  expandedBase: import('cesium').Cartesian3[]
  compactRays: import('cesium').Cartesian3[]
  expandedRays: import('cesium').Cartesian3[]
  compactFaces: import('cesium').Cartesian3[][]
  expandedFaces: import('cesium').Cartesian3[][]
}

interface SyncCaptureEntitiesParams {
  viewer: Viewer
  Cesium: CesiumNS
  mission: StudioMission
  focusedPhotoWaypointId: string | null
  showPhotoMarkers: boolean
  showCameraFootprint: boolean
  footprintOpacity: number
}

/** Rebuilds photo frustums and ground footprints in the capture layer. */
export function syncCaptureEntities({ viewer, Cesium, mission, focusedPhotoWaypointId, showPhotoMarkers, showCameraFootprint, footprintOpacity }: SyncCaptureEntitiesParams): Map<string, FrustumGeometry> {
  const geoOrigin = missionOrigin(mission)
  const frustumGeomMap = new Map<string, FrustumGeometry>()
  removeSceneEntitiesInLayer(viewer.entities, 'capture')
    const routes = getMissionRoutes(mission)
    for (const waypoint of mission.waypoints) {
      const photos = waypoint.actions.filter((action) => action.kind === 'photo')
      if (photos.length === 0) continue
      const geo = enuToLngLat(waypoint.x, waypoint.y, geoOrigin)
      const routeId = waypoint.routeId ?? routes[0]?.id
      const photoWaypoints = waypoint.generatedByArea
        ? mission.waypoints.filter((item) => item.generatedByArea === waypoint.generatedByArea).sort((a, b) => a.seq - b.seq)
        : getMissionRouteWaypoints(mission, routeId ?? '')
      const index = photoWaypoints.findIndex((item) => item.id === waypoint.id)
      const next = photoWaypoints[index + 1]
      const prior = photoWaypoints[index - 1]
      const dx = next ? next.x - waypoint.x : prior ? waypoint.x - prior.x : 0
      const dy = next ? next.y - waypoint.y : prior ? waypoint.y - prior.y : 1
      const length = Math.max(0.001, Math.hypot(dx, dy))
      const forwardX = dx / length
      const forwardY = dy / length
      const pitchDeg = photos[0].gimbalPitchDeg ?? mission.areas.find((item) => item.id === waypoint.generatedByArea)?.reconnaissance?.gimbalPitchDeg ?? routes.find((item) => item.id === routeId)?.reconnaissance?.gimbalPitchDeg ?? -65
      const selectedPhoto = focusedPhotoWaypointId === waypoint.id
      const showThisPhotoMarker = showPhotoMarkers
        && (focusedPhotoWaypointId === null || selectedPhoto)
      const footprintEnu = projectMockReconFootprintToGround(waypoint, { x: forwardX, y: forwardY }, pitchDeg)
      const footprintGround = footprintEnu?.map((point) => {
        const ground = enuToLngLat(point.x, point.y, geoOrigin)
        // Match the selected-photo projection while lifting it clear of the ground.
        return Cesium.Cartesian3.fromDegrees(ground.lng, ground.lat, MOCK_FOOTPRINT_RENDER_LIFT_M)
      }) ?? null
      if (showThisPhotoMarker && footprintGround) {
        // Keep the ground footprint visually distinct from the red frustum.
        const hoverColor = Cesium.Color.fromCssColorString('#25d885')
        viewer.entities.add({
          id: `ms-photo-hover-footprint-${waypoint.id}`,
          show: selectedPhoto,
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(footprintGround),
            perPositionHeight: true,
            material: hoverColor.withAlpha(0.32),
            outline: true,
            outlineColor: hoverColor.withAlpha(0.92)
          }
        })
      }
      if (showThisPhotoMarker && selectedPhoto) {
        frustumGeomMap.set(waypoint.id, {
          compactBase: [],
          expandedBase: [],
          compactRays: [],
          expandedRays: [],
          compactFaces: [],
          expandedFaces: []
        })
      }
      if (showThisPhotoMarker && !selectedPhoto) {
        /* Planner-style wireframe camera (map-3d-layers photo frustums):
           base rectangle + four rays from the capture pose, plus four
           translucent side faces so the sensor reads as a volume. Compact
           depth follows Planner's altitude-scaled formula (expanded is the
           hover size); direction follows the route with the resolved gimbal
           pitch. Cyan matches Planner's photoCamera overlay (owner
           direction; Cesium takes Cesium.Color, not CSS tokens). */
        const buildFrustum = (depth: number) => {
          const pitch = pitchDeg * Math.PI / 180
          const cosPitch = Math.cos(pitch)
          const sinPitch = Math.sin(pitch)
          const halfImageSpan = depth * MOCK_RECON_CAMERA_PROFILE.sensorWidthMm / (2 * MOCK_RECON_CAMERA_PROFILE.focalLengthMm)
          const origin = Cesium.Cartesian3.fromDegrees(geo.lng, geo.lat, waypoint.z)
          /* Build the image plane perpendicular to the camera boresight.
             Pitch is negative downward: at -90° the plane is horizontal, and
             at 0° it is vertical. The prior construction kept the image plane
             vertical at every pitch, which made nadir cameras look edge-on. */
          const boresight = {
            x: forwardX * cosPitch,
            y: forwardY * cosPitch,
            z: sinPitch
          }
          const right = { x: forwardY, y: -forwardX, z: 0 }
          const imageUp = {
            x: -forwardX * sinPitch,
            y: -forwardY * sinPitch,
            z: cosPitch
          }
          const center = {
            x: waypoint.x + boresight.x * depth,
            y: waypoint.y + boresight.y * depth,
            z: waypoint.z + boresight.z * depth
          }
          const pointOnImagePlane = (rightSign: number, upSign: number) => {
            const x = center.x + right.x * halfImageSpan * rightSign + imageUp.x * halfImageSpan * upSign
            const y = center.y + right.y * halfImageSpan * rightSign + imageUp.y * halfImageSpan * upSign
            const z = Math.max(0.5, center.z + imageUp.z * halfImageSpan * upSign)
            const position = enuToLngLat(x, y, geoOrigin)
            return Cesium.Cartesian3.fromDegrees(position.lng, position.lat, z)
          }
          const base = [
            pointOnImagePlane(-1, -1),
            pointOnImagePlane(1, -1),
            pointOnImagePlane(1, 1),
            pointOnImagePlane(-1, 1)
          ]
          const rays = base.flatMap((corner) => [origin, corner])
          return { origin, base, rays }
        }
        const compactDepth = Math.max(1.2, Math.min(4.5, Math.abs(waypoint.z) * 0.035))
        const compact = buildFrustum(compactDepth)
        const expanded = footprintGround
          ? {
              base: footprintGround,
              rays: footprintGround.flatMap((corner) => [compact.origin, corner])
            }
          : buildFrustum(Math.max(6, Math.min(24, Math.abs(waypoint.z) * 0.16)))
        const facesFor = (base: import('cesium').Cartesian3[]) =>
          base.map((corner, face) => [compact.origin, corner, base[(face + 1) % base.length]])
        const compactFaces = facesFor(compact.base)
        const expandedFaces = facesFor(expanded.base)
        frustumGeomMap.set(waypoint.id, {
          compactBase: compact.base,
          expandedBase: expanded.base,
          compactRays: compact.rays,
          expandedRays: expanded.rays,
          compactFaces,
          expandedFaces
        })
        const frustumColor = Cesium.Color.fromCssColorString('#68d7e2').withAlpha(0.92)
        viewer.entities.add({
          id: `ms-photo-base-${waypoint.id}`,
          polyline: {
            positions: [...compact.base, compact.base[0]],
            width: 1.8,
            material: frustumColor,
            arcType: Cesium.ArcType.NONE
          }
        })
        viewer.entities.add({
          id: `ms-photo-rays-${waypoint.id}`,
          polyline: {
            positions: compact.rays,
            width: 1.8,
            material: frustumColor,
            arcType: Cesium.ArcType.NONE
          }
        })
        for (let face = 0; face < 4; face += 1) {
          viewer.entities.add({
            id: `ms-photo-face-${waypoint.id}-${face}`,
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(compactFaces[face]),
              perPositionHeight: true,
              material: Cesium.Color.fromCssColorString('#68d7e2').withAlpha(0.16)
            }
          })
        }
      }
      if (showThisPhotoMarker && selectedPhoto && footprintGround) {
        const origin = Cesium.Cartesian3.fromDegrees(geo.lng, geo.lat, waypoint.z)
        const red = Cesium.Color.fromCssColorString('#ea4335').withAlpha(0.96)
        footprintGround.forEach((corner, index) => {
          viewer.entities.add({
            id: `ms-photo-focus-ray-${waypoint.id}-${index}`,
            polyline: {
              positions: [origin, corner],
              width: 2.4,
              material: red,
              arcType: Cesium.ArcType.NONE
            }
          })
          viewer.entities.add({
            id: `ms-photo-focus-face-${waypoint.id}-${index}`,
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy([origin, corner, footprintGround[(index + 1) % footprintGround.length]]),
              perPositionHeight: true,
              material: red.withAlpha(0.1)
            }
          })
        })
        viewer.entities.add({
          id: `ms-photo-focus-ground-${waypoint.id}`,
          polyline: {
            positions: [...footprintGround, footprintGround[0]],
            width: 2.4,
            material: red,
            arcType: Cesium.ArcType.NONE
          }
        })
      }
      if (!showCameraFootprint || !footprintGround) continue
      viewer.entities.add({
        id: `ms-camera-footprint-${waypoint.id}`,
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(footprintGround),
          perPositionHeight: true,
          material: Cesium.Color.fromCssColorString('#25d885').withAlpha(Math.max(0, Math.min(100, footprintOpacity)) / 100),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#16a96c')
        }
      })
    }
  return frustumGeomMap
}
