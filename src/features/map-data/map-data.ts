import type {
  MissionMapBuilding,
  MissionMapLandmark,
  MissionMapSceneLayer,
  MissionMapTree,
  MissionTerrainLayer,
} from "@/domain/mission-model";

export type MapDataLayerType = "boundary" | "scene";
export type MapTerrainLayer = MissionTerrainLayer;
export interface MapSceneContentSummary {
  buildings: number;
  roads: number;
  water: number;
  trees: number;
  hasTextureMetadata: boolean;
}

export interface MapDataFileRecord {
  id: string;
  name: string;
  type: MapDataLayerType;
  size: number;
  featureCount: number;
  bbox: [west: number, south: number, east: number, north: number] | null;
  sceneSummary?: MapSceneContentSummary;
  content: string;
}

export interface MapDataPreflight {
  name: string;
  type: MapDataLayerType;
  size: number;
  featureCount: number;
  bbox: [west: number, south: number, east: number, north: number] | null;
  terrain: MapTerrainLayer | null;
  sceneLayer?: MissionMapSceneLayer | null;
  sceneSummary?: MapSceneContentSummary;
  content: string;
}

function parseSceneLayer(
  value: unknown,
  sourceFileName: string,
): MissionMapSceneLayer | null {
  if (!isRecord(value) || !isRecord(value.scene)) return null;
  const scene = value.scene;
  const center = scene.center;
  const bbox = scene.bbox;
  const widthM = scene.width;
  const sceneAxes = isRecord(scene.reference) ? scene.reference.axes : null;
  // MapSpace's second footprint coordinate is Z (positive toward the south).
  // Mission ENU uses positive Y toward the north, so convert that axis here.
  const northingSign =
    typeof sceneAxes === "string" && /\bZ\s+south\b/iu.test(sceneAxes) ? -1 : 1;
  if (
    !isRecord(center) ||
    typeof center.lat !== "number" ||
    !Number.isFinite(center.lat) ||
    typeof center.lon !== "number" ||
    !Number.isFinite(center.lon) ||
    Math.abs(center.lat) > 90 ||
    Math.abs(center.lon) > 180 ||
    !isGeographicBounds(bbox) ||
    typeof widthM !== "number" ||
    !Number.isFinite(widthM) ||
    widthM <= 0 ||
    !Array.isArray(scene.buildings)
  )
    return null;

  const buildings: MissionMapBuilding[] = [];
  for (const [index, rawBuilding] of scene.buildings.entries()) {
    if (!isRecord(rawBuilding) || !Array.isArray(rawBuilding.polygons))
      continue;
    const polygons = rawBuilding.polygons.flatMap((rawPolygon) => {
      if (!isRecord(rawPolygon) || !Array.isArray(rawPolygon.outer)) return [];
      const outer = rawPolygon.outer
        .filter(finitePair)
        .map(([x, south]) => [x, south * northingSign] as [number, number]);
      if (outer.length < 4) return [];
      const holes = Array.isArray(rawPolygon.holes)
        ? rawPolygon.holes
            .map((ring) =>
              Array.isArray(ring)
                ? ring
                    .filter(finitePair)
                    .map(
                      ([x, south]) =>
                        [x, south * northingSign] as [number, number],
                    )
                : [],
            )
            .filter((ring) => ring.length >= 4)
        : [];
      return [{ outer, holes }];
    });
    if (!polygons.length) continue;
    const heightM =
      typeof rawBuilding.height === "number" &&
      Number.isFinite(rawBuilding.height)
        ? Math.max(1, Math.min(1000, rawBuilding.height))
        : 10;
    const heightLabel =
      rawBuilding.heightLabel === "verified" ||
      rawBuilding.heightLabel === "estimated" ||
      rawBuilding.heightLabel === "review"
        ? rawBuilding.heightLabel
        : "unknown";
    buildings.push({
      id:
        typeof rawBuilding.id === "string"
          ? rawBuilding.id.slice(0, 128)
          : `building-${index + 1}`,
      name:
        typeof rawBuilding.name === "string"
          ? rawBuilding.name.slice(0, 160)
          : "",
      heightM,
      heightLabel,
      polygons,
    });
    if (buildings.length >= 5000) break;
  }
  const bundledModels = new Set([
    "bitexco.glb",
    "cau-rong.glb",
    "chua-mot-cot.glb",
    "dinh-doc-lap.glb",
    "landmark-81.glb",
    "nha-tho-duc-ba.glb",
    "thap-rua.glb",
  ]);
  const landmarks: MissionMapLandmark[] = (
    Array.isArray(scene.landmarks) ? scene.landmarks : []
  ).flatMap((rawLandmark, index) => {
    if (!isRecord(rawLandmark) || typeof rawLandmark.url !== "string")
      return [];
    const fileName =
      rawLandmark.url.split(/[?#]/u, 1)[0]?.split("/").at(-1) ?? "";
    if (!bundledModels.has(fileName)) return [];
    const xM = rawLandmark.x;
    const southM = rawLandmark.z;
    const rotationDeg = rawLandmark.rotation;
    const scale = rawLandmark.scale;
    const heightM = rawLandmark.height;
    const baseElevationM =
      typeof rawLandmark.baseY === "number" &&
      Number.isFinite(rawLandmark.baseY)
        ? rawLandmark.baseY
        : 0;
    if (
      typeof xM !== "number" ||
      !Number.isFinite(xM) ||
      typeof southM !== "number" ||
      !Number.isFinite(southM) ||
      typeof rotationDeg !== "number" ||
      !Number.isFinite(rotationDeg) ||
      typeof scale !== "number" ||
      !Number.isFinite(scale) ||
      scale <= 0 ||
      typeof heightM !== "number" ||
      !Number.isFinite(heightM) ||
      heightM <= 0
    )
      return [];
    return [
      {
        id:
          typeof rawLandmark.id === "string"
            ? rawLandmark.id.slice(0, 128)
            : `landmark-${index + 1}`,
        name:
          typeof rawLandmark.name === "string"
            ? rawLandmark.name.slice(0, 160)
            : "Imported landmark",
        localModelPath: `/demo-assets/mapspace/models/${fileName}`,
        xM,
        yM: southM * northingSign,
        baseElevationM,
        rotationDeg,
        scale: Math.min(100, scale),
        heightM: Math.min(2000, heightM),
        ...(typeof rawLandmark.attribution === "string"
          ? { attribution: rawLandmark.attribution.slice(0, 500) }
          : {}),
      },
    ];
  });
  const trees: MissionMapTree[] = (
    Array.isArray(scene.trees) ? scene.trees.slice(0, 2000) : []
  ).flatMap((rawTree, index) => {
    if (!isRecord(rawTree)) return [];
    const xM = rawTree.x;
    const southM = rawTree.z;
    const heightM = rawTree.h;
    const canopyRadiusM = rawTree.r;
    if (
      typeof xM !== "number" ||
      !Number.isFinite(xM) ||
      typeof southM !== "number" ||
      !Number.isFinite(southM) ||
      typeof heightM !== "number" ||
      !Number.isFinite(heightM) ||
      heightM <= 0 ||
      typeof canopyRadiusM !== "number" ||
      !Number.isFinite(canopyRadiusM) ||
      canopyRadiusM <= 0
    )
      return [];
    return [
      {
        id: `tree-${index + 1}`,
        xM,
        yM: southM * northingSign,
        heightM: Math.min(80, heightM),
        canopyRadiusM: Math.min(20, canopyRadiusM),
      },
    ];
  });
  if (!buildings.length && !landmarks.length && !trees.length) return null;
  return {
    sourceFileName,
    coordinateFrame: "mission-enu",
    center: { lat: center.lat, lon: center.lon },
    bbox: bbox as [number, number, number, number],
    widthM,
    horizontalReference:
      isRecord(scene.reference) && typeof scene.reference.crs === "string"
        ? scene.reference.crs
        : "Not declared",
    verticalReference: "unverified",
    buildings,
    landmarks,
    trees,
  };
}

export function parseMapSceneLayer(
  content: string,
  sourceFileName: string,
): MissionMapSceneLayer | null {
  try {
    return parseSceneLayer(JSON.parse(content) as unknown, sourceFileName);
  } catch {
    return null;
  }
}

const MAX_MAP_DATA_FILE_BYTES = 25_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGeographicBounds(
  value: unknown,
): value is [number, number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every(
      (entry) => typeof entry === "number" && Number.isFinite(entry),
    ) &&
    value[0] >= -180 &&
    value[2] <= 180 &&
    value[1] >= -90 &&
    value[3] <= 90 &&
    value[0] < value[2] &&
    value[1] < value[3]
  );
}

function finitePair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1])
  );
}

function featureCollection(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || value.type !== "FeatureCollection") return null;
  return Array.isArray(value.features) ? value : null;
}

function geometryBounds(
  value: unknown,
): [number, number, number, number] | null {
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  const visit = (node: unknown) => {
    if (!Array.isArray(node)) return;
    if (finitePair(node)) {
      const [lon, lat] = node;
      if (Math.abs(lon) > 180 || Math.abs(lat) > 90) return;
      bounds[0] = Math.min(bounds[0], lon);
      bounds[1] = Math.min(bounds[1], lat);
      bounds[2] = Math.max(bounds[2], lon);
      bounds[3] = Math.max(bounds[3], lat);
      return;
    }
    for (const child of node) visit(child);
  };
  visit(value);
  return bounds.every(Number.isFinite)
    ? (bounds as [number, number, number, number])
    : null;
}

function parseTerrain(
  value: unknown,
  sourceFileName: string,
): MapTerrainLayer | null {
  if (!isRecord(value) || !isRecord(value.scene)) return null;
  const scene = value.scene;
  const terrain = scene.terrain;
  const center = scene.center;
  const bbox = scene.bbox;
  const terrainRecord = isRecord(terrain) ? terrain : null;
  const size = terrainRecord?.size;
  const elevations = terrainRecord?.elevations;
  const baseElevation = terrainRecord?.baseElevation;
  const width = scene.width;
  if (
    !isRecord(center) ||
    typeof center.lat !== "number" ||
    !Number.isFinite(center.lat) ||
    Math.abs(center.lat) > 90 ||
    typeof center.lon !== "number" ||
    !Number.isFinite(center.lon) ||
    Math.abs(center.lon) > 180 ||
    !isGeographicBounds(bbox) ||
    typeof width !== "number" ||
    !Number.isFinite(width) ||
    width <= 0 ||
    typeof size !== "number" ||
    !Number.isInteger(size) ||
    size < 2 ||
    size > 512 ||
    !Array.isArray(elevations) ||
    elevations.length !== size * size ||
    !elevations.every(
      (entry) => typeof entry === "number" && Number.isFinite(entry),
    )
  ) {
    return null;
  }
  return {
    sourceFileName,
    center: { lat: center.lat, lon: center.lon },
    bbox: bbox as [number, number, number, number],
    widthM: width,
    gridSize: size,
    elevationsM: elevations as number[],
    baseElevationM:
      typeof baseElevation === "number" && Number.isFinite(baseElevation)
        ? baseElevation
        : 0,
    ...(typeof terrainRecord?.sourceResolutionM === "number" &&
    Number.isFinite(terrainRecord.sourceResolutionM) &&
    terrainRecord.sourceResolutionM > 0
      ? { sourceResolutionM: terrainRecord.sourceResolutionM }
      : {}),
    ...(typeof terrainRecord?.sourceName === "string"
      ? { sourceName: terrainRecord.sourceName.slice(0, 120) }
      : {}),
    horizontalReference:
      isRecord(scene.reference) && typeof scene.reference.crs === "string"
        ? scene.reference.crs
        : "Not declared",
    verticalReference: "unverified",
  };
}

export async function inspectMapDataFile(
  file: File,
): Promise<MapDataPreflight> {
  if (file.size > MAX_MAP_DATA_FILE_BYTES) {
    throw new Error(`${file.name} exceeds the 25 MB per-file limit.`);
  }
  if (!/\.(geojson|json)$/iu.test(file.name)) {
    throw new Error(`${file.name} is not a supported GeoJSON or JSON file.`);
  }
  const content = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`${file.name} is not valid JSON.`);
  }
  const collection = featureCollection(parsed);
  if (collection) {
    const features = collection.features as unknown[];
    const featureBounds = features.flatMap((feature) => {
      const geometry = isRecord(feature) ? feature.geometry : null;
      const bounds = geometryBounds(
        isRecord(geometry) ? geometry.coordinates : null,
      );
      return bounds ? [bounds] : [];
    });
    const bounds =
      featureBounds.length > 0
        ? featureBounds.reduce<[number, number, number, number]>(
            (extent, next) => [
              Math.min(extent[0], next[0]),
              Math.min(extent[1], next[1]),
              Math.max(extent[2], next[2]),
              Math.max(extent[3], next[3]),
            ],
            [Infinity, Infinity, -Infinity, -Infinity],
          )
        : geometryBounds(collection.bbox);
    if (!bounds)
      throw new Error(`${file.name} has no valid geographic coordinates.`);
    return {
      name: file.name,
      type: "boundary",
      size: file.size,
      featureCount: features.length,
      bbox: bounds,
      terrain: null,
      content,
    };
  }
  const terrain = parseTerrain(parsed, file.name);
  if (terrain) {
    const scene = (parsed as { scene?: Record<string, unknown> }).scene ?? {};
    const sceneLayer = parseSceneLayer(parsed, file.name);
    const count = (key: string) =>
      Array.isArray(scene[key]) ? (scene[key] as unknown[]).length : 0;
    const sceneSummary = {
      buildings: count("buildings"),
      roads: count("roads"),
      water: count("water"),
      trees: count("trees"),
      hasTextureMetadata: Boolean(scene.texture || scene.textures),
    };
    return {
      name: file.name,
      type: "scene",
      size: file.size,
      featureCount:
        sceneSummary.buildings +
        sceneSummary.roads +
        sceneSummary.water +
        sceneSummary.trees,
      bbox: terrain.bbox,
      terrain,
      sceneLayer,
      sceneSummary,
      content,
    };
  }
  throw new Error(
    `${file.name} is JSON, but has no supported MapSpace terrain grid or GeoJSON FeatureCollection.`,
  );
}

export async function loadBundledMapSpaceSample(): Promise<File[]> {
  const files = [
    ...[
      "sample-scene-landmark81.json",
      "sample-scene-bitexco.json",
      "sample-scene-cau-rong.json",
      "sample-scene-dinh-doc-lap.json",
      "sample-scene-nha-tho-duc-ba.json",
      "sample-scene-thap-rua.json",
      "sample-scene-chua-mot-cot.json",
    ].map(
      (name) =>
        [
          name,
          `/demo-assets/mapspace/data/${name}`,
          "application/json",
        ] as const,
    ),
    [
      "vietnam-provinces.geojson",
      "/demo-assets/mapspace/data/boundaries/vietnam-provinces.geojson",
      "application/geo+json",
    ],
  ] as const;
  return Promise.all(
    files.map(async ([name, url, type]) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Could not load bundled sample file ${name}.`);
      }
      return new File([await response.blob()], name, { type });
    }),
  );
}

export function mapDataFileSummary(files: readonly MapDataFileRecord[]) {
  return {
    boundaryCount: files.filter((file) => file.type === "boundary").length,
    featureCount: files.reduce((sum, file) => sum + file.featureCount, 0),
    terrainAvailable: files.some((file) => {
      try {
        return Boolean(parseTerrain(JSON.parse(file.content), file.name));
      } catch {
        return false;
      }
    }),
    buildingCount: files.reduce(
      (sum, file) =>
        sum +
        (parseMapSceneLayer(file.content, file.name)?.buildings.length ?? 0),
      0,
    ),
  };
}
