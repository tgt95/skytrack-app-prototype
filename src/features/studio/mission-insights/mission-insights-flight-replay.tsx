import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  MissionInsightsFlightScene,
  type ReplayCamera,
  type ReplayLayers,
} from "./mission-insights-flight-scene";
import { MissionInsightsTelemetryCharts } from "./mission-insights-charts";
import { MissionInsightsPlannerEvents } from "./mission-insights-planner-events";
import { MissionInsightsReplayControls } from "./mission-insights-replay-controls";
import type { MissionInsightSample } from "./mission-insights-data";
import { replayTimeline } from "./replay-sample";

function formatClock(seconds: number) {
  return `${seconds.toFixed(1)} s`;
}

function formatWallClock(seconds: number) {
  const [startHours = 0, startMinutes = 0, startSeconds = 0] =
    replayTimeline.startClock.split(":").map(Number);
  const totalSeconds =
    startHours * 3600 + startMinutes * 60 + startSeconds + seconds;
  const normalizedSeconds = ((totalSeconds % 86400) + 86400) % 86400;
  const hours = String(Math.floor(normalizedSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((normalizedSeconds % 3600) / 60)).padStart(
    2,
    "0",
  );
  const wallSeconds = (normalizedSeconds % 60).toFixed(1).padStart(4, "0");
  return `${hours}:${minutes}:${wallSeconds}`;
}

function positionAt(time: number) {
  const samples = replayTimeline.samples;
  const rightIndex = samples.findIndex((sample) => sample.t > time);
  if (rightIndex < 0) {
    const last = samples[samples.length - 1];
    return { ...last, altitude: -last.d };
  }
  if (rightIndex === 0) {
    const first = samples[0];
    return { ...first, altitude: -first.d };
  }
  const left = samples[rightIndex - 1];
  const right = samples[rightIndex];
  const amount = Math.max(
    0,
    Math.min(1, (time - left.t) / Math.max(0.001, right.t - left.t)),
  );
  const lerp = (a: number, b: number) => a + (b - a) * amount;
  const down = lerp(left.d, right.d);
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
    vd: lerp(left.vd, right.vd),
  };
}

function attitudeAt(time: number) {
  const samples = replayTimeline.attitude;
  const rightIndex = samples.findIndex((sample) => sample.t > time);
  if (rightIndex < 0) return samples[samples.length - 1];
  if (rightIndex === 0) return samples[0];
  const left = samples[rightIndex - 1];
  const right = samples[rightIndex];
  const amount = Math.max(
    0,
    Math.min(1, (time - left.t) / Math.max(0.001, right.t - left.t)),
  );
  const yawDelta = ((right.yaw - left.yaw + 540) % 360) - 180;
  return {
    t: time,
    roll: left.roll,
    pitch: left.pitch,
    yaw: left.yaw + yawDelta * amount,
  };
}

const airborneDepthFrames = replayTimeline.depth.filter(
  (frame) =>
    frame.n_pts >= 50 &&
    frame.cx !== null &&
    frame.cy !== null &&
    frame.az05 !== null &&
    frame.az95 !== null &&
    frame.zlo !== null &&
    frame.zhi !== null &&
    positionAt(frame.t).altitude > 0.5,
);

const depthObservations = airborneDepthFrames.map((frame) => {
  const histogramTotal = frame.hist.reduce((total, value) => total + value, 0);
  const largestBin = frame.hist.length ? Math.max(...frame.hist) : 0;
  return {
    frame,
    range: Math.hypot(frame.cx, frame.cy),
    bottom: Math.max(0, -frame.zhi),
    top: -frame.zlo,
    medianAltitude: -frame.zmed,
    mixed: !histogramTotal || largestBin / histogramTotal < 0.7,
  };
});

export function MissionInsightsFlightReplay({
  sample,
  time,
  seekNotice,
  onSeek,
}: {
  sample: MissionInsightSample;
  time: number;
  seekNotice: string;
  onSeek: (requestedTime: number, label?: string) => void;
}) {
  const maxTime = replayTimeline.durationSeconds;
  const [speed, setSpeed] = useState("1");
  const [playing, setPlaying] = useState(false);
  const [cameraMode, setCameraMode] = useState<ReplayCamera>("3d");
  const [layers, setLayers] = useState<ReplayLayers>({
    follow: false,
    future: false,
    nearGround: true,
    mixedRange: true,
    seenEmptyLater: true,
  });
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const timeRef = useRef(time);
  timeRef.current = time;

  const current = positionAt(time);
  const attitude = attitudeAt(time);
  const nearestDepth = useMemo(
    () => replayTimeline.depth.filter((frame) => frame.t <= time).at(-1),
    [time],
  );
  const currentObservation = depthObservations
    .filter(({ frame }) => frame.t <= time)
    .at(-1);
  const distanceToTarget = Math.hypot(
    current.tn - current.n,
    current.te - current.e,
    -current.td - current.altitude,
  );
  const stateRows: ReadonlyArray<readonly [string, string]> = [
    ["Time", `${time.toFixed(2)} s`],
    ["Clock", formatWallClock(time)],
    ["Segment", current.seg],
    ["PX4 mode", current.mode],
    ["North", `${current.n.toFixed(2)} m`],
    ["East", `${current.e.toFixed(2)} m`],
    ["Altitude", `${current.altitude.toFixed(2)} m`],
    ["Speed", `${current.spd.toFixed(2)} m/s`],
    ["Heading", `${attitude.yaw.toFixed(1)}°`],
    [
      "Roll / pitch",
      `${attitude.roll.toFixed(1)}° / ${attitude.pitch.toFixed(1)}°`,
    ],
    [
      "Target",
      `N${current.tn.toFixed(1)} E${current.te.toFixed(1)} · alt ${(-current.td).toFixed(1)} m`,
    ],
    ["Dist to target", `${distanceToTarget.toFixed(2)} m`],
    [
      "Nearest depth pt",
      nearestDepth && nearestDepth.near !== null
        ? `${nearestDepth.near.toFixed(2)} m`
        : "—",
    ],
    [
      "Depth frame",
      currentObservation
        ? `${currentObservation.frame.n_pts} pts @ ${currentObservation.range.toFixed(1)} m${currentObservation.mixed ? " (mixed)" : ""}`
        : "—",
    ],
    [
      "Seen height",
      currentObservation
        ? `${currentObservation.bottom.toFixed(1)}–${currentObservation.top.toFixed(1)} m, median ${currentObservation.medianAltitude.toFixed(1)} m`
        : "—",
    ],
  ];

  useEffect(() => {
    if (!playing) return;
    let animationFrame = 0;
    let previous = performance.now();
    const rate = Number(speed);
    const advance = (now: number) => {
      const delta = (now - previous) / 1000;
      previous = now;
      const next = timeRef.current + delta * rate;
      if (next >= maxTime) {
        setPlaying(false);
        onSeek(0);
      } else onSeek(next);
      animationFrame = window.requestAnimationFrame(advance);
    };
    animationFrame = window.requestAnimationFrame(advance);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [playing, speed, maxTime, onSeek]);

  function seek(requestedTime: number, label?: string) {
    onSeek(requestedTime, label);
  }

  function handleKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest('button, input, [role="slider"], [role="combobox"]'))
      return;
    if (event.key === " ") {
      event.preventDefault();
      setPlaying((value) => !value);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      seek(time + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      seek(time - 1);
    }
  }

  function updateLayer(key: keyof ReplayLayers, value: boolean) {
    setLayers((previous) => ({ ...previous, [key]: value }));
  }

  function changeCameraMode(next: ReplayCamera) {
    setCameraMode(next);
    if (next === "chase") updateLayer("follow", true);
  }

  const selectedEventItem =
    selectedEvent === null ? null : replayTimeline.events[selectedEvent];

  return (
    <div
      className="flex min-w-0 flex-col gap-6"
      tabIndex={0}
      onKeyDown={handleKeyboard}
      aria-label="Flight replay. Use Space to play or pause; arrow keys seek one second."
      data-testid="ms-insights-flight-replay"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="m-0 text-lg font-medium text-foreground">
          Flight replay 3D — {replayTimeline.run}
        </h3>
        <p className="m-0 break-words text-(--muted-foreground)">
          {replayTimeline.log} · start {replayTimeline.startClock} ·{" "}
          {replayTimeline.samples.length} position samples ·{" "}
          {airborneDepthFrames.length} airborne depth frames ·{" "}
          {replayTimeline.events.length} events
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {sample.replayStats.map(([label, value]) => (
          <div
            key={label}
            className="flex min-w-0 flex-col gap-1 rounded-(--radius) border border-border bg-(--card) p-3"
          >
            <span className="font-semibold tabular-nums">{value}</span>
            <span className="text-(--muted-foreground)">{label}</span>
          </div>
        ))}
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
      />

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(28rem,0.8fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <MissionInsightsFlightScene
            time={time}
            cameraMode={cameraMode}
            layers={layers}
          />
          <p className="m-0 text-(--muted-foreground)">
            Flown path, waypoint targets, reports, and depth-camera observations
            from the shared sample replay. Drag to rotate, right-drag to pan,
            and scroll to zoom.
          </p>
          <ul className="m-0 grid list-disc grid-cols-1 gap-x-6 gap-y-2 pl-5 text-(--muted-foreground) sm:grid-cols-2">
            <li>Flown path; colour represents speed.</li>
            <li>Fly-to targets.</li>
            <li>
              One depth-camera observation panel per frame; the solid line is
              the median point height.
            </li>
            <li>
              The faint upper panel is above the median point height and
              represents the sparser half of the points.
            </li>
            <li>
              A green strip means a later frame looked at this part at the
              drone’s altitude and found no point in range.
            </li>
            <li>
              A mixed-range frame has points spread over several distances, so
              its panel position is less reliable.
            </li>
            <li>Drone position at each EXPLORE stop or detection.</li>
          </ul>
          <p className="m-0 text-(--muted-foreground)">
            Obstacle panels are reconstructed from logged DEPTH_DBG statistics
            (about 1 Hz), not the raw point cloud. Each red panel spans the
            cloud’s azimuth p05–p95 at its median horizontal range and extends
            from its lowest to highest world height. It uses the drone position
            and yaw at that frame; roll and pitch are ignored. The source
            describes roughly ±0.5 m error. True obstacle geometry needs the
            planner recording or scenario world file.
          </p>
        </div>
        <section
          className="flex min-w-0 flex-col gap-4 rounded-(--radius) border border-border bg-(--card) p-4"
          aria-labelledby="ms-replay-state-title"
        >
          <h3
            id="ms-replay-state-title"
            className="m-0 text-lg font-medium text-foreground"
          >
            Replay state
          </h3>
          <dl className="m-0 grid min-w-0 grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-x-4 gap-y-3">
            {stateRows.map(([label, value]) => (
              <Fragment key={label}>
                <dt className="text-(--muted-foreground)">{label}</dt>
                <dd className="m-0 break-words text-right tabular-nums">
                  {value}
                </dd>
              </Fragment>
            ))}
          </dl>
          {seekNotice ? (
            <p role="status" className="m-0 text-(--muted-foreground)">
              {seekNotice}
            </p>
          ) : null}
          {selectedEventItem ? (
            <p className="m-0">
              Selected event: {selectedEventItem.tag} ·{" "}
              {formatClock(selectedEventItem.t)}
            </p>
          ) : null}
        </section>
      </div>

      <MissionInsightsTelemetryCharts currentTime={time} onSeek={seek} />

      <MissionInsightsPlannerEvents
        selectedEvent={selectedEvent}
        onSelectedEventChange={setSelectedEvent}
        onSeek={seek}
      />
    </div>
  );
}
