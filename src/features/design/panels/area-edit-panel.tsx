import { useId } from "react";
import { Button } from "skytrack-ui/button";
import { FieldLabel, FieldRoot } from "skytrack-ui/field";
import { NumberField, NumberFieldInput } from "skytrack-ui/number-field";
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
} from "skytrack-ui/slider";
import { AreaIcon } from "@/ui/components/icons";
import { getAreaScanSpacingM, type MissionArea } from "@/domain/mission-model";
import {
  distanceFromDisplay,
  distanceToDisplay,
  distanceUnit,
  useMeasurementSystem,
} from "@/shared/measurement-units";

interface AreaEditPanelProps {
  draft: MissionArea;
  onDraftChange: (draft: MissionArea) => void;
  onCancel: () => void;
  onCommit: () => void;
}

export function AreaEditPanel({
  draft,
  onDraftChange,
  onCancel,
  onCommit,
}: AreaEditPanelProps) {
  const unitSystem = useMeasurementSystem();
  const fieldId = useId();
  const lineSpacingLabelId = `${fieldId}-line-spacing`;
  const orientationLabelId = `${fieldId}-orientation`;
  const scanPaddingLabelId = `${fieldId}-scan-padding`;
  const updateDistance = (
    key: "lineSpacingM" | "paddingM",
    value: number,
    min: number,
    max: number,
  ) => {
    onDraftChange({
      ...draft,
      [key]: distanceFromDisplay(
        Math.min(
          distanceToDisplay(max, unitSystem),
          Math.max(distanceToDisplay(min, unitSystem), value),
        ),
        unitSystem,
      ),
    });
  };

  return (
    <form
      className="ms-inspector box-border flex h-full min-h-0 w-full min-w-0 flex-col gap-0 overflow-hidden"
      aria-label={`Edit ${draft.label} area settings`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        } else if (
          event.key === "Enter" &&
          event.target instanceof HTMLElement &&
          event.target.getAttribute("role") === "slider"
        ) {
          event.preventDefault();
          event.currentTarget.requestSubmit();
        }
      }}
      onSubmit={(event) => {
        event.preventDefault();
        onCommit();
      }}
    >
      <header className="sticky top-0 z-2 w-full min-w-0 border-b border-border bg-(--card) p-4">
        <h2 className="m-0 flex items-center gap-2 text-lg font-semibold">
          <AreaIcon
            aria-hidden="true"
            className="ms-route-icon w-4 h-4 text-foreground shrink-0"
          />
          Edit area
        </h2>
        <p className="m-0 mt-1 text-sm text-muted-foreground">
          {draft.label}
        </p>
      </header>
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-4">
        {draft.reconnaissance?.enabled ? (
          <p className="m-0 text-sm text-muted-foreground leading-[1.5]">
            Lane spacing follows Side overlap (
            {distanceToDisplay(getAreaScanSpacingM(draft), unitSystem).toFixed(
              1,
            )}{" "}
            {distanceUnit(unitSystem)}) while Recon is on. Turn Recon off to
            edit manual line spacing.
          </p>
        ) : (
          <FieldRoot data-testid="ms-slider-field">
            <FieldLabel id={lineSpacingLabelId} data-testid="ms-slider-label">
              {`Line spacing (${distanceUnit(unitSystem)})`}
            </FieldLabel>
            <div className="flex w-full items-center gap-2">
              <div className="flex-[1_1_auto] flex items-center min-w-0">
                <Slider
                  value={distanceToDisplay(draft.lineSpacingM ?? 6, unitSystem)}
                  min={distanceToDisplay(0.25, unitSystem)}
                  max={distanceToDisplay(20, unitSystem)}
                  step={unitSystem === "imperial" ? 0.5 : 0.25}
                  onValueChange={(next) => {
                    const value = typeof next === "number" ? next : next[0];
                    if (typeof value === "number")
                      updateDistance("lineSpacingM", value, 0.25, 20);
                  }}
                >
                  <SliderControl>
                    <SliderTrack>
                      <SliderIndicator />
                      <SliderThumb aria-labelledby={lineSpacingLabelId} />
                    </SliderTrack>
                  </SliderControl>
                </Slider>
              </div>
              <div className="grow-0 shrink-0 basis-17">
                <NumberField
                  value={distanceToDisplay(draft.lineSpacingM ?? 6, unitSystem)}
                  min={distanceToDisplay(0.25, unitSystem)}
                  max={distanceToDisplay(20, unitSystem)}
                  step={unitSystem === "imperial" ? 0.5 : 0.25}
                  className="w-full"
                  onValueChange={(value) => {
                    if (typeof value === "number" && Number.isFinite(value))
                      updateDistance("lineSpacingM", value, 0.25, 20);
                  }}
                >
                  <NumberFieldInput aria-labelledby={lineSpacingLabelId} />
                </NumberField>
              </div>
            </div>
          </FieldRoot>
        )}
        <FieldRoot data-testid="ms-slider-field">
          <FieldLabel id={orientationLabelId} data-testid="ms-slider-label">
            Orientation (°)
          </FieldLabel>
          <div className="flex w-full items-center gap-2">
            <div className="flex-[1_1_auto] flex items-center min-w-0">
              <Slider
                value={draft.orientationDeg ?? 0}
                min={-180}
                max={180}
                step={1}
                onValueChange={(next) => {
                  const value = typeof next === "number" ? next : next[0];
                  if (typeof value === "number")
                    onDraftChange({ ...draft, orientationDeg: value });
                }}
              >
                <SliderControl>
                  <SliderTrack>
                    <SliderIndicator />
                    <SliderThumb aria-labelledby={orientationLabelId} />
                  </SliderTrack>
                </SliderControl>
              </Slider>
            </div>
            <div className="grow-0 shrink-0 basis-17">
              <NumberField
                value={draft.orientationDeg ?? 0}
                min={-180}
                max={180}
                step={1}
                className="w-full"
                onValueChange={(value) => {
                  if (typeof value === "number" && Number.isFinite(value))
                    onDraftChange({
                      ...draft,
                      orientationDeg: Math.min(180, Math.max(-180, value)),
                    });
                }}
              >
                <NumberFieldInput aria-labelledby={orientationLabelId} />
              </NumberField>
            </div>
          </div>
        </FieldRoot>
        <FieldRoot data-testid="ms-slider-field">
          <FieldLabel id={scanPaddingLabelId} data-testid="ms-slider-label">
            {`Scan padding (${distanceUnit(unitSystem)})`}
          </FieldLabel>
          <div className="flex w-full items-center gap-2">
            <div className="flex-[1_1_auto] flex items-center min-w-0">
              <Slider
                value={distanceToDisplay(draft.paddingM ?? 0, unitSystem)}
                min={distanceToDisplay(0, unitSystem)}
                max={distanceToDisplay(20, unitSystem)}
                step={unitSystem === "imperial" ? 1 : 0.5}
                onValueChange={(next) => {
                  const value = typeof next === "number" ? next : next[0];
                  if (typeof value === "number")
                    updateDistance("paddingM", value, 0, 20);
                }}
              >
                <SliderControl>
                  <SliderTrack>
                    <SliderIndicator />
                    <SliderThumb aria-labelledby={scanPaddingLabelId} />
                  </SliderTrack>
                </SliderControl>
              </Slider>
            </div>
            <div className="grow-0 shrink-0 basis-17">
              <NumberField
                value={distanceToDisplay(draft.paddingM ?? 0, unitSystem)}
                min={distanceToDisplay(0, unitSystem)}
                max={distanceToDisplay(20, unitSystem)}
                step={unitSystem === "imperial" ? 1 : 0.5}
                className="w-full"
                onValueChange={(value) => {
                  if (typeof value === "number" && Number.isFinite(value))
                    updateDistance("paddingM", value, 0, 20);
                }}
              >
                <NumberFieldInput aria-labelledby={scanPaddingLabelId} />
              </NumberField>
            </div>
          </div>
        </FieldRoot>
      </div>
      <footer className="sticky bottom-0 flex w-full min-w-0 justify-end gap-2 border-t border-border bg-card p-3">
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" variant="default">
          Save changes
        </Button>
      </footer>
    </form>
  );
}
