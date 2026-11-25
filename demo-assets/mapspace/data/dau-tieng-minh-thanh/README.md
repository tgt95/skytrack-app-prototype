# Dầu Tiếng / Minh Thạnh GIS import sample

Open building-footprint and elevation samples around the supplied map pin at
11.4275283, 106.529848. In New mission → Step 2, import
`microsoft-buildings-dau-tieng.geojson` as map data and
`gedtm30-dau-tieng.tif` as elevation data.

## Files

- `microsoft-globalml-quadkey-132212333.csv.gz` is Microsoft's raw Vietnam
  tile for QuadKey `132212333`, from the 2026-11-12 dataset index. It contains
  line-delimited GeoJSON inside gzip and is retained as the source snapshot;
  the app importer uses the smaller GeoJSON file below.
- `microsoft-buildings-dau-tieng.geojson` contains the 922 Microsoft building
  footprints intersecting the area `106.519,11.417,106.541,11.438` (west,
  south, east, north). The source features are satellite-derived footprints.
  The import copy adds the `building` tag and stable IDs; raw height and
  confidence values are kept in `source_height_raw` and
  `source_confidence_raw`.
- `gedtm30-dau-tieng.tif` is a clipped, single-band GeoTIFF terrain raster,
  89 × 85 pixels, with elevations stored in meters. Its extent is
  `106.519,11.41675,106.54125,11.438` (west, south, east, north), and its
  vertical reference is EPSG:3855.

## Sources, licenses, and limits

- Building source: [Microsoft Global ML Building Footprints](https://github.com/microsoft/GlobalMLBuildingFootprints), Vietnam tile indexed
  2026-11-12. Microsoft licenses the dataset under CDLA Permissive 2.0. This
  area has no positive building-height estimates, so Mission Studio displays
  imported footprints at its default 10 m visualization height.
- Elevation source: [GEDTM30](https://doi.org/10.5281/zenodo.15689805), global
  30 m digital terrain model, v20250611. This clip contains elevations from
  32.1 m to 62.3 m and is licensed CC BY 4.0. It gives regional terrain shape,
  not survey-grade or terrain-follow planning data.
- An OpenStreetMap API check of the same bounding box returned no ways tagged
  as buildings, so the footprint sample uses Microsoft's layer. OSM remains a
  useful open source for roads and mapped context; its data is ODbL and
  requires attribution if included in a derivative.

Source tile URL:
<https://bfppub.z5.web.core.windows.net/2026-11-12/global-buildings.geojsonl/RegionName=Vietnam/quadkey=132212333/part-00179-4b4e6876-7466-49a9-940f-834dab87ccde.c000.csv.gz>

Source elevation raster:
<https://s3.opengeohub.org/global/edtm/gedtm_rf_m_30m_s_20060101_20151231_go_epsg.4326.3855_v20250611.tif>
