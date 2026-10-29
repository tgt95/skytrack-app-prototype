import type { CSSProperties } from "react";
import { CheckboxIndicator, CheckboxRoot } from "skytrack-ui/checkbox";
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderLabel,
  SliderThumb,
  SliderTrack,
} from "skytrack-ui/slider";
import { Tabs, TabsList, TabsPanel, TabsTab } from "skytrack-ui/tabs";
import {
  getMockReconGsdCmPerPx,
  type ReconFlightSettings,
} from "../../../domain/mission-model";
import {
  distanceFromDisplay,
  distanceToDisplay,
  distanceUnit,
  formatResolution,
  speedFromDisplay,
  speedToDisplay,
  speedUnit,
  useMeasurementSystem,
} from "../../../shared/measurement-units";

interface ReconnaissanceSettingsFormProps {
  value: ReconFlightSettings;
  onChange: (value: ReconFlightSettings) => void;
  showFlightPattern?: boolean;
  altitudeReference?: "AGL";
}

type NumericSetting = Exclude<
  keyof ReconFlightSettings,
  "enabled" | "flightPattern" | "terrainAwareness"
>;

/* Ranges, marks, and hints follow the owner-approved capture table and
   Planner LiveSlider copy (adapted to English; Planner source untouched). */
const numericFields: Array<{
  key: NumericSetting;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  marks?: number[];
  hint?: string;
}> = [
  {
    key: "altitudeM",
    label: "Flight altitude",
    min: 30,
    max: 200,
    step: 1,
    unit: "m",
    marks: [30, 80, 130, 200],
  },
  {
    key: "frontOverlapPct",
    label: "Front overlap",
    min: 50,
    max: 95,
    step: 1,
    unit: "%",
    marks: [50, 65, 75, 90, 95],
    hint: "50–65%: Low · 65–75%: Minimum · 75–90%: Recommended · 90–95%: Dense",
  },
  {
    key: "sideOverlapPct",
    label: "Side overlap",
    min: 50,
    max: 95,
    step: 1,
    unit: "%",
    marks: [50, 65, 75, 90, 95],
    hint: "50–65%: Low · 65–75%: Minimum · 75–90%: Recommended · 90–95%: Dense",
  },
  {
    key: "gimbalPitchDeg",
    label: "Gimbal pitch",
    min: -90,
    max: -30,
    step: 1,
    unit: "°",
    marks: [-90, -65, -30],
    hint: "Tilted −65° is best for facades and 3D",
  },
  {
    key: "flightSpeedMS",
    label: "Flight speed",
    min: 2,
    max: 15,
    step: 0.5,
    unit: "m/s",
    marks: [2, 5, 8, 12, 15],
    hint: "Safe cruise speed for mechanical-shutter quality.",
  },
];

/* Numeric setting rendered as a skytrack-ui Slider, patterned on Planner's
   LiveSlider (label row with live value badge, slider below). Ranges, steps,
   units, and defaults come from numericFields unchanged; the slider clamps
   to min/max and the thumb carries the accessible name with full keyboard
   operation (arrows/Home/End). Draft semantics are unchanged: every change
   lands in the nested settings-page draft and only Save commits it. */
function ReconSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  marks,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  marks?: number[];
  hint?: string;
  onChange: (value: number) => void;
}) {
  const display = Number.isInteger(value) ? String(value) : value.toFixed(1);
  const toPct = (mark: number) => ((mark - min) / (max - min)) * 100;
  return (
    <div
      className={" grid gap-2 pt-3.5 px-0.5 pb-2.5 border-t border-t-border"}
      data-testid="ms-recon-slider"
    >
      <Slider
        className="w-full"
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={(next: number | readonly number[]) => {
          const first = Array.isArray(next) ? next[0] : next;
          if (typeof first === "number" && Number.isFinite(first))
            onChange(first);
        }}
      >
        <div
          className=" flex items-baseline justify-between gap-2 text-(--foreground)"
          data-testid="ms-recon-slider-head"
        >
          <SliderLabel data-testid="ms-recon-slider-label">{label}</SliderLabel>
          <span
            className=" py-0.25 px-2 rounded-(--radius) bg-(--muted) text-(--foreground) text-[0.6875rem] font-semibold [font-variant-numeric:tabular-nums] whitespace-nowrap"
            data-testid="ms-recon-slider-badge"
          >
            {display}
            {unit}
          </span>
        </div>
        <SliderControl>
          <SliderTrack className="relative">
            <SliderIndicator />
            {marks?.map((mark) => (
              <span
                key={mark}
                aria-hidden="true"
                className=" absolute left-(--ms-recon-mark-position) top-[50%] w-px h-2 transform-[translate(-50%,-50%)] bg-(--foreground) opacity-[0.4] pointer-events-none"
                style={
                  {
                    "--ms-recon-mark-position": `${toPct(mark)}%`,
                  } as CSSProperties
                }
                data-testid="ms-recon-mark-tick"
              />
            ))}
            <SliderThumb aria-label={`${label} in ${unit}`} />
          </SliderTrack>
        </SliderControl>
      </Slider>
      {marks && marks.length > 0 ? (
        <div
          data-testid="ms-recon-mark-labels"
          className="relative h-4 [user-select:none]"
          aria-hidden="true"
        >
          {marks.map((mark, index) => (
            <span
              key={mark}
              className={`absolute left-(--ms-recon-mark-position) text-[0.6875rem] text-(--muted-foreground) whitespace-nowrap [font-variant-numeric:tabular-nums] ${index === 0 ? "transform-none" : index === marks.length - 1 ? "transform-[translateX(-100%)]" : "transform-[translateX(-50%)]"}`}
              style={
                {
                  "--ms-recon-mark-position": `${toPct(mark)}%`,
                } as CSSProperties
              }
            >
              {mark}
            </span>
          ))}
        </div>
      ) : null}
      {hint ? (
        <p
          className=" m-0 text-(--muted-foreground) text-xs leading-[1.6]"
          data-testid="ms-recon-slider-hint"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function ReconnaissanceSettingsForm({
  value,
  onChange,
  showFlightPattern = false,
  altitudeReference,
}: ReconnaissanceSettingsFormProps) {
  const unitSystem = useMeasurementSystem();
  const updateNumber = (key: NumericSetting) => (nextValue: number) => {
    if (!Number.isFinite(nextValue)) return;
    onChange({ ...value, [key]: nextValue });
  };

  const updatePattern = (next: unknown) => {
    onChange({
      ...value,
      flightPattern: String(next) === "double" ? "double" : "single",
    });
  };

  const updateTerrainAwareness = (checked: boolean) => {
    onChange({ ...value, terrainAwareness: checked });
  };

  return (
    <div data-testid="ms-recon-form">
      {altitudeReference === "AGL" ? (
        <p className="ms-hint">
          Altitude AGL uses a flat z=0 reference plane; terrain is not modeled.
        </p>
      ) : null}
      <div
        className=" pt-4 grid grid-cols-[minmax(0,1fr)] gap-1"
        data-testid="ms-recon-form-grid"
      >
        {numericFields.map(
          ({ key, label, min, max, step, unit, marks, hint }) => {
            const isAltitude = key === "altitudeM";
            const isSpeed = key === "flightSpeedMS";
            const displayValue = isAltitude
              ? distanceToDisplay(value[key], unitSystem)
              : isSpeed
                ? speedToDisplay(value[key], unitSystem)
                : value[key];
            const displayMin = isAltitude
              ? distanceToDisplay(min, unitSystem)
              : isSpeed
                ? speedToDisplay(min, unitSystem)
                : min;
            const displayMax = isAltitude
              ? distanceToDisplay(max, unitSystem)
              : isSpeed
                ? speedToDisplay(max, unitSystem)
                : max;
            const displayStep =
              unitSystem === "imperial" && isAltitude
                ? 5
                : unitSystem === "imperial" && isSpeed
                  ? 0.5
                  : step;
            const displayUnit = isAltitude
              ? distanceUnit(unitSystem)
              : isSpeed
                ? speedUnit(unitSystem)
                : unit;
            const displayMarks = marks?.map((mark) =>
              isAltitude
                ? distanceToDisplay(mark, unitSystem)
                : isSpeed
                  ? speedToDisplay(mark, unitSystem)
                  : mark,
            );
            const commitDisplayValue = (next: number) =>
              updateNumber(key)(
                isAltitude
                  ? distanceFromDisplay(next, unitSystem)
                  : isSpeed
                    ? speedFromDisplay(next, unitSystem)
                    : next,
              );
            const fieldLabel =
              key === "altitudeM" && altitudeReference === "AGL"
                ? "Flight altitude (AGL)"
                : label;
            const fieldHint =
              key === "altitudeM"
                ? `Resolution estimate: GSD ${formatResolution(getMockReconGsdCmPerPx(value.altitudeM), unitSystem)}`
                : hint;
            return (
              <ReconSlider
                key={key}
                label={fieldLabel}
                value={displayValue}
                min={displayMin}
                max={displayMax}
                step={displayStep}
                unit={displayUnit}
                marks={displayMarks}
                hint={fieldHint}
                onChange={commitDisplayValue}
              />
            );
          },
        )}

        {showFlightPattern ? (
          <div
            className=" grid gap-1.25 text-(--muted-foreground) text-xs"
            data-testid="ms-recon-form-field"
          >
            <span
              className="ms-recon-form-label text-sm font-medium text-foreground"
              id="ms-recon-form-flight-pattern-label"
            >
              Flight pattern
            </span>
            <Tabs
              value={value.flightPattern}
              onValueChange={updatePattern}
              className=" w-full max-w-none"
              data-testid="ms-recon-pattern-tabs"
            >
              <TabsList
                variant="filled"
                className=" w-full"
                aria-labelledby="ms-recon-form-flight-pattern-label"
                data-testid="ms-recon-pattern-list"
              >
                <TabsTab value="single" variant="filled" size="sm">
                  Single grid
                </TabsTab>
                <TabsTab value="double" variant="filled" size="sm">
                  Double grid
                </TabsTab>
              </TabsList>
              <TabsPanel value="single" className="ms-recon-pattern-panel">
                <span className="ms-sr">Single grid flight pattern.</span>
              </TabsPanel>
              <TabsPanel value="double" className="ms-recon-pattern-panel">
                <span className="ms-sr">Double grid flight pattern.</span>
              </TabsPanel>
            </Tabs>
          </div>
        ) : null}
      </div>

      {showFlightPattern ? (
        <p className="ms-recon-form-help">
          For Area scans, Front overlap sets photo spacing and Side overlap sets
          lane spacing using the camera footprint.
        </p>
      ) : null}

      <label
        className=" flex items-start gap-2 mt-3.5"
        data-testid="ms-recon-form-toggle"
      >
        <CheckboxRoot
          checked={value.terrainAwareness}
          onCheckedChange={(checked) =>
            updateTerrainAwareness(checked === true)
          }
          aria-label="Terrain awareness"
        >
          <CheckboxIndicator aria-hidden="true">✓</CheckboxIndicator>
        </CheckboxRoot>
        <span
          className=" grid gap-0.75"
          data-testid="ms-recon-form-toggle-copy"
        >
          <span className="ms-recon-form-label">Terrain awareness</span>
          <span className="ms-recon-form-help">
            Adjust the route to follow changes in terrain elevation.
          </span>
        </span>
      </label>
    </div>
  );
}
