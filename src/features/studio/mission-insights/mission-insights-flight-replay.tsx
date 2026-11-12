import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent
} from 'react'
import {
  CaretDownIcon,
  CaretRightIcon,
  CaretUpIcon,
  InfoIcon
} from '@phosphor-icons/react'
import {
  MissionInsightsFlightScene,
  type ReplayCamera,
  type ReplayLayers
} from './mission-insights-flight-scene'
import { MissionInsightsTelemetryCharts } from './mission-insights-charts'
import { MissionInsightsPlannerEvents } from './mission-insights-planner-events'
import { MissionInsightsReplayControls } from './mission-insights-replay-controls'
import type { MissionInsightSample } from './mission-insights-data'
import { replayTimeline } from './replay-sample'

const replayLegend = [
  {
    label: 'Flown path',
    color: 'bg-primary',
    title: 'Colour represents speed.'
  },
  { label: 'Fly-to', color: 'bg-success', title: 'Fly-to waypoint target.' },
  {
    label: 'Depth frame · median line',
    color: 'bg-destructive',
    title:
      'One depth-camera observation panel per frame; line marks median point height.'
  },
  {
    label: 'Upper height band',
    color: 'bg-destructive/30',
    title: 'Faint band shows the sparser half of points above median height.'
  },
  {
    label: 'Clear on later scan',
    color: 'bg-success',
    title: 'Later frame found no point in range at the drone’s altitude.'
  },
  {
    label: 'Mixed range',
    color: 'border border-dashed border-destructive',
    title: 'Points span several distances, so panel position is less reliable.'
  },
  {
    label: 'Drone stop / detection',
    color: 'bg-warning',
    title: 'Drone position at each EXPLORE stop or detection.'
  }
] as const

function formatClock (seconds: number) {
  return `${seconds.toFixed(1)} s`
}

function compassDirection (heading: number) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return directions[Math.round(heading / 45) % directions.length] ?? 'N'
}

function formatWallClock (seconds: number) {
  const [startHours = 0, startMinutes = 0, startSeconds = 0] =
    replayTimeline.startClock.split(':').map(Number)
  const totalSeconds =
    startHours * 3600 + startMinutes * 60 + startSeconds + seconds
  const normalizedSeconds = ((totalSeconds % 86400) + 86400) % 86400
  const hours = String(Math.floor(normalizedSeconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((normalizedSeconds % 3600) / 60)).padStart(
    2,
    '0'
  )
  const wallSeconds = (normalizedSeconds % 60).toFixed(1).padStart(4, '0')
  return `${hours}:${minutes}:${wallSeconds}`
}

function positionAt (time: number) {
  const samples = replayTimeline.samples
  const rightIndex = samples.findIndex(sample => sample.t > time)
  if (rightIndex < 0) {
    const last = samples[samples.length - 1]
    return { ...last, altitude: -last.d }
  }
  if (rightIndex === 0) {
    const first = samples[0]
    return { ...first, altitude: -first.d }
  }
  const left = samples[rightIndex - 1]
  const right = samples[rightIndex]
  const amount = Math.max(
    0,
    Math.min(1, (time - left.t) / Math.max(0.001, right.t - left.t))
  )
  const lerp = (a: number, b: number) => a + (b - a) * amount
  const down = lerp(left.d, right.d)
  return {
    ...left,
    n: lerp(left.n, right.n),
    e: lerp(left.e, right.e),
    d: down,
    altitude: -down,
    speed: lerp(left.spd, right.spd),
    spd: lerp(left.spd, right.spd),
    vn: lerp(left.vn, right.vn),
    ve: lerp(left.ve, right.ve),
    vd: lerp(left.vd, right.vd)
  }
}

function attitudeAt (time: number) {
  const samples = replayTimeline.attitude
  const rightIndex = samples.findIndex(sample => sample.t > time)
  if (rightIndex < 0) return samples[samples.length - 1]
  if (rightIndex === 0) return samples[0]
  const left = samples[rightIndex - 1]
  const right = samples[rightIndex]
  const amount = Math.max(
    0,
    Math.min(1, (time - left.t) / Math.max(0.001, right.t - left.t))
  )
  const yawDelta = ((right.yaw - left.yaw + 540) % 360) - 180
  return {
    t: time,
    roll: left.roll,
    pitch: left.pitch,
    yaw: left.yaw + yawDelta * amount
  }
}

const airborneDepthFrames = replayTimeline.depth.filter(
  frame =>
    frame.n_pts >= 50 &&
    frame.cx !== null &&
    frame.cy !== null &&
    frame.az05 !== null &&
    frame.az95 !== null &&
    frame.zlo !== null &&
    frame.zhi !== null &&
    positionAt(frame.t).altitude > 0.5
)

const depthObservations = airborneDepthFrames.map(frame => {
  const histogramTotal = frame.hist.reduce((total, value) => total + value, 0)
  const largestBin = frame.hist.length ? Math.max(...frame.hist) : 0
  return {
    frame,
    range: Math.hypot(frame.cx, frame.cy),
    bottom: Math.max(0, -frame.zhi),
    top: -frame.zlo,
    medianAltitude: -frame.zmed,
    mixed: !histogramTotal || largestBin / histogramTotal < 0.7
  }
})

export function MissionInsightsFlightReplay ({
  sample,
  time,
  seekNotice,
  onSeek
}: {
  sample: MissionInsightSample
  time: number
  seekNotice: string
  onSeek: (requestedTime: number, label?: string) => void
}) {
  const maxTime = replayTimeline.durationSeconds
  const [speed, setSpeed] = useState('1')
  const [playing, setPlaying] = useState(false)
  const [telemetryExpanded, setTelemetryExpanded] = useState(true)
  const [cameraMode, setCameraMode] = useState<ReplayCamera>('3d')
  const [layers, setLayers] = useState<ReplayLayers>({
    follow: false,
    future: false,
    nearGround: true,
    mixedRange: true,
    seenEmptyLater: true
  })
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null)
  const [replayFullscreen, setReplayFullscreen] = useState(false)
  const [replaySurfaceHeight, setReplaySurfaceHeight] = useState<number | null>(
    null
  )
  const replaySurfaceRef = useRef<HTMLDivElement>(null)
  const timeRef = useRef(time)
  timeRef.current = time
  const playbackTimeRef = useRef(time)

  const current = positionAt(time)
  const attitude = attitudeAt(time)
  const heading = ((attitude.yaw % 360) + 360) % 360
  const headingDirection = compassDirection(heading)
  const nearestDepth = useMemo(
    () => replayTimeline.depth.filter(frame => frame.t <= time).at(-1),
    [time]
  )
  const currentObservation = depthObservations
    .filter(({ frame }) => frame.t <= time)
    .at(-1)
  const distanceToTarget = Math.hypot(
    current.tn - current.n,
    current.te - current.e,
    -current.td - current.altitude
  )
  const stateRows: ReadonlyArray<readonly [string, string]> = [
    ['Time', `${time.toFixed(2)} s`],
    ['Clock', formatWallClock(time)],
    ['Segment', current.seg],
    ['PX4 mode', current.mode],
    ['North', `${current.n.toFixed(2)} m`],
    ['East', `${current.e.toFixed(2)} m`],
    ['Altitude', `${current.altitude.toFixed(2)} m`],
    ['Speed', `${current.spd.toFixed(2)} m/s`],
    [
      'Heading',
      `${String(Math.round(heading)).padStart(3, '0')}° ${headingDirection}`
    ],
    [
      'Roll / pitch',
      `${attitude.roll.toFixed(1)}° / ${attitude.pitch.toFixed(1)}°`
    ],
    [
      'Target',
      `N${current.tn.toFixed(1)} E${current.te.toFixed(
        1
      )} · alt ${(-current.td).toFixed(1)} m`
    ],
    ['Dist to target', `${distanceToTarget.toFixed(2)} m`],
    [
      'Nearest depth pt',
      nearestDepth && nearestDepth.near !== null
        ? `${nearestDepth.near.toFixed(2)} m`
        : '—'
    ],
    [
      'Depth frame',
      currentObservation
        ? `${
            currentObservation.frame.n_pts
          } pts @ ${currentObservation.range.toFixed(1)} m${
            currentObservation.mixed ? ' (mixed)' : ''
          }`
        : '—'
    ],
    [
      'Seen height',
      currentObservation
        ? `${currentObservation.bottom.toFixed(
            1
          )}–${currentObservation.top.toFixed(
            1
          )} m, median ${currentObservation.medianAltitude.toFixed(1)} m`
        : '—'
    ]
  ]

  useEffect(() => {
    if (replayFullscreen) return
    const surface = replaySurfaceRef.current
    if (!surface) return

    const syncHeight = (height: number) => {
      const nextHeight = Math.ceil(height)
      setReplaySurfaceHeight(currentHeight =>
        currentHeight === nextHeight ? currentHeight : nextHeight
      )
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) syncHeight(entry.contentRect.height)
    })
    observer.observe(surface)
    syncHeight(surface.getBoundingClientRect().height)

    return () => observer.disconnect()
  }, [replayFullscreen])

  useEffect(() => {
    if (!playing) return
    let animationFrame = 0
    let previous = performance.now()
    let lastPublished = previous
    const rate = Number(speed)
    playbackTimeRef.current = timeRef.current
    const advance = (now: number) => {
      const delta = (now - previous) / 1000
      previous = now
      const next = playbackTimeRef.current + delta * rate
      playbackTimeRef.current = next
      if (next >= maxTime) {
        setPlaying(false)
        playbackTimeRef.current = maxTime
        onSeek(maxTime)
        return
      }
      if (now - lastPublished >= 1000 / 30) {
        lastPublished = now
        onSeek(next)
      }
      animationFrame = window.requestAnimationFrame(advance)
    }
    animationFrame = window.requestAnimationFrame(advance)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [playing, speed, maxTime, onSeek])

  useEffect(() => {
    const syncFullscreenState = () => {
      setReplayFullscreen(
        document.fullscreenElement === replaySurfaceRef.current
      )
    }
    document.addEventListener('fullscreenchange', syncFullscreenState)
    return () =>
      document.removeEventListener('fullscreenchange', syncFullscreenState)
  }, [])

  const seek = useCallback(
    (requestedTime: number, label?: string) => {
      onSeek(requestedTime, label)
    },
    [onSeek]
  )

  function handleKeyboard (event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    if (target.closest('button, input, [role="slider"], [role="combobox"]'))
      return
    if (event.key === ' ') {
      event.preventDefault()
      setPlaying(value => !value)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      seek(time + 1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      seek(time - 1)
    }
  }

  function updateLayer (key: keyof ReplayLayers, value: boolean) {
    setLayers(previous => ({ ...previous, [key]: value }))
  }

  function changeCameraMode (next: ReplayCamera) {
    setCameraMode(next)
    if (next === 'chase') updateLayer('follow', true)
  }

  function toggleReplayFullscreen () {
    if (document.fullscreenElement === replaySurfaceRef.current) {
      void document.exitFullscreen()
    } else {
      void replaySurfaceRef.current?.requestFullscreen()
    }
  }

  return (
    <div
      className='flex min-w-0 flex-col gap-6'
      tabIndex={0}
      onKeyDown={handleKeyboard}
      aria-label='Flight replay. Use Space to play or pause; arrow keys seek one second.'
      data-testid='ms-insights-flight-replay'
    >
      <div>
        <div className='grid min-w-0 grid-cols-2 gap-0 sm:grid-cols-3 xl:grid-cols-7 border border-b-0 border-border'>
          {sample.replayStats.map(([label, value]) => (
            <div
              key={label}
              className='flex min-w-0 flex-col gap-0 not-last:border-r border-border p-3'
            >
              <span className='h4 tabular-nums'>{value}</span>
              <span className='text-muted-foreground'>{label}</span>
            </div>
          ))}
        </div>

        <div className='grid min-w-0 grid-cols-1 gap-6 xl:gap-0 xl:grid-cols-7 mb-3'>
          <div className='flex min-w-0 flex-col gap-3 col-span-5'>
            <div
              ref={replaySurfaceRef}
              className={`relative min-w-0 ${
                replayFullscreen
                  ? 'flex h-dvh w-screen min-w-0 flex-col gap-2 bg-background p-4'
                  : ''
              }`}
            >
              <div
                className={`relative min-w-0 ${
                  replayFullscreen ? 'min-h-0 flex-1' : ''
                }`}
              >
                <MissionInsightsFlightScene
                  time={time}
                  cameraMode={cameraMode}
                  layers={layers}
                  fullscreen={replayFullscreen}
                />
                <section
                  className={`absolute bottom-3 right-3 z-10 flex flex-col gap-2 rounded-(--radius) border border-border bg-background/90 p-3 text-foreground shadow-sm backdrop-blur-sm ${
                    telemetryExpanded
                      ? 'w-[min(22rem,calc(100%-1.5rem))]'
                      : 'w-fit max-w-[calc(100%-1.5rem)]'
                  }`}
                  aria-label='Replay telemetry'
                >
                  <button
                    type='button'
                    className={`inline-flex items-center justify-between gap-2 rounded-(--radius) p-0 text-left text-xs sub-heading hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                      telemetryExpanded
                        ? 'w-full'
                        : 'w-fit max-w-full flex-wrap'
                    }`}
                    aria-expanded={telemetryExpanded}
                    aria-controls='ms-replay-telemetry-content'
                    onClick={() => setTelemetryExpanded(expanded => !expanded)}
                  >
                    <span>Drone heading</span>
                    {!telemetryExpanded ? (
                      <>
                        <span className='whitespace-nowrap text-xs tabular-nums text-muted-foreground'>
                          {String(Math.round(heading)).padStart(3, '0')}°{' '}
                          {headingDirection}
                        </span>
                        <span className='flex flex-wrap items-center gap-x-2 text-xs font-normal text-muted-foreground'>
                          <span className='whitespace-nowrap'>
                            {time.toFixed(1)}s
                          </span>
                          <span className='whitespace-nowrap'>
                            Alt {current.altitude.toFixed(1)}m
                          </span>
                          <span className='whitespace-nowrap'>
                            Spd {current.spd.toFixed(1)}m/s
                          </span>
                        </span>
                      </>
                    ) : null}
                    {telemetryExpanded ? (
                      <CaretDownIcon aria-hidden='true' className='size-4' />
                    ) : (
                      <CaretUpIcon aria-hidden='true' className='size-4' />
                    )}
                  </button>
                  <div
                    id='ms-replay-telemetry-content'
                    hidden={!telemetryExpanded}
                    className={
                      telemetryExpanded
                        ? 'flex min-w-0 flex-col gap-2'
                        : 'hidden'
                    }
                  >
                    <div className='flex flex-row items-start gap-3 w-full'>
                      <div className='flex shrink-0 flex-col items-center gap-1'>
                        <div
                          className='relative size-20 rounded-full border border-border bg-card/90'
                          role='img'
                          aria-label={`Drone heading ${Math.round(
                            heading
                          )} degrees ${headingDirection}`}
                        >
                          <span className='absolute left-1/2 top-1 -translate-x-1/2 text-[0.625rem] font-medium text-muted-foreground'>
                            N
                          </span>
                          <span className='absolute right-1 top-1/2 -translate-y-1/2 text-[0.625rem] font-medium text-muted-foreground'>
                            E
                          </span>
                          <span className='absolute bottom-1 left-1/2 -translate-x-1/2 text-[0.625rem] font-medium text-muted-foreground'>
                            S
                          </span>
                          <span className='absolute left-1 top-1/2 -translate-y-1/2 text-[0.625rem] font-medium text-muted-foreground'>
                            W
                          </span>
                          <svg
                            aria-hidden='true'
                            viewBox='0 0 24 24'
                            className='absolute left-1/2 top-1/2 size-7'
                            style={{
                              transform: `translate(-50%, -50%) rotate(${heading}deg)`
                            }}
                          >
                            <path
                              d='M12 2.5 17.2 21l-5.2-3.2L6.8 21 12 2.5Z'
                              className='fill-primary stroke-background'
                              strokeWidth='1.5'
                              strokeLinejoin='round'
                            />
                          </svg>
                        </div>
                        <span className='text-xs font-semibold tabular-nums'>
                          {String(Math.round(heading)).padStart(3, '0')}°{' '}
                          {headingDirection}
                        </span>
                      </div>
                      <div className='grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-1 text-xs'>
                        <span className='col-span-2 truncate font-medium'>
                          {formatClock(time)} · {current.seg}
                        </span>
                        <span className='text-muted-foreground'>Altitude</span>
                        <span className='font-medium text-right tabular-nums'>
                          {current.altitude.toFixed(1)} m
                        </span>
                        <span className='text-muted-foreground'>Speed</span>
                        <span className='font-medium text-right tabular-nums'>
                          {current.spd.toFixed(1)} m/s
                        </span>
                        <span className='text-muted-foreground'>To target</span>
                        <span className='font-medium text-right tabular-nums'>
                          {distanceToTarget.toFixed(1)} m
                        </span>
                      </div>
                    </div>
                    <details className='group border-t border-border pt-2 text-xs'>
                      <summary className='flex w-fit cursor-pointer list-none items-center gap-1.5 text-muted-foreground select-none [&::-webkit-details-marker]:hidden'>
                        <CaretRightIcon
                          aria-hidden='true'
                          className='size-3 transition-transform group-open:rotate-90'
                        />
                        <span>More Telemetry</span>
                      </summary>
                      <dl className='m-0 mt-2 grid max-h-40 grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-x-3 gap-y-1 overflow-y-auto border-t border-border pt-2'>
                        {stateRows
                          .filter(
                            ([label]) =>
                              ![
                                'Time',
                                'Segment',
                                'Altitude',
                                'Speed',
                                'Heading',
                                'Dist to target'
                              ].includes(label)
                          )
                          .map(([label, value]) => (
                            <Fragment key={label}>
                              <dt className='text-muted-foreground'>{label}</dt>
                              <dd className='m-0 break-words font-medium text-right tabular-nums'>
                                {value}
                              </dd>
                            </Fragment>
                          ))}
                      </dl>
                    </details>
                    {seekNotice ? (
                      <p
                        role='status'
                        className='m-0 text-xs text-muted-foreground'
                      >
                        {seekNotice}
                      </p>
                    ) : null}
                  </div>
                </section>
              </div>
              <MissionInsightsReplayControls
                time={time}
                maxTime={maxTime}
                speed={speed}
                onSpeedChange={setSpeed}
                playing={playing}
                onPlayingChange={setPlaying}
                cameraMode={cameraMode}
                onCameraModeChange={changeCameraMode}
                layers={layers}
                onLayerChange={updateLayer}
                onSeek={seek}
                onFullscreenToggle={toggleReplayFullscreen}
                fullscreen={replayFullscreen}
              />
            </div>
          </div>
          <MissionInsightsPlannerEvents
            selectedEvent={selectedEvent}
            onSelectedEventChange={setSelectedEvent}
            onSeek={seek}
            height={replaySurfaceHeight}
            className='col-span-2'
          />
        </div>

        <div className='flex flex-col gap-1'>
          <ul
            className='m-0 flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-xs text-muted-foreground'
            aria-label='Replay scene legend'
          >
            {replayLegend.map(({ label, color, title }) => (
              <li
                key={label}
                className='inline-flex items-center gap-1.5'
                title={title}
              >
                <span
                  aria-hidden='true'
                  className={`size-2.5 shrink-0 rounded-sm ${color}`}
                />
                {label}
              </li>
            ))}
          </ul>
          <details className='group text-xs text-muted-foreground'>
            <summary className='flex w-fit cursor-pointer list-none items-center gap-1.5 select-none [&::-webkit-details-marker]:hidden'>
              <InfoIcon aria-hidden='true' className='size-3.5' />
              <span>How this scene is reconstructed</span>
              <CaretRightIcon
                aria-hidden='true'
                className='size-3 transition-transform group-open:rotate-90'
              />
            </summary>
            <p className='m-0 max-w-5xl pt-2 leading-relaxed'>
              Approximation from logged DEPTH_DBG statistics (~1 Hz), not the
              raw point cloud. Panels span azimuth p05–p95 at median horizontal
              range and minimum–maximum world height; drone position and yaw are
              used, roll and pitch ignored. Source estimates roughly ±0.5 m
              error. Exact obstacle geometry needs the planner recording or
              scenario world file.
            </p>
          </details>
        </div>
      </div>

      <MissionInsightsTelemetryCharts currentTime={time} onSeek={seek} />
    </div>
  )
}
