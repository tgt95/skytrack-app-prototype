import type { Viewer } from "cesium";
import type {
  GeoOrigin,
  SceneSelection,
  StudioMission,
} from "../../domain/mission-model";
import type { SceneToken } from "./mission-scene-helpers";

export type CesiumNamespace = typeof import("cesium");

export interface CommittedEntityContext {
  viewer: Viewer;
  Cesium: CesiumNamespace;
  mission: StudioMission;
  origin: GeoOrigin;
  cssColor: (varName: SceneToken, alpha: number) => import("cesium").Color;
}

export interface AreaEntityContext extends CommittedEntityContext {
  selection: SceneSelection | null;
  showAreaSurface: boolean;
}

export interface RouteEntityContext extends CommittedEntityContext {
  selection: SceneSelection | null;
  simActive: boolean;
  focusedPhotoWaypointId: string | null;
}
