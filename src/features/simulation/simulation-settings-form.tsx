import { Button } from "skytrack-ui/button";
import { FieldLabel, FieldRoot } from "skytrack-ui/field";
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
  return (
    <div>
      <FieldRoot className="ms-field">
        <FieldLabel>Run times</FieldLabel>
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
          <NumberFieldGroup>
            <NumberFieldDecrement aria-label="Decrease run times">
              −
            </NumberFieldDecrement>
            <NumberFieldInput aria-label="Run times" />
            <NumberFieldIncrement aria-label="Increase run times">
              +
            </NumberFieldIncrement>
          </NumberFieldGroup>
        </NumberField>
        <p className="ms-hint">Enter 1–20.</p>
      </FieldRoot>
      <FieldRoot className="ms-field">
        <FieldLabel>
          Playback speed — {settings.speedFactor.toFixed(1)}×
        </FieldLabel>
        <Slider
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
      </FieldRoot>
      <label
        className=" flex items-center gap-2 text-[0.8125rem] cursor-pointer"
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
        Reduced motion (step vehicle, no camera glide)
      </label>
      <FieldRoot className="ms-field">
        <FieldLabel>Wind (m/s)</FieldLabel>
        <NumberField
          value={settings.windMS}
          min={0}
          max={12}
          step={0.5}
          onValueChange={(v: number | null) => {
            if (v !== null) onChange({ ...settings, windMS: v });
          }}
        >
          <NumberFieldGroup>
            <NumberFieldDecrement aria-label="Decrease wind">
              −
            </NumberFieldDecrement>
            <NumberFieldInput aria-label="Wind" />
            <NumberFieldIncrement aria-label="Increase wind">
              +
            </NumberFieldIncrement>
          </NumberFieldGroup>
        </NumberField>
      </FieldRoot>
      <FieldRoot className="ms-field">
        <FieldLabel>Inject failure at waypoint (0 = none)</FieldLabel>
        <NumberField
          value={settings.mockFailureAtSeq}
          min={0}
          max={maxSeq}
          step={1}
          onValueChange={(v: number | null) => {
            if (v !== null)
              onChange({
                ...settings,
                mockFailureAtSeq: Math.min(maxSeq, Math.max(0, Math.round(v))),
              });
          }}
        >
          <NumberFieldGroup>
            <NumberFieldDecrement aria-label="Decrease failure waypoint">
              −
            </NumberFieldDecrement>
            <NumberFieldInput aria-label="Failure waypoint" />
            <NumberFieldIncrement aria-label="Increase failure waypoint">
              +
            </NumberFieldIncrement>
          </NumberFieldGroup>
        </NumberField>
      </FieldRoot>
      {onClose ? (
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      ) : null}
    </div>
  );
}
