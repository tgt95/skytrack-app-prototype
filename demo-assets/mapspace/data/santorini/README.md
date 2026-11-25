# Santorini GIS import sample

Small open-data files for trying the Mission Studio map-data importer. The building files describe objects above the ground; the elevation TIFF describes the ground surface.

## Files and roles

- `santorini-buildings.gpkg` — six building footprints in a GeoPackage. Choose this as the vector map file when testing the importer.
- `santorini-buildings.geojson` — the same six footprints in GeoJSON. This is an alternative to the GeoPackage; choose one vector file, not both.
- `gedtm30-santorini-window.tif` — a 360 × 360 GeoTIFF elevation clip. Choose this with either vector file to add terrain relief. It uses EPSG:4326 horizontally and EGM2008 vertical reference (EPSG:3855), with 0.1 scale and `-2147483648` NoData.
- `santorini-osm-map.osm` — the source OpenStreetMap XML extract used to derive the building footprints. It preserves the raw source data; it is not the vector file to select in this import flow.
- `prepare-import-samples.py` — rebuilds the GeoJSON and GeoPackage from the OSM extract. This is a maintenance script, not an import file.

## Import pair

Select either `santorini-buildings.gpkg` or `santorini-buildings.geojson`, together with `gedtm30-santorini-window.tif`. The vector file provides building footprints; the TIFF provides ground elevation. The OSM extract and Python script are for source traceability and rebuilding the vector samples.

The Santorini sample mission uses normalized seed records derived from this
GeoPackage and GeoTIFF at
`src/features/library/database/seeds/map-data/`. The source GeoPackage and
GeoTIFF remain the files to choose when testing the import flow.

## Sources and limits

The OSM extract covers `25.360,36.356,25.362,36.358` (west, south, east, north). Its six buildings have footprints but no measured height tags. The prototype displays missing heights with its default visualization height.

The elevation clip comes from GEDTM30 v20250611, a global 30 m digital terrain model for the 2006–2015 reference period. This clipped area includes sea pixels and is for regional terrain context, not fine survey-site terrain or terrain-follow planning.

- OpenStreetMap API: <https://api.openstreetmap.org/api/0.6/map?bbox=25.36,36.356,25.362,36.358>. ODbL 1.0; credit © OpenStreetMap contributors: <https://www.openstreetmap.org/copyright>.
- GEDTM30 source GeoTIFF: <https://s3.opengeohub.org/global/edtm/gedtm_rf_m_30m_s_20060101_20151231_go_epsg.4326.3855_v20250611.tif>. CC BY 4.0; metadata and citation: <https://stac.ecodatacube.eu/gedtm_rf/collection.json>.
