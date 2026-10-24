export interface MapTileOrigin {
  lat: number;
  lng: number;
}

export const SATELLITE_TILE_TEMPLATE =
  "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const SATELLITE_TILE_ATTRIBUTION = "Tiles © Esri and its contributors";

export function satelliteTileUrl(origin: MapTileOrigin, zoom = 17): string {
  const safeZoom = Math.min(19, Math.max(0, Math.round(zoom)));
  const tileCount = 2 ** safeZoom;
  const latitude = Math.min(85.05112878, Math.max(-85.05112878, origin.lat));
  const latitudeRadians = (latitude * Math.PI) / 180;
  const x = Math.floor(((origin.lng + 180) / 360) * tileCount);
  const y = Math.floor(
    ((1 - Math.asinh(Math.tan(latitudeRadians)) / Math.PI) / 2) * tileCount,
  );

  return SATELLITE_TILE_TEMPLATE.replace("{z}", String(safeZoom))
    .replace("{y}", String(y))
    .replace("{x}", String(x));
}
