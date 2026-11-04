import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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

type TrendPoint = { time: number; value: number };

const timeFormatter = (value: number) => `${Number(value).toFixed(0)} s`;

function TrendChart({
  title,
  unit,
  data,
  currentTime,
  color,
  onSeek,
}: {
  title: string;
  unit: string;
  data: TrendPoint[];
  currentTime: number;
  color: string;
  onSeek: (time: number) => void;
}) {
  const config: ChartConfig = { value: { label: title, color } };

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label={title}>
      <h4 className="m-0 text-base font-medium text-(--foreground)">{title}</h4>
      <ChartContainer
        className="h-52 min-w-0 w-full"
        config={config}
        aria-label={`${title} over replay time in ${unit}; click the chart to seek`}
      >
        <LineChart
          data={data}
          accessibilityLayer
          onClick={(state) => {
            const activeTime = Number(state?.activeLabel);
            if (Number.isFinite(activeTime)) onSeek(activeTime);
          }}
          margin={{ left: 4, right: 12, top: 8, bottom: 4 }}
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            type="number"
            domain={[0, replayTimeline.durationSeconds]}
            tickFormatter={timeFormatter}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            width={48}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${Number(value).toFixed(1)} ${unit}`}
          />
          <ChartTooltip
            content={<ChartTooltipContent className="rounded-(--radius)" />}
            labelFormatter={(value) => `Time ${timeFormatter(Number(value))}`}
          />
          <ReferenceLine
            x={currentTime}
            stroke="var(--foreground)"
            strokeDasharray="4 4"
          />
          <Line
            type="monotone"
            dataKey="value"
            name={title}
            stroke="var(--color-value)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
      <p className="m-0 text-(--muted-foreground)">
        Unit: {unit}. Select a point to seek the replay.
      </p>
    </section>
  );
}

export function MissionInsightsTelemetryCharts({
  currentTime,
  onSeek,
}: {
  currentTime: number;
  onSeek: (time: number) => void;
}) {
  const altitude = useMemo(
    () =>
      replayTimeline.samples.map((sample) => ({
        time: sample.t,
        value: Number((-sample.d).toFixed(2)),
      })),
    [],
  );
  const speed = useMemo(
    () =>
      replayTimeline.samples.map((sample) => ({
        time: sample.t,
        value: Number(sample.spd.toFixed(2)),
      })),
    [],
  );
  const nearestDepth = useMemo(
    () =>
      replayTimeline.depth.flatMap((frame) =>
        frame.near === null
          ? []
          : [{ time: frame.t, value: Number(frame.near.toFixed(2)) }],
      ),
    [],
  );

  return (
    <section
      className="flex min-w-0 flex-col gap-4"
      aria-labelledby="ms-replay-telemetry-title"
    >
      <h3
        id="ms-replay-telemetry-title"
        className="m-0 text-lg font-medium text-(--foreground)"
      >
        Telemetry
      </h3>
      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-3">
        <TrendChart
          title="Altitude"
          unit="m"
          data={altitude}
          currentTime={currentTime}
          color="var(--chart-1)"
          onSeek={onSeek}
        />
        <TrendChart
          title="Speed"
          unit="m/s"
          data={speed}
          currentTime={currentTime}
          color="var(--chart-2)"
          onSeek={onSeek}
        />
        <TrendChart
          title="Nearest depth point in flight band"
          unit="m"
          data={nearestDepth}
          currentTime={currentTime}
          color="var(--chart-3)"
          onSeek={onSeek}
        />
      </div>
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
