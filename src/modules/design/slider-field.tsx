import { NumberField, NumberFieldInput } from 'skytrack-ui/number-field'
import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack } from 'skytrack-ui/slider'

export interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (value: number) => void
}

export default function SliderField({ label, value, min, max, step, unit, onChange }: SliderFieldProps) {
  return (
    <div className='ms-slider-field'>
      <div className='ms-slider-label'>{label}</div>
      <div className='ms-slider-row'>
        <div className='ms-slider-track-wrap'>
          <Slider
            value={value}
            min={min}
            max={max}
            step={step}
            onValueChange={(next) => {
              const first = typeof next === 'number' ? next : next[0]
              if (typeof first === 'number') onChange(first)
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
        <div className='ms-slider-val-box'>
          <NumberField
            value={value}
            min={min}
            max={max}
            step={step}
            className='w-full'
            onValueChange={(next) => {
              if (typeof next === 'number' && Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)))
            }}
          >
            <NumberFieldInput aria-label={`${label} ${unit}`} />
          </NumberField>
        </div>
      </div>
    </div>
  )
}
