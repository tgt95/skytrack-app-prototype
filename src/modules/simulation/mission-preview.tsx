import { useEffect, useMemo, useState } from 'react'
import { Button } from 'skytrack-ui/button'
import { Badge } from 'skytrack-ui/badge'
import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack } from 'skytrack-ui/slider'
import { Switch, SwitchThumb } from 'skytrack-ui/switch'
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
import { getMissionHome, type StudioMission } from '../../domain/mission-model'
import { buildPreview, previewPhotoCaptureAt, previewPositionAt } from './mission-preview-model'
export { previewPhotoCaptureAt, previewPositionAt } from './mission-preview-model'

/* Playback speeds keep the existing time math (seconds per tick scale). */
const SPEED_OPTIONS = [
  { value: '0.5', label: '0.5×' },
  { value: '1', label: '1×' },
  { value: '2', label: '2×' },
  { value: '4', label: '4×' },
  { value: '16', label: '16×' }
]

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

export interface MissionPreviewProps {
  mission: StudioMission
  onSelectWaypoint: (id: string) => void
  previewPositionRef: { current: { x: number; y: number; z: number } | null }
  previewCaptureRef: { current: string | null }
}

export default function MissionPreview({ mission, onSelectWaypoint, previewPositionRef, previewCaptureRef }: MissionPreviewProps) {
  const [showPhotoScanDemo, setShowPhotoScanDemo] = useState(true)
  const preview = useMemo(() => buildPreview(mission, showPhotoScanDemo), [mission, showPhotoScanDemo])
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    setTime((current) => Math.min(current, preview.duration))
    if (preview.duration === 0) setPlaying(false)
  }, [preview.duration])

  useEffect(() => {
    if (time >= preview.duration) setPlaying(false)
  }, [time, preview.duration])

  useEffect(() => {
    if (!playing || preview.duration === 0) return
    const timer = window.setInterval(() => {
      setTime((current) => {
        return Math.min(preview.duration, current + 0.1 * speed)
      })
    }, 100)
    return () => window.clearInterval(timer)
  }, [playing, preview.duration, speed])

  const dronePosition = useMemo(
    () => preview.transferBlocked ? null : previewPositionAt(mission, time, showPhotoScanDemo),
    [mission, preview.transferBlocked, time, showPhotoScanDemo]
  )
  const activePhotoCaptureId = useMemo(
    () => preview.transferBlocked ? null : previewPhotoCaptureAt(mission, time, showPhotoScanDemo),
    [mission, preview.transferBlocked, time, showPhotoScanDemo]
  )
  useEffect(() => {
    previewPositionRef.current = dronePosition
  }, [dronePosition, previewPositionRef])
  useEffect(() => {
    previewCaptureRef.current = activePhotoCaptureId
  }, [activePhotoCaptureId, previewCaptureRef])
  useEffect(() => () => {
    previewPositionRef.current = null
    previewCaptureRef.current = null
  }, [previewPositionRef, previewCaptureRef])

  const activeEvent = [...preview.events].reverse().find((event) => event.time <= time)
  const scrub = preview.duration > 0 ? Math.round((time / preview.duration) * 1000) : 0
  const activeWaypointId = activeEvent?.waypoint.id ?? null
  const home = getMissionHome(mission)
  const boundsPoints = [
    home,
    ...mission.waypoints,
    ...mission.areas.flatMap((area) => area.points)
  ]
  const bounds = boundsPoints.length ? {
    minX: Math.min(...boundsPoints.map((point) => point.x)),
    maxX: Math.max(...boundsPoints.map((point) => point.x)),
    minY: Math.min(...boundsPoints.map((point) => point.y)),
    maxY: Math.max(...boundsPoints.map((point) => point.y))
  } : { minX: -1, maxX: 1, minY: -1, maxY: 1 }
  const spanX = Math.max(1, bounds.maxX - bounds.minX)
  const spanY = Math.max(1, bounds.maxY - bounds.minY)
  const project = (x: number, y: number) => ({
    x: 30 + ((x - bounds.minX) / spanX) * 580,
    y: 24 + ((bounds.maxY - y) / spanY) * 232
  })
  const activePosition = dronePosition ? project(dronePosition.x, dronePosition.y) : null
  const homePosition = project(home.x, home.y)

  return (
    <section className='ms-preview' aria-label='Mission route preview' data-testid='ms-preview'>
      {/* <header className='ms-preview-header'>
        <div>
          <h2 className='ms-preview-title'>Flight preview</h2>
          <p className='ms-preview-note'>Approximate route playback · no drone control</p>
        </div>
        <span className='ms-preview-duration' aria-label={`Estimated duration ${formatTime(preview.duration)}`}>
          {formatTime(time)} / {formatTime(preview.duration)}
        </span>
      </header> */}

      <div className='ms-preview-map' role='img' aria-label='Mini map of areas and flight path'>
        <svg viewBox='0 0 640 280' preserveAspectRatio='xMidYMid meet' aria-hidden='true'>
          {Array.from({ length: 9 }, (_, index) => <line key={`v${index}`} x1={index * 80} y1='0' x2={index * 80} y2='280' className='ms-preview-grid-line' />)}
          {Array.from({ length: 5 }, (_, index) => <line key={`h${index}`} x1='0' y1={index * 70} x2='640' y2={index * 70} className='ms-preview-grid-line' />)}
          {mission.areas.map((area) => (
            <polygon key={area.id} points={area.points.map((point) => { const p = project(point.x, point.y); return `${p.x},${p.y}` }).join(' ')} className='ms-preview-area' />
          ))}
          {preview.rows.map(({ waypoint }, index) => {
            const point = project(waypoint.x, waypoint.y)
            const next = preview.rows[index + 1]?.waypoint
            const nextPoint = next ? project(next.x, next.y) : null
            return <g key={waypoint.id}>
              {nextPoint ? <line x1={point.x} y1={point.y} x2={nextPoint.x} y2={nextPoint.y} className='ms-preview-route-line' /> : null}
              {waypoint.actions.some((action) => action.kind === 'photo') ? <circle cx={point.x} cy={point.y} r='11' className='ms-preview-photo-ring' /> : null}
              <circle cx={point.x} cy={point.y} r='6' className='ms-preview-waypoint-dot' />
              <text x={point.x + 9} y={point.y - 8} className='ms-preview-map-label'>{waypoint.seq}</text>
            </g>
          })}
          <g className='ms-preview-home-marker' transform={`translate(${homePosition.x} ${homePosition.y})`}>
            <circle r='10' />
            <text x='12' y='4'>HOME</text>
          </g>
          {activePosition ? <g className='ms-preview-drone-marker' transform={`translate(${activePosition.x} ${activePosition.y})`}>
            <circle r='12' />
            <path d='M0 -8 L5 5 L0 2 L-5 5 Z' />
          </g> : null}
        </svg>
        <span className='ms-preview-map-caption'>Route overview · photo points highlighted</span>
      </div>

      <label className='flex items-center gap-2 text-sm'>
        <Switch
          checked={showPhotoScanDemo}
          size='sm'
          data-testid='ms-preview-photo-demo-toggle'
          aria-label='Show photo scan demonstration'
          onCheckedChange={(checked: boolean) => setShowPhotoScanDemo(checked)}
        >
          <SwitchThumb />
        </Switch>
        Show photo scan demonstration
      </label>

      <div className='ms-preview-playback' role='region' aria-label='Route playback'>
        <Button
          type='button'
          variant='outline'
          aria-pressed={playing}
          onClick={() => {
            if (time >= preview.duration) setTime(0)
            setPlaying((current) => !current)
          }}
          disabled={preview.duration <= 0}
          aria-label={playing ? 'Pause flight preview' : 'Play flight preview'}
          data-testid='ms-preview-play'
        >
          {playing ? 'Pause' : 'Play'}
        </Button>
        <div className='ms-preview-scrub'>
          <Slider
            value={scrub}
            min={0}
            max={1000}
            step={1}
            onValueChange={(next: number | readonly number[]) => {
              const first = Array.isArray(next) ? next[0] : next
              if (typeof first !== 'number' || !Number.isFinite(first) || preview.duration <= 0) return
              setPlaying(false)
              setTime(Math.min(Math.max((first / 1000) * preview.duration, 0), preview.duration))
            }}
          >
            <SliderControl>
              <SliderTrack>
                <SliderIndicator />
                <SliderThumb aria-label='Preview playback position' />
              </SliderTrack>
            </SliderControl>
          </Slider>
        </div>
        <div className='ms-preview-speed'>
          <Select<string>
            items={SPEED_OPTIONS}
            value={String(speed)}
            onValueChange={(next: unknown) => {
              const parsed = Number(next)
              if (SPEED_OPTIONS.some((option) => option.value === String(next)) && Number.isFinite(parsed)) setSpeed(parsed)
            }}
          >
            <SelectTrigger aria-label='Preview playback speed' className='ms-preview-speed-trigger'>
              <SelectValue />
              <SelectIcon />
            </SelectTrigger>
            <SelectPortal>
              <SelectPositioner side='bottom' align='end' sideOffset={4}>
                <SelectPopup>
                  <SelectList>
                    {SPEED_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <SelectItemIndicator />
                        <SelectItemText>{option.label}</SelectItemText>
                      </SelectItem>
                    ))}
                  </SelectList>
                </SelectPopup>
              </SelectPositioner>
            </SelectPortal>
          </Select>
        </div>
        <span className='ms-preview-time' data-testid='ms-preview-time'>
          {formatTime(time)} / {formatTime(preview.duration)}
        </span>
      </div>

      <p className='ms-preview-event' aria-live='polite' data-testid='ms-preview-current-event'>
        {preview.transferBlocked
          ? 'Preview unavailable: an Avoid zone blocks a route transfer. Adjust the route or Avoid zone to preview flight timing.'
          : activeEvent?.label ?? (preview.rows.length ? 'Take-off at Home' : 'Add waypoints to preview this mission.')}
      </p>

      <p className='ms-preview-estimate'>For runnable missions, estimate follows the mock flight path from Home, including transfers, Area traversal and landing. {showPhotoScanDemo ? 'Photo adds 1.5 s' : 'Photo demo dwell is skipped'}; LiDAR adds 2 s per action. Other actions add no dwell time.</p>

      <div className='flex flex-col gap-2'>
        <div className='flex justify-between gap-2'>
          <div className='font-medium'>Waypoints in flight order</div>
          <Badge count={`${preview.rows.length} waypoint${preview.rows.length === 1 ? '' : 's'}`} status='outline' />
        </div>
        <div className='ms-preview-tablewrap'>
          <table className='ms-preview-table' aria-label='Waypoints in flight order'>
            <thead>
              <tr>
                <th scope='col'>#</th>
                <th scope='col'>X</th>
                <th scope='col'>Y</th>
                <th scope='col'>Z</th>
                <th scope='col'>Action</th>
                <th scope='col'>T+</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map(({ waypoint, time: arrivalTime }) => {
                const isActive = activeWaypointId === waypoint.id
                const selectRow = () => {
                  onSelectWaypoint(waypoint.id)
                  setPlaying(false)
                  setTime(arrivalTime)
                }
                return (
                  <tr
                    key={waypoint.id}
                    data-seq={waypoint.seq}
                    tabIndex={0}
                    aria-selected={isActive}
                    className={isActive ? 'is-current' : ''}
                    data-testid={`ms-preview-waypoint-${waypoint.seq}`}
                    onClick={selectRow}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        selectRow()
                      }
                    }}
                  >
                    <td>{waypoint.seq}</td>
                    <td>{Math.round(waypoint.x * 10) / 10}</td>
                    <td>{Math.round(waypoint.y * 10) / 10}</td>
                    <td>{Math.round(waypoint.z * 10) / 10}</td>
                    <td>{waypoint.actions.length ? waypoint.actions.map((action) => action.label).join(' · ') : 'Fly to point'}</td>
                    <td>{formatTime(arrivalTime)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
