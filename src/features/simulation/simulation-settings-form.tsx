import { Button } from "skytrack-ui/button";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "skytrack-ui/number-field";
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
} from "skytrack-ui/slider";
import { Switch, SwitchThumb } from "skytrack-ui/switch";
import type { SimSettings } from "./simulation-types";
import {
  speedFromDisplay,
  speedToDisplay,
  speedUnit,
  useMeasurementSystem,
} from "../../shared/measurement-units";
import { InspectorField } from "../design/controls/inspector-field";

export interface SimulationSettingsFormProps {
  settings: SimSettings;
  onChange: (settings: SimSettings) => void;
  onClose?: () => void;
  /** Waypoint count used to bound the mock-failure field. Defaults when rendered without mission context. */
  maxSeq?: number;
}

export function SimulationSettingsForm({
  settings,
  onChange,
  onClose,
  maxSeq = 99,
}: SimulationSettingsFormProps) {
  const unitSystem = useMeasurementSystem();
  return (
    <div className="flex flex-col gap-3">
      <InspectorField label="Run times" labelId="ms-sim-run-times-label">
        <div className="flex w-100/2 max-w-50 flex-col gap-1.5">
          <NumberField
            value={settings.runTimes}
            min={1}
            max={20}
            step={1}
            onValueChange={(v: number | null) => {
              if (v !== null)
                onChange({
                  ...settings,
                  runTimes: Math.min(20, Math.max(1, Math.round(v))),
                });
            }}
          >
            <NumberFieldGroup size="sm" className="w-full">
              <NumberFieldDecrement aria-label="Decrease run times">
                −
              </NumberFieldDecrement>
              <NumberFieldInput size="sm" aria-label="Run times" />
              <NumberFieldIncrement aria-label="Increase run times">
                +
              </NumberFieldIncrement>
            </NumberFieldGroup>
          </NumberField>
          <p className="ms-hint">Enter 1–20.</p>
        </div>
      </InspectorField>
      <InspectorField
        label={`Playback speed — ${settings.speedFactor.toFixed(1)}×`}
        labelId="ms-sim-playback-speed-label"
      >
        <Slider
          className="w-100/2 max-w-50"
          value={settings.speedFactor}
          min={0.25}
          max={4}
          step={0.25}
          onValueChange={(v: number | readonly number[]) => {
            const first = typeof v === "number" ? v : v[0];
            if (typeof first === "number")
              onChange({ ...settings, speedFactor: first });
          }}
        >
          <SliderControl>
            <SliderTrack>
              <SliderIndicator />
              <SliderThumb aria-label="Playback speed" />
            </SliderTrack>
          </SliderControl>
        </Slider>
      </InspectorField>
      <InspectorField
        label="Reduced motion"
        labelId="ms-sim-reduced-motion-label"
      >
        <label
          className="flex w-100/2 max-w-50 items-center gap-2 text-[0.8125rem] cursor-pointer"
          data-testid="ms-switchrow"
        >
          <Switch
            checked={settings.reducedMotion}
            size="sm"
            onCheckedChange={(v: boolean) =>
              onChange({ ...settings, reducedMotion: v })
            }
            aria-label="Reduced motion"
          >
            <SwitchThumb />
          </Switch>
          Step vehicle, no camera glide
        </label>
      </InspectorField>
      <InspectorField
        label={`Wind (${speedUnit(unitSystem)})`}
        labelId="ms-sim-wind-label"
      >
        <div className="w-100/2 max-w-50">
          <NumberField
            value={speedToDisplay(settings.windMS, unitSystem)}
            min={0}
            max={speedToDisplay(12, unitSystem)}
            step={0.5}
            onValueChange={(v: number | null) => {
              if (v !== null)
                onChange({
                  ...settings,
                  windMS: speedFromDisplay(v, unitSystem),
                });
            }}
          >
            <NumberFieldGroup size="sm" className="w-full">
              <NumberFieldDecrement aria-label="Decrease wind">
                −
              </NumberFieldDecrement>
              <NumberFieldInput
                size="sm"
                aria-label={`Wind ${speedUnit(unitSystem)}`}
              />
              <NumberFieldIncrement aria-label="Increase wind">
                +
              </NumberFieldIncrement>
            </NumberFieldGroup>
          </NumberField>
        </div>
      </InspectorField>
      <InspectorField
        label="Inject failure at waypoint (0 = none)"
        labelId="ms-sim-failure-label"
      >
        <div className="w-100/2 max-w-50">
          <NumberField
            value={settings.mockFailureAtSeq}
            min={0}
            max={maxSeq}
            step={1}
            onValueChange={(v: number | null) => {
              if (v !== null)
                onChange({
                  ...settings,
                  mockFailureAtSeq: Math.min(
                    maxSeq,
                    Math.max(0, Math.round(v)),
                  ),
                });
            }}
          >
            <NumberFieldGroup size="sm" className="w-full">
              <NumberFieldDecrement aria-label="Decrease failure waypoint">
                −
              </NumberFieldDecrement>
              <NumberFieldInput size="sm" aria-label="Failure waypoint" />
              <NumberFieldIncrement aria-label="Increase failure waypoint">
                +
              </NumberFieldIncrement>
            </NumberFieldGroup>
          </NumberField>
        </div>
      </InspectorField>
      {onClose ? (
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      ) : null}
    </div>
  );
}
