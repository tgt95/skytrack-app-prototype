/* Leaf controls for mission design and map interaction. Keep state transitions in the route shell. */

import { useRef, useState } from 'react'
import { CheckIcon } from '@phosphor-icons/react'
import { Button } from 'skytrack-ui/button'
import { Toggle } from 'skytrack-ui/toggle'
import { ToolbarButton } from 'skytrack-ui/toolbar'
import { Tooltip, TooltipArrow, TooltipPopup, TooltipPortal, TooltipPositioner, TooltipProvider, TooltipTrigger } from 'skytrack-ui/tooltip'
import { BASEMAPS, type MissionBasemapStyle } from '../scene/mission-map-2d'

/* Toolbar-backed button with styled tooltip and native disabled semantics. */
export function ToolButton({
  label,
  hint,
  active,
  disabled,
  onClick,
  children,
  testid
}: {
  label: string
  hint?: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
  testid?: string
}) {
  const fullLabel = hint ? `${label} — ${hint}` : label
  if (disabled) {
    return (
      <ToolbarButton
        type='button'
        render={<Toggle variant='brand' pressed={active} />}
        size='icon'
        aria-label={fullLabel}
        data-testid={testid}
        onClick={onClick}
        disabled
      >
        {children}
      </ToolbarButton>
    )
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <ToolbarButton
              type='button'
              render={<Toggle variant='brand' pressed={active} />}
              size='icon'
              aria-label={fullLabel}
              data-testid={testid}
              onClick={onClick}
            />
          }
        >
          {children}
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner side='right' sideOffset={8}>
            <TooltipPopup>
              <TooltipArrow />
              {label}
              {hint ? ` — ${hint}` : ''}
            </TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  )
}


/* Planner-style basemap preview grid shared by the 2D and 3D map pickers.
   Satellite stays the Studio default; switching only swaps the active map
   imagery and never touches camera, entities, or mission state. */
export function BasemapPickerGrid({
  value,
  onChange,
  testidPrefix
}: {
  value: MissionBasemapStyle
  onChange: (style: MissionBasemapStyle) => void
  testidPrefix: string
}) {
  const groups: { label: string; ids: MissionBasemapStyle[] }[] = [
    { label: 'Standard', ids: ['satellite', 'basic', 'light', 'dark'] },
    { label: 'More styles', ids: ['daybreak', 'overcast'] }
  ]
  return (
    <>
      {groups.map((group) => (
        <div key={group.label}>
          <p className='ms-basemap-group-label'>{group.label}</p>
          <div className='ms-basemap-grid'>
            {group.ids.map((id) => {
              const option = BASEMAPS[id]
              return (
                <Button key={id} type='button' variant={value === id ? 'secondary' : 'outline'} aria-pressed={value === id} data-testid={`${testidPrefix}-${id}`} className='ms-basemap-option' onClick={() => onChange(id)}>
                  <span className='ms-basemap-thumb'><img src={option.thumbnailUrl} alt='' loading='lazy' onError={(event) => { event.currentTarget.style.visibility = 'hidden' }} />{value === id ? <span className='ms-basemap-check'><CheckIcon aria-hidden='true' weight='bold' /></span> : null}</span>
                  <span>{option.label}</span>
                </Button>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}


const RULER_MIN = 0
const RULER_MAX = 500
const RULER_STEP = 0.5

export function clampSnapRuler(v: number): number {
  if (!Number.isFinite(v)) return 2.0
  return Math.min(RULER_MAX, Math.max(RULER_MIN, Math.round(v * 2) / 2))
}

/* Right-edge drawing-altitude ruler (reference 03): tick track with a
   draggable knob plus a value badge aligned with the knob holding direct
   numeric input. Draft-only: commits change future geometry altitude, never
   the selected waypoint. 0–500 m, 0.5 m step, default 2.0 m. */
export function DrawingAltitudeRuler({
  value,
  onCommit,
  onAnnounce
}: {
  value: number
  onCommit: (v: number) => void
  onAnnounce: (text: string) => void
}) {
  const [text, setText] = useState<string | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const shown = text ?? value.toFixed(1)
  const pct = Math.min(100, Math.max(0, ((value - RULER_MIN) / (RULER_MAX - RULER_MIN)) * 100))
  const badgeBottom = `clamp(12px, ${pct}%, calc(100% - 12px))`

  const valueFromClientY = (clientY: number): number | null => {
    const track = trackRef.current
    if (!track) return null
    const rect = track.getBoundingClientRect()
    if (rect.height <= 0) return null
    const t = 1 - (clientY - rect.top) / rect.height
    return clampSnapRuler(t * (RULER_MAX - RULER_MIN) + RULER_MIN)
  }

  const commitText = (raw: string | null) => {
    if (raw === null) return
    // Empty or invalid input reverts to the last committed value.
    if (raw.trim() === '') {
      setText(null)
      return
    }
    const parsed = Number(raw.trim())
    if (!Number.isFinite(parsed)) {
      setText(null)
      return
    }
    onCommit(clampSnapRuler(parsed))
    setText(null)
  }

  const stepCommit = (delta: number) => {
    const anchor = text !== null && text.trim() !== '' ? Number(text) : value
    const next = clampSnapRuler((Number.isFinite(anchor) ? anchor : value) + delta)
    onCommit(next)
    return next
  }

  const onTrackPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    try {
      trackRef.current?.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    const v = valueFromClientY(e.clientY)
    if (v !== null) onCommit(v)
  }

  const onTrackPointerMove = (e: React.PointerEvent) => {
    if ((e.buttons & 1) === 0) return
    const v = valueFromClientY(e.clientY)
    if (v !== null) onCommit(v)
  }

  const onKnobKeyDown = (e: React.KeyboardEvent) => {
    let next: number | null = null
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next = clampSnapRuler(value + RULER_STEP)
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next = clampSnapRuler(value - RULER_STEP)
    else if (e.key === 'Home') next = RULER_MIN
    else if (e.key === 'End') next = RULER_MAX
    else if (e.key === 'PageUp') next = clampSnapRuler(value + 5)
    else if (e.key === 'PageDown') next = clampSnapRuler(value - 5)
    if (next === null) return
    e.preventDefault()
    onCommit(next)
    onAnnounce(`Drawing altitude ${next.toFixed(1)} meters. Future geometry only.`)
  }

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitText(text)
    } else if (e.key === 'Escape') {
      // Cancel the edit; revert without committing. The window shortcut
      // handler already ignores Escape while typing.
      e.preventDefault()
      e.stopPropagation()
      setText(null)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = stepCommit(RULER_STEP)
      setText(next.toFixed(1))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = stepCommit(-RULER_STEP)
      setText(next.toFixed(1))
    }
  }

  return (
    <div className='ms-alt-ruler' role='group' aria-label='Drawing altitude in meters, 0 to 500 in half-meter steps'>
      <div className='ms-alt-body'>
        <div className='ms-alt-badge-slot'>
          <div className='ms-alt-badge' style={{ bottom: badgeBottom }}>
            <input
              className='ms-alt-input'
              data-testid='ms-alt-ruler-input'
              value={shown}
              inputMode='decimal'
              autoComplete='off'
              spellCheck={false}
              aria-label='Drawing altitude in meters'
              onFocus={(e) => {
                setText(value.toFixed(1))
                e.target.select()
              }}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => commitText(text)}
              onKeyDown={onInputKeyDown}
            />
            <span className='ms-alt-unit' aria-hidden='true'>m</span>
          </div>
        </div>
        <div
          ref={trackRef}
          className='ms-alt-track'
          data-testid='ms-alt-ruler-track'
          onPointerDown={onTrackPointerDown}
          onPointerMove={onTrackPointerMove}
        >
          <div
            className='ms-alt-gradient'
            aria-hidden='true'
            style={{ bottom: `${pct}%`, height: `min(40px, ${pct}%)` }}
          />
          <div className='ms-alt-ticks' aria-hidden='true' />
          <div className='ms-alt-active-line' aria-hidden='true' style={{ bottom: `${pct}%` }} />
          <div
            className='ms-alt-knob'
            data-testid='ms-alt-ruler-knob'
            role='slider'
            tabIndex={0}
            aria-label='Drawing altitude in meters, 0 to 500 in half-meter steps'
            aria-valuemin={RULER_MIN}
            aria-valuemax={RULER_MAX}
            aria-valuenow={value}
            aria-valuetext={`${value.toFixed(1)} meters`}
            aria-orientation='vertical'
            style={{ bottom: `${pct}%` }}
            onKeyDown={onKnobKeyDown}
          />
        </div>
      </div>
      <span className='ms-alt-hint' aria-hidden='true'>ALT</span>
    </div>
  )
}

export function DraftAxisInput({
  label,
  axis,
  value,
  min,
  max,
  precision,
  onChange
}: {
  label: string
  axis: 'X' | 'Y' | 'Z'
  value: number
  min: number
  max: number
  precision: number
  onChange: (v: number) => void
}) {
  const [text, setText] = useState<string | null>(null)
  const [syncedValue, setSyncedValue] = useState(value)
  if (syncedValue !== value) {
    setSyncedValue(value)
    setText(null)
  }

  const display = text ?? value.toFixed(2)

  const normalize = (val: number): number => {
    const clamped = Math.min(max, Math.max(min, val))
    if (precision === 0.1) {
      return Math.round(clamped * 10) / 10
    }
    return Math.round(clamped * 100) / 100
  }

  const commit = (rawText: string | null) => {
    setText(null)
    if (rawText === null || rawText.trim() === '') {
      return
    }
    const num = Number(rawText)
    if (!Number.isFinite(num)) {
      return
    }
    const nextVal = normalize(num)
    onChange(nextVal)
  }

  return (
    <label className='ms-axis-compact'>
      <span className='ms-axis' aria-hidden='true'>
        {axis}
      </span>
      <input
        type='number'
        inputMode='decimal'
        className='ms-axis-input'
        aria-label={label}
        value={display}
        min={min}
        max={Number.isFinite(max) ? max : undefined}
        step={precision}
        onChange={(event) => {
          const raw = event.target.value
          setText(raw)
          if (raw.trim() !== '') {
            const num = Number(raw)
            if (Number.isFinite(num) && num >= min && num <= max) {
              const normalized = normalize(num)
              onChange(normalized)
            }
          }
        }}
        onBlur={(event) => {
          commit(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.stopPropagation()
            commit(event.currentTarget.value)
            event.currentTarget.blur()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            setText(null)
            event.currentTarget.blur()
          }
        }}
      />
    </label>
  )
}
