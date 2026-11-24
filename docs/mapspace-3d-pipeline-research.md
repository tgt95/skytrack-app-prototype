# Nghiên cứu Kiến trúc Kỹ thuật & Nguồn Dữ liệu 3D GIS: MapSpace

> **Mục đích:** Tài liệu phân tích cơ chế dựng hình bản đồ 3D, nguồn dữ liệu địa không gian (geospatial data), chính sách bản quyền và phương pháp trích xuất mô hình 3D từ dịch vụ [MapSpace](https://mapspace.kimq.tech/) phục vụ nghiên cứu & tích hợp tính năng bản đồ 3D cho SkyTrack Mission Studio.

---

## 1. Cơ chế Dựng Bản đồ 3D (3D Reconstruction Pipeline)

MapSpace hoạt động trên mô hình **Client-Server kết hợp Tile-based Streaming**:
- **Backend (Python / Node.js API):** Xử lý truy vấn bounding box (BBox), cắt lớp dữ liệu GIS vector/raster theo lưới toạ độ, đóng gói thành các ô lưới (Tiles).
- **Frontend (Three.js / WebGL):** Nạp tile theo cơ chế bất đồng bộ, phân cấp mức độ chi tiết (LOD), dựng mesh hình học trực tiếp trên trình duyệt bằng WebGL.

### 1.1. Hệ thống Lưới & Đa mức Chi tiết (Tiling & LOD)
- Không gian bản đồ được phân rã thành các ô vuông logic thông qua API `/api/areas/{id}/tiles/{key}`.
- Mỗi tile mang toạ độ dịch chuyển `(dx, dz)` và cao độ gốc `baseElevation`.
- **Phân cấp LOD:**
  - **`near` LOD:** Áp dụng cho các ô ở gần camera. Bật đổ bóng (`shadowMap`), nạp ảnh vệ tinh độ nét cao (lên đến 2048px), dựng chi tiết cây xanh, cầu đường, phân cấp vách tường toà nhà.
  - **`far` LOD:** Áp dụng cho các ô ở xa tầm nhìn. Toà nhà được gộp thành các khối hộp tối giản (`blocks`), tắt bóng đổ, giảm ảnh nền vệ tinh về canvas 512×512 để tiết kiệm GPU VRAM.

### 1.2. Dựng Lưới Địa hình (Terrain Mesh)
- **Cấu trúc dữ liệu:** Server trả về mảng 1 chiều `elevations[]` tương ứng với ma trận độ cao kích thước `size × size` (thường là 32×32 hoặc 64×64).
- **Thuật toán tạo Mesh:** Hàm `jc(t)` tạo một `THREE.BufferGeometry` dạng lưới tam giác:
  - Tọa độ các đỉnh $(X, Y, Z)$ với $Y = elevations[row \times size + col]$.
  - Tọa độ UV được trải phẳng để phủ ảnh vệ tinh hoặc màu địa hình kiến trúc (`#657668`).
- **Nội suy độ cao (Bilinear Interpolation):** Hàm `Ac(t, x, z)` sử dụng thuật toán nội suy song tuyến (`K.lerp`) để tính chính xác cao độ mặt đất tại bất kỳ toạ độ nào trong scene. Đây là cơ sở để neo chân công trình, tim đường, rải cây sát mặt địa hình mấp mô.

### 1.3. Dựng Công trình (Building Extrusion & Batching)
- **Dựng hình khối (Geometry Extrusion):**
  - Nhận footprint 2D dưới dạng đa giác (`polygons: { outer, holes }`).
  - Triangulate đa giác 2D đáy và đùn thành khối 3D theo chiều cao `height`.
  - Đáy công trình được neo khớp với độ cao địa hình: $Y_{base} = \min(groundElevation) + offY$.
- **Tối ưu hiệu năng (GPU Batching):**
  - Sử dụng cơ chế gom lô (`this.batches`) ghép các toà nhà trong cùng tile thành các batch lớn để giảm thiểu Draw Calls trên GPU.
- **Vật liệu mặt đứng (Procedural Facades):**
  - Sinh shader/texture theo thuật toán phân tầng (`Procedural floor ledges`), tạo cửa sổ và gờ phân tầng theo chiều cao công trình (phân loại tháp cao tầng vs nhà dân thấp tầng).
- **Vật liệu mái (Projected Roofs):**
  - Mái toà nhà sử dụng thuật toán chiếu UV phẳng (Planar UV Projection) lấy trực tiếp phần ảnh vệ tinh phía trên đỉnh công trình (`Roof · projected aerial image / planar assumption`).
  - Tự động phân tích giá trị màu ảnh vệ tinh để xác định mái tối màu (`markTileDarkRoofs`).

### 1.4. Hạ tầng Giao thông, Cảnh quan & Công trình Biểu tượng
- **Đường giao thông (Roads):** Chiếu đa giác tim đường bám sát mặt địa hình dạng Decal/Overlay (`Roads · painted on terrain`). Thiết lập `polygonOffsetFactor: -4` và `polygonOffsetUnits: -4` để triệt tiêu hiện tượng nhấp nháy chồng lấn mặt (z-fighting). Chiều rộng đường tự động tính theo số làn (`lanes`) hoặc thuộc tính `width` trong dữ liệu OSM. Cầu cống (`Bridges`) được tách thành mesh riêng nâng cao độ.
- **Mặt nước (Water):** Dựng polygon từ dữ liệu thuỷ hệ, gán vật liệu riêng biệt (`#3f7f91`).
- **Cây xanh (Trees):** Khởi tạo bằng `THREE.InstancedMesh` gồm 2 khối cơ bản (thân trụ và tán nón) được phân bổ tại toạ độ cây của OSM hoặc vị trí suy luận từ độ phủ tán cây trên ảnh vệ tinh (Canopy inference).
- **Mô hình Landmark (GLTF/GLB):** Các công trình kiến trúc đặc thù (Landmark 81, Bitexco...) được thay thế khối đùn bằng mô hình 3D thực tế dạng `.glb`.

---

## 2. Nguồn Dữ liệu Địa Không Gian (Data Sources & Database)

Hệ thống kết hợp nhiều nguồn dữ liệu mở và dịch vụ bản đồ:

| Thành phần | Nguồn dữ liệu sử dụng | Vai trò & Đặc điểm |
| :--- | :--- | :--- |
| **Footprint toà nhà** | **OpenStreetMap (OSM)**<br>**Microsoft ML Buildings**<br>**Google Open Buildings** | - OSM: Footprint chuẩn do cộng đồng đóng góp.<br>- Microsoft ML Buildings: Dữ liệu AI phát hiện toà nhà từ ảnh vệ tinh (chuẩn ODbL-1.0).<br>- Google Open Buildings (2.5D): Bổ sung footprint các khu vực OSM chưa có (`infill`). |
| **Chiều cao công trình** | Thuật toán ưu tiên 4 cấp:<br>1. Thẻ OSM `height`<br>2. Thẻ OSM `building:levels` × 3,6 m<br>3. Google Open Buildings 2.5D (pixel 2m)<br>4. Ước lượng theo bối cảnh lân cận (hoặc mặc định 9,6 m) | Giải quyết bài toán phần lớn toà nhà tại Việt Nam thiếu dữ liệu chiều cao thực tế. Hệ thống so sánh đối chiếu giữa các nguồn để gán nhãn: `Kiểm chứng` (verified), `Ước lượng` (estimated), hoặc `Cần xem` (review). |
| **Giao thông, Thuỷ hệ, Cây xanh** | **OpenStreetMap (OSM)** | Lấy các tags: `highway=*`, `lanes=*`, `natural=water`, `waterway=*`, `natural=tree`. Hỗ trợ chế độ gọi trực tiếp thời gian thực (`osmLive: true`). |
| **Độ cao địa hình (DEM)** | **Copernicus DEM GLO-30 / SRTM / Mapbox Terrain** | Dữ liệu mô hình số độ cao toàn cầu dạng raster. Server cắt theo BBox rồi nội suy ra lưới cao độ `elevations[]`. |
| **Ảnh vệ tinh nền** | **Esri World Imagery**<br>(nguồn ảnh: Maxar, Vantor) | URL mẫu: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`. Dùng phủ texture nền và chiếu mặt mái toà nhà. |
| **Thông tin địa danh** | **Wikidata** / **Nominatim** | Tìm kiếm địa điểm, geocoding và gắn metadata cho các công trình. |
| **Bản đồ Quy hoạch** | Cổng Quy hoạch tỉnh/thành phố Việt Nam | Kết nối WMS/Tile layers từ: Hà Nội (`quyhoach.hanoi.gov.vn`), TP.HCM (`thongtinquyhoach.hochiminhcity.gov.vn`), Đà Nẵng, Hải Phòng, Quảng Ngãi. |

---

## 3. Đánh giá Tính Miễn phí & Bản quyền (License & Cost Analysis)

### 3.1. Nhóm Hoàn toàn Miễn phí (Dùng được cho cả Thương mại & Demo)
1. **OpenStreetMap (OSM):**
   - *Giấy phép:* ODbL (Open Database License).
   - *Chi phí:* 0đ.
   - *Ràng buộc:* Bắt buộc ghi nhận công trạng `© OpenStreetMap contributors`. Nếu truy vấn số lượng lớn cần tự dựng server Overpass/Nominatim riêng để tránh bị rate limit.
2. **Microsoft ML Buildings & Google Open Buildings:**
   - *Giấy phép:* ODbL-1.0 / CC BY-4.0.
   - *Chi phí:* 0đ.
   - *Ràng buộc:* Miễn phí hoàn toàn cho nghiên cứu và thương mại; bắt buộc ghi nhận nguồn.
3. **Wikidata:**
   - *Giấy phép:* CC0 (Public Domain).
   - *Chi phí:* 0đ, tự do tuyệt đối không có rào cản pháp lý.
4. **Dữ liệu độ cao địa hình (Copernicus DEM GLO-30 / SRTM):**
   - *Giấy phép:* Public Domain / Open Data từ ESA và NASA.
   - *Chi phí:* 0đ nếu tải file GeoTIFF về máy chủ nội bộ để tự bóc tách lưới độ cao.

### 3.2. Nhóm Miễn phí có Điều kiện / Rủi ro Pháp lý
1. **Esri World Imagery (Ảnh vệ tinh):**
   - *Hiện trạng:* URL tile của Esri truy cập được trực tiếp mà không cần API key cho lưu lượng nhỏ/thử nghiệm.
   - *Rủi ro:* Theo Điều khoản Dịch vụ của Esri (Terms of Use), việc sử dụng ảnh này trong các sản phẩm thương mại hoặc ứng dụng có thu phí bắt buộc phải mua gói bản quyền ArcGIS Developer.
2. **Lớp Bản đồ Quy hoạch Việt Nam:**
   - *Hiện trạng:* Các cổng quy hoạch công khai mở cổng WMS/Tile.
   - *Rủi ro:* Không có cam kết SLA hay giấy phép API mở; có thể bị chặn CORS, chặn dải IP hoặc sập bất ngờ khi cơ quan nhà nước đổi cấu trúc hệ thống.

---

## 4. Cơ chế Mô hình 3D Landmark & Hướng dẫn Clone/Trích xuất Demo

### 4.1. Landmark 3D được lưu trữ thế nào trên MapSpace?
Qua kiểm tra source code và API thực tế:
1. **Phân nhóm công trình công khai (Public Landmarks):**
   - Được lưu trữ dưới dạng file chuẩn `.glb` trên CDN:
     `https://assets.kimq.tech/landmarks/{landmark-id}.glb`
   - *Ví dụ thực tế:* Landmark 81 được lưu tại:
     `https://assets.kimq.tech/landmarks/landmark-81.glb` (Dung lượng: ~1.75 MB, định dạng chuẩn `model/gltf-binary`).
2. **Bản quyền gốc của mô hình:**
   - Các mô hình được lấy từ kho **Sketchfab** theo giấy phép **Creative Commons Attribution (CC-BY)**.
   - *Ví dụ:* Landmark 81 ghi rõ bản quyền trong metadata API:
     > *“Landmark 81” của Dave Love SketchFab (Sketchfab), CC Attribution; MapSpace đổi tỉ lệ và đặt vào vị trí thật.*
3. **Phân nhóm công trình bảo vệ (Protected Landmarks):**
   - MapSpace có cơ chế mã hóa **AES-GCM** client-side đối với một số mô hình đặc thù thông qua endpoint `/api/landmarks/access`:
     - Server trả về `{ trace, models: { [id]: { near: { url, file, key }, far: { url, file, key } } } }`.
     - Client giải mã bằng Web Crypto API: `crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: encode(file) }, key, ciphertext)`.
     - Sau khi giải mã sẽ thu được mảng byte nhị phân của file `.glb` thông thường.

### 4.2. Cách Clone / Tải về phục vụ Demo

#### Cách 1: Tải trực tiếp qua CDN (Nhanh nhất)
Đối với các công trình công khai (như Landmark 81), tải trực tiếp bằng lệnh terminal:
```bash
curl -O "https://assets.kimq.tech/landmarks/landmark-81.glb"
```
Kiểm tra cấu trúc và hiển thị thử nghiệm bằng các công cụ 3D viewer (Blender, [gltf-viewer.donmccurdy.com](https://gltf-viewer.donmccurdy.com/)).

#### Cách 2: Trích xuất trực tiếp từ Browser DevTools
Khi mở một cảnh có Landmark trên MapSpace:
1. Mở Chrome DevTools (`F12`), chuyển sang tab **Console**.
2. Can thiệp trực tiếp vào Three.js scene trong bộ nhớ:
```javascript
// Tìm instance Three.js scene hoặc export trực tiếp đối tượng landmark
const landmark = window.__scene || /* tìm mesh Landmark trong scene root */;
// Hoặc lắng nghe hàm crypto.subtle.decrypt để hứng ArrayBuffer đã giải mã:
const originalDecrypt = crypto.subtle.decrypt.bind(crypto.subtle);
crypto.subtle.decrypt = async function(algorithm, key, data) {
  const result = await originalDecrypt(algorithm, key, data);
  const blob = new Blob([result], { type: 'model/gltf-binary' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'landmark-extracted.glb';
  a.click();
  return result;
};
```
Khi camera di chuyển đến gần công trình, file `.glb` sạch sẽ tự động được tải về máy.

#### Cách 3: Lấy trực tiếp từ nguồn gốc (Khuyến nghị cho dự án dài hạn)
Vì tác giả MapSpace lấy mô hình từ Sketchfab theo giấy phép CC-BY:
- Có thể lên trực tiếp [Sketchfab](https://sketchfab.com/) tìm kiếm tên công trình (ví dụ: `Landmark 81 Dave Love`, `Bitexco`, `Keangnam Landmark`).
- Tải file gốc định dạng GLTF/FBX với đầy đủ texture PBR chất lượng cao hơn.
- Giữ dòng ghi công tác giả theo đúng giấy phép CC-BY để đảm bảo tính hợp lệ.

---

## 5. Kết luận & Ứng dụng cho SkyTrack Mission Studio

- **Về công nghệ 3D:** Kiến trúc Mesh Extrusion từ OSM polygon kết hợp DEM nội suy độ cao là giải pháp tối ưu, nhẹ và dễ triển khai cho Cesium hoặc Three.js trong SkyTrack Mission Studio.
- **Về dữ liệu:** Hoàn toàn có thể xây dựng pipeline tự động lấy dữ liệu từ OSM + Google Open Buildings + Copernicus DEM 30m mà **không phát sinh chi phí mua bản quyền database**.
- **Về Landmark 3D:** Có thể clone trực tiếp từ CDN của MapSpace hoặc lấy từ Sketchfab (CC-BY) để làm tài nguyên mẫu (mock assets) cho các bản demo của Mission Studio.
