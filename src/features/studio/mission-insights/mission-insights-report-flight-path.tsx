import { useState } from 'react'
import {
  ArrowCounterClockwiseIcon,
  BuildingIcon,
  CameraIcon,
  GearIcon
} from '@phosphor-icons/react'
import {
  type JsonRecord,
  asRecord,
  textValue,
  numberValue,
  reportForSample,
  asRecords,
  sampleMedia,
  sampleWorldImage,
  modelForId
} from './mission-insights-report-data'
import { type MissionInsightSample } from './mission-insights-data'
import { DetailSection } from './mission-insights-page-sections'
import { Badge } from 'skytrack-ui/badge'
import { type MissionInsightsReportTab } from '@/features/studio/mission-report-url'
import { Button } from 'skytrack-ui/button'
import { Switch, SwitchThumb } from 'skytrack-ui/switch'
import {
  Popover,
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverTitle,
  PopoverTrigger
} from 'skytrack-ui/popover'
import { KeyValueList } from './mission-insights-report-shared'
import { MissionInsightsReportFlightPath3D } from './mission-insights-report-flight-path-3d'

const defaultMapLayers = {
  route: true,
  waypoints: true,
  captures: true,
  detections: true,
  areas: true,
  avoids: true,
  altitude: true
}

type MapLayer = keyof typeof defaultMapLayers
type MapHover =
  | {
      kind: 'capture'
      item: ReturnType<typeof sampleMedia>[number]
      x: number
      y: number
    }
  | { kind: 'waypoint'; point: JsonRecord; index: number; x: number; y: number }
  | {
      kind: 'detection'
      item: JsonRecord
      label: string
      x: number
      y: number
    }

export function capturePoseSummary (artifact: JsonRecord) {
  const pose = asRecord(asRecord(artifact.metadata).capture_pose)
  const frame = textValue(pose.frame_id, 'Frame not recorded')
  const axes = (['x_m', 'y_m', 'z_m'] as const).map(axis =>
    numberValue(pose[axis])
  )
  if (axes.some(value => value === null)) return frame
  return `${frame} · X ${axes[0]!.toFixed(2)} m · Y ${axes[1]!.toFixed(
    2
  )} m · Z ${axes[2]!.toFixed(2)} m`
}

function flightPathMetrics (report: JsonRecord) {
  const flight = asRecord(report.flight_path)
  const run = asRecord(report.run)
  const samples = asRecords(flight.samples)
  const speeds = samples.slice(1).flatMap((point, index) => {
    const previous = samples[index]
    const t1 = numberValue(point.t_s)
    const t0 = numberValue(previous.t_s)
    const x1 = numberValue(point.x_m)
    const y1 = numberValue(point.y_m)
    const z1 = numberValue(point.z_m)
    const x0 = numberValue(previous.x_m)
    const y0 = numberValue(previous.y_m)
    const z0 = numberValue(previous.z_m)
    if (
      t1 === null ||
      t0 === null ||
      t1 <= t0 ||
      x1 === null ||
      y1 === null ||
      z1 === null ||
      x0 === null ||
      y0 === null ||
      z0 === null
    ) {
      return []
    }
    return [Math.hypot(x1 - x0, y1 - y0, z1 - z0) / (t1 - t0)]
  })
  const altitudeSamples = samples.flatMap(point => {
    const altitude = numberValue(point.z_m)
    return altitude === null ? [] : [altitude]
  })
  const duration = numberValue(run.duration_ms)
  const maxAltitude =
    numberValue(flight.max_altitude_m) ??
    (altitudeSamples.length ? Math.max(...altitudeSamples) : null)
  const maxSpeed = speeds.length ? Math.max(...speeds) : null
  const distance = numberValue(flight.distance_m)

  return [
    ['Duration', duration === null ? '—' : `${(duration / 1000).toFixed(1)} s`],
    [
      'Maximum altitude',
      maxAltitude === null ? '—' : `${maxAltitude.toFixed(1)} m`
    ],
    ['Maximum speed', maxSpeed === null ? '—' : `${maxSpeed.toFixed(1)} m/s`],
    ['Distance flown', distance === null ? '—' : `${distance.toFixed(1)} m`]
  ] as const
}

function FlightPathSummary ({
  sample,
  className = ''
}: {
  sample: MissionInsightSample
  className?: string
}) {
  const report = reportForSample(sample)
  const flight = asRecord(report.flight_path)
  const touchdown = asRecord(flight.touchdown)
  const pad = asRecord(asRecord(report.field).pad)
  const waypoints = asRecords(report.waypoints)
  const reached = waypoints.filter(point => point.reached === true).length
  const altitudeValues = waypoints.flatMap(point => {
    const altitude = numberValue(point.z_m)
    return altitude === null ? [] : [altitude]
  })
  const maxAltitude =
    numberValue(flight.max_altitude_m) ??
    (altitudeValues.length ? Math.max(...altitudeValues) : null)
  const samples = asRecords(flight.samples)
  const duration = numberValue(asRecord(report.run).duration_ms)
  const climbEnd = samples.find(point => {
    const altitude = numberValue(point.z_m)
    return (
      altitude !== null && maxAltitude !== null && altitude >= maxAltitude * 0.9
    )
  })
  const descentStart = [...samples].reverse().find(point => {
    const altitude = numberValue(point.z_m)
    return altitude !== null && altitude >= (maxAltitude ?? 0) * 0.9
  })
  const climbSeconds = numberValue(climbEnd?.t_s)
  const descentStartSeconds = numberValue(descentStart?.t_s)
  const flightSeconds = duration === null ? null : duration / 1000
  const touchdownX = numberValue(touchdown.x_m)
  const touchdownY = numberValue(touchdown.y_m)
  const padX = numberValue(pad.x_m)
  const padY = numberValue(pad.y_m)
  const touchdownDistance =
    numberValue(touchdown.distance_from_pad_m) ??
    (touchdownX !== null &&
    touchdownY !== null &&
    padX !== null &&
    padY !== null
      ? Math.hypot(touchdownX - padX, touchdownY - padY)
      : null)
  const captures = sampleMedia(sample).filter(item => item.kind === 'image')
  const localCaptures = captures.filter(
    item => item.availability === 'local'
  ).length
  const remoteCaptures = captures.length - localCaptures
  const detectionCount = asRecords(report.detections_geo).length
  const metrics = flightPathMetrics(report)
  const metricValue = (label: string) =>
    metrics.find(([name]) => name === label)?.[1] ?? '—'
  const touchdownLabel =
    touchdownDistance === null
      ? 'TOUCHDOWN RECORDED'
      : touchdownDistance <= 0.2
      ? 'TOUCHDOWN ON PAD'
      : 'TOUCHDOWN OFF PAD'
  const touchdownStatus =
    touchdownDistance === null
      ? 'secondary'
      : touchdownDistance <= 0.2
      ? 'success'
      : 'warning'

  return (
    <DetailSection
      title={<span className='inline-flex items-center gap-2'>Summary</span>}
      className={`gap-5 ${className}`}
    >
      <dl className='m-0 grid grid-cols-2 gap-x-8 gap-y-8'>
        {[
          ['Distance', metricValue('Distance flown')],
          ['Max altitude', metricValue('Maximum altitude')],
          ['Flight time', metricValue('Duration')],
          [
            'Touchdown',
            touchdownDistance === null
              ? '—'
              : `${touchdownDistance.toFixed(2)} m`
          ]
        ].map(([label, value], index) => (
          <div key={label} className='relative min-w-0'>
            <dt className='text-sm text-muted-foreground'>{label}</dt>
            <dd className='mt-1 break-words h4 tabular-nums'>{value}</dd>
            {index % 2 === 0 ? (
              <div
                aria-hidden='true'
                className='absolute top-0 -right-4 bottom-0 w-px bg-border'
              />
            ) : null}
            {index < 2 ? (
              <div
                aria-hidden='true'
                className='absolute -bottom-4 left-0 right-0 h-px bg-border'
              />
            ) : null}
          </div>
        ))}
      </dl>
      <KeyValueList
        columns='grid-cols-1'
        rows={[
          [
            'Waypoints',
            `${reached} of ${waypoints.length} reached${
              maxAltitude === null ? '' : ` (${maxAltitude.toFixed(1)} m)`
            }`
          ],
          [
            'Climb & descent',
            maxAltitude === null
              ? 'Not recorded'
              : `0 → ${maxAltitude.toFixed(1)} m (${
                  climbSeconds === null ? '—' : `${climbSeconds.toFixed(1)} s`
                }) · ${maxAltitude.toFixed(1)} → 0 m (${
                  flightSeconds === null || descentStartSeconds === null
                    ? '—'
                    : `${Math.max(
                        0,
                        flightSeconds - descentStartSeconds
                      ).toFixed(1)} s`
                })`
          ],
          [
            'Touchdown position (local X/Y)',
            touchdownX === null || touchdownY === null ? (
              'Not recorded'
            ) : (
              <span className='inline-flex items-center gap-2'>
                {`X ${touchdownX.toFixed(2)} m · Y ${touchdownY.toFixed(2)} m `}
                <Badge
                  aria-label={touchdownLabel}
                  count={touchdownLabel}
                  status={touchdownStatus}
                />
              </span>
            )
          ],
          [
            'Captures & hits',
            `${localCaptures} local images${
              remoteCaptures ? ` · ${remoteCaptures} other images` : ''
            } · ${detectionCount} detections`
          ]
        ]}
      />
    </DetailSection>
  )
}

function FlightPathLegend ({
  sample,
  className = ''
}: {
  sample: MissionInsightSample
  className?: string
}) {
  const report = reportForSample(sample)
  const flight = asRecord(report.flight_path)
  const samples = asRecords(flight.samples)
  const altitudes = samples.flatMap(point => {
    const altitude = numberValue(point.z_m)
    return altitude === null ? [] : [altitude]
  })
  const minAltitude = Math.min(0, ...altitudes)
  const maxAltitude = Math.max(0, ...altitudes)
  const hasCaptures = sampleMedia(sample).some(item => item.kind === 'image')
  const hasDetections = asRecords(report.detections_geo).length > 0

  return (
    <section
      aria-label='Flight path map key'
      className={`flex min-w-0 flex-col gap-4 p-6 ${className}`}
    >
      <div className='flex flex-col gap-1 text-sm text-muted-foreground'>
        <span className='text-foreground shrink-0'>Altitude heatmap</span>
        <div className='flex w-full items-center gap-2'>
          <span>{minAltitude.toFixed(0)} m</span>
          <span
            role='img'
            aria-label={`Altitude heatmap from ${minAltitude.toFixed(
              1
            )} to ${maxAltitude.toFixed(1)} metres`}
            className='h-2 min-w-12 flex-1'
            style={{
              background:
                'linear-gradient(to right, var(--chart-1), var(--chart-2), var(--chart-3), var(--chart-4))'
            }}
          />
          <span>{maxAltitude.toFixed(1)} m</span>
        </div>
      </div>
      <div className='grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2'>
        <span className='flex items-center gap-2'>
          <i
            aria-hidden='true'
            className='size-2 rounded-full border border-foreground'
          />
          Pad
        </span>
        <span className='flex items-center gap-2'>
          <i aria-hidden='true' className='size-2 rounded-full bg-success' />
          Touchdown
        </span>
        <span className='flex items-center gap-2'>
          <i aria-hidden='true' className='size-2 rounded-full bg-success' />
          Waypoint reached
        </span>
        <span className='flex items-center gap-2'>
          <i
            aria-hidden='true'
            className='size-2 rounded-full border border-warning'
          />
          Waypoint not reached
        </span>
        {hasCaptures ? (
          <span className='flex items-center gap-2'>
            <CameraIcon
              aria-hidden='true'
              className='size-3 text-warning'
              weight='fill'
            />
            Image capture
          </span>
        ) : null}
        {hasDetections ? (
          <span className='flex items-center gap-2'>
            <i
              aria-hidden='true'
              className='size-2.5 rounded-full bg-warning'
            />
            Detection
          </span>
        ) : null}
      </div>
    </section>
  )
}

export function coordinatePairs (value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) return []
  return value.flatMap(pair => {
    if (!Array.isArray(pair) || pair.length < 2) return []
    const x = numberValue(pair[0])
    const y = numberValue(pair[1])
    return x === null || y === null ? [] : [[x, y]]
  })
}

export function localPoint (value: unknown): [number, number] | null {
  const point = asRecord(value)
  const x = numberValue(point.x_m)
  const y = numberValue(point.y_m)
  return x === null || y === null ? null : [x, y]
}

export function FlightPathMap ({
  sample,
  selectedCaptureId,
  onSelectCapture,
  onSelectDiagnostic,
  className = ''
}: {
  sample: MissionInsightSample
  selectedCaptureId: string | null
  onSelectCapture: (id: string) => void
  onSelectDiagnostic: () => void
  className?: string
}) {
  const [layers, setLayers] = useState(defaultMapLayers)
  const [hoveredMarker, setHoveredMarker] = useState<MapHover | null>(null)
  const report = reportForSample(sample)
  const field = asRecord(report.field)
  const waypoints = asRecords(report.waypoints)
  const flightPath = asRecord(report.flight_path)
  const primaryDiagnostic =
    asRecords(asRecord(report.diagnostics).items)[0] ?? {}
  const pad = asRecord(asRecord(field.pad))
  const touchdown = asRecord(flightPath.touchdown)
  const lastPosition = asRecord(flightPath.last_position)
  const samples = asRecords(flightPath.samples)
  const polygon = coordinatePairs(field.polygon_m)
  const areaPolygons = asRecords(field.areas)
    .map(area => coordinatePairs(area.polygon_m))
    .filter(area => area.length > 2)
  const displayedPolygons = areaPolygons.length ? areaPolygons : [polygon]
  const avoidPolygons = asRecords(field.avoids)
    .map(avoid => coordinatePairs(avoid.polygon_m))
    .filter(avoid => avoid.length > 2)
  const media = sampleMedia(sample).filter(item => item.kind === 'image')
  const captures = media.flatMap(item => {
    const pose = localPoint(asRecord(item.artifact.metadata).capture_pose)
    return pose ? [{ item, point: pose }] : []
  })
  const detections = asRecords(report.detections_geo).flatMap(item => {
    const point = localPoint(item)
    return point ? [{ item, label: textValue(item.class), point }] : []
  })
  const pathPoints = samples.flatMap(point => {
    const coordinates = localPoint(point)
    return coordinates ? [coordinates] : []
  })
  const altitudeSamples = samples.flatMap(point => {
    const coordinates = localPoint(point)
    const altitude = numberValue(point.z_m)
    return coordinates && altitude !== null ? [{ coordinates, altitude }] : []
  })
  const minPathAltitude = Math.min(
    ...altitudeSamples.map(point => point.altitude),
    0
  )
  const maxPathAltitude = Math.max(
    ...altitudeSamples.map(point => point.altitude),
    0
  )
  const altitudePalette = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)'
  ]
  const bounds = [
    ...displayedPolygons.flat(),
    ...avoidPolygons.flat(),
    ...pathPoints,
    ...[pad, touchdown, lastPosition].flatMap(point => {
      const coordinates = localPoint(point)
      return coordinates ? [coordinates] : []
    }),
    ...waypoints.flatMap(point => {
      const coordinates = localPoint(point)
      return coordinates ? [coordinates] : []
    }),
    ...detections.map(item => item.point)
  ]
  const xs = bounds.map(([x]) => x)
  const ys = bounds.map(([, y]) => y)
  const minX = xs.length ? Math.min(...xs) : 0
  const maxX = xs.length ? Math.max(...xs) : 1
  const minY = ys.length ? Math.min(...ys) : 0
  const maxY = ys.length ? Math.max(...ys) : 1
  const xSpan = Math.max(maxX - minX, 1)
  const ySpan = Math.max(maxY - minY, 1)
  const mapScale = Math.min(90 / xSpan, 50 / ySpan)
  const mapPoint = ([x, y]: [number, number]) =>
    [
      50 + (x - (minX + maxX) / 2) * mapScale,
      30 - (y - (minY + maxY) / 2) * mapScale
    ] as const
  const padPoint = localPoint(pad)
  const touchdownPoint = localPoint(touchdown)
  const lastPositionPoint = localPoint(lastPosition)
  const worldImage = sampleWorldImage(sample)
  const first = pathPoints[0] ? mapPoint(pathPoints[0]) : null
  const last = pathPoints[pathPoints.length - 1]
    ? mapPoint(pathPoints[pathPoints.length - 1])
    : null

  return (
    <DetailSection
      title={`Top view: ${textValue(field.label, sample.world)}`}
      className={className}
      toolbar={
        <div className='flex items-center gap-2'>
          {sample.key === 'real-succeeded' ? (
            <Badge
              className='rounded-(--radius)'
              count='Reference image'
              status='secondary'
            />
          ) : null}
        </div>
      }
    >
      <figure className='m-0 flex min-w-0 flex-col gap-3'>
        <div
          className='relative aspect-video min-w-0 overflow-hidden rounded-(--radius) border border-border bg-(--muted)'
          onMouseLeave={() => setHoveredMarker(null)}
        >
          {worldImage ? (
            <img
              src={worldImage}
              alt={`${textValue(field.label, sample.world)} world image`}
              className='absolute inset-0 size-full object-cover'
            />
          ) : null}
          <svg
            className='absolute inset-0 size-full'
            viewBox='0 0 100 60'
            preserveAspectRatio='xMidYMid meet'
            role='img'
            aria-label={`Top-down flight map${
              layers.avoids ? `, ${avoidPolygons.length} Avoid zones` : ''
            }${layers.areas ? ', Areas' : ''}${
              layers.route ? ', flight path' : ''
            }, pad${layers.waypoints ? ', waypoints' : ''}${
              layers.captures ? ', image captures' : ''
            }${
              layers.detections && detections.length ? ', detections' : ''
            }, and endpoint`}
          >
            <desc>
              Top-down map with Avoid zones, Areas, path, pad, waypoints,
              captures
              {detections.length ? ', detections,' : ','} and endpoint.
            </desc>
            {layers.avoids
              ? avoidPolygons.map((avoid, index) => (
                  <polygon
                    key={`avoid-${index}`}
                    points={avoid
                      .map(point => mapPoint(point).join(','))
                      .join(' ')}
                    fill='var(--destructive)'
                    fillOpacity='0.32'
                    stroke='var(--destructive)'
                    strokeWidth='0.7'
                    vectorEffect='non-scaling-stroke'
                  >
                    <title>
                      {textValue(
                        asRecords(field.avoids)[index]?.label,
                        'Avoid zone'
                      )}
                    </title>
                  </polygon>
                ))
              : null}
            {layers.areas
              ? displayedPolygons.map((area, index) =>
                  area.length > 2 ? (
                    <polygon
                      key={`area-${index}`}
                      points={area
                        .map(point => mapPoint(point).join(','))
                        .join(' ')}
                      fill='var(--primary)'
                      fillOpacity='0.08'
                      stroke='var(--primary)'
                      strokeWidth='0.8'
                      vectorEffect='non-scaling-stroke'
                    />
                  ) : null
                )
              : null}
            {padPoint
              ? (() => {
                  const [x, y] = mapPoint(padPoint)
                  return (
                    <circle
                      cx={x}
                      cy={y}
                      r='1.2'
                      fill='var(--background)'
                      stroke='var(--foreground)'
                      strokeWidth='0.4'
                    >
                      <title>Landing pad</title>
                    </circle>
                  )
                })()
              : null}
            {layers.route && waypoints.length > 1 ? (
              <polyline
                points={waypoints
                  .flatMap(point => {
                    const coordinates = localPoint(point)
                    return coordinates ? [mapPoint(coordinates).join(',')] : []
                  })
                  .join(' ')}
                fill='none'
                stroke='var(--info)'
                strokeWidth='1.2'
                vectorEffect='non-scaling-stroke'
              >
                <title>Planned route through defined waypoints</title>
              </polyline>
            ) : null}
            {layers.route && layers.altitude ? (
              altitudeSamples.slice(1).map((point, index) => {
                const start = mapPoint(altitudeSamples[index].coordinates)
                const end = mapPoint(point.coordinates)
                const ratio =
                  maxPathAltitude > minPathAltitude
                    ? (point.altitude - minPathAltitude) /
                      (maxPathAltitude - minPathAltitude)
                    : 0
                const bucket = Math.min(
                  altitudePalette.length - 1,
                  Math.floor(ratio * altitudePalette.length)
                )
                return (
                  <line
                    key={`map-path-${index}`}
                    x1={start[0]}
                    y1={start[1]}
                    x2={end[0]}
                    y2={end[1]}
                    stroke={altitudePalette[bucket]}
                    strokeWidth='1.2'
                    vectorEffect='non-scaling-stroke'
                  >
                    <title>{point.altitude.toFixed(1)} m altitude</title>
                  </line>
                )
              })
            ) : layers.route ? (
              altitudeSamples.length > 1 ? (
                <polyline
                  points={altitudeSamples
                    .map(point => mapPoint(point.coordinates).join(','))
                    .join(' ')}
                  fill='none'
                  stroke='var(--info)'
                  strokeWidth='1.2'
                  vectorEffect='non-scaling-stroke'
                />
              ) : null
            ) : null}
            {layers.waypoints
              ? waypoints.map((point, index) => {
                  const coordinates = localPoint(point)
                  if (!coordinates) return null
                  const [x, y] = mapPoint(coordinates)
                  const isCapturePoint = asRecords(point.actions).some(
                    action => action.kind === 'photo'
                  )
                  return (
                    <g
                      key={`waypoint-${index}`}
                      tabIndex={0}
                      role='img'
                      aria-label={`Waypoint ${
                        numberValue(point.index) ?? index + 1
                      }, ${
                        numberValue(point.z_m)?.toFixed(1) ?? 'unknown'
                      } metres altitude${
                        isCapturePoint ? ', photo capture' : ''
                      }`}
                      onMouseEnter={() =>
                        setHoveredMarker({
                          kind: 'waypoint',
                          point,
                          index,
                          x,
                          y
                        })
                      }
                      onFocus={() =>
                        setHoveredMarker({
                          kind: 'waypoint',
                          point,
                          index,
                          x,
                          y
                        })
                      }
                      onBlur={() => setHoveredMarker(null)}
                      className='cursor-pointer outline-none focus-visible:drop-shadow-[0_0_2px_var(--ring)]'
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r='1.5'
                        fill='transparent'
                        pointerEvents='all'
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r='0.82'
                        fill={
                          point.reached === true
                            ? 'var(--success)'
                            : 'var(--background)'
                        }
                        stroke={
                          point.reached === true
                            ? 'var(--background)'
                            : 'var(--warning)'
                        }
                        strokeWidth='0.25'
                      >
                        <title>
                          Waypoint {numberValue(point.index) ?? index + 1}
                          {isCapturePoint ? ' · Photo capture' : ''}
                        </title>
                      </circle>
                      <text
                        x={x + 1.05}
                        y={y + 1.65}
                        fill='var(--foreground)'
                        stroke='var(--background)'
                        strokeWidth='0.45'
                        paintOrder='stroke'
                        fontSize='1.35'
                        fontWeight='600'
                      >
                        {numberValue(point.index) ?? index + 1}
                      </text>
                    </g>
                  )
                })
              : null}
            {layers.captures
              ? captures.map(({ item, point }) => {
                  const [x, y] = mapPoint(point)
                  const selected = item.id === selectedCaptureId
                  return (
                    <g
                      key={item.id}
                      role='button'
                      tabIndex={0}
                      aria-label={`Select capture ${item.name} at ${
                        item.captureTime?.toFixed(1) ?? 'unknown'
                      } seconds`}
                      onMouseEnter={() =>
                        setHoveredMarker({ kind: 'capture', item, x, y })
                      }
                      onFocus={() =>
                        setHoveredMarker({ kind: 'capture', item, x, y })
                      }
                      onBlur={() => setHoveredMarker(null)}
                      onClick={() => onSelectCapture(item.id)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onSelectCapture(item.id)
                        }
                      }}
                      className='cursor-pointer outline-none focus-visible:drop-shadow-[0_0_2px_var(--ring)]'
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r='1.5'
                        fill='transparent'
                        pointerEvents='all'
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r={selected ? '1.05' : '0.9'}
                        fill={
                          item.availability === 'local'
                            ? 'var(--warning)'
                            : 'var(--background)'
                        }
                        stroke={selected ? 'var(--ring)' : 'var(--warning)'}
                        strokeWidth={selected ? '0.5' : '0.3'}
                        strokeDasharray={
                          item.availability === 'local' ? undefined : '0.45 0.3'
                        }
                      />
                      <CameraIcon
                        x={x - 0.55}
                        y={y - 0.55}
                        width='1.1'
                        height='1.1'
                        weight='fill'
                        aria-hidden='true'
                        style={{
                          color:
                            item.availability === 'local'
                              ? 'var(--background)'
                              : 'var(--warning)'
                        }}
                      />
                      <title>{item.name} capture</title>
                    </g>
                  )
                })
              : null}
            {layers.detections
              ? detections.map(({ item, label, point }, index) => {
                  const [x, y] = mapPoint(point)
                  const saved = item.saved_as_rescue_location === true
                  const isBuilding = label.toLowerCase() === 'building'
                  return (
                    <g
                      key={`${label}-${index}`}
                      tabIndex={0}
                      role='img'
                      aria-label={`${label} detection${saved ? ', saved' : ''}`}
                      onMouseEnter={() =>
                        setHoveredMarker({
                          kind: 'detection',
                          item,
                          label,
                          x,
                          y
                        })
                      }
                      onFocus={() =>
                        setHoveredMarker({
                          kind: 'detection',
                          item,
                          label,
                          x,
                          y
                        })
                      }
                      onBlur={() => setHoveredMarker(null)}
                      className='cursor-pointer outline-none focus-visible:drop-shadow-[0_0_2px_var(--ring)]'
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r='1.5'
                        fill='transparent'
                        pointerEvents='all'
                      />
                      <rect
                        x={x - 0.58}
                        y={y - 0.58}
                        width='1.16'
                        height='1.16'
                        fill={
                          saved
                            ? 'var(--destructive)'
                            : isBuilding
                            ? 'var(--warning)'
                            : 'var(--background)'
                        }
                        stroke={saved ? 'var(--destructive)' : 'var(--warning)'}
                        strokeWidth='0.2'
                        strokeDasharray={saved ? undefined : '0.4 0.25'}
                      />
                      {isBuilding ? (
                        <BuildingIcon
                          x={x - 0.8}
                          y={y - 0.8}
                          width='1.6'
                          height='1.6'
                          weight='fill'
                          aria-hidden='true'
                          style={{ color: 'var(--background)' }}
                        />
                      ) : null}
                      <title>
                        {label} · {saved ? 'saved' : 'not saved'}
                      </title>
                    </g>
                  )
                })
              : null}
            {touchdownPoint
              ? (() => {
                  const [x, y] = mapPoint(touchdownPoint)
                  return (
                    <path
                      d={`M ${x} ${y - 1.4} L ${x - 1.2} ${y + 1} L ${
                        x + 1.2
                      } ${y + 1} Z`}
                      fill='var(--success)'
                      stroke='var(--background)'
                      strokeWidth='0.25'
                    >
                      <title>Touchdown</title>
                    </path>
                  )
                })()
              : null}
            {lastPositionPoint && Object.keys(primaryDiagnostic).length > 0
              ? (() => {
                  const [x, y] = mapPoint(lastPositionPoint)
                  const code = textValue(
                    primaryDiagnostic.code,
                    'Last position'
                  )
                  const time = numberValue(primaryDiagnostic.time_s)
                  return (
                    <g
                      role='button'
                      tabIndex={0}
                      aria-label={`Select diagnostic ${code}${
                        time === null ? '' : ` at ${time.toFixed(1)} seconds`
                      }`}
                      onClick={onSelectDiagnostic}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onSelectDiagnostic()
                        }
                      }}
                      className='cursor-pointer outline-none focus-visible:drop-shadow-[0_0_2px_var(--ring)]'
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r='1.2'
                        fill='var(--destructive)'
                        stroke='var(--background)'
                        strokeWidth='0.3'
                      />
                      <text
                        x={x + 1.4}
                        y={y - 1.2}
                        fill='var(--destructive)'
                        fontSize='2.2'
                      >
                        {code}
                      </text>
                      <title>
                        {code}
                        {time === null ? '' : ` at ${time.toFixed(1)} s`}
                      </title>
                    </g>
                  )
                })()
              : null}
            {first ? (
              <circle
                cx={first[0]}
                cy={first[1]}
                r='1.25'
                fill='var(--success)'
                stroke='var(--background)'
                strokeWidth='0.3'
              >
                <title>Start</title>
              </circle>
            ) : null}
            {last ? (
              <circle
                cx={last[0]}
                cy={last[1]}
                r='1.25'
                fill='var(--foreground)'
                stroke='var(--background)'
                strokeWidth='0.3'
              >
                <title>End</title>
              </circle>
            ) : null}
          </svg>
          <div className='absolute right-2 bottom-2 z-1'>
            <Popover>
              <PopoverTrigger
                aria-label='Map layers'
                render={
                  <Button
                    variant='outline'
                    size='icon-sm'
                    className='border-border !bg-card shadow-md'
                  >
                    <GearIcon aria-hidden='true' />
                  </Button>
                }
              />
              <PopoverPortal>
                <PopoverPositioner side='top' align='end' sideOffset={6}>
                  <PopoverPopup
                    className='w-64 gap-3 p-3'
                    aria-label='Map layers'
                  >
                    <div className='flex items-center justify-between gap-2'>
                      <PopoverTitle className='text-sm font-semibold'>
                        Layers
                      </PopoverTitle>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='h-7 gap-1 px-2 text-xs'
                        onClick={() => setLayers(defaultMapLayers)}
                      >
                        <ArrowCounterClockwiseIcon aria-hidden='true' />
                        Reset
                      </Button>
                    </div>
                    {(
                      [
                        ['route', 'Flight path'],
                        ['waypoints', 'Waypoints'],
                        ['captures', 'Image captures'],
                        ['detections', 'Detection results'],
                        ['areas', 'Areas'],
                        ['avoids', 'Avoid zones'],
                        ['altitude', 'Altitude heatmap']
                      ] as [MapLayer, string][]
                    ).map(([key, label]) => (
                      <div
                        key={key}
                        className='flex items-center justify-between gap-3 text-sm'
                      >
                        <span>{label}</span>
                        <Switch
                          checked={layers[key]}
                          onCheckedChange={checked =>
                            setLayers(current => ({
                              ...current,
                              [key]: checked
                            }))
                          }
                          aria-label={label}
                        >
                          <SwitchThumb />
                        </Switch>
                      </div>
                    ))}
                  </PopoverPopup>
                </PopoverPositioner>
              </PopoverPortal>
            </Popover>
          </div>
          {hoveredMarker ? (
            <div
              role='tooltip'
              className='pointer-events-none absolute z-20 w-56 -translate-x-1/2 -translate-y-[calc(100%+0.5rem)] rounded-(--radius) border border-border bg-popover p-2 text-popover-foreground shadow-md'
              style={{
                left: `${Math.max(18, Math.min(82, hoveredMarker.x))}%`,
                top: `${Math.max(24, (hoveredMarker.y / 60) * 100)}%`
              }}
            >
              {hoveredMarker.kind === 'capture' ? (
                <div className='flex flex-col gap-2'>
                  {hoveredMarker.item.imageUrl ? (
                    <img
                      src={hoveredMarker.item.imageUrl}
                      alt={`Preview of ${hoveredMarker.item.name}`}
                      className='aspect-video w-full rounded-(--radius) border border-border object-cover'
                    />
                  ) : (
                    <div className='grid aspect-video w-full place-items-center rounded-(--radius) bg-muted text-xs text-muted-foreground'>
                      Preview unavailable
                    </div>
                  )}
                  <div className='min-w-0'>
                    <p className='m-0 truncate text-xs font-medium'>
                      {hoveredMarker.item.name}
                    </p>
                    <p className='m-0 text-xs text-muted-foreground'>
                      Image capture ·{' '}
                      {hoveredMarker.item.captureTime?.toFixed(1) ??
                        'Time unknown'}{' '}
                      s
                    </p>
                    <p className='m-0 text-xs text-muted-foreground'>
                      {hoveredMarker.item.detectionCount} detection
                      {hoveredMarker.item.detectionCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              ) : hoveredMarker.kind === 'waypoint' ? (
                <div className='flex flex-col gap-1'>
                  <p className='m-0 text-sm font-medium'>
                    Waypoint{' '}
                    {numberValue(hoveredMarker.point.index) ??
                      hoveredMarker.index + 1}
                  </p>
                  <p className='m-0 text-xs text-muted-foreground'>
                    X {numberValue(hoveredMarker.point.x_m)?.toFixed(1) ?? '—'}{' '}
                    m · Y{' '}
                    {numberValue(hoveredMarker.point.y_m)?.toFixed(1) ?? '—'} m
                  </p>
                  <p className='m-0 text-xs text-muted-foreground'>
                    Altitude{' '}
                    {numberValue(hoveredMarker.point.z_m)?.toFixed(1) ?? '—'} m
                    ·{' '}
                    {hoveredMarker.point.reached === true
                      ? 'Reached'
                      : 'Not reached'}
                  </p>
                  {asRecords(hoveredMarker.point.actions).length ? (
                    <p className='m-0 text-xs text-muted-foreground'>
                      Actions ·{' '}
                      {asRecords(hoveredMarker.point.actions)
                        .map(action =>
                          textValue(action.label, textValue(action.kind))
                        )
                        .join(', ')}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className='flex flex-col gap-1'>
                  <p className='m-0 text-sm font-medium'>
                    {hoveredMarker.label}
                  </p>
                  <p className='m-0 text-xs text-muted-foreground'>
                    Detection result ·{' '}
                    {hoveredMarker.item.saved_as_rescue_location === true
                      ? 'Saved location'
                      : 'Not saved'}
                  </p>
                  {numberValue(hoveredMarker.item.confidence) !== null ? (
                    <p className='m-0 text-xs text-muted-foreground'>
                      Confidence ·{' '}
                      {(
                        numberValue(hoveredMarker.item.confidence)! * 100
                      ).toFixed(0)}
                      %
                    </p>
                  ) : null}
                  {textValue(
                    hoveredMarker.item.model_name || hoveredMarker.item.model_id
                  ) ? (
                    <p className='m-0 text-xs text-muted-foreground'>
                      Model ·{' '}
                      {textValue(
                        asRecord(
                          modelForId(
                            report,
                            textValue(hoveredMarker.item.model_id)
                          )
                        ).name,
                        textValue(
                          hoveredMarker.item.model_name,
                          textValue(hoveredMarker.item.model_id)
                        )
                      )}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </figure>
    </DetailSection>
  )
}

export function FlightPathTab ({
  sample,
  onNavigate,
  onOpenMedia
}: {
  sample: MissionInsightSample
  onNavigate: (tab: MissionInsightsReportTab) => void
  onOpenMedia: (id: string) => void
}) {
  const [selectedCaptureId, setSelectedCaptureId] = useState<string | null>(
    null
  )
  const [diagnosticSelected, setDiagnosticSelected] = useState(false)
  const selectedCapture =
    sampleMedia(sample).find(item => item.id === selectedCaptureId) ?? null
  const report = reportForSample(sample)
  const diagnostic = asRecords(asRecord(report.diagnostics).items)[0] ?? null

  return (
    <div className='flex min-w-0 flex-col gap-6'>
      <section
        className='grid min-w-0 grid-cols-1 overflow-hidden rounded-(--radius) border border-border bg-(--card) shadow-xs xl:grid-cols-[minmax(0,1fr)_24rem]'
        aria-label='Flight path map and summary'
      >
        <FlightPathMap
          sample={sample}
          selectedCaptureId={selectedCaptureId}
          onSelectCapture={id => {
            setDiagnosticSelected(false)
            setSelectedCaptureId(id)
          }}
          onSelectDiagnostic={() => {
            setSelectedCaptureId(null)
            setDiagnosticSelected(true)
          }}
          className='!rounded-none !border-0 !shadow-none'
        />
        <aside
          className='flex min-w-0 flex-col border-t border-border xl:border-l xl:border-t-0'
          aria-label='Flight path summary and legend'
        >
          <FlightPathSummary
            sample={sample}
            className='!rounded-none !border-0 !shadow-none'
          />
          <div className='border-t border-border' />
          <FlightPathLegend
            sample={sample}
            className='!rounded-none !border-0 !shadow-none'
          />
        </aside>
      </section>
      {selectedCapture ? (
        <DetailSection
          title='Selected capture'
          toolbar={
            <Button
              variant='outline'
              size='sm'
              onClick={() => setSelectedCaptureId(null)}
            >
              Clear selection
            </Button>
          }
        >
          <KeyValueList
            rows={[
              ['File', selectedCapture.name],
              [
                'Capture time',
                selectedCapture.captureTime === null
                  ? 'Not supplied'
                  : `${selectedCapture.captureTime.toFixed(1)} s`
              ],
              ['Availability', selectedCapture.availability],
              ['Related detections', selectedCapture.detectionCount.toString()],
              ['Capture pose', capturePoseSummary(selectedCapture.artifact)]
            ]}
          />
          <Button
            variant='link'
            size='sm'
            className='self-start'
            onClick={() => onOpenMedia(selectedCapture.id)}
          >
            Open in Media & Files
          </Button>
        </DetailSection>
      ) : null}
      {diagnosticSelected && diagnostic ? (
        <DetailSection
          title={`Diagnostic · ${textValue(diagnostic.code, 'Issue')}`}
          toolbar={
            <Button
              variant='outline'
              size='sm'
              onClick={() => setDiagnosticSelected(false)}
            >
              Clear selection
            </Button>
          }
        >
          <KeyValueList
            rows={[
              ['Severity', textValue(diagnostic.severity, 'Not supplied')],
              ['Message', textValue(diagnostic.message, 'Not supplied')],
              [
                'Time',
                numberValue(diagnostic.time_s) === null
                  ? 'Time unknown'
                  : `${numberValue(diagnostic.time_s)!.toFixed(1)} s`
              ]
            ]}
          />
          <Button
            variant='link'
            size='sm'
            className='self-start'
            onClick={() => onNavigate('timeline')}
          >
            Open Timeline
          </Button>
        </DetailSection>
      ) : null}
      <FlightPathReportDetails sample={sample} onNavigate={onNavigate} />
    </div>
  )
}

function FlightPathReportDetails ({
  sample,
  onNavigate
}: {
  sample: MissionInsightSample
  onNavigate: (tab: MissionInsightsReportTab) => void
}) {
  const report = reportForSample(sample)
  const flight = asRecord(report.flight_path)
  const waypoints = asRecords(report.waypoints)
  const flightSamples = asRecords(flight.samples)
  const altitudeValues = flightSamples.flatMap(point => {
    const altitude = numberValue(point.z_m)
    return altitude === null ? [] : [altitude]
  })
  const coords = flightSamples.flatMap(point => {
    const x = numberValue(point.x_m)
    const y = numberValue(point.y_m)
    const z = numberValue(point.z_m)
    return x === null || y === null || z === null ? [] : [[x, y, z] as const]
  })
  const waypointCoords = waypoints.flatMap(waypoint => {
    const x = numberValue(waypoint.x_m)
    const y = numberValue(waypoint.y_m)
    const z = numberValue(waypoint.z_m)
    return x === null || y === null || z === null
      ? []
      : [
          {
            index: numberValue(waypoint.index),
            reached: waypoint.reached === true,
            point: [x, y, z] as const
          }
        ]
  })
  const speeds = coords.slice(1).flatMap((point, index) => {
    const previous = coords[index]
    const t1 = numberValue(flightSamples[index + 1]?.t_s)
    const t0 = numberValue(flightSamples[index]?.t_s)
    if (!previous || t1 === null || t0 === null || t1 <= t0) return []
    return [
      Math.hypot(
        point[0] - previous[0],
        point[1] - previous[1],
        point[2] - previous[2]
      ) /
        (t1 - t0)
    ]
  })
  const boundedCoords = [...coords, ...waypointCoords.map(({ point }) => point)]
  const minX = Math.min(...boundedCoords.map(([x]) => x))
  const maxX = Math.max(...boundedCoords.map(([x]) => x))
  const minY = Math.min(...boundedCoords.map(([, y]) => y))
  const maxY = Math.max(...boundedCoords.map(([, y]) => y))
  const minZ = Math.min(0, ...boundedCoords.map(([, , z]) => z))
  const maxZ = Math.max(...boundedCoords.map(([, , z]) => z))
  const minSpeed = speeds.length ? Math.min(...speeds) : null
  const maxSpeed = speeds.length ? Math.max(...speeds) : null

  return (
    <DetailSection title='Report flight path · 3D projection'>
      <p className='m-0 text-muted-foreground'>
        {numberValue(flight.sample_interval_s) === null
          // ? 'Mission waypoints projected in local X/Y/Z coordinates.'
          ? 'Mission waypoints projected in local X/Y/Z coordinates.'
          : `Flight path sampled every ${numberValue(
              flight.sample_interval_s
            )!.toFixed(1)} s. Projection uses local X/Y/Z coordinates.`}{' '}
        Line color shows consecutive-sample speed.
      </p>
      {coords.length ? (
        <figure className='m-0 flex min-w-0 flex-col gap-3'>
          <MissionInsightsReportFlightPath3D report={report} />
          <figcaption className='flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground'>
            <span>Samples: {coords.length}</span>
            <span>
              X {minX.toFixed(1)}–{maxX.toFixed(1)} m
            </span>
            <span>
              Y {minY.toFixed(1)}–{maxY.toFixed(1)} m
            </span>
            <span>
              Z {Math.min(...altitudeValues, minZ).toFixed(1)}–{maxZ.toFixed(1)}{' '}
              m
            </span>
            <span>
              Speed {minSpeed?.toFixed(2) ?? '—'}–{maxSpeed?.toFixed(2) ?? '—'}{' '}
              m/s
            </span>
            <span>◆ Waypoint reached · ✚ Waypoint defined</span>
            <span>Segment color encodes consecutive-sample speed</span>
          </figcaption>
        </figure>
      ) : (
        <p className='m-0 text-muted-foreground'>
          No flight path data available.
        </p>
      )}
      <Button
        variant='outline'
        size='sm'
        className='self-start'
        onClick={() => onNavigate('timeline')}
      >
        Open actions and report event metadata
      </Button>
    </DetailSection>
  )
}
