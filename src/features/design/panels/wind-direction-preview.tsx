import { useEffect, useState } from 'react'
import { meteorologicalFromAzimuthToEnuPushTo } from '@/domain/mission-model'
import {
  CENTER,
  pointAlongPolyline,
  pointAtCompassBearing,
  pointAtElevation,
  project,
  RADIUS,
  sectorPath,
  SHOW_COORDINATE_AXES,
  SPHERE_RADIUS,
  WIND_ARROW_COUNT
} from './wind-direction-preview-geometry'

interface WindDirectionPreviewProps {
  windFromDeg: number
  elevationDeg: number
  speedMS: number
}

export function WindDirectionPreview ({
  windFromDeg,
  elevationDeg,
  speedMS
}: WindDirectionPreviewProps) {
  const [motionAllowed, setMotionAllowed] = useState(true)
  useEffect(() => {
    const preference = window.matchMedia(
      '(prefers-reduced-motion: no-preference)'
    )
    const syncPreference = () => setMotionAllowed(preference.matches)
    syncPreference()
    preference.addEventListener('change', syncPreference)
    return () => preference.removeEventListener('change', syncPreference)
  }, [])

  const pushToAzimuthDeg = meteorologicalFromAzimuthToEnuPushTo(windFromDeg)
  const pushToBearingDeg = (90 - pushToAzimuthDeg + 360) % 360
  const elevation = (elevationDeg * Math.PI) / 180
  const horizonTarget = pointAtCompassBearing(pushToBearingDeg)
  const target = pointAtElevation(horizonTarget, elevation)
  const fromHorizonTarget = pointAtCompassBearing(windFromDeg)
  const windPathPoints = [fromHorizonTarget, CENTER, target]
  const windPath = windPathPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
    .join(' ')
  const xAxisTarget = pointAtCompassBearing(90)
  const yAxisTarget = pointAtCompassBearing(0)
  const zAxisTarget = project(0, 0, 1, SPHERE_RADIUS / (RADIUS * 0.9))
  const bearingArcSteps = Math.max(24, Math.ceil(windFromDeg / 5))
  const bearingArc = Array.from({ length: bearingArcSteps + 1 }, (_, index) => {
    const angle = (windFromDeg * index) / bearingArcSteps
    return pointAtCompassBearing(angle)
  })
  const bearingSector = sectorPath(bearingArc)
  const bearingLabel = pointAtCompassBearing(windFromDeg / 2, 0.74)
  const elevationArc = Array.from({ length: 17 }, (_, index) =>
    pointAtElevation(horizonTarget, (elevation * index) / 16)
  )
  const elevationSector = sectorPath(elevationArc)
  const elevationLabelAngle = elevation * 0.5
  const elevationLabel = pointAtElevation(
    horizonTarget,
    elevationLabelAngle,
    0.58
  )
  const elevationLabelText = `${elevationDeg > 0 ? '+' : ''}${elevationDeg}°`
  const durationSeconds = Math.min(
    6,
    Math.max(0.45, 1.4 * (6 / Math.max(speedMS, 0.1)))
  )
  const windArrows = Array.from({ length: WIND_ARROW_COUNT }, (_, index) => ({
    index,
    point: pointAlongPolyline(
      windPathPoints,
      (index + 0.5) / WIND_ARROW_COUNT
    )
  }))
  return (
    <div className='flex flex-col gap-1'>
      <div className='flex min-w-0 items-center justify-between gap-3'>
        <div className='group-data-disabled/field:cursor-not-allowed group-data-disabled/field:opacity-50 w-100/2 text-sm leading-normal font-medium text-muted-foreground'>
          Wind direction preview
        </div>
        <span
          className='text-xs text-muted-foreground shrink-0'
          data-testid='ms-wind-preview-angles'
        >
          {windFromDeg}° FROM / {elevationDeg}° flow
        </span>
      </div>
      <section
        className='box-border flex w-full min-w-0 flex-col gap-2 overflow-hidden rounded-(--radius) border border-border p-3'
        aria-label='Wind direction preview'
        data-testid='ms-wind-direction-preview'
      >
        <svg
          viewBox='0 0 320 250'
          className='mx-auto block h-auto max-h-64 w-full max-w-80 text-muted-foreground'
          role='img'
          aria-label={`Wind comes from ${windFromDeg} degrees clockwise from true North and flows toward ${(windFromDeg + 180) % 360} degrees. Flow elevation is ${elevationDeg} degrees.`}
        >
          <defs>
            <clipPath id='ms-wind-sphere-clip'>
              <circle cx={CENTER.x} cy={CENTER.y} r={SPHERE_RADIUS} />
            </clipPath>
            <marker
              id='ms-wind-direction-arrow'
              markerWidth='12'
              markerHeight='12'
              refX='12'
              refY='6'
              orient='auto'
              markerUnits='userSpaceOnUse'
            >
              <path d='M0,0 L12,6 L0,12 Z' fill='var(--primary)' />
            </marker>
            <marker
              id='ms-wind-axis-arrow'
              markerWidth='5'
              markerHeight='5'
              refX='4.5'
              refY='2.5'
              orient='auto'
              markerUnits='userSpaceOnUse'
            >
              <path d='M0,0 L5,2.5 L0,5 Z' fill='var(--foreground)' />
            </marker>
          </defs>

          <g transform='translate(160 125) scale(1.35) translate(-160 -104)'>
          <circle
            cx={CENTER.x}
            cy={CENTER.y}
            r={SPHERE_RADIUS}
            fill='none'
            stroke='currentColor'
            strokeWidth='0.75'
            strokeOpacity='0.25'
          />
          <ellipse
            cx={CENTER.x}
            cy={CENTER.y}
            rx={SPHERE_RADIUS}
            ry='29'
            fill='none'
            stroke='currentColor'
            strokeWidth='0.75'
            strokeOpacity='0.25'
          />
          {SHOW_COORDINATE_AXES ? (
            <g
              aria-hidden='true'
              fill='none'
              stroke='var(--foreground)'
              strokeWidth='1'
              strokeOpacity='0.62'
            >
              <line
                x1={CENTER.x}
                y1={CENTER.y}
                x2={xAxisTarget.x}
                y2={xAxisTarget.y}
                markerEnd='url(#ms-wind-axis-arrow)'
              />
              <line
                x1={CENTER.x}
                y1={CENTER.y}
                x2={yAxisTarget.x}
                y2={yAxisTarget.y}
                markerEnd='url(#ms-wind-axis-arrow)'
              />
              <line
                x1={CENTER.x}
                y1={CENTER.y}
                x2={zAxisTarget.x}
                y2={zAxisTarget.y}
                markerEnd='url(#ms-wind-axis-arrow)'
              />
            </g>
          ) : null}
          <path d={bearingSector} fill='var(--primary)' fillOpacity='0.12' />
          <path
            d={elevationSector}
            fill='var(--chart-2)'
            fillOpacity='0.12'
          />
          <polyline
            points={bearingArc.map(({ x, y }) => `${x},${y}`).join(' ')}
            fill='none'
            stroke='var(--border)'
            strokeDasharray='3 4'
            strokeWidth='0.75'
            strokeOpacity='1'
          />
          <polyline
            points={elevationArc.map(({ x, y }) => `${x},${y}`).join(' ')}
            fill='none'
            stroke='var(--border)'
            strokeDasharray='3 4'
            strokeWidth='0.75'
            strokeOpacity='1'
          />
          <path
            d={windPath}
            fill='none'
            stroke='var(--primary)'
            strokeWidth='1.5'
            markerEnd='url(#ms-wind-direction-arrow)'
          />
          {speedMS > 0 ? (
            <g clipPath='url(#ms-wind-sphere-clip)' aria-hidden='true'>
              {windArrows.map(({ index, point }) => (
                <g
                  key={`wind-arrow-${index}`}
                  opacity={0.82}
                  transform={
                    motionAllowed
                      ? undefined
                      : `translate(${point.x} ${point.y}) rotate(${point.angle})`
                  }
                >
                  <path d='M-3,-2.5 L3,0 L-3,2.5 Z' fill='var(--primary)' />
                  {motionAllowed ? (
                    <animateMotion
                      path={windPath}
                      rotate='auto'
                      dur={`${durationSeconds}s`}
                      begin={`${-(durationSeconds * index) / WIND_ARROW_COUNT}s`}
                      repeatCount='indefinite'
                    />
                  ) : null}
                </g>
              ))}
            </g>
          ) : null}
          <circle
            cx={fromHorizonTarget.x}
            cy={fromHorizonTarget.y}
            r='4'
            fill='var(--card)'
            stroke='var(--primary)'
            strokeWidth='2'
          />
          <text
            x={bearingLabel.x}
            y={bearingLabel.y}
            textAnchor='middle'
            className='fill-primary text-[9px] font-semibold'
          >
            {windFromDeg}°
          </text>
          <text
            x={elevationLabel.x + (elevationLabel.x > CENTER.x ? 8 : -8)}
            y={elevationLabel.y - 5}
            textAnchor={elevationLabel.x > CENTER.x ? 'start' : 'end'}
            fill='var(--chart-2)'
            className='text-[9px] font-semibold'
          >
            {elevationLabelText}
          </text>
          <circle cx={CENTER.x} cy={CENTER.y} r='4' fill='currentColor' />
          {SHOW_COORDINATE_AXES ? (
            <>
              <text
                x={xAxisTarget.x + 5}
                y={xAxisTarget.y - 8}
                className='fill-muted-foreground text-[9px] font-medium'
              >
                X
              </text>
              <text
                x={yAxisTarget.x - 18}
                y={yAxisTarget.y - 10}
                textAnchor='end'
                className='fill-muted-foreground text-[9px] font-medium'
              >
                Y
              </text>
              <text
                x={zAxisTarget.x + 5}
                y={zAxisTarget.y + 18}
                textAnchor='middle'
                className='fill-muted-foreground text-[9px] font-medium'
              >
                Z
              </text>
            </>
          ) : null}
          <text
            x={CENTER.x}
            y={CENTER.y - 29 - 5}
            textAnchor='middle'
            className='fill-muted-foreground text-xs sub-heading'
          >
            W
          </text>
          <text
            x={CENTER.x + SPHERE_RADIUS + 7}
            y={CENTER.y + 4}
            textAnchor='start'
            className='fill-muted-foreground text-xs sub-heading'
          >
            N
          </text>
          <text
            x={CENTER.x}
            y={CENTER.y + 29 + 14}
            textAnchor='middle'
            className='fill-muted-foreground text-xs sub-heading'
          >
            E
          </text>
          <text
            x={CENTER.x - SPHERE_RADIUS - 7}
            y={CENTER.y + 4}
            textAnchor='end'
            className='fill-muted-foreground text-xs sub-heading'
          >
            S
          </text>
          </g>
        </svg>
      </section>
    </div>
  )
}
