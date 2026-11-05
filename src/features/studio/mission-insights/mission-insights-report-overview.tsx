import { type MissionInsightSample } from "./mission-insights-data";
import { type InsightOutput } from "./mission-insights-output-data";
import { MissionInsightsOutputs, MissionInsightsTopIssues, DetailSection } from "./mission-insights-page-sections";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "skytrack-ui/chart";
import { BarChart, CartesianGrid, XAxis, YAxis, Bar, Cell } from "recharts";

export function OverviewTab({
  sample,
  onOpenOutput,
  onOpenSurveyImages,
  onOpenFlightPath,
  onSeek,
}: {
  sample: MissionInsightSample;
  onOpenOutput: (output: InsightOutput) => void;
  onOpenSurveyImages: () => void;
  onOpenFlightPath: () => void;
  onSeek: (time: number, label?: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <MissionInsightsOutputs
        sample={sample}
        onOpen={onOpenOutput}
        onOpenSurveyImages={onOpenSurveyImages}
      />
      <MissionInsightsTopIssues
        sample={sample}
        onSeek={(time, label) => {
          onSeek(time, label);
          onOpenFlightPath();
        }}
      />
      <DetailSection title="Run distributions">
        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
          <CategoryChart
            title="Actions by status"
            rows={sample.actions}
            unit="Actions"
          />
          <CategoryChart
            title="Files by type"
            rows={sample.files}
            unit="Files"
          />
        </div>
      </DetailSection>
    </div>
  );
}

export function CategoryChart({
  title,
  rows,
  unit,
}: {
  title: string;
  rows: ReadonlyArray<readonly [string, number]>;
  unit: string;
}) {
  const data = rows.map(([name, count]) => ({ name, count }));
  const config: ChartConfig = {
    count: { label: unit, color: "var(--chart-1)" },
  };
  const palette = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
  ];

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label={title}>
      <h3 className="m-0 text-lg font-medium text-foreground">{title}</h3>
      {data.length ? (
        <ChartContainer
          className="h-60 min-w-0 w-full"
          config={config}
          aria-label={`${title}; exact values are listed below`}
        >
          <BarChart
            data={data}
            accessibilityLayer
            layout="vertical"
            margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
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
              width={110}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              content={<ChartTooltipContent className="rounded-(--radius)" />}
            />
            <Bar
              dataKey="count"
              name={unit}
              radius={0}
              isAnimationActive={false}
            >
              {data.map((row, index) => (
                <Cell key={row.name} fill={palette[index % palette.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      ) : (
        <p className="m-0 text-(--muted-foreground)">
          No {unit.toLowerCase()} values are recorded for this sample.
        </p>
      )}
      {data.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.map(([name, count]) => (
            <li key={name} className="flex items-center justify-between gap-3">
              <span>{name}</span>
              <span className="tabular-nums">
                {count} {unit.toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
