import type { Viewer } from 'cesium'
import type { StudioMission } from '../../domain/mission-model'
import { missionOrigin } from '../../domain/mission-model'
import { enuToLngLat, safeColor, themeColor, type SceneToken } from './mission-scene-helpers'
import { WORLD_TERRAIN_FIXTURES } from './world-terrain-fixtures'

type CesiumNS = typeof import('cesium')
export type WorldTerrainTriangle = readonly [import('cesium').Cartesian3, import('cesium').Cartesian3, import('cesium').Cartesian3]

/** Rebuilds the committed World surface and local grid. */
export function syncWorldTerrain(viewer: Viewer, Cesium: CesiumNS, mission: StudioMission): WorldTerrainTriangle[] {
  const origin = missionOrigin(mission)
  const cssColor = (varName: SceneToken, alpha: number): import('cesium').Color =>
    safeColor(Cesium, themeColor(varName), varName, alpha)
  const worldTerrainTriangles: WorldTerrainTriangle[] = []
    // Ground grid (mock studio floor): two alternating-direction strips.
    // Alternating keeps every connector to a 10 m edge tick; a naive
    // pair-per-line strip draws long frame-crossing diagonals, and many
    // per-line entities starved primitive construction (see handback).
    const strip = (horiz: boolean): import('cesium').Cartesian3[] => {
      const pts: import('cesium').Cartesian3[] = []
      let flip = false
      const at = (g: number): [number, number, number, number] =>
        horiz
          ? [flip ? 120 : -120, g, flip ? -120 : 120, g]
          : [g, flip ? 120 : -120, g, flip ? -120 : 120]
      for (let g = -120; g <= 120; g += 10) {
        const [x1, y1, x2, y2] = at(g)
        const a = enuToLngLat(x1, y1, origin)
        const b = enuToLngLat(x2, y2, origin)
        pts.push(Cesium.Cartesian3.fromDegrees(a.lng, a.lat, 0.05))
        pts.push(Cesium.Cartesian3.fromDegrees(b.lng, b.lat, 0.05))
        flip = !flip
      }
      return pts
    }
    if (mission.worldType !== '2D' && mission.world === 'Blank space') {
      const gridMat = cssColor('--muted-foreground', 0.22)
      viewer.entities.add({
        id: 'ms-grid-x',
        polyline: { positions: strip(true), width: 1, material: gridMat, arcType: Cesium.ArcType.NONE }
      })
      viewer.entities.add({
        id: 'ms-grid-y',
        polyline: { positions: strip(false), width: 1, material: gridMat, arcType: Cesium.ArcType.NONE }
      })
    }

    // Non-blank legacy 3D Worlds use local hard-coded elevation fixtures.
    // Sample only the current globe terrain when available; ellipsoid-only
    // scenes fall back to zero. This keeps synthetic relief above the visible
    // ground without installing or requesting a terrain provider.
    if (mission.worldType !== '2D' && mission.world !== 'Blank space') {
      const terrain = WORLD_TERRAIN_FIXTURES[mission.world]
      const rows = terrain?.elevationsM
      const rowCount = rows?.length ?? 0
      const columnCount = rows?.[0]?.length ?? 0
      if (terrain && rowCount > 1 && columnCount > 1 && rows?.every((row) => row.length === columnCount)) {
        const maxElevation = Math.max(...rows.flat())
        const terrainTint = safeColor(Cesium, terrain.tint, '--muted-foreground', 1)
        const lowTint = Cesium.Color.fromCssColorString('#456e54')
        const highTint = Cesium.Color.fromCssColorString('#dfb66d')
        const centerX = mission.spawn.x - ((columnCount - 1) * terrain.sampleSpacingM) / 2
        const centerY = mission.spawn.y - ((rowCount - 1) * terrain.sampleSpacingM) / 2
        // Keep the relief inside the default overview camera frustum. Values
        // are relative to the local surface, not absolute altitude.
        const verticalScale = 2
        const vertexPositions = rows.map((samples, rowIndex) => samples.map((relativeHeight, columnIndex) => {
          const x = centerX + columnIndex * terrain.sampleSpacingM
          const y = centerY + (rowCount - 1 - rowIndex) * terrain.sampleSpacingM
          const geo = enuToLngLat(x, y, origin)
          const sampledGround = viewer.scene.globe.getHeight(Cesium.Cartographic.fromDegrees(geo.lng, geo.lat)) ?? 0
          const height = Math.max(0, sampledGround) + 3 + relativeHeight * verticalScale
          return Cesium.Cartesian3.fromDegrees(geo.lng, geo.lat, height)
        }))
        for (let row = 0; row < rowCount - 1; row += 1) {
          for (let column = 0; column < columnCount - 1; column += 1) {
            const corners = [
              vertexPositions[row + 1][column],
              vertexPositions[row + 1][column + 1],
              vertexPositions[row][column + 1],
              vertexPositions[row][column]
            ]
            worldTerrainTriangles.push(
              [corners[0], corners[1], corners[2]],
              [corners[0], corners[2], corners[3]]
            )
            const relativeHeights = [rows[row + 1][column], rows[row + 1][column + 1], rows[row][column + 1], rows[row][column]]
            const cellMean = relativeHeights.reduce((sum, value) => sum + value, 0) / relativeHeights.length
            const intensity = maxElevation > 0 ? cellMean / maxElevation : 0
            const material = Cesium.Color.lerp(lowTint, highTint, Math.max(0, Math.min(1, intensity)), new Cesium.Color())
            const cellTint = Cesium.Color.lerp(material, terrainTint, 0.12, new Cesium.Color()).withAlpha(0.48)
            viewer.entities.add({
              id: `ms-world-terrain-${row}-${column}`,
              name: `${terrain.label} elevation surface`,
              description: terrain.description,
              polygon: {
                hierarchy: new Cesium.PolygonHierarchy(corners),
                perPositionHeight: true,
                material: cellTint,
                outline: false
              }
            })
          }
        }
        // Elevation-following grid makes the synthetic slopes readable from
        // the normal oblique camera. Polylines also avoid translucent seams
        // between independently triangulated cell polygons.
        const contourColor = terrainTint.withAlpha(0.9)
        for (let row = 0; row < rowCount; row += 1) {
          viewer.entities.add({
            id: `ms-world-terrain-row-${row}`,
            name: `${terrain.label} elevation contour`,
            polyline: { positions: vertexPositions[row], width: 2, material: contourColor, arcType: Cesium.ArcType.NONE }
          })
        }
        for (let column = 0; column < columnCount; column += 1) {
          viewer.entities.add({
            id: `ms-world-terrain-column-${column}`,
            name: `${terrain.label} elevation contour`,
            polyline: { positions: vertexPositions.map((row) => row[column]), width: 2, material: contourColor, arcType: Cesium.ArcType.NONE }
          })
        }
      }
    }

  return worldTerrainTriangles
}
