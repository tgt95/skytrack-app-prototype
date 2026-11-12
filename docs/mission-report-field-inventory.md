# Mission Report — field inventory

Tài liệu tra cứu các thông tin và field đang được render trong Mission Insights report của standalone prototype, kèm mục đích giúp người đọc hiểu mỗi field hỗ trợ việc gì.

> **Phạm vi dữ liệu:** bảng này bám theo source và report fixtures hiện tại: Simulation succeeded, Simulation failed và Real succeeded. `MissionInsightSample.type` hiện loại trừ `HITL`, vì vậy tài liệu không khẳng định prototype đã có report sample HITL. Giá trị thay đổi theo run; field không có trong fixture có thể hiện `Not supplied`, `Not recorded`, `—` hoặc không render.
>
> **Ranh giới sample:** một số vùng như Flight replay dùng shared planner sample, tách biệt với telemetry/run đã chọn. Raw JSON là sanitized prototype report sample, không phải manifest đầy đủ của một run thực.

## Header, định danh và điều hướng

| Khu vực | Field / control | Thông tin hiển thị | Dùng để làm gì |
| :-- | :-- | :-- | :-- |
| Header | Page title | Mission Insights | Giúp nhận biết report đang xem. |
| Header | Run ID | `run.id` | Định danh chính xác run, hỗ trợ đối chiếu và chia sẻ. |
| Header | Drone | `sample.vehicle` | Cho biết vehicle gắn với kết quả. |
| Header | World | `sample.world` | Cho biết môi trường hoặc khu vực chạy mission. |
| Header | Type | Simulation hoặc Real flight | Phân biệt run mô phỏng với run thực. |
| Header | Status | Succeeded / Failed (theo run fixture) | Cho biết kết quả tổng thể của run. Không đồng nhất với status của output hay severity của issue. |
| Header | Started | Ngày giờ bắt đầu đã format | Đặt kết quả vào đúng thời điểm chạy. |
| Header | Duration | Thời lượng run, giây | Cho biết run kéo dài bao lâu. |
| Header action | Apply to Mission Design | Nút hành động | Áp dụng dữ liệu run/sample vào Mission Design khi thao tác đó được hỗ trợ. |
| Header action | More actions | Menu: Copy URL, Download report | Chia sẻ đường dẫn report hoặc tải report sample JSON. |
| Header tabs | Overview, Flight path, Media & Files, AI Models, Timeline, Mission Logic, Raw JSON | Bảy tab report | Chuyển tới nhóm thông tin theo nhu cầu kiểm tra. |
| Sample notice | Illustrative values | Chỉ xuất hiện với các sample demo tương ứng; cảnh báo giá trị minh họa và ảnh tham chiếu không được run chụp | Tránh nhầm dữ liệu demo/ảnh tham chiếu với bằng chứng đã thu tại hiện trường. |

## Overview

| Nhóm | Field | Thông tin hiển thị | Dùng để làm gì |
| :-- | :-- | :-- | :-- |
| Mission result | Outcome headline | Kết quả chính hoặc lỗi runtime | Trả lời nhanh mission hoàn tất hay dừng do lỗi gì. |
| Mission result | Outcome details | Tiến độ waypoint, landing hoặc flight end state; nội dung thay đổi theo run | Giải thích ngắn kết quả và trạng thái cuối của chuyến bay. |
| Needs attention | Issue count / summary | Số warning/error và số issue được tóm tắt | Cho biết cần kiểm tra vấn đề hay không. |
| Needs attention | Severity | Error / Warning / Info theo issue | Giúp ưu tiên mức độ cần xử lý. |
| Needs attention | Issue code | Mã chẩn đoán, ví dụ `POSITIONING_REF_STALE` | Hỗ trợ tra cứu lỗi và liên kết với log/diagnostic. |
| Needs attention | Issue message | Mô tả dễ đọc và ngưỡng liên quan nếu có | Giải thích điều kiện nào bị vi phạm. |
| Needs attention | Issue time | Thời điểm issue trong run hoặc `Time unknown` | Định vị issue trong timeline. |
| Needs attention | View in Timeline | Nút điều hướng | Mở Timeline để xem chi tiết issue cùng hoạt động run. |
| Outputs | Output name | Ví dụ Location results, Captured image set, Survey image set | Nhận biết deliverable mà mission tạo ra. `Captured image set` là title UI khái quát; raw fixture vẫn giữ tên output gốc. |
| Outputs | Output status | `Available` hoặc `Partial` trong model hiện tại | Cho biết output đầy đủ/sẵn dùng hay chỉ có một phần. Không phải status của run. |
| Outputs | Preview + caption | Ảnh đại diện và nhãn nguồn ảnh | Xem nhanh nội dung đầu ra; caption cho biết ảnh là fixture, sample hay ảnh tham chiếu. |
| Outputs | Summary | Số lượng kỳ vọng/thực tế, định dạng/kích thước hoặc file thiếu | Giúp đánh giá nhanh output có đủ để tiếp tục dùng không. |
| Outputs | Open details | Nút mở chi tiết output | Xem summary, danh sách file, provenance, issue và thông tin ảnh nếu fixture cung cấp. |
| Output details | File row | Tên file, số lượng/size, thời điểm, trạng thái lưu và đường dẫn đã sanitize | Xác định file nào tồn tại, thiếu hoặc chưa được ghi. |
| Output details | Integrity | Verified/unavailable/mismatch cùng kích thước, availability | Kiểm tra mức độ có thể tin cậy và truy cập file theo fixture. |
| Output details | Detection result | Số detection, class/confidence, detection đã lưu hay chưa | Đánh giá kết quả mô hình có được ghi vào deliverable hay không. |
| Output details | Produced by | Action, time span, model/invocations | Truy ngược output được tạo bởi bước nào. |
| Output details | Issues | Lỗi ghi file, invocation hoặc lưu kết quả | Giải thích vì sao output bị Partial/thiếu dữ liệu. |
| Output details | Image information | File name, capture time, format, kích thước, thiết bị, màu sắc và metadata vị trí khi có | Nhận diện ngữ cảnh của ảnh nguồn. Một số field có thể bị lược bỏ/redact. |
| Output details | Lineage and identifiers | Artifact IDs, nguồn detection, action/model IDs, hash và pose khi có | Truy vết quan hệ giữa ảnh, detection và output. |
| Flight replay | Replay identity | Replay run ID, file name và start time | Định danh replay sample đang phát. Đây là shared planner replay, không phải telemetry của selected run. |
| Flight replay | Replay stats | Duration, maximum altitude/speed, distance, obstacle encounters, closest stop, replay warnings | Tóm tắt nội dung replay mẫu trước khi phát. Không dùng để suy ra số liệu của run đã chọn. |
| Flight replay | Sample counts | Position samples, depth frames và events | Cho biết replay chứa loại dữ liệu nào và quy mô sample. |
| Flight replay controls | Play/pause, playback speed, scrub time, camera (3D/Top/Side/Chase), follow drone, depth-frame toggles | Điều khiển phát lại và góc nhìn replay. | Giúp quan sát hành trình replay ở tốc độ/góc nhìn phù hợp. |
| Evidence | Completeness | Tổng kết output kỳ vọng/được tạo/được xác minh | Trả lời report có đủ bằng chứng theo fixture hay còn thiếu. |
| Evidence | Availability | File local, remote-only hoặc missing | Cho biết bằng chứng có thể truy cập ở đâu theo fixture. |
| Evidence | Signature | Trạng thái chữ ký/hash verification nếu có | Giúp nhận biết trạng thái xác thực toàn vẹn được report ghi nhận. |
| Run distributions | Actions by status | Số action theo trạng thái | Nhìn nhanh mức hoàn thành/thất bại của các action. |
| Run distributions | Files by type | Số file theo loại | Hiểu run tạo ra loại artifact nào và số lượng bao nhiêu. |

## Flight path

| Nhóm | Field | Thông tin hiển thị | Dùng để làm gì |
| :-- | :-- | :-- | :-- |
| Top view | Field / world label | Tên field/world | Định hướng bản đồ theo khu vực của report fixture. |
| Top view | Planned route | Waypoints và đường dự kiến | So sánh kế hoạch với đường bay ghi trong report. |
| Top view | Flown path and altitude | Đường bay thực ghi nhận; màu biểu thị altitude | Nhìn đường đi và thay đổi độ cao theo vị trí. |
| Top view | Waypoint state | Waypoint reached / not reached | Nhận diện tiến độ waypoint. |
| Top view | Image capture positions | Vị trí chụp ảnh và trạng thái availability | Đối chiếu vị trí camera capture với đường bay. |
| Top view | Detection locations | Vị trí detection; saved/not saved khi có | Liên hệ kết quả detection với ảnh và vị trí. |
| Top view | Pad and endpoints | Landing pad, touchdown hoặc last position, start/end | Hiểu điểm cất/hạ cánh và điểm cuối được report ghi nhận. |
| Top view | Map counts/legend | Số waypoint, capture, detection; chú giải lớp dữ liệu | Đọc đúng ý nghĩa từng dấu trên bản đồ. |
| Flight summary | Distance | Tổng quãng đường, m | Đánh giá phạm vi di chuyển. |
| Flight summary | Maximum altitude | Độ cao lớn nhất, m | Kiểm tra độ cao cao nhất ghi nhận. |
| Flight summary | Flight time | Thời lượng bay từ run duration | Đặt các metric đường bay vào ngữ cảnh thời gian. |
| Flight summary | Waypoints | Số waypoint reached/total và danh sách chưa tới | Đánh giá mức hoàn thành route. |
| Flight summary | Climb & descent | Độ cao mục tiêu/đã đạt và thời lượng takeoff/landing khi có | Xem diễn biến lên/xuống. |
| Flight summary | Path speed | Min–max tốc độ giữa các sample, m/s | Hiểu dải tốc độ được tính từ các sample liên tiếp. |
| Flight summary | Touchdown | Tọa độ và khoảng cách từ pad; hoặc không có touchdown | Đánh giá điểm hạ cánh so với pad. |
| Flight summary | Last position | X/Y/Z cuối cùng khi không có touchdown hoặc khi được ghi nhận | Xác định vị trí cuối cùng mà report có dữ liệu. |
| Flight summary | Image captures | Số ảnh local, trên Mission Computer và missing | Đánh giá khả năng truy cập media của chuyến bay. |
| Flight summary | Detections | Số detection địa lý trong report | Nắm số kết quả detection được ghi. |
| Flight summary | Primary diagnostic | Code, severity, message, time | Tóm tắt diagnostic chính bên cạnh đường bay; chọn để xem chi tiết hoặc mở Timeline. |
| 3D projection | Samples and interval | Số sample và khoảng lấy mẫu, giây | Cho biết mật độ dữ liệu dùng để dựng đường bay 3D. |
| 3D projection | X/Y/Z ranges | Dải tọa độ cục bộ, mét | Hiểu kích thước vùng hiển thị. |
| 3D projection | Speed range | Min–max tốc độ giữa các sample liên tiếp | Giải thích mã màu đoạn đường theo tốc độ. |
| Selected capture | File, capture time, availability, related detections, capture pose | Chi tiết ảnh được chọn trên bản đồ | Kiểm tra metadata ảnh và mở ảnh tương ứng trong Media & Files. |

## Media & Files

| Nhóm | Field | Thông tin hiển thị | Dùng để làm gì |
| :-- | :-- | :-- | :-- |
| Browse filters | All / Images / Videos / With detections / On Mission Computer / Local files | Bộ lọc và số lượng theo nhóm | Thu hẹp thư viện theo loại hoặc nơi lưu. |
| Search/filter | Search file name; Kind | Tên file cần tìm và loại artifact | Tìm nhanh file media hoặc file phụ trợ. |
| Media list | File name, action, availability, detection count | Thông tin rút gọn trên từng item | Chọn đúng ảnh/video và biết file có sẵn ở local hay remote. |
| Preview | Image/video preview, detection overlay | Nội dung media; overlay có thể bật/tắt khi sample có detection | Kiểm tra bằng chứng trực quan và vùng detection minh họa. |
| Information | Kind · size, Created, Modified, Content created, Dimensions | Loại file, dung lượng, thời điểm và kích thước khung hình | Nhận diện file và kiểm tra thông tin cơ bản. |
| Information | Duration, Codec (video) | Thời lượng và codec | Xác định đặc tính video. Chỉ hiển thị khi media là video và data có sẵn. |
| Information | Capture time, Color space, Color profile (image) | Thời điểm chụp và thông tin màu | Hiểu ngữ cảnh kỹ thuật của ảnh. |
| Information | Longitude, Latitude | Tọa độ metadata khi được cung cấp | Định vị ảnh; có thể bị redact/không supplied trong sample. |
| Information | Device make/model, Content creator, Sample path/Preview source | Nguồn tạo và vị trí file đã sanitize | Phân biệt asset thật trong fixture với preview dựng cho demo. |
| Producer & detections | Action, Producer, Detections | Action tạo media, component producer và số detection/kết quả liên quan | Truy nguồn media và xem liệu detection có kết quả tương ứng. |
| Detection detail | Class, confidence | Nhãn lớp và confidence được fixture cung cấp | Xem kết quả mẫu của mô hình; không tự nó chứng minh độ chính xác. |
| Artifact details | Artifact ID, role, media type, SHA-256, capture pose, related detection artifact | Định danh, toàn vẹn và liên kết artifact | Đối chiếu media với report và detection artifact liên quan. |
| Other files | Folder/file names, kind, availability, file count | Cây file phụ trợ và trạng thái file | Tìm artifact không phải ảnh/video, như log, telemetry, JSON hoặc output. |
| File details | SHA-256, Role, Kind, Media type, Path, Availability, Size | Metadata artifact được chọn | Kiểm tra file phụ trợ; path đã sanitize và không thao tác lên disk/remote. |
| Video timeline | Start, recorded/expected duration, capture markers, successful invocation markers, truncated state | Trục thời gian video cùng mốc ảnh và model invocation | Định vị capture/invocation trong video; chỉ render khi fixture có dữ liệu thời gian. |

## AI Models

| Nhóm | Field | Thông tin hiển thị | Dùng để làm gì |
| :-- | :-- | :-- | :-- |
| Model activity | Execution source | Ví dụ Mission Computer hoặc nguồn chạy khác nếu fixture có | Biết model được chạy ở đâu. |
| Model activity | Models, Invocations, With results, Zero results, Failed | Số tổng hợp model/invocation theo kết quả | Đánh giá hoạt động mô hình ở mức run. |
| Model activity | Invocations by result | Số invocation có kết quả, zero result và failed | Phân biệt không phát hiện với invocation thất bại. |
| Model activity | Detections by class | Detection count theo class | Nắm loại object được ghi nhận trong fixture. |
| Model inventory | Name, version, invocation count, detection count, invoked state | Danh sách model được cấu hình và trạng thái có gọi hay không | Xác định model tham gia run. |
| Model details | Model ID, Task, Classes, Producer, Execution location | Nhận dạng và cấu hình vai trò model | Đối chiếu model, loại tác vụ và vị trí xử lý. |
| Model details | Inputs processed, Detections, Mean · p95 duration, SHA-256 | Số input, kết quả, độ trễ và hash model | Đánh giá khối lượng xử lý và phiên bản model theo report. |
| Invocations table | Invocation, Model, Input, Availability, Output, Time, Result, Detections, Duration, Failure | Field cho mỗi invocation | Truy từng lần gọi model đến input/output và lỗi. |
| Trust note | Detection-count disclaimer | Counts là output của prototype fixture, không phải ground-truth và không chứng minh model accuracy | Ngăn diễn giải số demo như đánh giá độ chính xác. |

## Timeline

| View | Field | Thông tin hiển thị | Dùng để làm gì |
| :-- | :-- | :-- | :-- |
| Actions · timeline | Action name, status, start, duration | Thanh thời gian cho từng action | So sánh thứ tự, thời gian chạy và trạng thái các action. |
| Actions · table | Status, Action, Start · action duration, Action summary, Artifacts, Type · ID, Inputs, Outputs, Error, Timestamps (UTC) | Bản ghi chi tiết mỗi action | Tra input/output/error và định danh execution cho một hành động cụ thể. |
| Issues | Issue count, severity, code, time, message | Danh sách diagnostics trong selected report | Tìm warning/error và hiểu thời điểm/nguyên nhân được report ghi lại. |
| Issue details | Component, Action ID | Field bổ sung khi issue được chọn và report có giá trị | Liên kết issue với thành phần hoặc action phát sinh. |
| Events · stream metadata | Source path, first–last sequence, total event count, sequence gaps, displayed count | Metadata stream và số sample rows đang hiển thị | Phân biệt sample rows với tổng số events; nhận ra sequence bị mất. |
| Events · table | Sequence, Time, Type, Component | Các event sample của selected run | Tra sự kiện theo thứ tự, thời điểm, loại và component. |
| Events · gap row | Missing count, sequence range, time, component, `EVENTS_DROPPED` | Dấu hiệu khoảng sequence bị mất khi fixture ghi nhận | Cho biết event stream có gap, không giả lập event bị thiếu. |
| Events · filters | Type, Component | Lọc event sample theo hai trường | Tập trung vào loại sự kiện hoặc component cần kiểm tra. |
| Timeline tabs | Actions, Issues, Events | Chọn cách xem hoạt động | Chuyển giữa execution, diagnostics và event stream. |

## Mission Logic

| Nhóm | Field | Thông tin hiển thị | Dùng để làm gì |
| :-- | :-- | :-- | :-- |
| Mission logic | Authoring mode badge | Python script hoặc UI design plan | Nhận biết cách mission logic được author trong report. |
| Mission logic | Source file name, size, line count, language | File nguồn và kích thước/tính chất code | Định danh phần logic gắn với run. |
| Artifact details | Authoring mode, Entrypoint, SDK, Source revision | Thông tin build/source có trong report | Giúp đối chiếu code và môi trường đã khai báo. |
| Artifact details | File URI, Availability, SHA-256, Local path | Vị trí logic và trạng thái/hash; local path được redact trong sample | Xác minh nguồn logic mà không lộ private path. |
| Source preview | Source code | Nội dung file trong fixture | Đọc logic đã gắn với sample run. |
| Source actions | Copy code | Nút copy source | Sao chép source để xem hoặc phân tích bên ngoài prototype. |

## Raw JSON

Tab này hiển thị cây JSON của sanitized report sample, có thể mở rộng/thu gọn và tải xuống. Các key dưới đây là schema fields có trong fixtures; một số nested field chỉ có ở một sample.

| JSON path / nhóm field | Các field có trong fixture hiện tại | Dùng để làm gì |
| :-- | :-- | :-- |
| Root metadata | `$schema`, `schema_version`, `report_id`, `report_type`, `created_at` | Xác định schema, phiên bản và danh tính report sample. |
| `generator` | `name`, `version`, `runtime_instance_id` | Xác định phần mềm tạo report. |
| `source` | `kind`, `label` | Mô tả nguồn report/run. |
| `run` | `run_id`, `run_name`, `mission_id`, `mission_name`, `attempt`, `environment`, `status`, `started_at`, `ended_at`, `duration_ms`, `termination`, `local_folder`; `termination.reason` và `termination.failure.{action_id,code,message}` khi có | Metadata tổng thể/vòng đời run, và nguyên nhân kết thúc hoặc lỗi runtime. |
| `scenario` | `world_id`, `coordinate_frames[]` với `frame_id`, `parent_frame_id`, `type` | Khu vực/world và hệ tọa độ được khai báo. |
| `mission_definition` | `authoring_mode`, `definition_artifact_id`; `definition_file.{name,uri,media_type,size_bytes,line_count,preview,local_path}`; `entrypoint`; `sdk.{name,version}`; `source_revision.{type,value}` | Liên kết run với file mission logic, SDK và revision. Một số nested fields chỉ có ở một số fixture. |
| `vehicles[]` | `vehicle_id`, `name`, `vehicle_type`, `autopilot.{type,version}`, `model.{name}`, `payloads[].{payload_id,type}` | Vehicle, autopilot, model và payload liên quan. |
| `executions[]` | `execution_id`, `vehicle_id`, `status`, `actions[]` | Các execution và action records của run. |
| `executions[].actions[]` | `action_id`, `type`, `name`, `status`, `started_at`, `ended_at`, `t0_s`, `t1_s`, `inputs`, `outputs`, `error` (có thể có `code`/`message`) | Thời điểm, kết quả, dữ liệu vào/ra và lỗi theo action. Các key bên trong `inputs`/`outputs` tùy action. |
| `waypoints[]` | `index`, `x_m`, `y_m`, `z_m`, `reached` | Vị trí và trạng thái waypoint. |
| `field` | `polygon_m`, `label`, `pad.{x_m,y_m,radius_m}` | Hình học/vị trí field và landing pad. |
| `flight_path` | `frame_id`, `sample_interval_s`, `source_artifact_id`, `samples[].{t_s,x_m,y_m,z_m}`, `touchdown.{x_m,y_m,distance_from_pad_m}`, `last_position.{x_m,y_m,z_m}`, `max_altitude_m`, `distance_m` | Sample đường bay và tóm tắt endpoint/metrics. `last_position` chỉ có trong một số fixture. |
| `flight_path.samples[]` | `t_s`, `x_m`, `y_m`, `z_m` | Mẫu vị trí theo thời gian, dùng để dựng path và tính các metrics. |
| `event_streams[]` | `stream_id`, `format`, `uri`, `event_count`, `first_sequence`, `last_sequence`, `sequence_gaps[]` | Mô tả stream, số event và gaps. Raw event file đầy đủ không nhất thiết có trong fixture. |
| `artifacts[]` | `artifact_id`, `type`, `role`, `uri`, `media_type`, `size_bytes`, `sha256`, `created_at`, `created_by.{producer_type,component}`, `context.{execution_id,action_id,vehicle_id,event_id}`, `derived_from[]`, `availability.{state,location}`, `metadata`, `local_path` | Danh sách artifact, nguồn tạo, liên kết và trạng thái lưu trữ. |
| `artifacts[].metadata` | `file.{name,kind,size_bytes,created,modified,content_created,width_px,height_px,color_space,color_profile,device_make,device_model,content_creator,latitude_deg,longitude_deg,duration_ms,codec}`; `capture_pose.{frame_id,x_m,y_m,z_m}`; `capture_time_s`, `width_px`, `height_px`, `duration_ms`, `expected_duration_ms`, `start_time_s`, `truncated`, `codec`, `poster`, `preview`, `rows`, `expected_rows`, `object_count`, `classes`, `format`, `geometry.{type,coordinate_space}`, `georeferenced`, `objects[].{class,confidence,bbox,polygon}` | Metadata nội dung file theo loại artifact; mỗi artifact chỉ có một phần field này. |
| `ai_models[]` | `model_id`, `name`, `version`, `sha256`, `producer_type`, `task`, `classes[]`, `runs_on`, `invocations.{total,with_results,zero_results,failed}`, `inputs_processed`, `detections`, `mean_duration_ms`, `p95_duration_ms` | Cấu hình và số liệu model. `runs_on` không có ở mọi fixture. |
| `invocations[]` | `invocation_id`, `model_id`, `input_artifact_id`, `output_artifact_id`, `started_s`, `duration_ms`, `result`, `result_count`, `error` | Mỗi lần gọi model, input/output, kết quả và lỗi nếu có. |
| `detections_geo[]` | `class`, `x_m`, `y_m`, `source_artifact_id`, `saved_as_rescue_location` | Vị trí detection, ảnh nguồn và trạng thái lưu khi report có trường đó. |
| `expected_outputs[]` | `output_id`, `name`, `required`, `expected_count` | Output dự kiến và số lượng kỳ vọng. |
| `outputs[]` | `output_id`, `name`, `type`, `status`, `summary`, `artifact_ids`, `produced_by_action_ids` | Trạng thái và liên kết của output tổng hợp. |
| `diagnostics` | `completeness`, `availability`, `dropped_event_count`, `incomplete_artifact_ids`, `items[]` | Tình trạng dữ liệu, file thiếu và diagnostics. |
| `diagnostics.items[]` | `severity`, `code`, `message`, `time_s`, `action_id`, `component` | Chi tiết từng warning/error/info được ghi trong report. |
| `integrity` | `manifest_sha256`, `checksums_uri`, `signature.{algorithm,key_id,value}`, `verification.{checked_at,signature,artifacts.{verified,mismatch,unavailable,declared},details[].{artifact_id,reason,result}}` | Manifest, chữ ký và kết quả kiểm tra toàn vẹn được khai báo. |

## Source map

- Report tabs, header, sample types: `src/features/studio/mission-insights/mission-insights-page.tsx`, `mission-insights-data.ts`, `mission-insights-report-tabs.tsx`.
- Overview, output details and evidence: `mission-insights-report-overview.tsx`, `mission-insights-page-sections.tsx`, `mission-insights-output-data.ts`.
- Flight path, media, models, timeline, logic and raw JSON: files named `mission-insights-report-*.tsx` in the same feature directory.
- Raw report fixtures: `src/features/studio/mission-insights/sample-data/{ok,fail,real}/report.json`.

