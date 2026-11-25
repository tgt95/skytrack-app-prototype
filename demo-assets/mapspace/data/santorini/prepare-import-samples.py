"""Build tiny repeatable GeoJSON and GeoPackage import samples from saved OSM XML."""

import json
import sqlite3
import struct
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).parent
root = ET.parse(HERE / "santorini-osm-map.osm").getroot()
nodes = {
    node.attrib["id"]: [float(node.attrib["lon"]), float(node.attrib["lat"])]
    for node in root.findall("node")
}
features = []
for way in root.findall("way"):
    tags = {tag.attrib["k"]: tag.attrib["v"] for tag in way.findall("tag")}
    refs = [node.attrib["ref"] for node in way.findall("nd")]
    if "building" not in tags or len(refs) < 4 or refs[0] != refs[-1]:
        continue
    try:
        ring = [nodes[ref] for ref in refs]
    except KeyError:
        continue
    features.append(
        {
            "type": "Feature",
            "id": way.attrib["id"],
            "properties": {**tags, "osm_id": way.attrib["id"]},
            "geometry": {"type": "Polygon", "coordinates": [ring]},
        }
    )

collection = {"type": "FeatureCollection", "features": features}
(HERE / "santorini-buildings.geojson").write_text(json.dumps(collection))

gpkg_path = HERE / "santorini-buildings.gpkg"
gpkg_path.unlink(missing_ok=True)
db = sqlite3.connect(gpkg_path)
db.executescript(
    """
    PRAGMA application_id = 1196437808;
    PRAGMA user_version = 10300;
    CREATE TABLE gpkg_spatial_ref_sys (
      srs_name TEXT NOT NULL, srs_id INTEGER NOT NULL PRIMARY KEY,
      organization TEXT NOT NULL, organization_coordsys_id INTEGER NOT NULL,
      definition TEXT NOT NULL, description TEXT
    );
    INSERT INTO gpkg_spatial_ref_sys VALUES
      ('Undefined Cartesian', -1, 'NONE', -1, 'undefined', 'undefined cartesian coordinate reference system'),
      ('Undefined Geographic', 0, 'NONE', 0, 'undefined', 'undefined geographic coordinate reference system'),
      ('WGS 84 geodetic', 4326, 'EPSG', 4326,
       'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]',
       'longitude/latitude coordinates in decimal degrees');
    CREATE TABLE gpkg_contents (
      table_name TEXT NOT NULL PRIMARY KEY, data_type TEXT NOT NULL, identifier TEXT UNIQUE,
      description TEXT DEFAULT '', last_change DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE, srs_id INTEGER,
      FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id)
    );
    CREATE TABLE gpkg_geometry_columns (
      table_name TEXT NOT NULL, column_name TEXT NOT NULL, geometry_type_name TEXT NOT NULL,
      srs_id INTEGER NOT NULL, z TINYINT NOT NULL, m TINYINT NOT NULL,
      PRIMARY KEY (table_name, column_name),
      FOREIGN KEY (table_name) REFERENCES gpkg_contents(table_name),
      FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id)
    );
    CREATE TABLE buildings (
      fid INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      geom BLOB NOT NULL, building TEXT, height TEXT, name TEXT, osm_id TEXT
    );
    INSERT INTO gpkg_contents(table_name,data_type,identifier,srs_id)
      VALUES ('buildings','features','buildings',4326);
    INSERT INTO gpkg_geometry_columns VALUES ('buildings','geom','POLYGON',4326,0,0);
    """
)

for feature in features:
    coordinates = feature["geometry"]["coordinates"]
    ring_bytes = struct.pack("<I", len(coordinates))
    for ring in coordinates:
        ring_bytes += struct.pack("<I", len(ring))
        for lon, lat in ring:
            ring_bytes += struct.pack("<dd", lon, lat)
    wkb = struct.pack("<BI", 1, 3) + ring_bytes
    gpkg_binary = b"GP" + bytes([0, 1]) + struct.pack("<i", 4326) + wkb
    props = feature["properties"]
    db.execute(
        "INSERT INTO buildings(geom,building,height,name,osm_id) VALUES (?,?,?,?,?)",
        (gpkg_binary, props.get("building"), props.get("height"), props.get("name"), props["osm_id"]),
    )
db.commit()
db.close()
print(f"Wrote {len(features)} buildings to GeoJSON and GeoPackage")
