import type { HeightmapTerrainData, TerrainProvider, Viewer } from "cesium";
import type { MissionTerrainLayer } from "@/domain/mission-model";

type CesiumNS = typeof import("cesium");

const MAX_IMPORTED_TERRAIN_LEVEL = 20;
const TILE_HEIGHTMAP_SIZE = 65;

interface ActiveTerrainProvider {
  layer: MissionTerrainLayer;
  provider: TerrainProvider;
  previous: TerrainProvider;
}

const activeTerrainProviders = new WeakMap<Viewer, ActiveTerrainProvider>();

function terrainRectangle(Cesium: CesiumNS, layer: MissionTerrainLayer) {
  const [west, south, east, north] = layer.bbox;
  return Cesium.Rectangle.fromDegrees(west, south, east, north);
}

function sampleHeight(
  layer: MissionTerrainLayer,
  rectangle: import("cesium").Rectangle,
  longitude: number,
  latitude: number,
) {
  const { west, east, south, north } = rectangle;
  if (
    longitude < west ||
    longitude > east ||
    latitude < south ||
    latitude > north
  ) {
    return layer.baseElevationM;
  }

  const last = layer.gridSize - 1;
  const column = ((longitude - west) / (east - west)) * last;
  const row = ((north - latitude) / (north - south)) * last;
  const column0 = Math.min(last, Math.floor(column));
  const row0 = Math.min(last, Math.floor(row));
  const column1 = Math.min(last, column0 + 1);
  const row1 = Math.min(last, row0 + 1);
  const columnWeight = column - column0;
  const rowWeight = row - row0;
  const at = (sampleRow: number, sampleColumn: number) =>
    layer.elevationsM[sampleRow * layer.gridSize + sampleColumn];
  const northHeight =
    at(row0, column0) * (1 - columnWeight) + at(row0, column1) * columnWeight;
  const southHeight =
    at(row1, column0) * (1 - columnWeight) + at(row1, column1) * columnWeight;
  const relativeHeight =
    northHeight * (1 - rowWeight) + southHeight * rowWeight;
  const metersPerDegreeLongitude =
    111_320 * Math.cos((latitude * Math.PI) / 180);
  const edgeDistanceM = Math.min(
    (longitude - west) * metersPerDegreeLongitude,
    (east - longitude) * metersPerDegreeLongitude,
    (latitude - south) * 111_320,
    (north - latitude) * 111_320,
  );
  const gridSpacingM = layer.widthM / (layer.gridSize - 1);
  const fadeDistanceM = Math.max(1, layer.sourceResolutionM ?? gridSpacingM);
  const edgeRatio = Math.max(0, Math.min(1, edgeDistanceM / fadeDistanceM));
  const edgeBlend = edgeRatio * edgeRatio * (3 - 2 * edgeRatio);
  return layer.baseElevationM + relativeHeight * edgeBlend;
}

function createImportedTerrainProvider(
  Cesium: CesiumNS,
  layer: MissionTerrainLayer,
  ellipsoid: import("cesium").Ellipsoid,
): TerrainProvider {
  const coverage = terrainRectangle(Cesium, layer);

  class ImportedTerrainProvider extends Cesium.EllipsoidTerrainProvider {
    constructor() {
      super({
        tilingScheme: new Cesium.GeographicTilingScheme({ ellipsoid }),
      });
    }

    requestTileGeometry(
      _x: number,
      _y: number,
      level: number,
    ): Promise<HeightmapTerrainData> {
      const rectangle = this.tilingScheme.tileXYToRectangle(_x, _y, level);
      const buffer = new Float32Array(
        TILE_HEIGHTMAP_SIZE * TILE_HEIGHTMAP_SIZE,
      );
      for (let row = 0; row < TILE_HEIGHTMAP_SIZE; row += 1) {
        const latitude = Cesium.Math.lerp(
          rectangle.north,
          rectangle.south,
          row / (TILE_HEIGHTMAP_SIZE - 1),
        );
        for (let column = 0; column < TILE_HEIGHTMAP_SIZE; column += 1) {
          const longitude = Cesium.Math.lerp(
            rectangle.west,
            rectangle.east,
            column / (TILE_HEIGHTMAP_SIZE - 1),
          );
          buffer[row * TILE_HEIGHTMAP_SIZE + column] = sampleHeight(
            layer,
            coverage,
            longitude,
            latitude,
          );
        }
      }

      /* Continue the flat base terrain beyond local DEM coverage. Every child
         tile remains available, while sampleHeight returns baseElevationM for
         points outside the imported rectangle. */
      const childTileMask =
        level < MAX_IMPORTED_TERRAIN_LEVEL ? 0b1111 : 0;

      return Promise.resolve(
        new Cesium.HeightmapTerrainData({
          buffer,
          width: TILE_HEIGHTMAP_SIZE,
          height: TILE_HEIGHTMAP_SIZE,
          childTileMask,
        }),
      );
    }

    getTileDataAvailable(_x: number, _y: number, level: number) {
      return level <= MAX_IMPORTED_TERRAIN_LEVEL;
    }
  }

  return new ImportedTerrainProvider();
}

/** Use the imported elevation grid as the globe surface; uncovered tiles stay flat. */
export function syncMapSpaceTerrainProvider(
  viewer: Viewer,
  Cesium: CesiumNS,
  layer: MissionTerrainLayer | undefined,
) {
  const active = activeTerrainProviders.get(viewer);
  if (!layer) {
    if (active) {
      viewer.terrainProvider = active.previous;
      activeTerrainProviders.delete(viewer);
    }
    return;
  }
  if (active?.layer === layer) return;

  const previous = active?.previous ?? viewer.terrainProvider;
  const provider = createImportedTerrainProvider(
    Cesium,
    layer,
    viewer.scene.globe.ellipsoid,
  );
  viewer.terrainProvider = provider;
  activeTerrainProviders.set(viewer, { layer, provider, previous });
}
