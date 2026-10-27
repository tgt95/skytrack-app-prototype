import { NumberField, NumberFieldInput } from "skytrack-ui/number-field";
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
} from "skytrack-ui/slider";

export interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

export default function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: SliderFieldProps) {
  return (
    <div
      className=" flex flex-col gap-1 mb-2"
      data-testid="ms-slider-field"
    >
      <div
        className=" text-xs font-medium text-(--foreground)"
        data-testid="ms-slider-label"
      >
        {label}
      </div>
      <div
        className=" flex items-center gap-2 w-full"
        data-testid="ms-slider-row"
      >
        <div
          className=" flex-[1_1_auto] flex items-center min-w-0"
          data-testid="ms-slider-track-wrap"
        >
          <Slider
            value={value}
            min={min}
            max={max}
            step={step}
            onValueChange={(next) => {
              const first = typeof next === "number" ? next : next[0];
              if (typeof first === "number") onChange(first);
            }}
          >
            <SliderControl>
              <SliderTrack>
                <SliderIndicator />
                <SliderThumb aria-label={label} />
              </SliderTrack>
            </SliderControl>
          </Slider>
        </div>
        <div className=" grow-0 shrink-0 basis-17" data-testid="ms-slider-val-box">
          <NumberField
            value={value}
            min={min}
            max={max}
            step={step}
            className="w-full"
            onValueChange={(next) => {
              if (typeof next === "number" && Number.isFinite(next))
                onChange(Math.min(max, Math.max(min, next)));
            }}
          >
            <NumberFieldInput aria-label={`${label} ${unit}`} />
          </NumberField>
        </div>
      </div>
    </div>
  );
}
