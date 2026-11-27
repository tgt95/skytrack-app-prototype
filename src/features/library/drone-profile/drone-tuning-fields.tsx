import { useState } from 'react'
import { Button } from 'skytrack-ui/button'
import { Card, CardContent, CardHeader, CardTitle } from 'skytrack-ui/card'
import { CheckboxRoot } from 'skytrack-ui/checkbox'
import { FieldLabel, FieldRoot } from 'skytrack-ui/field'
import {
  NumberField,
  NumberFieldGroup,
  NumberFieldInput
} from 'skytrack-ui/number-field'
import {
  DEFAULT_DRONE_PID_GAINS,
  DEFAULT_DRONE_PID_GAINS_RESET,
  DRONE_POSITION_VELOCITY_PID_GROUPS,
  DRONE_RATE_PID_GROUPS,
  type DronePidGainKey,
  type DronePidGains
} from '@/domain/drone-tuning'

function TuningCard ({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card as='section'>
      <CardHeader>
        <CardTitle as='h2'>{title}</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>{children}</CardContent>
    </Card>
  )
}

function GainField ({
  field,
  value,
  onChange
}: {
  field: {
    key: DronePidGainKey
    label: string
    defaultValue?: number
    initialValue?: number
    value?: number
  }
  value: number
  onChange: (key: DronePidGainKey, value: number) => void
}) {
  const id = `pid-${field.key.toLowerCase()}`
  const defaultValue = field.defaultValue ?? field.value ?? 0
  return (
    <FieldRoot orientation='vertical' className='ms-field flex flex-col gap-1'>
      <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
      <NumberField
        className='w-full'
        value={Number.isFinite(value) ? value : null}
        onValueChange={next => {
          if (next !== null) onChange(field.key, next)
        }}
        step={0.001}
      >
        <NumberFieldGroup className='w-full'>
          <NumberFieldInput
            id={id}
            title={`${field.key} · Default ${defaultValue}`}
            className='w-full min-w-0 flex-1'
          />
        </NumberFieldGroup>
      </NumberField>
    </FieldRoot>
  )
}

export function DroneManualPidFields ({
  gains,
  onChange
}: {
  gains: DronePidGains
  onChange: (gains: DronePidGains) => void
}) {
  const [advanced, setAdvanced] = useState(false)
  const patchGain = (key: DronePidGainKey, value: number) =>
    onChange({ ...gains, [key]: value })
  const resetOuter = () => {
    const outerKeys = DRONE_POSITION_VELOCITY_PID_GROUPS.flatMap(group =>
      group.fields.map(field => field.key)
    )
    onChange({
      ...gains,
      ...Object.fromEntries(
        outerKeys.map(key => [key, DEFAULT_DRONE_PID_GAINS_RESET[key]])
      )
    })
  }
  const useInitialEstimate = () =>
    onChange({ ...gains, ...DEFAULT_DRONE_PID_GAINS })

  return (
    <div className='flex flex-col gap-4'>
      <TuningCard title='Manual PID settings · Custom'>
        <p className='m-0 text-muted-foreground text-sm'>
          Changes apply with Update &amp; restart. Initial estimates are
          starting values, not flight-tested gains.
        </p>
        <h3 className='m-0 text-base font-semibold'>
          Manual PID settings · Basic (12 gains)
        </h3>
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
          {DRONE_RATE_PID_GROUPS.map(group => (
            <div
              key={group.label}
              className='flex flex-col gap-4 p-4 bg-muted rounded-(--radius)'
            >
              <div className='text-base font-medium text-foreground'>
                {group.label}
              </div>
              <div className='grid grid-cols-1 gap-3'>
                {group.fields.map(field => (
                  <GainField
                    key={field.key}
                    field={field}
                    value={gains[field.key]}
                    onChange={patchGain}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <FieldRoot orientation='vertical' className='flex flex-col gap-2'>
          <FieldLabel className='flex items-center gap-2 font-normal'>
            <CheckboxRoot checked={advanced} onCheckedChange={setAdvanced} />
            Advanced — 20 gains
          </FieldLabel>
          <p className='m-0 text-muted-foreground text-sm'>
            Basic 12 + Position / Velocity 8. Hiding this table keeps saved
            gains.
          </p>
        </FieldRoot>
        {advanced && (
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
            {DRONE_POSITION_VELOCITY_PID_GROUPS.map(group => (
              <div
                key={group.label}
                className='flex flex-col gap-4 p-4 bg-muted rounded-(--radius)'
              >
                <div className='text-base font-medium text-foreground'>
                  {group.label}
                </div>
                <div className='grid grid-cols-1 gap-3'>
                  {group.fields.map(field => (
                    <GainField
                      key={field.key}
                      field={field}
                      value={gains[field.key]}
                      onChange={patchGain}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className='flex flex-wrap gap-2'>
          <Button type='button' variant='outline' onClick={resetOuter}>
            Reset Position / Velocity to defaults
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={useInitialEstimate}
          >
            Use initial PID estimate
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => onChange({ ...DEFAULT_DRONE_PID_GAINS_RESET })}
          >
            Reset PID to defaults
          </Button>
        </div>
      </TuningCard>
    </div>
  )
}

export function DroneFlightTuningFields () {
  const [consent, setConsent] = useState(false)
  return (
    <div className='flex flex-col gap-4'>
      <TuningCard title='Flight tuning'>
        <p className='m-0 font-medium'>
          Land and disarm · Wind off · Clear test area.
        </p>
        <FieldRoot orientation='vertical' className='flex flex-col gap-2'>
          <FieldLabel className='flex items-center gap-2 font-normal'>
            <CheckboxRoot checked={consent} onCheckedChange={setConsent} />
            Allow automatic test takeoffs and landings
          </FieldLabel>
        </FieldRoot>
        <div className='flex flex-wrap gap-2'>
          <Button type='button' variant='outline' disabled>
            Find stable initial PID
          </Button>
          <Button type='button' variant='outline' disabled>
            Run PX4 Autotune
          </Button>
          <Button type='button' variant='outline' disabled>
            Position &amp; Velocity tuning
          </Button>
        </div>
        <p className='m-0 text-muted-foreground text-sm' role='status'>
          Save the drone and open it in a running simulation to run these tests.
        </p>
        <details className='border-t border-border pt-3'>
          <summary className='cursor-pointer font-medium'>Test details</summary>
          <p className='mb-0 mt-3 text-muted-foreground text-sm'>
            Requires stable hover. Tests short X/Y/Z movements; keep at least 3
            m clear space horizontally and 1 m above hover.
          </p>
        </details>
      </TuningCard>
    </div>
  )
}
