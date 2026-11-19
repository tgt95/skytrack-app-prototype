import type { Viewer } from 'cesium'
import { getMissionStart, missionOrigin, type StudioMission } from '@/domain/mission-model'
import { samplePlan, type SimPlan } from '@/features/simulation/simulation'
import { enuToLngLat } from './mission-scene-helpers'
import type { MissionSceneHandle } from './mission-scene-types'
import { fitMission } from './scene-camera-gestures'

type CesiumNS = typeof import('cesium')
type MutableRef<T> = { current: T }

interface MissionSceneHandleArgs {
  viewerRef: MutableRef<Viewer | null>
  cesiumRef: MutableRef<CesiumNS | null>
  fitRef: MutableRef<typeof fitMission>
  missionRef: MutableRef<StudioMission>
  planRef: MutableRef<SimPlan | null>
  reducedRef: MutableRef<boolean>
  clockRef: { current: number }
  topDownRef: MutableRef<() => void>
  zdragRef: MutableRef<{ id: string; startY: number; startZ: number } | null>
  wpDragRef: MutableRef<unknown>
  pendingDragRef: MutableRef<unknown>
  editControlsRef: MutableRef<{ hasActiveEditDrag(): boolean; escAbortEdits(): void } | null>
  abortPendingDrag: () => void
  abortWpDrag: () => void
  abortZdrag: () => void
}

export function createMissionSceneHandle({ viewerRef, cesiumRef, fitRef, missionRef, planRef, reducedRef, clockRef, topDownRef, zdragRef, wpDragRef, pendingDragRef, editControlsRef, abortPendingDrag, abortWpDrag, abortZdrag }: MissionSceneHandleArgs): MissionSceneHandle {
  return {
    getCameraHeading: () => {
      const viewer = viewerRef.current
      return viewer && !viewer.isDestroyed() ? viewer.camera.heading : 0
    },
    getWindScreenVector: (azimuthDeg, elevationDeg) => {
      const viewer = viewerRef.current
      const Cesium = cesiumRef.current
      if (!viewer || !Cesium || viewer.isDestroyed()) return null

      const { scene, camera, canvas } = viewer
      const center = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2)
      const ray = camera.getPickRay(center)
      const anchor = ray ? scene.globe.pick(ray, scene) : undefined
      const ground = anchor ?? camera.pickEllipsoid(center, scene.globe.ellipsoid)
      if (!ground) return null

      const azimuth = Cesium.Math.toRadians(azimuthDeg)
      const elevation = Cesium.Math.toRadians(elevationDeg)
      const horizontal = Math.cos(elevation)
      const localWind = Cesium.Cartesian3.fromElements(
        horizontal * Math.cos(azimuth),
        horizontal * Math.sin(azimuth),
        Math.sin(elevation),
      )
      const sampleDistanceM = 25
      Cesium.Cartesian3.multiplyByScalar(localWind, sampleDistanceM, localWind)

      const enuFrame = Cesium.Transforms.eastNorthUpToFixedFrame(ground, scene.globe.ellipsoid)
      const worldWind = Cesium.Matrix4.multiplyByPointAsVector(
        enuFrame,
        localWind,
        new Cesium.Cartesian3(),
      )
      const windPoint = Cesium.Cartesian3.add(ground, worldWind, new Cesium.Cartesian3())
      const start = scene.cartesianToCanvasCoordinates(ground)
      const end = scene.cartesianToCanvasCoordinates(windPoint)
      if (!start || !end || !Number.isFinite(start.x) || !Number.isFinite(start.y) || !Number.isFinite(end.x) || !Number.isFinite(end.y)) return null

      return {
        x: (end.x - start.x) / sampleDistanceM,
        y: (end.y - start.y) / sampleDistanceM,
      }
    },
    subscribeCameraChanged: (listener) => {
      const viewer = viewerRef.current
      if (!viewer || viewer.isDestroyed()) return () => undefined
      return viewer.camera.changed.addEventListener(listener)
    },
    downloadMapImage: () => {
      const viewer = viewerRef.current
      const Cesium = cesiumRef.current
      if (!viewer || !Cesium || viewer.isDestroyed()) return false

      const previousBackground = viewer.scene.backgroundColor.clone()
      const imageCanvas: { current: HTMLCanvasElement | null } = { current: null }
      let removePostRender: (() => void) | undefined
      try {
        // Capture Cesium's scene canvas only. DOM controls and review markup stay out.
        viewer.scene.backgroundColor = Cesium.Color.TRANSPARENT
        removePostRender = viewer.scene.postRender.addEventListener(() => {
          const canvas = document.createElement('canvas')
          canvas.width = viewer.canvas.width
          canvas.height = viewer.canvas.height
          const context = canvas.getContext('2d')
          if (context) {
            context.drawImage(viewer.canvas, 0, 0)
            imageCanvas.current = canvas
          }
          removePostRender?.()
        })
        viewer.scene.requestRender()
        viewer.render()
        if (!imageCanvas.current) return false

        const link = document.createElement('a')
        const safeName = (missionRef.current.name || 'mission')
          .replace(/[<>:"/\\|?*]/g, '-')
          .replace(/\s+/g, ' ')
          .trim()
        link.download = `${safeName || 'mission'}-map.png`
        link.href = imageCanvas.current.toDataURL('image/png')
        document.body.append(link)
        try {
          link.click()
        } finally {
          link.remove()
        }
        return true
      } catch {
        return false
      } finally {
        removePostRender?.()
        viewer.scene.backgroundColor = previousBackground
        viewer.scene.requestRender()
      }
    },
    resetCamera: () => {
      const viewer = viewerRef.current
      const Cesium = cesiumRef.current
      if (viewer && Cesium && !viewer.isDestroyed()) fitRef.current(viewer, Cesium, missionRef.current)
    },
    focusVehicle: () => {
      const viewer = viewerRef.current
      const Cesium = cesiumRef.current
      if (!viewer || !Cesium || viewer.isDestroyed()) return
      const p = planRef.current
      let gx: number
      let gy: number
      let gz: number
      if (p) {
        const t = reducedRef.current ? Math.floor(clockRef.current) : clockRef.current
        const s = samplePlan(p, t)
        gx = s.pos.x
        gy = s.pos.y
        gz = s.pos.z
      } else {
        const start = getMissionStart(missionRef.current)
        gx = start.x
        gy = start.y
        gz = Math.max(start.z, 0.5)
      }
      const g = enuToLngLat(gx, gy, missionOrigin(missionRef.current))
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, gz + 55),
        orientation: { heading: 0, pitch: -Math.PI / 2.6, roll: 0 },
        duration: reducedRef.current ? 0 : 0.9
      })
      viewer.scene.requestRender()
    },
    focusPoint: (pt) => {
      const viewer = viewerRef.current
      const Cesium = cesiumRef.current
      if (!viewer || !Cesium || viewer.isDestroyed()) return
      const g = enuToLngLat(pt.x, pt.y, missionOrigin(missionRef.current))
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, pt.z + 45),
        orientation: { heading: 0, pitch: -Math.PI / 2.8, roll: 0 },
        duration: reducedRef.current ? 0 : 0.9
      })
      viewer.scene.requestRender()
    },
    flyToLocation: ({ latitude, longitude }) => {
      const viewer = viewerRef.current
      const Cesium = cesiumRef.current
      if (!viewer || !Cesium || viewer.isDestroyed()) return
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 2400),
        orientation: { heading: 0, pitch: -Math.PI / 3, roll: 0 },
        duration: reducedRef.current ? 0 : 1
      })
      viewer.scene.requestRender()
    },
    zoomBy: (factor) => {
      const viewer = viewerRef.current
      if (!viewer || viewer.isDestroyed()) return
      const dist = viewer.camera.positionCartographic?.height ?? 200
      viewer.camera.zoomIn(dist * 0.25 * factor)
      viewer.scene.requestRender()
    },
    snapTopDown: () => {
      topDownRef.current()
    },
    isEditDragActive: () => editControlsRef.current?.hasActiveEditDrag() ?? (zdragRef.current !== null || wpDragRef.current !== null || pendingDragRef.current !== null),
    cancelEditDrag: () => {
      const controls = editControlsRef.current
      if (controls) {
        controls.escAbortEdits()
        return
      }
      abortPendingDrag()
      abortWpDrag()
      abortZdrag()
    }
  }
}
