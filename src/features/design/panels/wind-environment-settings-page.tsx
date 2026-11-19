import { CaretDownIcon } from '@phosphor-icons/react'
import { Button } from 'skytrack-ui/button'
import { InputAdornment } from 'skytrack-ui/input'
import {
  NumberField,
  NumberFieldGroup,
  NumberFieldInput
} from 'skytrack-ui/number-field'
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
  SelectValue
} from 'skytrack-ui/select'
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack
} from 'skytrack-ui/slider'
import { InspectorField } from '@/features/design/controls/inspector-field'
import {
  equivalentWindSpeedFromForce,
  enuPushToAzimuthToMeteorologicalFrom,
  meteorologicalFromAzimuthToEnuPushTo,
  WIND_AIR_DENSITY_KG_M3,
  WIND_CD_AREA_M2,
  type WindControlMode,
  type WindEnvironmentSettings
} from '@/domain/mission-model'
import { WindDirectionPreview } from './wind-direction-preview'

interface WindEnvironmentSettingsPageProps {
  value: WindEnvironmentSettings
  onChange: (value: WindEnvironmentSettings) => void
  onCancel: () => void
  onApply: () => void
}

const CONTROL_MODES: { value: WindControlMode; label: string }[] = [
  { value: 'force', label: 'Force (N)' },
  { value: 'equivalent-speed', label: 'Equivalent speed (m/s)' }
]

function RangeControl ({
  value,
  min,
  max,
  step,
  label,
  unit,
  onChange
}: {
  value: number
  min: number
  max: number
  step: number
  label: string
  unit: string
  onChange: (value: number) => void
}) {
  return (
    <div className='flex w-full min-w-0 items-center gap-2'>
      <Slider
        className='min-w-0 flex-1'
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={(next: number | readonly number[]) => {
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
      <NumberField
        className='w-24 shrink-0'
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={(next: number | null) => {
          if (next !== null && Number.isFinite(next)) onChange(next)
        }}
      >
        <NumberFieldGroup
          size='sm'
          className='w-full overflow-hidden rounded-(--radius) border border-input bg-background focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50'
        >
          <NumberFieldInput
            size='sm'
            className='w-0 min-w-0 flex-1 rounded-none border-0 bg-transparent text-right shadow-none focus-visible:border-transparent focus-visible:ring-0'
            aria-label={label}
          />
          <InputAdornment position='end' className='px-2 text-xs'>
            {unit}
          </InputAdornment>
        </NumberFieldGroup>
      </NumberField>
    </div>
  )
}

export function WindEnvironmentSettingsPage ({
  value,
  onChange,
  onCancel,
  onApply
}: WindEnvironmentSettingsPageProps) {
  const forceMode = value.controlBy === 'force'
  const particleSpeedMS = forceMode
    ? equivalentWindSpeedFromForce(value.forceN)
    : value.speedMS
  const windFromDeg = enuPushToAzimuthToMeteorologicalFrom(value.azimuthDeg)

  return (
    <section
      className='ms-inspector box-border flex h-full min-h-0 w-full min-w-0 flex-col gap-0 overflow-x-hidden'
      aria-label='Wind environment settings'
      data-testid='ms-wind-settings-page'
    >
      <header className='sticky top-0 z-2 w-full min-w-0 border-b border-border bg-(--card) p-4'>
        <h2 className='m-0 text-lg font-semibold'>Wind environment settings</h2>
      </header>
      <div className='flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-4'>
        <InspectorField
          label='Control by'
          labelId='ms-wind-control-label'
          className='flex w-full min-w-0 flex-col items-stretch gap-2'
          labelClassName='w-full'
        >
          <Select<WindControlMode>
            items={CONTROL_MODES}
            value={value.controlBy}
            onValueChange={(next: unknown) => {
              if (next === 'force' || next === 'equivalent-speed') {
                onChange({ ...value, controlBy: next })
              }
            }}
          >
            <SelectTrigger
              className='w-full'
              aria-labelledby='ms-wind-control-label'
              data-testid='ms-wind-control-select'
            >
              <SelectValue />
              <SelectIcon>
                <CaretDownIcon aria-hidden='true' />
              </SelectIcon>
            </SelectTrigger>
            <SelectPortal>
              <SelectPositioner side='bottom' align='end' sideOffset={4}>
                <SelectPopup>
                  <SelectList>
                    {CONTROL_MODES.map(mode => (
                      <SelectItem key={mode.value} value={mode.value}>
                        <SelectItemIndicator />
                        <SelectItemText>{mode.label}</SelectItemText>
                      </SelectItem>
                    ))}
                  </SelectList>
                </SelectPopup>
              </SelectPositioner>
            </SelectPortal>
          </Select>
        </InspectorField>

        <InspectorField
          label={forceMode ? 'Force' : 'Equivalent speed'}
          labelId='ms-wind-magnitude-label'
          className='flex w-full min-w-0 flex-col items-stretch gap-2'
          labelClassName='w-full'
        >
          <RangeControl
            value={forceMode ? value.forceN : value.speedMS}
            min={0}
            max={20}
            step={forceMode ? 0.05 : 0.1}
            label={forceMode ? 'Force' : 'Equivalent speed'}
            unit={forceMode ? 'N' : 'm/s'}
            onChange={next =>
              onChange({
                ...value,
                ...(forceMode ? { forceN: next } : { speedMS: next })
              })
            }
          />
        </InspectorField>

        {forceMode ? (
          <section
            className='box-border flex w-full min-w-0 flex-col gap-1 rounded-(--radius) border border-border bg-muted p-3'
            aria-label='Derived particle speed'
          >
            <div className='m-0 text-sm font-medium'>
              Equivalent particle speed
            </div>
            <p
              className='m-0 text-base font-semibold'
              data-testid='ms-wind-derived-speed'
            >
              {particleSpeedMS.toFixed(1)} m/s
              <span className='ml-2 text-sm font-normal text-muted-foreground'>
                Calculated
              </span>
            </p>
            <p className='m-0 text-sm text-muted-foreground'>
              Uses air density {WIND_AIR_DENSITY_KG_M3} kg/m³ and CdA{' '}
              {WIND_CD_AREA_M2} m².
            </p>
          </section>
        ) : null}

        <InspectorField
          label='Wind direction (FROM true North)'
          labelId='ms-wind-azimuth-label'
          className='flex w-full min-w-0 flex-col items-stretch gap-2'
          labelClassName='w-full'
        >
          <RangeControl
            value={windFromDeg}
            min={0}
            max={360}
            step={5}
            label='Wind direction from true North, clockwise'
            unit='°'
            onChange={next =>
              onChange({
                ...value,
                azimuthDeg: meteorologicalFromAzimuthToEnuPushTo(next)
              })
            }
          />
        </InspectorField>

        <InspectorField
          label='Flow elevation'
          labelId='ms-wind-elevation-label'
          className='flex w-full min-w-0 flex-col items-stretch gap-2'
          labelClassName='w-full'
        >
          <RangeControl
            value={value.elevationDeg}
            min={-90}
            max={90}
            step={1}
            label='Flow elevation'
            unit='°'
            onChange={next => onChange({ ...value, elevationDeg: next })}
          />
        </InspectorField>

        <WindDirectionPreview
          windFromDeg={windFromDeg}
          elevationDeg={value.elevationDeg}
          speedMS={particleSpeedMS}
        />
      </div>
      <footer className='sticky bottom-0 flex w-full min-w-0 justify-end gap-2 border-t border-border bg-card p-3'>
        <Button variant='outline' onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onApply}>Apply</Button>
      </footer>
    </section>
  )
}
