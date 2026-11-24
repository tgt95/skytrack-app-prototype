# MapSpace Complete Assets Inventory & Documentation

Tài nguyên đầy đủ được trích xuất từ [MapSpace](https://mapspace.kimq.tech/) phục vụ nghiên cứu, dựng bản demo và tích hợp giải pháp GIS 3D cho dự án **SkyTrack Mission Studio**.

---

## 1. Cấu trúc Tổng thể Thư mục

```text
public/demo-assets/mapspace/
├── models/                         # 7 mô hình 3D (.glb) chuẩn glTF 2.0 (tổng ~22.3 MB)
│   ├── landmark-81.glb             # Toà nhà Landmark 81 (TP.HCM) - 1.67 MB
│   ├── bitexco.glb                 # Bitexco Financial Tower (TP.HCM) - 4.82 MB
│   ├── cau-rong.glb                # Cầu Rồng (Đà Nẵng) - 4.48 MB
│   ├── dinh-doc-lap.glb            # Dinh Độc Lập (TP.HCM) - 5.14 MB
│   ├── nha-tho-duc-ba.glb          # Nhà thờ Đức Bà (TP.HCM) - 0.76 MB
│   ├── thap-rua.glb                # Tháp Rùa Hồ Gươm (Hà Nội) - 3.24 MB
│   └── chua-mot-cot.glb            # Chùa Một Cột (Hà Nội) - 2.08 MB
├── data/                           # Dữ liệu GIS mẫu & Ranh giới hành chính
│   ├── sample-scene-*.json         # Scene Landmark 81, Bitexco, Cầu Rồng, Dinh Độc Lập, Nhà thờ Đức Bà, Tháp Rùa, Chùa Một Cột
│   ├── world-boundaries.geojson    # Ranh giới quốc gia toàn cầu (GeoJSON)
│   └── boundaries/                 # Toàn bộ 35 file GeoJSON phân định địa giới Việt Nam
│       ├── vietnam-provinces.geojson # Ranh giới 34 Tỉnh/Thành phố trực thuộc TW
│       ├── VN-01.geojson           # Ranh giới Quận/Huyện Hà Nội (126 đơn vị)
│       ├── VN-79.geojson           # Ranh giới Quận/Huyện TP. Hồ Chí Minh (168 đơn vị)
│       ├── VN-48.geojson           # Ranh giới Quận/Huyện TP. Đà Nẵng (94 đơn vị)
│       └── [VN-04 .. VN-96].geojson# Ranh giới Quận/Huyện của tất cả 31 tỉnh thành còn lại
├── branding/                       # Bộ icon, favicon ứng dụng
│   ├── apple-touch-icon.png
│   ├── favicon.ico
│   ├── favicon-32.png
│   └── icon-192.png
├── web-client/                     # Bản clone toàn bộ frontend web & engine 3D Three.js
│   ├── index.html                  # HTML entry point
│   └── assets/                     # 13 script bundles & styles (Scene engine, Shaders, DXF/OBJ Export)
└── README.md                       # Tài liệu hướng dẫn sử dụng & bản quyền
```

---

## 2. Danh mục 7 Mô hình 3D Landmark & Bản quyền

| Tệp                  | Công trình         | Vị trí địa lý      | Dung lượng | Nguồn gốc                | Bản quyền |
| :------------------- | :----------------- | :----------------- | :--------- | :----------------------- | :-------- |
| `landmark-81.glb`    | **Landmark 81**    | Bình Thạnh, TP.HCM | 1.67 MB    | _Dave Love SketchFab_    | **CC-BY** |
| `bitexco.glb`        | **Bitexco Tower**  | Quận 1, TP.HCM     | 4.82 MB    | Sketchfab / 3D Warehouse | **CC-BY** |
| `cau-rong.glb`       | **Cầu Rồng**       | Đà Nẵng            | 4.48 MB    | Sketchfab / 3D Warehouse | **CC-BY** |
| `dinh-doc-lap.glb`   | **Dinh Độc Lập**   | Quận 1, TP.HCM     | 5.14 MB    | Sketchfab / 3D Warehouse | **CC-BY** |
| `nha-tho-duc-ba.glb` | **Nhà thờ Đức Bà** | Quận 1, TP.HCM     | 0.76 MB    | Sketchfab / 3D Warehouse | **CC-BY** |
| `thap-rua.glb`       | **Tháp Rùa**       | Hoàn Kiếm, Hà Nội  | 3.24 MB    | Sketchfab / 3D Warehouse | **CC-BY** |
| `chua-mot-cot.glb`   | **Chùa Một Cột**   | Ba Đình, Hà Nội    | 2.08 MB    | Sketchfab / 3D Warehouse | **CC-BY** |

---

## 3. Hệ thống Dữ liệu Địa giới Hành chính Việt Nam (`boundaries/`)

Hệ thống chứa đầy đủ dữ liệu GeoJSON 2 cấp:

1. `vietnam-provinces.geojson`: Đa giác ranh giới 34 Tỉnh/Thành phố với đầy đủ tên tiếng Việt, tên tiếng Anh, tâm nhãn (`label: [lat, lon]`) và khung giới hạn (`bbox`).
2. 34 file `{Mã-ISO}.geojson`: Cung cấp danh sách đa giác ranh giới chi tiết đến cấp Quận/Huyện/Thị xã cho từng tỉnh thành (Hà Nội, TP.HCM, Đà Nẵng, Hải Phòng, Cần Thơ...).

Dữ liệu này có thể nạp trực tiếp vào Cesium qua `Cesium.GeoJsonDataSource` để hiển thị ranh giới khu vực quản lý bay / khảo sát drone.

---

## 4. Web Client & Three.js 3D Scene Engine (`web-client/`)

Bộ mã nguồn frontend đã được sao lưu toàn diện:

- `assets/scene-C0XBO-6q.js`: Cốt lõi engine 3D, thuật toán nội suy độ cao song tuyến (`Ac`), quản lý tile, đổ bóng (`shadowMap`), thuật toán chiếu ảnh vệ tinh lên mặt mái (`markTileDarkRoofs`).
- `assets/collect-CPv1KoCK.js`: Module đùn đa giác 3D (Polygon Extrusion) từ footprint toà nhà.
- `assets/dxf-MJkx6IZi.js` & `exportFormats-Dhcoamly.js`: Thuật toán xuất dữ liệu 3D sang định dạng CAD DXF, OBJ và GLTF độc lập.
- `assets/main-CfUgCHbv.css`: Toàn bộ stylesheet giao diện bản đồ.

## 5. MapSpace demo scenes and elevation provenance

The seven `sample-scene-*.json` files are independent scene choices in the
Mission Studio sample Map dataset. The six scenes added for this integration
use OpenStreetMap building footprints and tree locations where those features
are mapped. OSM tags do not consistently include measured building heights;
missing heights use an explicitly estimated 10 m demo value. Landmark model
positions are geocoded demo centers and their display scales/orientations are
approximate. The Dragon Bridge area currently has no mapped building/tree
features in the retrieved 300 m OSM extract, so its scene demonstrates the
landmark and terrain layer.

The six added scene terrain grids come from GEDTM30 v20250611, a global 30 m digital terrain
model for the 2006–2015 reference period. The source raster stores decimeters;
the bundled grids convert its samples to meters and use 11 × 11 points over
300 m coverage (30 m grid spacing). The vertical coordinate reference is
EPSG:3855 and has not been verified against Mission Studio's mission datum.
This is visual terrain context, not a qualified terrain-follow input.
Dataset citation: Ho, Y. & Hengl, T. (2025),
[GEDTM30](https://doi.org/10.5281/zenodo.15689805), CC BY 4.0.

The original Landmark 81 sample retains its Copernicus DEM GLO-30-derived
49 × 49 grid. Its source metadata reports 30.6 m resolution and a 2011–2015
capture period; GLO-30 is a surface model that can include buildings and
vegetation. It is kept separate from the six added GEDTM30 bare-earth scenes.

Building and tree features are derived from OpenStreetMap map extracts
retrieved 2026-11-23. Credit: © OpenStreetMap contributors,
[ODbL 1.0](https://www.openstreetmap.org/copyright).

No satellite raster is included in these new scenes. Their imagery field only
indicates that imagery should come from the Mission Studio basemap control.
