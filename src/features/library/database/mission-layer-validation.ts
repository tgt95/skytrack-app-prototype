import type {
  MissionMapSceneLayer,
  MissionTerrainLayer,
} from "@/domain/mission-model";

export function isMissionMapSceneLayer(
  value: unknown,
): value is MissionMapSceneLayer {
  if (!value || typeof value !== "object") return false;
  const layer = value as Partial<MissionMapSceneLayer>;
  const isFinitePoint = (point: unknown) =>
    Array.isArray(point) &&
    point.length === 2 &&
    point.every((entry) => typeof entry === "number" && Number.isFinite(entry));
  const isRing = (ring: unknown) =>
    Array.isArray(ring) && ring.length >= 4 && ring.every(isFinitePoint);
  return (
    typeof layer.sourceFileName === "string" &&
    (layer.coordinateFrame === undefined ||
      layer.coordinateFrame === "mission-enu") &&
    typeof layer.center?.lat === "number" &&
    Number.isFinite(layer.center.lat) &&
    typeof layer.center?.lon === "number" &&
    Number.isFinite(layer.center.lon) &&
    Math.abs(layer.center.lat) <= 90 &&
    Math.abs(layer.center.lon) <= 180 &&
    Array.isArray(layer.bbox) &&
    layer.bbox.length === 4 &&
    layer.bbox.every(
      (entry) => typeof entry === "number" && Number.isFinite(entry),
    ) &&
    typeof layer.widthM === "number" &&
    Number.isFinite(layer.widthM) &&
    layer.widthM > 0 &&
    typeof layer.horizontalReference === "string" &&
    layer.verticalReference === "unverified" &&
    Array.isArray(layer.buildings) &&
    layer.buildings.length <= 5000 &&
    Array.isArray(layer.landmarks) &&
    layer.landmarks.length <= 100 &&
    (layer.trees === undefined ||
      (Array.isArray(layer.trees) &&
        layer.trees.length <= 2000 &&
        layer.trees.every(
          (tree) =>
            typeof tree.id === "string" &&
            [tree.xM, tree.yM, tree.heightM, tree.canopyRadiusM].every(
              (entry) => typeof entry === "number" && Number.isFinite(entry),
            ) &&
            tree.heightM > 0 &&
            tree.heightM <= 80 &&
            tree.canopyRadiusM > 0 &&
            tree.canopyRadiusM <= 20,
        ))) &&
    (layer.buildings.length > 0 ||
      layer.landmarks.length > 0 ||
      (layer.trees?.length ?? 0) > 0) &&
    layer.buildings.every(
      (building) =>
        typeof building.id === "string" &&
        typeof building.name === "string" &&
        typeof building.heightM === "number" &&
        Number.isFinite(building.heightM) &&
        building.heightM > 0 &&
        ["verified", "estimated", "review", "unknown"].includes(
          building.heightLabel,
        ) &&
        Array.isArray(building.polygons) &&
        building.polygons.length > 0 &&
        building.polygons.every(
          (polygon) =>
            isRing(polygon.outer) &&
            Array.isArray(polygon.holes) &&
            polygon.holes.every(isRing),
        ),
    ) &&
    layer.landmarks.every(
      (landmark) =>
        typeof landmark.id === "string" &&
        typeof landmark.name === "string" &&
        [
          "bitexco.glb",
          "cau-rong.glb",
          "chua-mot-cot.glb",
          "dinh-doc-lap.glb",
          "landmark-81.glb",
          "nha-tho-duc-ba.glb",
          "thap-rua.glb",
        ].some(
          (file) =>
            landmark.localModelPath === `/demo-assets/mapspace/models/${file}`,
        ) &&
        [
          landmark.xM,
          landmark.yM,
          landmark.baseElevationM,
          landmark.rotationDeg,
          landmark.scale,
          landmark.heightM,
        ].every(
          (entry) => typeof entry === "number" && Number.isFinite(entry),
        ) &&
        landmark.scale > 0 &&
        landmark.heightM > 0 &&
        (landmark.attribution === undefined ||
          typeof landmark.attribution === "string"),
    )
  );
}

export function isMissionTerrainLayer(
  value: unknown,
): value is MissionTerrainLayer {
  if (!value || typeof value !== "object") return false;
  const terrain = value as Partial<MissionTerrainLayer>;
  return (
    typeof terrain.sourceFileName === "string" &&
    typeof terrain.center?.lat === "number" &&
    Number.isFinite(terrain.center.lat) &&
    typeof terrain.center?.lon === "number" &&
    Number.isFinite(terrain.center.lon) &&
    Array.isArray(terrain.bbox) &&
    terrain.bbox.length === 4 &&
    terrain.bbox.every(
      (item) => typeof item === "number" && Number.isFinite(item),
    ) &&
    typeof terrain.widthM === "number" &&
    Number.isFinite(terrain.widthM) &&
    terrain.widthM > 0 &&
    typeof terrain.gridSize === "number" &&
    Number.isInteger(terrain.gridSize) &&
    terrain.gridSize >= 2 &&
    terrain.gridSize <= 512 &&
    Array.isArray(terrain.elevationsM) &&
    terrain.elevationsM.length === terrain.gridSize * terrain.gridSize &&
    terrain.elevationsM.every(
      (item) => typeof item === "number" && Number.isFinite(item),
    ) &&
    typeof terrain.baseElevationM === "number" &&
    Number.isFinite(terrain.baseElevationM) &&
    typeof terrain.horizontalReference === "string" &&
    typeof terrain.verticalReference === "string" &&
    terrain.verticalReference.trim().length > 0 &&
    terrain.verticalReference.length <= 160
  );
}
