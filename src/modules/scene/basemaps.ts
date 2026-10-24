/* Shared basemap metadata. Kept independent from the optional Leaflet editor. */

import {
  SATELLITE_TILE_ATTRIBUTION,
  SATELLITE_TILE_TEMPLATE,
} from "../../shared/map-tiles";

export type MissionBasemapStyle =
  "satellite" | "basic" | "light" | "dark" | "daybreak" | "overcast";

export const BASEMAPS: Record<
  MissionBasemapStyle,
  {
    label: string;
    url: string;
    attribution: string;
    maxNativeZoom?: number;
    thumbnailUrl: string;
  }
> = {
  satellite: {
    label: "Satellite",
    url: SATELLITE_TILE_TEMPLATE,
    attribution: SATELLITE_TILE_ATTRIBUTION,
    thumbnailUrl:
      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/4/6/3",
  },
  basic: {
    label: "Basic",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles © Esri, DeLorme, HERE, USGS, Intermap, and contributors",
    thumbnailUrl:
      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/4/6/3",
  },
  light: {
    label: "Light",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri, HERE, Garmin, © OpenStreetMap contributors",
    maxNativeZoom: 16,
    thumbnailUrl:
      "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/4/6/3",
  },
  dark: {
    label: "Dark",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri, HERE, Garmin, © OpenStreetMap contributors",
    maxNativeZoom: 16,
    thumbnailUrl:
      "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/4/6/3",
  },
  daybreak: {
    label: "Daybreak",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri, HERE, Garmin, Intermap, USGS, and contributors",
    thumbnailUrl:
      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/4/6/3",
  },
  overcast: {
    label: "Overcast",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri, USGS, NOAA",
    maxNativeZoom: 13,
    thumbnailUrl:
      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/4/6/3",
  },
};
