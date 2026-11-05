import { type JsonRecord, asRecord, textValue, numberValue, reportForSample, asRecords, sampleMedia, sampleWorldImage } from "./mission-insights-report-data";
import { type MissionInsightSample } from "./mission-insights-data";
import { DetailSection } from "./mission-insights-page-sections";
import { Badge } from "skytrack-ui/badge";
import { type MissionInsightsReportTab } from "../mission-report-url";
import { MissionInsightsFlightReplay } from "./mission-insights-flight-replay";
import { MissionInsightsTelemetryCharts } from "./mission-insights-charts";
import { replayTimeline } from "./replay-sample";
import { Button } from "skytrack-ui/button";

export function capturePoseSummary(artifact: JsonRecord) {
  const pose = asRecord(asRecord(artifact.metadata).capture_pose);
  const frame = textValue(pose.frame_id, "Frame not recorded");
  const axes = (["x_m", "y_m", "z_m"] as const).map((axis) =>
    numberValue(pose[axis]),
  );
  if (axes.some((value) => value === null)) return frame;
  return `${frame} · X ${axes[0]!.toFixed(2)} m · Y ${axes[1]!.toFixed(
    2,
  )} m · Z ${axes[2]!.toFixed(2)} m`;
}

export function coordinatePairs(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((pair) => {
    if (!Array.isArray(pair) || pair.length < 2) return [];
    const x = numberValue(pair[0]);
    const y = numberValue(pair[1]);
    return x === null || y === null ? [] : [[x, y]];
  });
}

export function localPoint(value: unknown): [number, number] | null {
  const point = asRecord(value);
  const x = numberValue(point.x_m);
  const y = numberValue(point.y_m);
  return x === null || y === null ? null : [x, y];
}

export function FlightPathMap({ sample }: { sample: MissionInsightSample }) {
  const report = reportForSample(sample);
  const field = asRecord(report.field);
  const waypoints = asRecords(report.waypoints);
  const flightPath = asRecord(report.flight_path);
  const samples = asRecords(flightPath.samples);
  const polygon = coordinatePairs(field.polygon_m);
  const media = sampleMedia(sample).filter((item) => item.kind === "image");
  const captures = media.flatMap((item) => {
    const pose = localPoint(asRecord(item.artifact.metadata).capture_pose);
    return pose ? [{ item, point: pose }] : [];
  });
  const detections = asRecords(report.detections_geo).flatMap((item) => {
    const point = localPoint(item);
    return point ? [{ label: textValue(item.class), point }] : [];
  });
  const pathPoints = samples.flatMap((point) => {
    const coordinates = localPoint(point);
    return coordinates ? [coordinates] : [];
  });
  const bounds = [
    ...polygon,
    ...pathPoints,
    ...waypoints.flatMap((point) => {
      const coordinates = localPoint(point);
      return coordinates ? [coordinates] : [];
    }),
  ];
  const xs = bounds.map(([x]) => x);
  const ys = bounds.map(([, y]) => y);
  const minX = xs.length ? Math.min(...xs) : 0;
  const maxX = xs.length ? Math.max(...xs) : 1;
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxY = ys.length ? Math.max(...ys) : 1;
  const xSpan = Math.max(maxX - minX, 1);
  const ySpan = Math.max(maxY - minY, 1);
  const mapPoint = ([x, y]: [number, number]) =>
    [5 + ((x - minX) / xSpan) * 90, 55 - ((y - minY) / ySpan) * 50] as const;
  const worldImage = sampleWorldImage(sample);
  const first = pathPoints[0] ? mapPoint(pathPoints[0]) : null;
  const last = pathPoints[pathPoints.length - 1]
    ? mapPoint(pathPoints[pathPoints.length - 1])
    : null;

  return (
    <DetailSection
      title={`Top view · ${textValue(field.label, sample.world)}`}
      toolbar={
        sample.key === "real-succeeded" ? (
          <Badge
            className="rounded-(--radius)"
            count="Sample floor image"
            status="secondary"
          />
        ) : null
      }
    >
      <figure className="m-0 flex min-w-0 flex-col gap-3">
        <div className="relative aspect-video min-w-0 overflow-hidden rounded-(--radius) border border-border bg-(--muted)">
          {worldImage ? (
            <img
              src={worldImage}
              alt={`${textValue(field.label, sample.world)} sample world image`}
              className="absolute inset-0 size-full object-cover"
            />
          ) : null}
          <svg
            className="absolute inset-0 size-full"
            viewBox="0 0 100 60"
            preserveAspectRatio="none"
            role="img"
            aria-label="Illustrative flight path, field, waypoints, image captures, and detections"
          >
            <desc>
              Local-metre sample path. The route and report values are
              illustrative and are not linked to the selected run.
            </desc>
            {polygon.length > 2 ? (
              <polygon
                points={polygon
                  .map((point) => mapPoint(point).join(","))
                  .join(" ")}
                fill="var(--primary)"
                fillOpacity="0.08"
                stroke="var(--primary)"
                strokeWidth="0.45"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            {pathPoints.length > 1 ? (
              <polyline
                points={pathPoints
                  .map((point) => mapPoint(point).join(","))
                  .join(" ")}
                fill="none"
                stroke="var(--info)"
                strokeWidth="0.75"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            {waypoints.map((point, index) => {
              const coordinates = localPoint(point);
              if (!coordinates) return null;
              const [x, y] = mapPoint(coordinates);
              return (
                <g key={`waypoint-${index}`}>
                  <circle
                    cx={x}
                    cy={y}
                    r="0.9"
                    fill="var(--success)"
                    stroke="var(--background)"
                    strokeWidth="0.25"
                  />
                  <text
                    x={x + 1}
                    y={y - 1}
                    fill="var(--foreground)"
                    fontSize="2.2"
                  >
                    WP{numberValue(point.index) ?? index + 1}
                  </text>
                </g>
              );
            })}
            {captures.map(({ item, point }) => {
              const [x, y] = mapPoint(point);
              return (
                <g key={item.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r="0.7"
                    fill="var(--warning)"
                    stroke="var(--background)"
                    strokeWidth="0.2"
                  />
                  <title>{item.name} capture</title>
                </g>
              );
            })}
            {detections.map(({ label, point }, index) => {
              const [x, y] = mapPoint(point);
              return (
                <g key={`${label}-${index}`}>
                  <rect
                    x={x - 0.6}
                    y={y - 0.6}
                    width="1.2"
                    height="1.2"
                    fill="var(--destructive)"
                    stroke="var(--background)"
                    strokeWidth="0.2"
                  />
                  <title>{label} sample detection</title>
                </g>
              );
            })}
            {first ? (
              <circle
                cx={first[0]}
                cy={first[1]}
                r="1.25"
                fill="var(--success)"
                stroke="var(--background)"
                strokeWidth="0.3"
              >
                <title>Start</title>
              </circle>
            ) : null}
            {last ? (
              <circle
                cx={last[0]}
                cy={last[1]}
                r="1.25"
                fill="var(--foreground)"
                stroke="var(--background)"
                strokeWidth="0.3"
              >
                <title>End</title>
              </circle>
            ) : null}
          </svg>
        </div>
        <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-2 text-(--muted-foreground)">
          <span>Field: {textValue(field.label, sample.world)}</span>
          <span>{waypoints.length} waypoints</span>
          <span>{captures.length} image capture positions</span>
          <span>{detections.length} detection locations</span>
          <span>Coordinates use the report's local-metre frame.</span>
        </figcaption>
      </figure>
    </DetailSection>
  );
}

export function FlightPathTab({
  sample,
  time,
  seekNotice,
  onSeek,
  onNavigate,
}: {
  sample: MissionInsightSample;
  time: number;
  seekNotice: string;
  onSeek: (time: number, label?: string) => void;
  onNavigate: (tab: MissionInsightsReportTab) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <FlightPathMap sample={sample} />
      <DetailSection
        title="Flight replay"
        toolbar={
          <Badge
            className="rounded-(--radius)"
            count="Shared sample replay"
            status="secondary"
          />
        }
      >
        <p className="m-0 text-(--muted-foreground)">
          {sample.replayDescription}. This replay is a shared prototype sample,
          not telemetry for the selected run.
        </p>
        <MissionInsightsFlightReplay
          sample={sample}
          time={time}
          seekNotice={seekNotice}
          onSeek={onSeek}
        />
        <MissionInsightsTelemetryCharts currentTime={time} onSeek={onSeek} />
        <section
          className="flex min-w-0 flex-col gap-3"
          aria-labelledby="ms-planner-events-title"
        >
          <h3
            id="ms-planner-events-title"
            className="m-0 text-lg font-medium text-foreground"
          >
            Planner events
          </h3>
          <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
            {replayTimeline.events.slice(0, 8).map((event, index) => (
              <li key={`${event.t}-${event.tag}-${index}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-auto w-full justify-start whitespace-normal text-left"
                  onClick={() => onSeek(event.t, event.msg)}
                >
                  <span className="tabular-nums">{event.t.toFixed(1)} s</span>
                  <span>{event.msg}</span>
                </Button>
              </li>
            ))}
          </ul>
          <Button
            variant="link"
            size="sm"
            className="self-start"
            onClick={() => onNavigate("timeline")}
          >
            Open full Timeline
          </Button>
        </section>
      </DetailSection>
    </div>
  );
}
