import { Button } from "skytrack-ui/button";
import { Toggle } from "skytrack-ui/toggle";
import { ToggleGroup } from "skytrack-ui/toggle-group";
import { AreaIcon, AvoidZoneIcon } from "../../../ui/components/icons";
import {
  distanceFromDisplay,
  distanceToDisplay,
  distanceUnit,
  useMeasurementSystem,
} from "../../../shared/measurement-units";
import SliderField from "../controls/slider-field";

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
  return (
    <section
      className={`ms-card ms-zone-draft-panel ${className}`}
      aria-label={`${kind === "area" ? "Area" : "Avoid zone"} drawing settings`}
      data-testid="ms-zone-draft-panel"
    >
      <div className="ms-route-head">
        <div className="ms-route-title-group">
          {kind === "area" ? (
            <AreaIcon aria-hidden="true" className="ms-route-icon" />
          ) : (
            <AvoidZoneIcon aria-hidden="true" className="ms-route-icon" />
          )}
          <span className="ms-route-name">
            {kind === "area" ? "Area draft" : "Avoid zone draft"}
          </span>
        </div>
      </div>
      <div className="ms-zone-settings">
        {kind === "area" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-(--foreground)">
                Footprint shape
              </span>
              <ToggleGroup
                value={[shape]}
                variant="segmented"
                size="xs"
                aria-label="Area footprint shape"
                disabled={pointCount > 0}
                onValueChange={(values) => {
                  const value = values[0];
                  if (value === "polygon" || value === "cylinder")
                    onShapeChange(value);
                }}
              >
                <Toggle value="polygon">Polygon</Toggle>
                <Toggle value="cylinder">Cylinder</Toggle>
              </ToggleGroup>
            </div>
            <SliderField
              label={`Line spacing (${distanceUnit(unitSystem)})`}
              value={distanceToDisplay(area.lineSpacingM, unitSystem)}
              min={distanceToDisplay(0.25, unitSystem)}
              max={distanceToDisplay(20, unitSystem)}
              step={unitSystem === "imperial" ? 0.5 : 0.25}
              unit={distanceUnit(unitSystem)}
              onChange={(value) =>
                onAreaChange({
                  ...area,
                  lineSpacingM: distanceFromDisplay(value, unitSystem),
                })
              }
            />
            <SliderField
              label="Orientation (°)"
              value={area.orientationDeg}
              min={-180}
              max={180}
              step={1}
              unit="°"
              onChange={(value) =>
                onAreaChange({ ...area, orientationDeg: value })
              }
            />
            <SliderField
              label={`Scan padding (${distanceUnit(unitSystem)})`}
              value={distanceToDisplay(area.paddingM, unitSystem)}
              min={distanceToDisplay(0, unitSystem)}
              max={distanceToDisplay(20, unitSystem)}
              step={unitSystem === "imperial" ? 1 : 0.5}
              unit={distanceUnit(unitSystem)}
              onChange={(value) =>
                onAreaChange({
                  ...area,
                  paddingM: distanceFromDisplay(value, unitSystem),
                })
              }
            />
            <p className="ms-hint" aria-live="polite">
              {pointCount} outline point{pointCount === 1 ? "" : "s"} · scan
              preview updates as settings change.
            </p>
          </>
        ) : (
          <>
            <p className="ms-hint">
              Choose whether this is a physical obstacle or a people/privacy
              exclusion zone.
            </p>
            <ToggleGroup
              value={[avoid.type]}
              variant="segmented"
              size="xs"
              aria-label="Avoid zone type"
              className="ms-avoid-type-toggle"
              onValueChange={(values) => {
                const value = values[0];
                if (value === "obstacle" || value === "privacy")
                  onAvoidChange({ ...avoid, type: value });
              }}
            >
              <Toggle value="obstacle">Obstacle</Toggle>
              <Toggle value="privacy">People / Privacy</Toggle>
            </ToggleGroup>
            <SliderField
              label={`Zone height (${distanceUnit(unitSystem)})`}
              value={distanceToDisplay(avoid.heightM, unitSystem)}
              min={distanceToDisplay(1, unitSystem)}
              max={distanceToDisplay(150, unitSystem)}
              step={unitSystem === "imperial" ? 1 : 0.5}
              unit={distanceUnit(unitSystem)}
              onChange={(value) =>
                onAvoidChange({
                  ...avoid,
                  heightM: Math.max(1, distanceFromDisplay(value, unitSystem)),
                })
              }
            />
            <SliderField
              label={`Flight clearance (${distanceUnit(unitSystem)})`}
              value={distanceToDisplay(avoid.clearanceM, unitSystem)}
              min={distanceToDisplay(0, unitSystem)}
              max={distanceToDisplay(50, unitSystem)}
              step={unitSystem === "imperial" ? 1 : 0.5}
              unit={distanceUnit(unitSystem)}
              onChange={(value) =>
                onAvoidChange({
                  ...avoid,
                  clearanceM: Math.max(
                    0,
                    distanceFromDisplay(value, unitSystem),
                  ),
                })
              }
            />
            <p className="ms-hint" aria-live="polite">
              {pointCount} outline point{pointCount === 1 ? "" : "s"} · volume
              preview updates as settings change.
            </p>
          </>
        )}
        <div className="ms-btnrow">
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
        </div>
      </div>
    </section>
  );
}
