import { Field } from "skytrack-ui/field";
import {
  Select,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "skytrack-ui/select";
import { Switch, SwitchThumb } from "skytrack-ui/switch";
import type { MissionDesignPreferences } from "../../../shared/mission-design-preferences";
import {
  distanceFromDisplay,
  distanceToDisplay,
  distanceUnit,
  speedFromDisplay,
  speedToDisplay,
  speedUnit,
  useMeasurementSystem,
} from "../../../shared/measurement-units";

export function MissionDesignPreferencesContent({
  preferences,
  onChange,
}: {
  preferences: MissionDesignPreferences;
  onChange: (next: MissionDesignPreferences) => void;
}) {
  const unitSystem = useMeasurementSystem();
  return (
    <div
      className="flex min-w-0 flex-col gap-3.5"
      data-testid="ms-lib-account-preferences-content"
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
        <MissionPreferenceSelect
          label="Wheel direction"
          name="wheel-direction"
          value={preferences.zoomDirection}
          options={["normal", "reversed"] as const}
          formatOption={(value) => (value === "normal" ? "Normal" : "Reversed")}
          onChange={(zoomDirection) =>
            onChange({ ...preferences, zoomDirection })
          }
        />
        <MissionPreferenceSelect
          label="Zoom anchor"
          name="zoom-anchor"
          value={preferences.zoomAnchor}
          options={["cursor", "center"] as const}
          formatOption={(value) =>
            value === "cursor" ? "Cursor" : "Map center"
          }
          onChange={(zoomAnchor) => onChange({ ...preferences, zoomAnchor })}
        />
        <MissionPreferenceSelect
          label="Measurement units"
          name="measurement-units"
          value={preferences.unitSystem}
          options={["metric", "imperial"] as const}
          formatOption={(value) => (value === "metric" ? "Metric" : "Imperial")}
          onChange={(unitSystem) => onChange({ ...preferences, unitSystem })}
          className="sm:col-span-2"
        />
        <MissionPreferenceNumber
          className="sm:col-span-2"
          label={`Default target speed (${speedUnit(unitSystem)})`}
          name="default-target-speed"
          value={speedToDisplay(preferences.targetSpeedMS, unitSystem)}
          min={speedToDisplay(0.1, unitSystem)}
          max={speedToDisplay(30, unitSystem)}
          description="Used for new blank missions. Existing missions and template values stay unchanged."
          onChange={(value) =>
            onChange({
              ...preferences,
              targetSpeedMS: speedFromDisplay(value, unitSystem),
            })
          }
        />
        <MissionPreferenceNumber
          label={`Default take-off altitude (${distanceUnit(unitSystem)})`}
          name="default-take-off-altitude"
          value={distanceToDisplay(preferences.takeoffAltitudeM, unitSystem)}
          min={distanceToDisplay(0, unitSystem)}
          max={distanceToDisplay(500, unitSystem)}
          onChange={(value) =>
            onChange({
              ...preferences,
              takeoffAltitudeM: distanceFromDisplay(value, unitSystem),
            })
          }
        />
        <MissionPreferenceNumber
          label={`Default Area line spacing (${distanceUnit(unitSystem)})`}
          name="default-area-line-spacing"
          value={distanceToDisplay(preferences.areaLineSpacingM, unitSystem)}
          min={distanceToDisplay(0.1, unitSystem)}
          max={distanceToDisplay(100, unitSystem)}
          onChange={(value) =>
            onChange({
              ...preferences,
              areaLineSpacingM: distanceFromDisplay(value, unitSystem),
            })
          }
        />
        <div className="flex flex-col sm:col-span-2">
          <PreferenceRow
            title="Waypoint labels"
            checked={preferences.showWaypointLabels}
            onCheckedChange={(showWaypointLabels) =>
              onChange({ ...preferences, showWaypointLabels })
            }
          />
          <PreferenceRow
            title="Route distances"
            checked={preferences.showRouteDistances}
            onCheckedChange={(showRouteDistances) =>
              onChange({ ...preferences, showRouteDistances })
            }
          />
          <PreferenceRow
            title="Area scan lanes"
            checked={preferences.showAreaScanLanes}
            onCheckedChange={(showAreaScanLanes) =>
              onChange({ ...preferences, showAreaScanLanes })
            }
          />
        </div>
      </div>
    </div>
  );
}

function MissionPreferenceSelect<T extends string>({
  className,
  name,
  label,
  value,
  options,
  formatOption,
  onChange,
}: {
  className?: string;
  name: string;
  label: string;
  value: T;
  options: readonly T[];
  formatOption: (value: T) => string;
  onChange: (value: T) => void;
}) {
  return (
    <Field.Root name={name} className={`ms-field ${className ?? ""}`}>
      <Field.Label
        className="text-sm font-medium text-foreground"
        nativeLabel={false}
        render={<div />}
      >
        {label}
      </Field.Label>
      <Select<T>
        items={options.map((option) => ({
          value: option,
          label: formatOption(option),
        }))}
        value={value}
        onValueChange={(next: unknown) => onChange(String(next) as T)}
      >
        <SelectTrigger>
          <SelectValue />
          <SelectIcon />
        </SelectTrigger>
        <SelectPortal>
          <SelectPositioner
            side="bottom"
            align="start"
            sideOffset={4}
            className="z-[2147483647]"
          >
            <SelectPopup>
              <SelectList>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    <SelectItemIndicator />
                    <SelectItemText>{formatOption(option)}</SelectItemText>
                  </SelectItem>
                ))}
              </SelectList>
            </SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </Select>
    </Field.Root>
  );
}

function MissionPreferenceNumber({
  className,
  name,
  label,
  value,
  min,
  max,
  description,
  onChange,
}: {
  className?: string;
  name: string;
  label: string;
  value: number;
  min: number;
  max: number;
  description?: string;
  onChange: (value: number) => void;
}) {
  const errorId = `${name}-range-error`;
  return (
    <Field.Root
      name={name}
      className={`ms-field ${className ?? ""}`}
      validationMode="onChange"
      validate={(next) => {
        const numeric = Number(next);
        if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
          return `Enter a value from ${min} to ${max}.`;
        }
        return undefined;
      }}
    >
      <Field.Label className="text-sm font-medium text-foreground">
        {label}
      </Field.Label>
      <Field.Control
        type="number"
        min={min}
        max={max}
        step="any"
        value={String(value)}
        aria-describedby={description ? `${name}-description` : undefined}
        aria-errormessage={errorId}
        onValueChange={(next) => {
          const numeric = Number(next);
          if (next.trim() && Number.isFinite(numeric)) onChange(numeric);
        }}
        className="flex h-10 w-full min-w-0 self-stretch rounded-(--radius) border border-input bg-background px-3 py-1 text-foreground shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring) data-invalid:border-destructive"
      />
      {description ? (
        <Field.Description
          id={`${name}-description`}
          className="text-xs text-muted-foreground"
        >
          {description}
        </Field.Description>
      ) : null}
      <Field.Error id={errorId} className="text-xs text-destructive" />
    </Field.Root>
  );
}

function PreferenceRow({
  title,
  checked,
  onCheckedChange,
}: {
  title: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = `mission-pref-${title.toLowerCase().replace(/[^a-z0-9]+/gu, "-")}`;
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-b border-b-border">
      <label
        htmlFor={id}
        className="cursor-pointer text-[0.8125rem] font-medium"
      >
        {title}
      </label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={title}
      >
        <SwitchThumb />
      </Switch>
    </div>
  );
}
