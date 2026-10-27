import type { Viewer } from "cesium";
import {
  missionOrigin,
  type SceneSelection,
  type StudioMission,
} from "../../domain/mission-model";
import {
  safeColor,
  themeColor,
  type SceneToken,
} from "./mission-scene-helpers";
import { removeSceneEntitiesInLayer } from "./scene-entity-ownership";
import { addAreaAndAvoidEntities } from "./sync-area-entities";
import { addHomeConnectorEntities } from "./sync-home-entities";
import { addRouteEntities } from "./sync-route-entities";
import {
  syncWorldTerrain,
  type WorldTerrainTriangle,
} from "./sync-world-terrain";
import type {
  CesiumNamespace,
  CommittedEntityContext,
} from "./committed-entity-context";

interface SyncCommittedMissionEntitiesParams {
  viewer: Viewer;
  Cesium: CesiumNamespace;
  mission: StudioMission;
  selection: SceneSelection | null;
  simActive: boolean;
  showAreaSurface: boolean;
  focusedPhotoWaypointId: string | null;
  worldModelActive: boolean;
}

/** Rebuilds committed entities once while preserving every other scene layer. */
export function syncCommittedMissionEntities({
  viewer,
  Cesium,
  mission,
  selection,
  simActive,
  showAreaSurface,
  focusedPhotoWaypointId,
  worldModelActive,
}: SyncCommittedMissionEntitiesParams): WorldTerrainTriangle[] {
  removeSceneEntitiesInLayer(viewer.entities, "committed");
  const origin = missionOrigin(mission);
  const cssColor = (
    varName: SceneToken,
    alpha: number,
  ): import("cesium").Color =>
    safeColor(Cesium, themeColor(varName), varName, alpha);
  const context: CommittedEntityContext = {
    viewer,
    Cesium,
    mission,
    origin,
    cssColor,
  };

  addHomeConnectorEntities(context);
  const worldTerrainTriangles = syncWorldTerrain(
    viewer,
    Cesium,
    mission,
    worldModelActive,
  );
  // Sample Facade context block removed (F007): grid, route, Areas,
  // Avoid zones and markers below are the only scene objects.
  addAreaAndAvoidEntities({ ...context, selection, showAreaSurface });
  addRouteEntities({
    ...context,
    selection,
    simActive,
    focusedPhotoWaypointId,
  });

  return worldTerrainTriangles;
}
