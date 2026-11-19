# Front and Side overlap — implementation hand-off

**Audience:** Mission Studio frontend/domain developer implementing or reviewing Area Recon spacing.
**Source of truth:** Current Mission Studio source under `src/`. This note consolidates the behavior and source map so it can be handed to an implementer as one working reference.
**Current status:** Describes the implemented prototype model. The formulas below are nominal flat-ground estimates, not calibrated payload or terrain calculations.

## Expected behavior

- **Front overlap** controls spacing between photo captures along each scan lane.
- **Side overlap** controls spacing between neighboring scan lanes.
- Higher overlap means smaller spacing. Keep these axes independent.
- With Area Recon enabled, Side overlap drives scan-lane generation and Front overlap drives photo sampling on those lanes.
- With Area Recon disabled, lane spacing comes from the Area's manual `lineSpacingM`; the Recon Front-overlap photo interval is not used to resample the traversal path.
- A double-grid pattern adds a second scan pass rotated by 90 degrees; both passes use the same Side-overlap-derived spacing.

## Current calculation

The mock payload has a sensor width but no sensor height, so the prototype assumes a square, nadir-equivalent ground footprint:

```text
F = H × sensorWidth / focalLength
  = H × 17.3 mm / 12.3 mm
```

`H` is the Recon altitude in meters. Sensor width and focal length share units, so their ratio is dimensionless and `F` is in meters. The same footprint dimension is used for both image axes.

For overlap target `p` percent, effective spacing is:

```text
spacing = max(0.25 m, F × (1 − p / 100))
```

At 100 m altitude, `F ≈ 140.65 m`:

| Overlap | Spacing |
| ---: | ---: |
| 50% | 70.33 m |
| 75% | 35.16 m |
| 90% | 14.07 m |
| 95% | 7.03 m |

### Bounds, defaults, and fallbacks

- The overlap spacing helper clamps finite overlap input to **50–95%**. Values below 50% use 50%; values above 95% use 95%.
- A non-finite overlap falls back to the helper's fallback argument; current Front/Side call sites pass their corresponding default, both **50%**.
- Imported Recon settings are normalized separately: `frontOverlapPct` and `sideOverlapPct` accept **0–95%**. The current UI sliders expose **50–95%**. The calculation clamp still enforces 50% as the effective minimum.
- The footprint helper uses finite altitude with a **1 m** minimum; non-finite altitude falls back to the default Recon altitude (**30 m**). Imported settings currently normalize altitude to **2–500 m**; the Recon form exposes **30–200 m**.
- The **0.25 m** spacing floor avoids zero or tiny intervals.
- With Recon off, manual `lineSpacingM` defaults to **6 m** when absent or non-finite and has the same **0.25 m** minimum. Its UI has its own display range; do not confuse that range with the domain clamp.

## Generation and data flow

1. Recon settings are represented by `ReconFlightSettings` (`enabled`, altitude, Front/Side percentages, pattern, and related settings). Imported or persisted input passes through `reconSettingsFrom` normalization.
2. `generateAreaScan` calls `getAreaScanSpacingM`: Side-derived spacing for enabled Recon; manual `lineSpacingM` otherwise. It generates clipped lanes in local ENU coordinates and uses the configured orientation. `double` adds the perpendicular pass.
3. `generateAreaCapturePath` samples each scan lane at intervals no larger than `getAreaPhotoSpacingM` when Recon is enabled. Lane connectors remain in the route but are marked `capturePhoto: false`; scan-lane samples are `true`. Coincident points are merged and their capture flags combined.
4. `mission-generation.ts` consumes that path to create Area waypoints and photo actions. `sync-area-entities.ts`, Preview/Simulation, and serialization also consume generated Area geometry or capture paths. Keep these outputs aligned when changing the domain model.
5. `area-inspector-card.tsx` displays effective lane spacing while Recon is enabled. With Recon disabled, it offers manual line-spacing editing. The Recon settings form exposes the Front/Side controls and explains their distinct Area behavior.

## Source map

| Concern | File and symbols | Implementation note |
| --- | --- | --- |
| Recon shape, defaults, camera constants, import bounds | [`mission-types.ts`](../src/domain/mission-types.ts): `ReconFlightSettings`, `DEFAULT_RECON_FLIGHT_SETTINGS`, `DEFAULT_AREA_RECON_FLIGHT_SETTINGS`, `MOCK_RECON_CAMERA_PROFILE`, `reconSettingsFrom` | Defaults are 50% / 50%; mock profile is 17.3 mm sensor width, 12.3 mm focal length, 5280 px width. |
| Core formula and lane/path generation | [`area-scan.ts`](../src/domain/area-scan.ts): `getMockReconNadirFootprintM`, `getReconOverlapSpacingM`, `getAreaScanSpacingM`, `getAreaPhotoSpacingM`, `generateAreaScan`, `generateAreaCapturePath` | Primary implementation source for overlap math. Keep formulas centralized here. |
| Settings controls and helper copy | [`reconnaissance-settings-form.tsx`](../src/features/design/panels/reconnaissance-settings-form.tsx) | Slider values currently range 50–95%; copy says Front controls photo spacing and Side controls lane spacing for Area scans. |
| Area-local spacing display/edit | [`area-inspector-card.tsx`](../src/features/design/sequence/area-inspector-card.tsx) | Shows Side-derived spacing with Recon on; manual line spacing with Recon off. |
| Area edit draft defaults | [`use-area-edit-actions.ts`](../src/features/design/use-area-edit-actions.ts) | Missing `lineSpacingM`, orientation, and padding get edit-time defaults. |
| Mission generation and photo actions | [`mission-generation.ts`](../src/domain/mission-generation.ts) | Maps generated capture path into Area waypoints/actions; verify capture flags when spacing behavior changes. |
| Scene visualization of generated Area | [`sync-area-entities.ts`](../src/features/scene/sync-area-entities.ts) | Renders saved/generated scan lanes; this is downstream of domain spacing. |
| Consumers of capture path | [`mission-serialization.ts`](../src/domain/mission-serialization.ts), [`simulation-plan.ts`](../src/features/simulation/simulation-plan.ts) | Serialization and Simulation derive/use the generated path; check for behavioral consistency. |
| Preview draft lane generation | [`scene-draft-sync.ts`](../src/features/scene/scene-draft-sync.ts) | Draft preview calls `generateAreaScan`; it receives only manual Area settings today, so it is not the authoritative Recon capture-path renderer. |

## Implementation guidance for the receiving developer

1. Confirm whether the requested change affects the overlap definition, the mock camera footprint, Recon input bounds, lane generation, photo sampling, or only explanatory UI. Avoid changing multiple layers when one domain helper is sufficient.
2. Keep Front/Side math in `area-scan.ts`; update consumers to use its helpers instead of copying the formula.
3. Preserve the separation: Side drives cross-track lane spacing; Front drives along-track capture spacing. Do not wire Front into lane generation or Side into photo sampling.
4. Preserve the manual `lineSpacingM` path when Recon is disabled. Do not let a saved Recon value override the manual setting in that state.
5. If spacing changes, inspect generated lane geometry, capture waypoint locations/actions, visible lane entities, and serialization/Simulation consumers. Update the Recon form or Area inspector explanation if the user-visible meaning changes.
6. Keep the current flat z=0 / nominal footprint limitation explicit in technical claims. `projectMockReconFootprintToGround` is a separate view-projection helper; it projects a camera image footprint and is not the overlap spacing formula.

## Acceptance checks for a spacing change

- At fixed altitude, increasing either overlap decreases spacing on its own axis only.
- At fixed overlap, increasing altitude increases nominal footprint and resulting spacing proportionally, unless the 0.25 m floor applies.
- Finite overlap inputs below 50% and above 95% clamp to the documented effective range; non-finite overlap uses the configured fallback.
- Front overlap changes capture sample spacing without changing scan-lane separation.
- Side overlap changes scan-lane separation without changing the along-lane capture interval.
- Recon-off Areas retain the manual line-spacing behavior and do not get Recon Front-overlap resampling.
- Double grid adds a perpendicular pass with the same Side spacing; connector points do not create photo captures when Recon is enabled.
- Generated geometry, capture actions, displayed lane spacing, and serialized/Simulation paths remain consistent.

## Model limits

This is a prototype estimate based on a mock camera profile and flat ground. The missing sensor height is approximated with sensor width, altitude is treated as camera height above the reference plane, and the model does not account for terrain, lens distortion, calibrated payload intrinsics, or relief displacement. Do not present these values as mission-grade photogrammetry accuracy.
