import { useState } from "react";
import {
  type JsonRecord,
  asRecord,
  textValue,
  numberValue,
  reportForSample,
  asRecords,
  sampleMedia,
  sampleActions,
  sampleWorldImage,
} from "./mission-insights-report-data";
import { type MissionInsightSample } from "./mission-insights-data";
import { DetailSection } from "./mission-insights-page-sections";
import { Badge } from "skytrack-ui/badge";
import { type MissionInsightsReportTab } from "@/features/studio/mission-report-url";
import { Button } from "skytrack-ui/button";
import { KeyValueList, recordDuration } from "./mission-insights-report-shared";
import { MissionInsightsReportFlightPath3D } from "./mission-insights-report-flight-path-3d";

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

export function FlightPathMap({
  sample,
  selectedCaptureId,
  onSelectCapture,
  onSelectDiagnostic,
  className = "",
}: {
  sample: MissionInsightSample;
  selectedCaptureId: string | null;
  onSelectCapture: (id: string) => void;
  onSelectDiagnostic: () => void;
  className?: string;
}) {
  const report = reportForSample(sample);
  const field = asRecord(report.field);
  const waypoints = asRecords(report.waypoints);
  const flightPath = asRecord(report.flight_path);
  const primaryDiagnostic =
    asRecords(asRecord(report.diagnostics).items)[0] ?? {};
  const pad = asRecord(asRecord(field.pad));
  const touchdown = asRecord(flightPath.touchdown);
  const lastPosition = asRecord(flightPath.last_position);
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
  const altitudeSamples = samples.flatMap((point) => {
    const coordinates = localPoint(point);
    const altitude = numberValue(point.z_m);
    return coordinates && altitude !== null ? [{ coordinates, altitude }] : [];
  });
  const minPathAltitude = Math.min(
    ...altitudeSamples.map((point) => point.altitude),
    0,
  );
  const maxPathAltitude = Math.max(
    ...altitudeSamples.map((point) => point.altitude),
    0,
  );
  const altitudePalette = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
  ];
  const bounds = [
    ...polygon,
    ...pathPoints,
    ...[pad, touchdown, lastPosition].flatMap((point) => {
      const coordinates = localPoint(point);
      return coordinates ? [coordinates] : [];
    }),
    ...waypoints.flatMap((point) => {
      const coordinates = localPoint(point);
      return coordinates ? [coordinates] : [];
    }),
    ...detections.map((item) => item.point),
  ];
  const xs = bounds.map(([x]) => x);
  const ys = bounds.map(([, y]) => y);
  const minX = xs.length ? Math.min(...xs) : 0;
  const maxX = xs.length ? Math.max(...xs) : 1;
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxY = ys.length ? Math.max(...ys) : 1;
  const xSpan = Math.max(maxX - minX, 1);
  const ySpan = Math.max(maxY - minY, 1);
  const mapScale = Math.min(90 / xSpan, 50 / ySpan);
  const mapPoint = ([x, y]: [number, number]) =>
    [
      50 + (x - (minX + maxX) / 2) * mapScale,
      30 - (y - (minY + maxY) / 2) * mapScale,
    ] as const;
  const padPoint = localPoint(pad);
  const touchdownPoint = localPoint(touchdown);
  const lastPositionPoint = localPoint(lastPosition);
  const worldImage = sampleWorldImage(sample);
  const first = pathPoints[0] ? mapPoint(pathPoints[0]) : null;
  const last = pathPoints[pathPoints.length - 1]
    ? mapPoint(pathPoints[pathPoints.length - 1])
    : null;

  return (
    <DetailSection
      title={`Top view · ${textValue(field.label, sample.world)}`}
      className={className}
      toolbar={
        sample.key === "real-succeeded" ? (
          <Badge
            className="rounded-(--radius)"
            count="Reference image"
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
              alt={`${textValue(field.label, sample.world)} world image`}
              className="absolute inset-0 size-full object-cover"
            />
          ) : null}
          <svg
            className="absolute inset-0 size-full"
            viewBox="0 0 100 60"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Flight path, field, pad, waypoints, image captures, detections, and endpoint"
          >
            <desc>
              Map path, field, pad, waypoints, captures, detections, and endpoint.
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
            {padPoint
              ? (() => {
                  const [x, y] = mapPoint(padPoint);
                  return (
                    <circle
                      cx={x}
                      cy={y}
                      r="1.2"
                      fill="var(--background)"
                      stroke="var(--foreground)"
                      strokeWidth="0.4"
                    >
                      <title>Landing pad</title>
                    </circle>
                  );
                })()
              : null}
            {waypoints.length > 1 ? (
              <polyline
                points={waypoints
                  .flatMap((point) => {
                    const coordinates = localPoint(point);
                    return coordinates ? [mapPoint(coordinates).join(",")] : [];
                  })
                  .join(" ")}
                fill="none"
                stroke="var(--muted-foreground)"
                strokeWidth="0.45"
                strokeDasharray="1.2 0.8"
                vectorEffect="non-scaling-stroke"
              >
                <title>Planned route through defined waypoints</title>
              </polyline>
            ) : null}
            {altitudeSamples.slice(1).map((point, index) => {
              const start = mapPoint(altitudeSamples[index].coordinates);
              const end = mapPoint(point.coordinates);
              const ratio =
                maxPathAltitude > minPathAltitude
                  ? (point.altitude - minPathAltitude) /
                    (maxPathAltitude - minPathAltitude)
                  : 0;
              const bucket = Math.min(
                altitudePalette.length - 1,
                Math.floor(ratio * altitudePalette.length),
              );
              return (
                <line
                  key={`map-path-${index}`}
                  x1={start[0]}
                  y1={start[1]}
                  x2={end[0]}
                  y2={end[1]}
                  stroke={altitudePalette[bucket]}
                  strokeWidth="0.75"
                  vectorEffect="non-scaling-stroke"
                >
                  <title>{point.altitude.toFixed(1)} m altitude</title>
                </line>
              );
            })}
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
                    fill={
                      point.reached === true
                        ? "var(--success)"
                        : "var(--background)"
                    }
                    stroke={
                      point.reached === true
                        ? "var(--background)"
                        : "var(--warning)"
                    }
                    strokeWidth="0.25"
                  />
                  <text
                    x={x + 1}
                    y={y - 1}
                    fill={
                      point.reached === true
                        ? "var(--success)"
                        : "var(--warning)"
                    }
                    fontSize="2.2"
                  >
                    WP{numberValue(point.index) ?? index + 1}
                  </text>
                </g>
              );
            })}
            {captures.map(({ item, point }) => {
              const [x, y] = mapPoint(point);
              const selected = item.id === selectedCaptureId;
              return (
                <g
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select capture ${item.name} at ${item.captureTime?.toFixed(1) ?? "unknown"} seconds`}
                  onClick={() => onSelectCapture(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectCapture(item.id);
                    }
                  }}
                  className="cursor-pointer outline-none focus-visible:drop-shadow-[0_0_2px_var(--ring)]"
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={selected ? "1.35" : "0.9"}
                    fill={
                      item.availability === "local"
                        ? "var(--warning)"
                        : "var(--background)"
                    }
                    stroke={selected ? "var(--ring)" : "var(--warning)"}
                    strokeWidth={selected ? "0.5" : "0.25"}
                    strokeDasharray={
                      item.availability === "local" ? undefined : "0.45 0.3"
                    }
                  />
                  <title>{item.name} capture</title>
                </g>
              );
            })}
            {detections.map(({ label, point }, index) => {
              const [x, y] = mapPoint(point);
              const sourceDetection = asRecords(report.detections_geo).find(
                (item) =>
                  textValue(item.class) === label &&
                  localPoint(item)?.[0] === point[0] &&
                  localPoint(item)?.[1] === point[1],
              );
              const saved =
                asRecord(sourceDetection).saved_as_rescue_location === true;
              return (
                <g key={`${label}-${index}`}>
                  <rect
                    x={x - 0.6}
                    y={y - 0.6}
                    width="1.2"
                    height="1.2"
                    fill={saved ? "var(--destructive)" : "var(--background)"}
                    stroke={saved ? "var(--destructive)" : "var(--warning)"}
                    strokeWidth="0.2"
                    strokeDasharray={saved ? undefined : "0.4 0.25"}
                  />
                  <title>
                    {label} · {saved ? "saved" : "not saved"}
                  </title>
                </g>
              );
            })}
            {touchdownPoint
              ? (() => {
                  const [x, y] = mapPoint(touchdownPoint);
                  return (
                    <path
                      d={`M ${x} ${y - 1.4} L ${x - 1.2} ${y + 1} L ${x + 1.2} ${y + 1} Z`}
                      fill="var(--success)"
                      stroke="var(--background)"
                      strokeWidth="0.25"
                    >
                      <title>Touchdown</title>
                    </path>
                  );
                })()
              : null}
            {lastPositionPoint
              ? (() => {
                  const [x, y] = mapPoint(lastPositionPoint);
                  const code = textValue(
                    primaryDiagnostic.code,
                    "Last position",
                  );
                  const time = numberValue(primaryDiagnostic.time_s);
                  return (
                    <g
                      role="button"
                      tabIndex={0}
                      aria-label={`Select diagnostic ${code}${time === null ? "" : ` at ${time.toFixed(1)} seconds`}`}
                      onClick={onSelectDiagnostic}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelectDiagnostic();
                        }
                      }}
                      className="cursor-pointer outline-none focus-visible:drop-shadow-[0_0_2px_var(--ring)]"
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r="1.2"
                        fill="var(--destructive)"
                        stroke="var(--background)"
                        strokeWidth="0.3"
                      />
                      <text
                        x={x + 1.4}
                        y={y - 1.2}
                        fill="var(--destructive)"
                        fontSize="2.2"
                      >
                        {code}
                      </text>
                      <title>
                        {code}
                        {time === null ? "" : ` at ${time.toFixed(1)} s`}
                      </title>
                    </g>
                  );
                })()
              : null}
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
        <div
          className="flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground"
          aria-label="Map legend"
        >
          <span>
            <span
              aria-hidden="true"
              className="mr-1 inline-block size-2 rounded-full bg-(--info)"
            />
            Planned route
          </span>
          <span>
            <span
              aria-hidden="true"
              className="mr-1 inline-block size-2 rounded-full bg-(--chart-2)"
            />
            Flown path · altitude
          </span>
          <span>
            <span
              aria-hidden="true"
              className="mr-1 inline-block size-2 rounded-full bg-(--success)"
            />
            Waypoint reached
          </span>
          <span>
            <span
              aria-hidden="true"
              className="mr-1 inline-block size-2 rounded-full border border-warning"
            />
            Waypoint not reached
          </span>
          {captures.length ? (
            <span>
              <span
                aria-hidden="true"
                className="mr-1 inline-block size-2 rounded-full bg-(--warning)"
              />
              Image capture
            </span>
          ) : null}
          {captures.some((capture) => capture.item.availability !== "local") ? (
            <span>
              <span
                aria-hidden="true"
                className="mr-1 inline-block size-2 rounded-full border border-warning"
              />
              Capture unavailable locally
            </span>
          ) : null}
          {detections.length ? (
            <span>
              <span
                aria-hidden="true"
                className="mr-1 inline-block size-2 bg-(--destructive)"
              />
              Detection · saved and not saved
            </span>
          ) : null}
          {padPoint ? (
            <span>
              <span
                aria-hidden="true"
                className="mr-1 inline-block size-2 rounded-full border border-foreground"
              />
              Landing pad
            </span>
          ) : null}
          {touchdownPoint ? (
            <span>
              <span
                aria-hidden="true"
                className="mr-1 inline-block size-2 bg-success"
              />
              Touchdown
            </span>
          ) : null}
          {first ? (
            <span>
              <span
                aria-hidden="true"
                className="mr-1 inline-block size-2 rounded-full bg-(--success)"
              />
              Start
            </span>
          ) : null}
          {last ? (
            <span>
              <span
                aria-hidden="true"
                className="mr-1 inline-block size-2 rounded-full bg-(--foreground)"
              />
              End
            </span>
          ) : null}
        </div>
        <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
          <span>Field: {textValue(field.label, sample.world)}</span>
          <span>{waypoints.length} waypoints</span>
          <span>{captures.length} image capture positions</span>
          <span>{detections.length} detection locations</span>
          <span>
            Coordinates use report local-metre frame; map preserves equal X/Y
            scale.
          </span>
        </figcaption>
      </figure>
    </DetailSection>
  );
}

export function FlightPathTab({
  sample,
  onNavigate,
  onOpenMedia,
}: {
  sample: MissionInsightSample;
  onNavigate: (tab: MissionInsightsReportTab) => void;
  onOpenMedia: (id: string) => void;
}) {
  const [selectedCaptureId, setSelectedCaptureId] = useState<string | null>(
    null,
  );
  const [diagnosticSelected, setDiagnosticSelected] = useState(false);
  const selectedCapture =
    sampleMedia(sample).find((item) => item.id === selectedCaptureId) ?? null;
  const report = reportForSample(sample);
  const diagnostic = asRecords(asRecord(report.diagnostics).items)[0] ?? null;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <FlightPathMap
        sample={sample}
        selectedCaptureId={selectedCaptureId}
        onSelectCapture={(id) => {
          setDiagnosticSelected(false);
          setSelectedCaptureId(id);
        }}
        onSelectDiagnostic={() => {
          setSelectedCaptureId(null);
          setDiagnosticSelected(true);
        }}
        className="xl:col-start-1 xl:row-start-1"
      />
      {selectedCapture ? (
        <DetailSection
          title="Selected capture"
          className="xl:col-span-2"
          toolbar={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCaptureId(null)}
            >
              Clear selection
            </Button>
          }
        >
          <KeyValueList
            rows={[
              ["File", selectedCapture.name],
              [
                "Capture time",
                selectedCapture.captureTime === null
                  ? "Not supplied"
                  : `${selectedCapture.captureTime.toFixed(1)} s`,
              ],
              ["Availability", selectedCapture.availability],
              ["Related detections", selectedCapture.detectionCount.toString()],
              ["Capture pose", capturePoseSummary(selectedCapture.artifact)],
            ]}
          />
          <Button
            variant="link"
            size="sm"
            className="self-start"
            onClick={() => onOpenMedia(selectedCapture.id)}
          >
            Open in Media & Files
          </Button>
        </DetailSection>
      ) : null}
      {diagnosticSelected && diagnostic ? (
        <DetailSection
          title={`Diagnostic · ${textValue(diagnostic.code, "Issue")}`}
          className="xl:col-span-2"
          toolbar={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDiagnosticSelected(false)}
            >
              Clear selection
            </Button>
          }
        >
          <KeyValueList
            rows={[
              ["Severity", textValue(diagnostic.severity, "Not supplied")],
              ["Message", textValue(diagnostic.message, "Not supplied")],
              [
                "Time",
                numberValue(diagnostic.time_s) === null
                  ? "Time unknown"
                  : `${numberValue(diagnostic.time_s)!.toFixed(1)} s`,
              ],
            ]}
          />
          <Button
            variant="link"
            size="sm"
            className="self-start"
            onClick={() => onNavigate("timeline")}
          >
            Open Timeline
          </Button>
        </DetailSection>
      ) : null}
      <FlightPathReportDetails sample={sample} onNavigate={onNavigate} />
    </div>
  );
}

function FlightPathReportDetails({
  sample,
  onNavigate,
}: {
  sample: MissionInsightSample;
  onNavigate: (tab: MissionInsightsReportTab) => void;
}) {
  const report = reportForSample(sample);
  const flight = asRecord(report.flight_path);
  const touchdown = asRecord(flight.touchdown);
  const waypoints = asRecords(report.waypoints);
  const media = sampleMedia(sample).filter((item) => item.kind === "image");
  const reached = waypoints.filter((point) => point.reached === true).length;
  const actions = sampleActions(report);
  const takeoff = actions.find(
    (action) => action.type === "navigation.takeoff",
  );
  const landing = actions.find((action) => action.type === "navigation.land");
  const altitudeValues = asRecords(flight.samples).flatMap((point) => {
    const altitude = numberValue(point.z_m);
    return altitude === null ? [] : [altitude];
  });
  const run = asRecord(report.run);
  const distance = numberValue(flight.distance_m);
  const maxAltitude = numberValue(flight.max_altitude_m);
  const runSeconds = numberValue(run.duration_ms);
  const waypointAltitudes = waypoints.flatMap((point) => {
    const altitude = numberValue(point.z_m);
    return altitude === null ? [] : [altitude];
  });
  const waypointAltitudeRange = waypointAltitudes.length
    ? `${Math.min(...waypointAltitudes).toFixed(1)}–${Math.max(...waypointAltitudes).toFixed(1)} m`
    : "Not supplied";
  const savedHits = asRecords(report.detections_geo).filter(
    (item) => item.saved_as_rescue_location === true,
  ).length;
  const flightSamples = asRecords(flight.samples);
  const coords = flightSamples.flatMap((point) => {
    const x = numberValue(point.x_m);
    const y = numberValue(point.y_m);
    const z = numberValue(point.z_m);
    return x === null || y === null || z === null ? [] : [[x, y, z] as const];
  });
  const waypointCoords = waypoints.flatMap((waypoint) => {
    const x = numberValue(waypoint.x_m);
    const y = numberValue(waypoint.y_m);
    const z = numberValue(waypoint.z_m);
    return x === null || y === null || z === null
      ? []
      : [
          {
            index: numberValue(waypoint.index),
            reached: waypoint.reached === true,
            point: [x, y, z] as const,
          },
        ];
  });
  const speeds = coords.slice(1).flatMap((point, index) => {
    const previous = coords[index];
    const t1 = numberValue(flightSamples[index + 1]?.t_s);
    const t0 = numberValue(flightSamples[index]?.t_s);
    if (!previous || t1 === null || t0 === null || t1 <= t0) return [];
    return [
      Math.hypot(
        point[0] - previous[0],
        point[1] - previous[1],
        point[2] - previous[2],
      ) /
        (t1 - t0),
    ];
  });
  const boundedCoords = [...coords, ...waypointCoords.map(({ point }) => point)];
  const minX = Math.min(...boundedCoords.map(([x]) => x));
  const maxX = Math.max(...boundedCoords.map(([x]) => x));
  const minY = Math.min(...boundedCoords.map(([, y]) => y));
  const maxY = Math.max(...boundedCoords.map(([, y]) => y));
  const minZ = Math.min(0, ...boundedCoords.map(([, , z]) => z));
  const maxZ = Math.max(...boundedCoords.map(([, , z]) => z));
  const minSpeed = speeds.length ? Math.min(...speeds) : null;
  const maxSpeed = speeds.length ? Math.max(...speeds) : null;
  const touchdownExists = Object.keys(touchdown).length > 0;
  const takeoffDuration = takeoff ? recordDuration(takeoff) : "Not recorded";
  const landingDuration = landing ? recordDuration(landing) : null;
  const landingStart = numberValue(landing?.t0_s);
  const landingAltitude =
    landingStart === null
      ? null
      : flightSamples.reduce<{ time: number; altitude: number } | null>((nearest, point) => {
          const time = numberValue(point.t_s);
          const altitude = numberValue(point.z_m);
          if (time === null || altitude === null) return nearest;
          return nearest === null || Math.abs(time - landingStart) < Math.abs(nearest.time - landingStart)
            ? { time, altitude }
            : nearest;
        }, null)?.altitude ?? null;
  const climbSummary = takeoff
    ? `0 → ${numberValue(asRecord(takeoff.inputs).target_altitude_m)?.toFixed(1) ?? maxAltitude?.toFixed(1) ?? "—"} m (${takeoffDuration})`
    : "Not recorded";
  const descentSummary =
    landing?.status === "completed" && landingDuration
      ? `${landingAltitude?.toFixed(1) ?? "—"} → 0 m (${landingDuration})`
      : "No descent recorded";

  return (
    <div className="contents">
      <DetailSection
        title="Summary"
        className="self-start xl:col-start-2 xl:row-start-1"
      >
        <KeyValueList
          columns="sm:grid-cols-1"
          rows={[
            [
              "Distance",
              distance === null ? "Not supplied" : `${distance.toFixed(1)} m`,
            ],
            [
              "Maximum altitude",
              maxAltitude === null
                ? "Not supplied"
                : `${maxAltitude.toFixed(1)} m`,
            ],
            [
              "Flight time",
              runSeconds === null
                ? "Not supplied"
                : `${(runSeconds / 1000).toFixed(1)} s`,
            ],
            [
              "Touchdown",
              touchdownExists
                ? `${numberValue(touchdown.distance_from_pad_m)?.toFixed(2) ?? "—"} m from pad`
                : "Not recorded",
            ],
            [
              "Waypoints",
              `${reached} of ${waypoints.length} reached (altitude ${waypointAltitudeRange})`,
            ],
            ["Climb & descent", `${climbSummary} · ${descentSummary}`],
            [
              "Touchdown pose",
              touchdownExists
                ? `${numberValue(touchdown.x_m)?.toFixed(2) ?? "—"}, ${numberValue(touchdown.y_m)?.toFixed(2) ?? "—"} m (${numberValue(touchdown.distance_from_pad_m)?.toFixed(2) ?? "—"} m from pad)`
                : "No touchdown recorded",
            ],
            [
              "Captures & hits",
              `${media.filter((item) => item.availability === "local").length} local · ${media.filter((item) => item.availability === "remote_only").length} on Mission Computer · ${savedHits} saved`,
            ],
          ]}
        />
      </DetailSection>
      <DetailSection
        title="Report flight path · 3D projection"
        className="xl:col-span-2"
      >
        <p className="m-0 text-muted-foreground">
          Flight path sampled every{" "}
          {numberValue(flight.sample_interval_s)?.toFixed(1) ?? "—"} s. Projection
          uses local X/Y/Z coordinates; line color shows
          consecutive-sample speed.
        </p>
        {coords.length ? (
          <figure className="m-0 flex min-w-0 flex-col gap-3">
            <MissionInsightsReportFlightPath3D report={report} />
            <figcaption className="flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground">
              <span>Samples: {coords.length}</span>
              <span>
                X {minX.toFixed(1)}–{maxX.toFixed(1)} m
              </span>
              <span>
                Y {minY.toFixed(1)}–{maxY.toFixed(1)} m
              </span>
              <span>
                Z {Math.min(...altitudeValues, minZ).toFixed(1)}–
                {maxZ.toFixed(1)} m
              </span>
              <span>
                Speed {minSpeed?.toFixed(2) ?? "—"}–
                {maxSpeed?.toFixed(2) ?? "—"} m/s
              </span>
              <span>◆ Waypoint reached · ✚ Waypoint defined</span>
              <span>Segment color encodes consecutive-sample speed</span>
            </figcaption>
          </figure>
        ) : (
          <p className="m-0 text-muted-foreground">
            No flight path data available.
          </p>
        )}
        <Button
          variant="link"
          size="sm"
          className="self-start"
          onClick={() => onNavigate("timeline")}
        >
          Open actions and report event metadata
        </Button>
      </DetailSection>
    </div>
  );
}
