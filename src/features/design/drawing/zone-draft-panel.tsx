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
import { Tabs, TabsList, TabsTab } from "skytrack-ui/tabs";
import { AreaIcon, AvoidZoneIcon } from "@/ui/components/icons";
import {
  distanceFromDisplay,
  distanceToDisplay,
  distanceUnit,
  useMeasurementSystem,
} from "@/shared/measurement-units";

export interface ZoneDraftPanelProps {
  className?: string;
  kind: "area" | "avoid";
  shape: "polygon" | "cylinder";
  pointCount: number;
  canCommit: boolean;
  area: { lineSpacingM: number; orientationDeg: number; paddingM: number };
  avoid: { type: "obstacle" | "privacy"; heightM: number; clearanceM: number };
  onAreaChange: (next: ZoneDraftPanelProps["area"]) => void;
  onAvoidChange: (next: ZoneDraftPanelProps["avoid"]) => void;
  onShapeChange: (shape: ZoneDraftPanelProps["shape"]) => void;
  onCommit: () => void;
  onCancel: () => void;
}

export function ZoneDraftPanel({
  className = "",
  kind,
  shape,
  pointCount,
  canCommit,
  area,
  avoid,
  onAreaChange,
  onAvoidChange,
  onShapeChange,
  onCommit,
  onCancel,
}: ZoneDraftPanelProps) {
  const unitSystem = useMeasurementSystem();
  const fieldId = useId();
  const footprintShapeLabelId = `${fieldId}-footprint-shape`;
  const lineSpacingLabelId = `${fieldId}-line-spacing`;
  const orientationLabelId = `${fieldId}-orientation`;
  const scanPaddingLabelId = `${fieldId}-scan-padding`;
  return (
    <section
      className={`ms-inspector box-border flex h-full min-h-0 w-full min-w-0 flex-col gap-0 overflow-hidden ${className}`}
      aria-label={`${kind === "area" ? "Area" : "Avoid zone"} drawing settings`}
      data-testid="ms-zone-draft-panel"
    >
      <header className="sticky top-0 z-2 w-full min-w-0 border-b border-border bg-(--card) p-4">
        <h2 className="m-0 flex items-center gap-2 text-lg font-semibold">
          {kind === "area" ? (
            <AreaIcon
              aria-hidden="true"
              className="ms-route-icon w-4 h-4 text-foreground shrink-0"
            />
          ) : (
            <AvoidZoneIcon
              aria-hidden="true"
              className="ms-route-icon w-4 h-4 text-foreground shrink-0"
            />
          )}
          {kind === "area" ? "New area" : "New avoid zone"}
        </h2>
      </header>
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-4">
        {kind === "area" ? (
          <>
            <p
              className="ms-hint m-0 text-sm text-(--muted-foreground) leading-[1.5]"
              role="status"
              aria-live="polite"
            >
              {shape === "cylinder"
                ? pointCount === 0
                  ? "Choose Cylinder, then click the map to place its center."
                  : "Move the pointer to set the radius, then commit the area."
                : pointCount === 0
                  ? "Choose Polygon, then click the map to draw the outline."
                  : `${pointCount} point${pointCount === 1 ? "" : "s"} placed. Commit the area when the outline is valid.`}
            </p>
            <FieldRoot className="gap-1.5">
              <FieldLabel id={footprintShapeLabelId}>
                Footprint shape
              </FieldLabel>
              <Tabs
                value={shape}
                onValueChange={(value) => {
                  if (value === "polygon" || value === "cylinder")
                    onShapeChange(value);
                }}
                className="w-full"
              >
                <TabsList
                  variant="filled"
                  size="sm"
                  width="full"
                  aria-labelledby={footprintShapeLabelId}
                >
                  <TabsTab value="polygon" disabled={pointCount > 0}>
                    Polygon
                  </TabsTab>
                  <TabsTab value="cylinder" disabled={pointCount > 0}>
                    Cylinder
                  </TabsTab>
                </TabsList>
              </Tabs>
            </FieldRoot>
            <FieldRoot data-testid="ms-slider-field">
              <FieldLabel id={lineSpacingLabelId} data-testid="ms-slider-label">
                {`Line spacing (${distanceUnit(unitSystem)})`}
              </FieldLabel>
              <div
                className="flex w-full items-center gap-2"
                data-testid="ms-slider-row"
              >
                <div
                  className="flex-[1_1_auto] flex items-center min-w-0"
                  data-testid="ms-slider-track-wrap"
                >
                  <Slider
                    value={distanceToDisplay(area.lineSpacingM, unitSystem)}
                    min={distanceToDisplay(0.25, unitSystem)}
                    max={distanceToDisplay(20, unitSystem)}
                    step={unitSystem === "imperial" ? 0.5 : 0.25}
                    onValueChange={(next) => {
                      const value = typeof next === "number" ? next : next[0];
                      if (typeof value === "number") {
                        onAreaChange({
                          ...area,
                          lineSpacingM: distanceFromDisplay(value, unitSystem),
                        });
                      }
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
                <div
                  className="grow-0 shrink-0 basis-17"
                  data-testid="ms-slider-val-box"
                >
                  <NumberField
                    value={distanceToDisplay(area.lineSpacingM, unitSystem)}
                    min={distanceToDisplay(0.25, unitSystem)}
                    max={distanceToDisplay(20, unitSystem)}
                    step={unitSystem === "imperial" ? 0.5 : 0.25}
                    className="w-full"
                    onValueChange={(value) => {
                      if (typeof value === "number" && Number.isFinite(value)) {
                        onAreaChange({
                          ...area,
                          lineSpacingM: distanceFromDisplay(
                            Math.min(
                              distanceToDisplay(20, unitSystem),
                              Math.max(
                                distanceToDisplay(0.25, unitSystem),
                                value,
                              ),
                            ),
                            unitSystem,
                          ),
                        });
                      }
                    }}
                  >
                    <NumberFieldInput aria-labelledby={lineSpacingLabelId} />
                  </NumberField>
                </div>
              </div>
            </FieldRoot>
            <FieldRoot data-testid="ms-slider-field">
              <FieldLabel id={orientationLabelId} data-testid="ms-slider-label">
                Orientation (°)
              </FieldLabel>
              <div
                className="flex w-full items-center gap-2"
                data-testid="ms-slider-row"
              >
                <div
                  className="flex-[1_1_auto] flex items-center min-w-0"
                  data-testid="ms-slider-track-wrap"
                >
                  <Slider
                    value={area.orientationDeg}
                    min={-180}
                    max={180}
                    step={1}
                    onValueChange={(next) => {
                      const value = typeof next === "number" ? next : next[0];
                      if (typeof value === "number")
                        onAreaChange({ ...area, orientationDeg: value });
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
                <div
                  className="grow-0 shrink-0 basis-17"
                  data-testid="ms-slider-val-box"
                >
                  <NumberField
                    value={area.orientationDeg}
                    min={-180}
                    max={180}
                    step={1}
                    className="w-full"
                    onValueChange={(value) => {
                      if (typeof value === "number" && Number.isFinite(value))
                        onAreaChange({
                          ...area,
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
              <div
                className="flex w-full items-center gap-2"
                data-testid="ms-slider-row"
              >
                <div
                  className="flex-[1_1_auto] flex items-center min-w-0"
                  data-testid="ms-slider-track-wrap"
                >
                  <Slider
                    value={distanceToDisplay(area.paddingM, unitSystem)}
                    min={distanceToDisplay(0, unitSystem)}
                    max={distanceToDisplay(20, unitSystem)}
                    step={unitSystem === "imperial" ? 1 : 0.5}
                    onValueChange={(next) => {
                      const value = typeof next === "number" ? next : next[0];
                      if (typeof value === "number")
                        onAreaChange({
                          ...area,
                          paddingM: distanceFromDisplay(value, unitSystem),
                        });
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
                <div
                  className="grow-0 shrink-0 basis-17"
                  data-testid="ms-slider-val-box"
                >
                  <NumberField
                    value={distanceToDisplay(area.paddingM, unitSystem)}
                    min={distanceToDisplay(0, unitSystem)}
                    max={distanceToDisplay(20, unitSystem)}
                    step={unitSystem === "imperial" ? 1 : 0.5}
                    className="w-full"
                    onValueChange={(value) => {
                      if (typeof value === "number" && Number.isFinite(value))
                        onAreaChange({
                          ...area,
                          paddingM: distanceFromDisplay(
                            Math.min(
                              distanceToDisplay(20, unitSystem),
                              Math.max(0, value),
                            ),
                            unitSystem,
                          ),
                        });
                    }}
                  >
                    <NumberFieldInput aria-labelledby={scanPaddingLabelId} />
                  </NumberField>
                </div>
              </div>
            </FieldRoot>
          </>
        ) : (
          <>
            <Tabs
              value={avoid.type}
              onValueChange={(value) => {
                if (value === "obstacle" || value === "privacy")
                  onAvoidChange({ ...avoid, type: value });
              }}
              className="w-full"
            >
              <TabsList
                variant="filled"
                size="sm"
                width="full"
                aria-label="Avoid zone type"
              >
                <TabsTab value="obstacle">Obstacle</TabsTab>
                <TabsTab value="privacy">People / Privacy</TabsTab>
              </TabsList>
            </Tabs>
            <FieldRoot data-testid="ms-slider-field">
              <FieldLabel
                id={`${fieldId}-zone-height`}
                data-testid="ms-slider-label"
              >
                {`Zone height (${distanceUnit(unitSystem)})`}
              </FieldLabel>
              <div
                className="flex w-full items-center gap-2"
                data-testid="ms-slider-row"
              >
                <div
                  className="flex-[1_1_auto] flex items-center min-w-0"
                  data-testid="ms-slider-track-wrap"
                >
                  <Slider
                    value={distanceToDisplay(avoid.heightM, unitSystem)}
                    min={distanceToDisplay(1, unitSystem)}
                    max={distanceToDisplay(150, unitSystem)}
                    step={unitSystem === "imperial" ? 1 : 0.5}
                    onValueChange={(next) => {
                      const value = typeof next === "number" ? next : next[0];
                      if (typeof value === "number")
                        onAvoidChange({
                          ...avoid,
                          heightM: Math.max(
                            1,
                            distanceFromDisplay(value, unitSystem),
                          ),
                        });
                    }}
                  >
                    <SliderControl>
                      <SliderTrack>
                        <SliderIndicator />
                        <SliderThumb
                          aria-labelledby={`${fieldId}-zone-height`}
                        />
                      </SliderTrack>
                    </SliderControl>
                  </Slider>
                </div>
                <div
                  className="grow-0 shrink-0 basis-17"
                  data-testid="ms-slider-val-box"
                >
                  <NumberField
                    value={distanceToDisplay(avoid.heightM, unitSystem)}
                    min={distanceToDisplay(1, unitSystem)}
                    max={distanceToDisplay(150, unitSystem)}
                    step={unitSystem === "imperial" ? 1 : 0.5}
                    className="w-full"
                    onValueChange={(value) => {
                      if (typeof value === "number" && Number.isFinite(value)) {
                        onAvoidChange({
                          ...avoid,
                          heightM: Math.max(
                            1,
                            distanceFromDisplay(
                              Math.min(
                                distanceToDisplay(150, unitSystem),
                                Math.max(
                                  distanceToDisplay(1, unitSystem),
                                  value,
                                ),
                              ),
                              unitSystem,
                            ),
                          ),
                        });
                      }
                    }}
                  >
                    <NumberFieldInput
                      aria-labelledby={`${fieldId}-zone-height`}
                    />
                  </NumberField>
                </div>
              </div>
            </FieldRoot>
            <FieldRoot data-testid="ms-slider-field">
              <FieldLabel
                id={`${fieldId}-flight-clearance`}
                data-testid="ms-slider-label"
              >
                {`Flight clearance (${distanceUnit(unitSystem)})`}
              </FieldLabel>
              <div
                className="flex w-full items-center gap-2"
                data-testid="ms-slider-row"
              >
                <div
                  className="flex-[1_1_auto] flex items-center min-w-0"
                  data-testid="ms-slider-track-wrap"
                >
                  <Slider
                    value={distanceToDisplay(avoid.clearanceM, unitSystem)}
                    min={distanceToDisplay(0, unitSystem)}
                    max={distanceToDisplay(50, unitSystem)}
                    step={unitSystem === "imperial" ? 1 : 0.5}
                    onValueChange={(next) => {
                      const value = typeof next === "number" ? next : next[0];
                      if (typeof value === "number")
                        onAvoidChange({
                          ...avoid,
                          clearanceM: Math.max(
                            0,
                            distanceFromDisplay(value, unitSystem),
                          ),
                        });
                    }}
                  >
                    <SliderControl>
                      <SliderTrack>
                        <SliderIndicator />
                        <SliderThumb
                          aria-labelledby={`${fieldId}-flight-clearance`}
                        />
                      </SliderTrack>
                    </SliderControl>
                  </Slider>
                </div>
                <div
                  className="grow-0 shrink-0 basis-17"
                  data-testid="ms-slider-val-box"
                >
                  <NumberField
                    value={distanceToDisplay(avoid.clearanceM, unitSystem)}
                    min={distanceToDisplay(0, unitSystem)}
                    max={distanceToDisplay(50, unitSystem)}
                    step={unitSystem === "imperial" ? 1 : 0.5}
                    className="w-full"
                    onValueChange={(value) => {
                      if (typeof value === "number" && Number.isFinite(value)) {
                        onAvoidChange({
                          ...avoid,
                          clearanceM: Math.max(
                            0,
                            distanceFromDisplay(
                              Math.min(
                                distanceToDisplay(50, unitSystem),
                                Math.max(
                                  distanceToDisplay(0, unitSystem),
                                  value,
                                ),
                              ),
                              unitSystem,
                            ),
                          ),
                        });
                      }
                    }}
                  >
                    <NumberFieldInput
                      aria-labelledby={`${fieldId}-flight-clearance`}
                    />
                  </NumberField>
                </div>
              </div>
            </FieldRoot>
          </>
        )}
      </div>
      <footer className="sticky bottom-0 flex w-full min-w-0 justify-end gap-2 border-t border-border bg-card p-3">
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="default"
          onClick={onCommit}
          disabled={!canCommit}
        >
          {`Commit ${kind === "area" ? "area" : "avoid zone"}`}
        </Button>
      </footer>
    </section>
  );
}
