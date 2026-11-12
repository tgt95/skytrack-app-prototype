import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "skytrack-ui/chart";
import type { MissionInsightSample } from "./mission-insights-data";
import { replayTimeline } from "./replay-sample";

const timeFormatter = (value: number) => `${Number(value).toFixed(0)} s`;

type TelemetryValue = number | null;
type TelemetryPoint = {
  time: number;
  altitude: TelemetryValue;
  altitudeLane: TelemetryValue;
  speed: TelemetryValue;
  speedLane: TelemetryValue;
  nearestDepth: TelemetryValue;
  nearestDepthLane: TelemetryValue;
};

type TimedValue = { time: number; value: TelemetryValue };

function valueAt(points: TimedValue[], time: number): TelemetryValue {
  const rightIndex = points.findIndex((point) => point.time >= time);
  if (rightIndex === -1) return points.at(-1)?.value ?? null;
  const right = points[rightIndex];
  if (right.time === time || rightIndex === 0) return right.value;
  const left = points[rightIndex - 1];
  if (left.value === null || right.value === null) return null;
  const progress = (time - left.time) / (right.time - left.time);
  return left.value + (right.value - left.value) * progress;
}

function normalize(value: TelemetryValue, min: number, max: number) {
  if (value === null) return null;
  if (max <= min) return 0.5;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

function obstacleIntervals() {
  const events = replayTimeline.events;
  return events.flatMap((event, index) => {
    if (event.tag !== "EXPLORE" || !event.msg.includes("ON PATH")) return [];
    const end = events
      .slice(index + 1)
      .find(
        (next) =>
          next.seg === event.seg &&
          next.tag === "EXPLORE" &&
          next.msg.includes("path clear"),
      )?.t;
    return [{ start: event.t, end: end ?? event.t + 1 }];
  });
}

function TelemetryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: TelemetryPoint }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  const values = [
    {
      label: "Altitude",
      value: point.altitude,
      unit: "m",
      color: "var(--chart-1)",
    },
    {
      label: "Speed",
      value: point.speed,
      unit: "m/s",
      color: "var(--chart-2)",
    },
    {
      label: "Nearest depth",
      value: point.nearestDepth,
      unit: "m",
      color: "var(--chart-3)",
    },
  ];

  return (
    <div className="rounded-(--radius) border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="mb-2 mt-0 font-medium">{timeFormatter(point.time)}</p>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {values.map(({ label, value, unit, color }) => (
          <li key={label} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {label}
            </span>
            <span className="tabular-nums">
              {value === null ? "—" : `${value.toFixed(2)} ${unit}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MissionInsightsTelemetryCharts({
  currentTime,
  onSeek,
}: {
  currentTime: number;
  onSeek: (time: number) => void;
}) {
  const { data, intervals } = useMemo(() => {
    const altitude: TimedValue[] = replayTimeline.samples.map((sample) => ({
      time: sample.t,
      value: -sample.d,
    }));
    const speed: TimedValue[] = replayTimeline.samples.map((sample) => ({
      time: sample.t,
      value: sample.spd,
    }));
    const nearestDepth: TimedValue[] = replayTimeline.depth.map((frame) => ({
      time: frame.t,
      value: frame.near,
    }));
    const times = [
      ...new Set([
        ...altitude.map(({ time }) => time),
        ...speed.map(({ time }) => time),
        ...nearestDepth.map(({ time }) => time),
      ]),
    ].sort((a, b) => a - b);
    const altitudeValues = times.map((time) => valueAt(altitude, time));
    const speedValues = times.map((time) => valueAt(speed, time));
    const depthValues = times.map((time) => valueAt(nearestDepth, time));
    const extent = (values: TelemetryValue[]) => {
      const valid = values.filter((value): value is number => value !== null);
      return [Math.min(...valid), Math.max(...valid)] as const;
    };
    const [altitudeMin, altitudeMax] = extent(altitudeValues);
    const [speedMin, speedMax] = extent(speedValues);
    const [depthMin, depthMax] = extent(depthValues);
    return {
      data: times.map((time, index): TelemetryPoint => {
        const altitudeValue = altitudeValues[index];
        const speedValue = speedValues[index];
        const depthValue = depthValues[index];
        return {
          time,
          altitude: altitudeValue,
          altitudeLane:
            altitudeValue === null
              ? null
              : 2.16 +
                normalize(altitudeValue, altitudeMin, altitudeMax)! * 0.68,
          speed: speedValue,
          speedLane:
            speedValue === null
              ? null
              : 1.16 + normalize(speedValue, speedMin, speedMax)! * 0.68,
          nearestDepth: depthValue,
          nearestDepthLane:
            depthValue === null
              ? null
              : 0.16 + normalize(depthValue, depthMin, depthMax)! * 0.68,
        };
      }),
      intervals: obstacleIntervals(),
    };
  }, []);
  const config: ChartConfig = {
    altitudeLane: { label: "Altitude (m)", color: "var(--chart-1)" },
    speedLane: { label: "Speed (m/s)", color: "var(--chart-2)" },
    nearestDepthLane: {
      label: "Nearest depth point (m)",
      color: "var(--chart-3)",
    },
  };

  return (
    <section
      className="flex min-w-0 flex-col gap-4"
      aria-labelledby="ms-shared-replay-telemetry-title"
    >
      <h3
        id="ms-shared-replay-telemetry-title"
        className="m-0 text-lg font-medium text-foreground"
      >
        Shared replay telemetry
      </h3>
      <ChartContainer
        className="h-44 min-w-0 w-full border border-border pr-3"
        config={config}
        aria-label="Altitude, speed, and nearest depth over shared replay time; click chart to seek"
      >
        <LineChart
          data={data}
          accessibilityLayer
          onClick={(state) => {
            const activeTime = Number(state?.activeLabel);
            if (Number.isFinite(activeTime)) onSeek(activeTime);
          }}
          margin={{ left: 4, right: 12, top: 4, bottom: 0 }}
        >
          {intervals.map(({ start, end }) => (
            <ReferenceArea
              key={`${start}-${end}`}
              x1={start}
              x2={end}
              y1={0}
              y2={3}
              fill="var(--destructive)"
              fillOpacity={0.12}
              ifOverflow="hidden"
            />
          ))}
          <CartesianGrid
            horizontal={false}
            vertical
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <ReferenceLine y={1} stroke="var(--border)" />
          <ReferenceLine y={2} stroke="var(--border)" />
          <XAxis
            dataKey="time"
            type="number"
            domain={[0, replayTimeline.durationSeconds]}
            tickFormatter={timeFormatter}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            width={154}
            domain={[0, 3]}
            ticks={[0.5, 1.5, 2.5]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(value) =>
              ({
                0.5: "Nearest depth (m)",
                1.5: "Speed (m/s)",
                2.5: "Altitude (m)",
              })[value as 0.5 | 1.5 | 2.5] ?? ""
            }
          />
          <ChartTooltip content={<TelemetryTooltip />} />
          <ReferenceLine
            x={currentTime}
            stroke="var(--foreground)"
            strokeDasharray="4 4"
          />
          <Line
            type="monotone"
            dataKey="altitudeLane"
            name="Altitude"
            stroke="var(--color-altitudeLane)"
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="speedLane"
            name="Speed"
            stroke="var(--color-speedLane)"
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="nearestDepthLane"
            name="Nearest depth"
            stroke="var(--color-nearestDepthLane)"
            strokeWidth={1.75}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
      <ul className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-(--chart-1)" /> Altitude (m)
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-(--chart-2)" /> Speed (m/s)
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-(--chart-3)" /> Nearest depth
          point in flight band (m)
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-(--destructive)/30" /> EXPLORE
          obstacle on path
        </li>
      </ul>
    </section>
  );
}

function DistributionChart({
  title,
  rows,
  colors,
}: {
  title: string;
  rows: ReadonlyArray<readonly [string, number]>;
  colors: string[];
}) {
  const data = rows.map(([name, count]) => ({ name, count }));
  const config: ChartConfig = {
    count: { label: "Count", color: "var(--chart-1)" },
  };
  const total = rows.reduce((sum, [, count]) => sum + count, 0);

  return (
    <section
      className="flex min-w-0 flex-col gap-4"
      aria-labelledby={`ms-${title.toLowerCase().replaceAll(" ", "-")}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id={`ms-${title.toLowerCase().replaceAll(" ", "-")}`}
          className="h4 m-0"
        >
          {title}
        </h2>
        <span className="tabular-nums">
          {total} {title === "Actions by status" ? "actions" : "files"}
        </span>
      </header>
      <ChartContainer
        className="h-64 min-w-0 w-full"
        config={config}
        aria-label={`${title} distribution, ${total} total`}
      >
        <BarChart
          data={data}
          accessibilityLayer
          layout="vertical"
          margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
        >
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="3 3"
            horizontal={false}
          />
          <XAxis
            type="number"
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={116}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            content={<ChartTooltipContent className="rounded-(--radius)" />}
          />
          <Bar
            dataKey="count"
            name="Count"
            radius={0}
            isAnimationActive={false}
          >
            {data.map((row, index) => (
              <Cell key={row.name} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      <ul className="m-0 grid list-none grid-cols-1 gap-x-4 gap-y-2 p-0 sm:grid-cols-2">
        {rows.map(([name, count]) => (
          <li key={name} className="flex items-baseline justify-between gap-3">
            <span>{name}</span>
            <span className="tabular-nums">{count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MissionInsightsDistributions({
  sample,
}: {
  sample: MissionInsightSample;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
      <DistributionChart
        title="Actions by status"
        rows={sample.actions}
        colors={[
          "var(--success)",
          "var(--warning)",
          "var(--destructive)",
          "var(--muted-foreground)",
        ]}
      />
      <DistributionChart
        title="Files by type"
        rows={sample.files}
        colors={[
          "var(--chart-1)",
          "var(--chart-2)",
          "var(--chart-3)",
          "var(--chart-4)",
          "var(--chart-5)",
          "var(--chart-6)",
        ]}
      />
    </div>
  );
}
