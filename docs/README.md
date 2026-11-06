# Mission Studio project tree

Tài liệu này giải thích các nhánh chính của standalone app `skytrack-mission-studio`, gồm source code, content, tests và tài liệu kỹ thuật. Project tự chạy bằng Vite; đây là app độc lập, không dùng router hoặc app shell của Prototype Hub.

Tree dưới đây tập trung vào thư mục được duy trì. `node_modules/`, `.npm-cache/`, `.git/`, `dist/` và file môi trường riêng không nằm trong tree vì là dependency, dữ liệu cục bộ hoặc output sinh tự động.

```text
skytrack-mission-studio/
├── .github/workflows/      CI và GitHub Pages deploy
├── agents/                 Hướng dẫn agent, architecture và các audit dùng lại
├── content/                Nội dung tĩnh được app bundle
├── docs/                   Bản đồ source/entity, specs và plans kỹ thuật
├── public/                 File phục vụ trực tiếp từ web root
├── scripts/                Guardrails và script hỗ trợ dev/deploy
├── src/                    Source code React, TypeScript và assets
├── tests/                  Test tự động và test loader
├── vendor/                 Package SkyTrack UI đã pin cho standalone app
├── index.html              HTML entry của Vite
├── package.json            Scripts và dependencies
├── package-lock.json       Dependency lockfile
├── tsconfig*.json          Cấu hình TypeScript
└── vite.config.ts          Cấu hình Vite, alias, Tailwind và Cesium
```

## Source code: `src/`

```text
src/
├── App.tsx
├── main.tsx
├── assets/
│   ├── download/            Logo, icon, illustration cho trang Download
│   ├── images/
│   │   └── mission-templates/ Thumbnail mission template
│   └── ...                  Logo, ảnh login, model và thumbnail mặc định
├── domain/                  Kiểu dữ liệu và quy tắc mission thuần
├── features/
│   ├── auth/                Login gate của prototype
│   ├── design/
│   │   ├── controls/        Field và control trong inspector
│   │   ├── drawing/         Draft và công cụ vẽ Route/Area/Avoid
│   │   ├── panels/          Inspector panels, AI model và Recon
│   │   └── sequence/        Mission sequence, action và drag behavior
│   ├── dev-tools/           Scenario và công cụ debug/dev
│   │   └── scenarios/
│   │       ├── cloud-sim-access/
│   │       └── restart-to-update/
│   ├── library/
│   │   ├── account/         Account menu và release notes
│   │   ├── cards/           Card, preview và thumbnail renderer
│   │   ├── create-wizard/   Các bước tạo mission
│   │   ├── database/        Local stores, persistence và asset access
│   │   │   ├── seeds/       JSON khởi tạo Library local storage
│   │   │   │   └── missions/
│   │   │   └── worlds/      World GLB và preview assets
│   │   │       └── previews/
│   │   ├── dialogs/         Library và resource dialogs
│   │   ├── drone-profile/   Trường và section của drone profile
│   │   ├── pages/           Library, Download, Templates, Worlds, Drones, v.v.
│   │   └── workspace/       Workspace switcher, data và resource hooks
│   ├── scene/               Cesium viewer, map layers, picking và entity sync
│   ├── search/              Address search và geocoding
│   ├── simulation/          Simulation plan, playback, telemetry và preview
│   └── studio/              Studio state/composition và Mission Insights
│       └── mission-insights/
│           └── sample-data/
│               ├── fail/
│               ├── leeville/
│               ├── ok/
│               ├── real/
│               └── world/
├── pages/                   Route-level Studio page composition
├── shared/                  Helper và state trung lập giữa các feature
└── ui/
    ├── components/          React controls/icons dùng lại trong app
    ├── layout/              Header, page layout và footer
    └── styles/              App styles và utility entry
```

### Trách nhiệm các source boundary

| Nhánh | Sở hữu | Không nên chuyển vào đây |
|---|---|---|
| `src/domain/` | Mission types, geometry, generation, validation, serialization và quy tắc xác định. Giữ độc lập với React, Cesium, DOM và browser storage. | Component, state UI, hoặc persistence. |
| `src/features/` | UI, state và tích hợp thuộc từng feature. Tìm trong feature tương ứng trước khi thêm logic. | Quy tắc domain dùng chung hoặc component dùng chung toàn app. |
| `src/shared/` | Storage keys, map data, preference và utility trung lập feature. | Presentation hoặc database riêng của feature. |
| `src/ui/components/` | Component và icon do app sở hữu, dùng lại giữa feature. | Logic nghiệp vụ của một feature. |
| `src/ui/layout/` | App shell/layout và ghép các vùng hiển thị. | Owner state bên trong scene, Library hoặc inspector. |
| `src/pages/` | Điểm ghép route-level cho Studio page. | Chi tiết nội bộ của từng feature. |
| `src/assets/` | Asset được import từ source code. | Nội dung dài cần sửa thường xuyên; đặt nội dung đó trong `content/`. |

### Đường đi chính trong app

1. `src/main.tsx` khởi động React và cấu hình app entry.
2. `src/App.tsx` tạo app shell và route host.
3. `src/features/library/` hiển thị Library pages và điều hướng mission.
4. `src/pages/mission-studio-page.tsx` ghép Studio page.
5. `src/features/studio/`, `design/`, `scene/` và `simulation/` phối hợp cho chỉnh sửa mission, Cesium scene và simulation preview.
6. `src/domain/` cung cấp quy tắc mission; các stores dưới `src/features/library/database/` quản lý dữ liệu browser-local.

Imports xuyên thư mục trong `src/` dùng alias `@/`; import trong cùng thư mục có thể dùng `./`. `@content/` trỏ tới content tĩnh ở project root. Cấu hình alias nằm trong `tsconfig.app.json` và `vite.config.ts`.

## Các nhánh ngoài source

| Đường dẫn | Vai trò |
|---|---|
| `content/download/platforms.json` | Metadata có cấu trúc cho platform, yêu cầu hệ thống và download. |
| `content/download/setup/*.md` | Hướng dẫn setup dài; Download page render Markdown và code blocks. |
| `content/changelogs/*.md` | Release notes đọc trong What's New. Xem `content/changelogs/README.md` để biết format. |
| `docs/` | Tài liệu kiến trúc và entity map; chi tiết ở phần dưới. |
| `agents/` | Local agent rules, coding practices, kiến trúc và audit tham khảo. Task evidence riêng nằm ở `agents/task-work/T-###/`. |
| `tests/` | Node test suite cho domain, source contracts, UI helpers và storage behavior. `register-typescript.cjs` thiết lập loader cho test. |
| `scripts/` | `architecture-guardrails.cjs` kiểm tra boundary; các script khác xử lý Pages fallback và cập nhật package UI. |
| `public/` | Favicon và static files được phục vụ nguyên trạng từ web root. |
| `vendor/` | Bản package UI pin để app độc lập với source của Prototype Hub. |
| `.github/workflows/` | CI và GitHub Pages workflow. |

`package.json` định nghĩa `dev`, `typecheck`, `lint`, `test`, `build` và script bảo trì. `vite.config.ts` cấu hình React, Tailwind, alias và asset/worker của Cesium. `index.html` là HTML shell; `tsconfig*.json` chia cấu hình TypeScript cho app và tooling.

## Cấu trúc tài liệu: `docs/`

```text
docs/
├── README.md
├── mission-studio-entity-map.md
├── entities/                Một note kebab-case cho mỗi entity
└── superpowers/
    ├── specs/                Spec kỹ thuật có ngày
    └── plans/                Kế hoạch thực hiện có ngày
```

- `mission-studio-entity-map.md` có sơ đồ Mermaid, entity catalog, quan hệ và source links.
- `entities/` ghi định nghĩa, quan hệ và bằng chứng của từng khái niệm; tag hỗ trợ Obsidian Graph, không tạo phân cấp thư mục source.
- `superpowers/specs/` và `superpowers/plans/` giữ tài liệu theo từng công việc. Tài liệu cũ có thể chỉ mang tính lịch sử; xem task hoặc decision record để biết trạng thái.

## Quy tắc chọn nơi đặt file

1. Logic mission xác định, không phụ thuộc UI: `src/domain/`.
2. UI/state/integration riêng một feature: `src/features/<feature>/`.
3. Helper trung lập feature: `src/shared/`.
4. Component dùng lại hoặc app frame: `src/ui/`.
5. Nội dung tĩnh người dùng đọc: `content/`.
6. Seed local storage: `src/features/library/database/seeds/`.
7. Entity model, architecture, spec hoặc plan: `docs/`.
8. Evidence của một task: `agents/task-work/T-###/`, không trộn vào tài liệu dùng lại.

## Tài liệu chi tiết

- [Project README](../README.md): chạy app, routes và ranh giới prototype.
- [Architecture reference](../agents/reference/architecture.md): state flow, domain rules và owner của behavior.
- [Coding practices](../agents/coding-practices.md): quy tắc module và thay đổi source.
- [Agent instructions](../agents/AGENTS.md): quy trình làm việc và kiểm tra project.
- [Mission Studio entity map](./mission-studio-entity-map.md): quan hệ khái niệm và source evidence.
