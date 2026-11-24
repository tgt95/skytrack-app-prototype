import { BoundingBox, GeoPackageAPI, setSqljsWasmLocateFile } from "@ngageoint/geopackage";
import { fromBlob } from "geotiff";
import { toProj4 } from "geotiff-geokeys-to-proj4";
import type { GeoKeys } from "geotiff-geokeys-to-proj4";
import proj4 from "proj4";
import sqlWasmUrl from "@ngageoint/geopackage/dist/sql-wasm.wasm?url";

const MAX_FEATURES = 5000;
const TERRAIN_GRID_SIZE = 256;
const MAX_RASTER_DIMENSION = 100_000;
const GEOJSON_TYPES = new Set(["Polygon", "MultiPolygon"]);
let geopackageReady: Promise<void> | null = null;

export interface NormalizedStandardMapData {
  content: string;
  type: "boundary" | "scene";
  featureCount: number;
  bbox: [number, number, number, number] | null;
  sceneSummary?: {
    buildings: number;
    roads: number;
    water: number;
    trees: number;
    hasTextureMetadata: boolean;
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function geographicPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1]) &&
    Math.abs(value[0]) <= 180 &&
    Math.abs(value[1]) <= 90
  );
}

function boundsOf(value: unknown): [number, number, number, number] | null {
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  const visit = (node: unknown) => {
    if (!Array.isArray(node)) return;
    if (geographicPair(node)) {
      bounds[0] = Math.min(bounds[0]!, node[0]);
      bounds[1] = Math.min(bounds[1]!, node[1]);
      bounds[2] = Math.max(bounds[2]!, node[0]);
      bounds[3] = Math.max(bounds[3]!, node[1]);
      return;
    }
    node.forEach(visit);
  };
  visit(value);
  return bounds.every(Number.isFinite) && bounds[0]! < bounds[2]! && bounds[1]! < bounds[3]!
    ? (bounds as [number, number, number, number])
    : null;
}

function asMeters(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*(m|meter|meters|ft|feet)?$/iu);
  if (!match) return null;
  const amount = Number(match[1]);
  return /^(ft|feet)$/iu.test(match[2] ?? "") ? amount * 0.3048 : amount;
}

function featureIsBuilding(feature: unknown): feature is Record<string, unknown> {
  if (!record(feature) || !record(feature.geometry) || !record(feature.properties)) return false;
  const kind = feature.geometry.type;
  const properties = feature.properties;
  const building = properties.building ?? properties["building:part"] ?? properties.building_part;
  return GEOJSON_TYPES.has(String(kind)) && building !== undefined && building !== null && building !== false && building !== "no";
}

function geometryPolygons(geometry: Record<string, unknown>): unknown[][][] {
  const coordinates = geometry.coordinates;
  if (!Array.isArray(coordinates)) return [];
  return geometry.type === "Polygon"
    ? [coordinates as unknown[][]]
    : geometry.type === "MultiPolygon"
      ? (coordinates as unknown[][][])
      : [];
}

function normalizeVector(collection: unknown, sourceFileName: string): NormalizedStandardMapData {
  if (!record(collection) || collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
    throw new Error(`${sourceFileName} must contain a GeoJSON FeatureCollection.`);
  }
  const features = collection.features;
  const bounds = boundsOf(features.flatMap((feature) =>
    record(feature) && record(feature.geometry) ? [feature.geometry.coordinates] : [],
  ));
  if (!bounds) throw new Error(`${sourceFileName} has no valid WGS 84 longitude/latitude coordinates.`);

  const buildings = features.filter(featureIsBuilding).slice(0, MAX_FEATURES).flatMap((feature, index) => {
    const properties = feature.properties as Record<string, unknown>;
    const polygons = geometryPolygons(feature.geometry as Record<string, unknown>).flatMap((rings) => {
      const outer = rings[0];
      if (!Array.isArray(outer) || outer.length < 4 || !outer.every(geographicPair)) return [];
      const holes = rings.slice(1).filter((ring) => Array.isArray(ring) && ring.length >= 4 && ring.every(geographicPair));
      return [{ outer, holes }];
    });
    if (!polygons.length) return [];
    const directHeight = asMeters(properties.height ?? properties["building:height"] ?? properties.height_m);
    const levels = asMeters(properties["building:levels"] ?? properties.levels);
    const measuredHeight = directHeight ?? (levels === null ? null : levels * 3);
    const idValue = feature.id ?? properties.id ?? properties.osm_id;
    const name = properties.name ?? properties["name:en"] ?? "";
    return [{
      id: typeof idValue === "string" || typeof idValue === "number" ? String(idValue).slice(0, 128) : `building-${index + 1}`,
      name: typeof name === "string" ? name.slice(0, 160) : "",
      height: measuredHeight ?? 10,
      heightLabel: directHeight !== null ? "review" : levels !== null ? "estimated" : "unknown",
      polygons: polygons.map((polygon) => ({
        outer: polygon.outer.map((coordinate) => {
          const [lon, lat] = coordinate as [number, number];
          return [Math.round((lon - (bounds[0] + bounds[2]) / 2) * 111_320 * Math.cos(((bounds[1] + bounds[3]) / 2 * Math.PI) / 180) * 100) / 100,
            Math.round((lat - (bounds[1] + bounds[3]) / 2) * 111_320 * 100) / 100];
        }),
        holes: polygon.holes.map((ring) => ring.map((coordinate) => {
          const [lon, lat] = coordinate as [number, number];
          return [Math.round((lon - (bounds[0] + bounds[2]) / 2) * 111_320 * Math.cos(((bounds[1] + bounds[3]) / 2 * Math.PI) / 180) * 100) / 100,
            Math.round((lat - (bounds[1] + bounds[3]) / 2) * 111_320 * 100) / 100];
        })),
      })),
    }];
  });

  if (!buildings.length) {
    return { content: JSON.stringify(collection), type: "boundary", featureCount: features.length, bbox: bounds };
  }
  const center = { lon: (bounds[0] + bounds[2]) / 2, lat: (bounds[1] + bounds[3]) / 2 };
  const widthM = Math.max(1, 111_320 * Math.cos((center.lat * Math.PI) / 180) * (bounds[2] - bounds[0]));
  const heightM = Math.max(1, 111_320 * (bounds[3] - bounds[1]));
  const scene = {
    center,
    bbox: bounds,
    width: Math.max(widthM, heightM),
    reference: { crs: "OGC:CRS84; local geometry in mission ENU" },
    buildings,
  };
  return {
    content: JSON.stringify({ scene }),
    type: "scene",
    featureCount: features.length,
    bbox: bounds,
    sceneSummary: { buildings: buildings.length, roads: 0, water: 0, trees: 0, hasTextureMetadata: false },
  };
}

export function normalizeGeoJSON(content: string, sourceFileName: string): NormalizedStandardMapData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    throw new Error(`${sourceFileName} is not valid GeoJSON.`);
  }
  return normalizeVector(parsed, sourceFileName);
}

async function openGeoPackage(): Promise<void> {
  geopackageReady ??= (async () => {
    setSqljsWasmLocateFile(() => sqlWasmUrl);
  })();
  await geopackageReady;
}

export async function normalizeGeoPackage(file: File): Promise<NormalizedStandardMapData> {
  await openGeoPackage();
  let packageFile: Awaited<ReturnType<typeof GeoPackageAPI.open>> | null = null;
  try {
    packageFile = await GeoPackageAPI.open(new Uint8Array(await file.arrayBuffer()));
    const features: unknown[] = [];
    for (const table of packageFile.getFeatureTables()) {
      const dao = packageFile.getFeatureDao(table);
      if (!dao.isIndexed()) await dao.index();
      const iterator = dao.queryForGeoJSONIndexedFeaturesWithBoundingBox(
        new BoundingBox(-180, 180, -90, 90),
      );
      for (const feature of iterator) {
        features.push(feature);
        if (features.length >= MAX_FEATURES * 4) break;
      }
      if (features.length >= MAX_FEATURES * 4) break;
    }
    if (!features.length) throw new Error(`${file.name} contains no readable feature layers.`);
    return normalizeVector({ type: "FeatureCollection", features }, file.name);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(file.name)) throw error;
    throw new Error(`${file.name} could not be read as a GeoPackage. Check that it contains a valid feature layer and coordinate reference system.`);
  } finally {
    packageFile?.close();
  }
}

function gdalMetadataItem(
  image: { fileDirectory: { toObject: () => Record<string, unknown> } },
  name: string,
): string | null {
  const metadata = String(image.fileDirectory.toObject().GDAL_METADATA ?? "");
  const match = metadata.match(new RegExp(`<Item[^>]*name=["']${name}["'][^>]*>([^<]+)</Item>`, "iu"));
  return match?.[1]?.trim().replace(/\0/gu, "") ?? null;
}

function parseGdalScaleOffset(image: { fileDirectory: { toObject: () => Record<string, unknown> } }): { scale: number; offset: number } {
  const item = (name: string) => {
    const value = gdalMetadataItem(image, name);
    const number = value === null ? NaN : Number(value);
    return Number.isFinite(number) ? number : null;
  };
  return { scale: item("scale") ?? 1, offset: item("offset") ?? 0 };
}

function fillMissingValues(values: number[], size: number): number[] {
  for (let row = 0; row < size; row++) {
    const start = row * size;
    let last: number | null = null;
    for (let col = 0; col < size; col++) {
      const index = start + col;
      if (Number.isFinite(values[index]!)) last = values[index]!;
      else if (last !== null) values[index] = last;
    }
    last = null;
    for (let col = size - 1; col >= 0; col--) {
      const index = start + col;
      if (Number.isFinite(values[index]!)) last = values[index]!;
      else if (last !== null) values[index] = last;
    }
  }
  for (let col = 0; col < size; col++) {
    let last: number | null = null;
    for (let row = 0; row < size; row++) {
      const index = row * size + col;
      if (Number.isFinite(values[index]!)) last = values[index]!;
      else if (last !== null) values[index] = last;
    }
    last = null;
    for (let row = size - 1; row >= 0; row--) {
      const index = row * size + col;
      if (Number.isFinite(values[index]!)) last = values[index]!;
      else if (last !== null) values[index] = last;
    }
  }
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error("The elevation raster has too many NoData cells to build a terrain surface.");
  }
  return values;
}

export async function normalizeGeoTIFF(file: File): Promise<NormalizedStandardMapData> {
  try {
    const tiff = await fromBlob(file);
    const image = await tiff.getImage();
    const width = image.getWidth();
    const height = image.getHeight();
    if (width < 2 || height < 2 || width > MAX_RASTER_DIMENSION || height > MAX_RASTER_DIMENSION) {
      throw new Error("The raster dimensions are outside the supported range.");
    }
    if (image.getSamplesPerPixel() !== 1) throw new Error("Choose a single-band elevation GeoTIFF.");
    const rawGeoKeys = image.getGeoKeys();
    if (!rawGeoKeys) throw new Error("The GeoTIFF is missing its coordinate reference system.");
    const crs = toProj4(rawGeoKeys as GeoKeys);
    if (!crs.proj4 || Object.keys(crs.errors).length) throw new Error("The GeoTIFF coordinate reference system is not supported.");
    const projectToWgs84 = proj4(crs.proj4, "EPSG:4326");
    const nativeBounds = image.getBoundingBox();
    if (nativeBounds.length !== 4 || !nativeBounds.every(Number.isFinite)) throw new Error("The GeoTIFF has no usable georeferenced extent.");
    const corners = [
      projectToWgs84.forward([nativeBounds[0]!, nativeBounds[1]!]),
      projectToWgs84.forward([nativeBounds[0]!, nativeBounds[3]!]),
      projectToWgs84.forward([nativeBounds[2]!, nativeBounds[1]!]),
      projectToWgs84.forward([nativeBounds[2]!, nativeBounds[3]!]),
    ];
    const bbox = boundsOf(corners);
    if (!bbox) throw new Error("The GeoTIFF extent could not be transformed to WGS 84.");
    // Nearest-neighbor preserves exact NoData sentinels; bilinear would blend
    // them into valid elevations before we can mask and fill those cells.
    const rasters = await image.readRasters({ width: TERRAIN_GRID_SIZE, height: TERRAIN_GRID_SIZE, resampleMethod: "nearest" });
    const band = rasters[0];
    if (!band) throw new Error("The GeoTIFF does not contain an elevation band.");
    const noDataRaw = image.fileDirectory.toObject().GDAL_NODATA;
    const noData =
      noDataRaw === undefined
        ? null
        : Number(String(noDataRaw).replace(/\0/gu, "").trim());
    const { scale, offset } = parseGdalScaleOffset(image);
    const verticalUnitKey = rawGeoKeys.VerticalUnitsGeoKey;
    const verticalUnitFactor =
      verticalUnitKey === undefined || verticalUnitKey === 9001
        ? 1
        : verticalUnitKey === 9002
          ? 0.3048
          : verticalUnitKey === 9003
            ? 1200 / 3937
            : null;
    if (verticalUnitFactor === null) {
      throw new Error(`The GeoTIFF vertical unit (${verticalUnitKey}) is not supported.`);
    }
    const values = Array.from(band, (value) => {
      const sample = Number(value);
      return !Number.isFinite(sample) || (noData !== null && sample === noData)
        ? Number.NaN
        : (sample * scale + offset) * verticalUnitFactor;
    });
    const invalidCount = values.filter((value) => !Number.isFinite(value)).length;
    if (invalidCount > values.length * 0.5) throw new Error("More than half of the elevation raster is NoData.");
    fillMissingValues(values, TERRAIN_GRID_SIZE);
    const center = { lon: (bbox[0] + bbox[2]) / 2, lat: (bbox[1] + bbox[3]) / 2 };
    const widthM = Math.max(
      1,
      111_320 * Math.cos((center.lat * Math.PI) / 180) * (bbox[2] - bbox[0]),
      111_320 * (bbox[3] - bbox[1]),
    );
    const sourceResolutionM = widthM / Math.max(width, height);
    const scene = {
      center,
      bbox,
      width: widthM,
      reference: { crs: `EPSG:${rawGeoKeys.ProjectedCSTypeGeoKey ?? rawGeoKeys.GeographicTypeGeoKey ?? "unknown"}` },
      buildings: [],
      terrain: {
        size: TERRAIN_GRID_SIZE,
        elevations: values,
        baseElevation: 0,
        sourceResolutionM,
        sourceName: file.name,
        verticalReference:
          gdalMetadataItem(image, "VERTICAL_DATUM") ??
          (typeof rawGeoKeys.VerticalCSTypeGeoKey === "number"
            ? `EPSG:${rawGeoKeys.VerticalCSTypeGeoKey}`
            : "unverified"),
      },
    };
    return {
      content: JSON.stringify({ scene }),
      type: "scene",
      featureCount: 0,
      bbox,
      sceneSummary: { buildings: 0, roads: 0, water: 0, trees: 0, hasTextureMetadata: false },
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(file.name)) throw error;
    throw new Error(`${file.name} could not be read as a georeferenced elevation GeoTIFF${error instanceof Error ? `: ${error.message}` : "."}`);
  }
}
