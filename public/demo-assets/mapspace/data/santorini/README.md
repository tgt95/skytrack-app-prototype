# Santorini GIS import sample

Small open-data files for trying the Mission Studio map-data importer. Select one vector file and the elevation TIFF together to create a dataset with both map context and terrain.

## Files

- `santorini-buildings.geojson` — six building footprints in WGS 84 GeoJSON.
- `santorini-buildings.gpkg` — the same six building footprints in GeoPackage.
- `gedtm30-santorini-window.tif` — 360 × 360 pixel GeoTIFF clip, EPSG:4326, with EGM2008 vertical reference (EPSG:3855), 0.1 scale, and `-2147483648` NoData.
- `santorini-osm-map.osm` — source OpenStreetMap XML extract for the building footprints.
- `prepare-import-samples.py` — rebuilds the GeoJSON and GeoPackage from the XML extract.

The Satorini sample mission uses normalized seed records derived from this
GeoPackage and GeoTIFF at
`src/features/library/database/seeds/map-data/`. The source GeoPackage and
GeoTIFF remain the files to choose when testing the import flow.

## Sources and limits

The OSM extract covers `25.360,36.356,25.362,36.358` (west, south, east, north). Its six buildings have footprints but no measured height tags. The prototype displays missing heights with its default visualization height.

The elevation clip comes from GEDTM30 v20250611, a global 30 m digital terrain model for the 2006–2015 reference period. This clipped area includes sea pixels and is for regional terrain context, not fine survey-site terrain or terrain-follow planning.

- OpenStreetMap API: <https://api.openstreetmap.org/api/0.6/map?bbox=25.36,36.356,25.362,36.358>. ODbL 1.0; credit © OpenStreetMap contributors: <https://www.openstreetmap.org/copyright>.
- GEDTM30 source GeoTIFF: <https://s3.opengeohub.org/global/edtm/gedtm_rf_m_30m_s_20060101_20151231_go_epsg.4326.3855_v20250611.tif>. CC BY 4.0; metadata and citation: <https://stac.ecodatacube.eu/gedtm_rf/collection.json>.
