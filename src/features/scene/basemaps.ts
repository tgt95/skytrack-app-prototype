/* Shared basemap metadata. Kept independent from the optional Leaflet editor. */

import {
  OPENSTREETMAP_TILE_ATTRIBUTION,
  OPENSTREETMAP_TILE_TEMPLATE,
  SATELLITE_TILE_ATTRIBUTION,
  SATELLITE_TILE_TEMPLATE,
} from "@/shared/map-tiles";
import type { MissionBasemapStyle } from "@/shared/map-tiles";
export type { MissionBasemapStyle } from "@/shared/map-tiles";

export const BASEMAPS: Record<
  MissionBasemapStyle,
  {
    label: string;
    url: string;
    attribution: string;
    creditLabel: string;
    creditHref: string;
    osmCreditLabel?: string;
    osmCreditHref?: string;
    maxNativeZoom?: number;
    thumbnailUrl: string;
  }
> = {
  satellite: {
    label: "Satellite",
    url: SATELLITE_TILE_TEMPLATE,
    attribution: SATELLITE_TILE_ATTRIBUTION,
    creditLabel: "Tiles © Esri and its contributors",
    creditHref:
      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
    thumbnailUrl:
      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/4/6/3",
  },
  openstreetmap: {
    label: "OpenStreetMap",
    url: OPENSTREETMAP_TILE_TEMPLATE,
    attribution: OPENSTREETMAP_TILE_ATTRIBUTION,
    creditLabel: "© OpenStreetMap contributors",
    creditHref: "https://www.openstreetmap.org/copyright",
    osmCreditLabel: "© OpenStreetMap contributors",
    osmCreditHref: "https://www.openstreetmap.org/copyright",
    maxNativeZoom: 19,
    thumbnailUrl: "https://tile.openstreetmap.org/14/13044/7696.png",
  },
  basic: {
    label: "Basic",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles © Esri, DeLorme, HERE, USGS, Intermap, and contributors",
    creditLabel: "Tiles © Esri, DeLorme, HERE, USGS, Intermap, and contributors",
    creditHref:
      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer",
    osmCreditLabel: "© OpenStreetMap contributors",
    osmCreditHref: "https://www.openstreetmap.org/copyright",
    thumbnailUrl: "https://tile.openstreetmap.org/14/13044/7696.png",
  },
  light: {
    label: "Light",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri, HERE, Garmin, © OpenStreetMap contributors",
    creditLabel: "Tiles © Esri, HERE, Garmin, © OpenStreetMap contributors",
    creditHref:
      "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer",
    osmCreditLabel: "© OpenStreetMap contributors",
    osmCreditHref: "https://www.openstreetmap.org/copyright",
    maxNativeZoom: 16,
    thumbnailUrl:
      "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/4/6/3",
  },
  dark: {
    label: "Dark",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri, HERE, Garmin, © OpenStreetMap contributors",
    creditLabel: "Tiles © Esri, HERE, Garmin, © OpenStreetMap contributors",
    creditHref:
      "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer",
    osmCreditLabel: "© OpenStreetMap contributors",
    osmCreditHref: "https://www.openstreetmap.org/copyright",
    maxNativeZoom: 16,
    thumbnailUrl:
      "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/4/6/3",
  },
  daybreak: {
    label: "Daybreak",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri, HERE, Garmin, Intermap, USGS, and contributors",
    creditLabel: "Tiles © Esri, HERE, Garmin, Intermap, USGS, and contributors",
    creditHref:
      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer",
    osmCreditLabel: "© OpenStreetMap contributors",
    osmCreditHref: "https://www.openstreetmap.org/copyright",
    thumbnailUrl:
      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/4/6/3",
  },
  overcast: {
    label: "Overcast",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri, USGS, NOAA",
    creditLabel: "Tiles © Esri, USGS, NOAA",
    creditHref:
      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer",
    osmCreditLabel: "© OpenStreetMap contributors",
    osmCreditHref: "https://www.openstreetmap.org/copyright",
    maxNativeZoom: 13,
    thumbnailUrl:
      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/4/6/3",
  },
};
