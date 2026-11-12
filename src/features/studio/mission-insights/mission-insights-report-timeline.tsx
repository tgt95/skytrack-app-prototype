import {
  type JsonRecord,
  textValue,
  numberValue,
  reportForSample,
  asRecord,
  asRecords,
} from "./mission-insights-report-data";
import {
  KeyValueList,
  statusLabel,
  statusVariant,
  recordDuration,
  formatValue,
} from "./mission-insights-report-shared.tsx";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectPortal,
  SelectPositioner,
  SelectPopup,
  SelectList,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
} from "skytrack-ui/select";
import { type MissionInsightSample } from "./mission-insights-data";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  actionRows,
  eventRows,
  sequenceGapRows,
  type SequenceGapSample,
  type TimelineEventRow,
} from "./mission-insights-report-timeline-data";
import { Tabs, TabsList, TabsTab, TabsPanel } from "skytrack-ui/tabs";
import { DetailSection } from "./mission-insights-page-sections";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import {
  CaretDownIcon,
  CaretUpIcon,
  CaretUpDownIcon,
} from "@phosphor-icons/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "skytrack-ui/chart";

export function EventFilter({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <div className="min-w-0">
      <Select
        value={value}
        onValueChange={(next) => {
          if (typeof next === "string") onValueChange(next);
        }}
        items={options}
      >
        <SelectTrigger size="sm" className="w-auto min-w-40 gap-1.5">
          <span className="shrink-0 text-muted-foreground">{label}:</span>
          <SelectValue className="max-w-40" placeholder={`Select ${label.toLowerCase()}`}>
            {options.find((option) => option.value === value)?.label ??
              `Select ${label.toLowerCase()}`}
          </SelectValue>
          <SelectIcon />
        </SelectTrigger>
        <SelectPortal>
          <SelectPositioner
            side="bottom"
            align="start"
            sideOffset={4}
            alignItemWithTrigger={false}
          >
            <SelectPopup>
              <SelectList>
                {options.map((option) => (
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
  );
}

type SortDirection = "asc" | "desc";
type TableSort = { key: string; direction: SortDirection } | null;

function SortableHeader({
  label,
  sort,
  onSort,
  className = "",
}: {
  label: string;
  sort: SortDirection | undefined;
  onSort: () => void;
  className?: string;
}) {
  const SortIcon = sort === "asc"
    ? CaretUpIcon
    : sort === "desc"
      ? CaretDownIcon
      : CaretUpDownIcon;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={sort ? `Sort by ${label}, ${sort === "asc" ? "ascending" : "descending"}` : `Sort by ${label}`}
      onClick={onSort}
      className={`h-auto w-full cursor-pointer justify-start gap-1.5 p-0 !px-0 font-medium hover:text-foreground focus-visible:underline ${className}`}
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        <SortIcon aria-hidden="true" className="size-3.5 shrink-0" />
      </span>
    </Button>
  );
}

function cycleSort(current: TableSort, key: string): TableSort {
  if (current?.key !== key) return { key, direction: "asc" };
  if (current.direction === "asc") return { key, direction: "desc" };
  return null;
}

function compareSortValues(left: string | number, right: string | number): number {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function sortedRows<T>(
  rows: T[],
  sort: TableSort,
  getValue: (row: T, key: string) => string | number,
): T[] {
  if (!sort) return rows;
  const direction = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => direction * compareSortValues(
    getValue(left, sort.key),
    getValue(right, sort.key),
  ));
}

function actionFactPairs(
  report: JsonRecord,
  value: unknown,
  kind: "input" | "output" | "error",
): Array<[string, string]> {
  const record = asRecord(value);
  const artifacts = asRecords(report.artifacts);
  const models = asRecords(report.ai_models);

  return Object.entries(record)
    .filter(([key]) => !(kind === "error" && key === "stack"))
    .map(([key, item]) => {
      const label = key
        .replace(/_mps$/, " (m/s)")
        .replace(/_ms$/, " (ms)")
        .replace(/_m$/, " (m)")
        .replace(/_s$/, " (s)")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
      let displayValue = formatValue(item);

      if (kind === "input" && key === "model_id" && typeof item === "string") {
        const model = models.find((candidate) => candidate.model_id === item);
        if (model) displayValue = `${textValue(model.name)} (${item})`;
      }

      if (kind === "output" && typeof item === "string") {
        const artifact = artifacts.find(
          (candidate) => candidate.artifact_id === item,
        );
        if (artifact) {
          const metadata = asRecord(artifact.metadata);
          const file = asRecord(metadata.file);
          const uriName = textValue(artifact.uri, "").split("/").pop();
          const fileName = textValue(file.name, uriName || item);
          displayValue = `${fileName} (${item})`;
        }
      }

      return [label, displayValue];
    });
}

function ActionFactCell({
  rows,
}: {
  rows: Array<[string, string]>;
}) {
  return rows.length ? (
    <div className="flex min-w-48 flex-col gap-1">
      {rows.map(([label, value]) => (
        <div key={label} className="break-words">
          <span className="text-muted-foreground">{label}: </span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}

function ActionTimeline({
  report,
  actions,
}: {
  report: JsonRecord;
  actions: ReturnType<typeof actionRows>;
}) {
  const run = asRecord(report.run);
  const durationMs = numberValue(run.duration_ms);
  const durationSeconds = durationMs === null ? null : durationMs / 1000;
  const chartConfig: ChartConfig = {
    start: { label: "Start offset", color: "transparent" },
    duration: { label: "Action duration", color: "var(--chart-1)" },
  };
  const chartRows = actions.map((row) => {
    const start = numberValue(row.action.t0_s);
    const end = numberValue(row.action.t1_s);
    const hasInterval = start !== null && end !== null && end > start;
    return {
      name: row.name,
      status: row.status,
      start: hasInterval ? start : 0,
      duration: hasInterval ? end - start : 0,
    };
  });
  const actionLabels = new Map(
    chartRows.map((row) => [row.name, `${row.status} · ${row.name}`]),
  );
  const statusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "var(--success)";
      case "partial":
        return "var(--warning)";
      case "failed":
        return "var(--destructive)";
      default:
        return "var(--chart-1)";
    }
  };

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-labelledby="ms-action-timeline-heading">
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h3 id="ms-action-timeline-heading" className="m-0 text-lg font-medium text-foreground">
          Action timeline
        </h3>
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-2 rounded-(--radius) bg-(--chart-1)" aria-hidden="true" />
          Action duration
        </span>
      </header>
      <p className="m-0 text-muted-foreground">
        Bars show each recorded action interval across the selected run duration.
        {durationSeconds === null ? " Run duration is not supplied." : ` Total run duration: ${durationSeconds.toFixed(1)} s.`}
      </p>
      {durationSeconds !== null && durationSeconds > 0 && chartRows.length > 0 ? (
        <div className="min-w-0 overflow-x-auto rounded-(--radius) border border-border bg-(--background) p-3">
          <ChartContainer
            className="h-[22rem] min-w-[48rem] w-full"
            config={chartConfig}
            aria-label={`Action timeline for ${chartRows.length} actions over ${durationSeconds.toFixed(1)} seconds; labels include action status`}
          >
            <BarChart
              accessibilityLayer
              data={chartRows}
              layout="vertical"
              margin={{ left: 8, right: 20, top: 8, bottom: 8 }}
              barCategoryGap="24%"
            >
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis
                type="number"
                domain={[0, durationSeconds]}
                tickFormatter={(value: number) => `${Number(value).toFixed(0)} s`}
                tickLine={false}
                axisLine={false}
                label={{ value: "Run time", position: "insideBottomRight", offset: -4 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={250}
                tickFormatter={(value: string) => actionLabels.get(value) ?? value}
                tick={{ fill: "var(--foreground)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    className="rounded-(--radius)"
                  />
                }
              />
              <Bar
                dataKey="start"
                stackId="run-time"
                fill="var(--color-start)"
                fillOpacity={0}
                stroke="none"
                radius={0}
                isAnimationActive={false}
              />
              <Bar
                dataKey="duration"
                stackId="run-time"
                fill="var(--color-duration)"
                radius={0}
                isAnimationActive={false}
              >
                {chartRows.map((row) => (
                  <Cell key={row.name} fill={statusColor(row.status)} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      ) : (
        <p className="m-0 text-muted-foreground">
          No action intervals can be plotted for this run.
        </p>
      )}
    </section>
  );
}

function ActionDetailsTable({
  report,
  actions,
}: {
  report: JsonRecord;
  actions: ReturnType<typeof actionRows>;
}) {
  const executionId = textValue(
    asRecords(report.executions)[0]?.execution_id,
  );
  const [sort, setSort] = useState<TableSort>(null);
  const displayedActions = sortedRows(actions, sort, (row, key) => {
    switch (key) {
      case "status": return row.status;
      case "action": return row.name;
      case "start": return numberValue(row.action.t0_s) ?? -1;
      case "summary": return row.summary;
      case "artifacts": return row.artifactCount;
      case "type-id": return `${row.type} ${row.id}`;
      case "inputs": return actionFactPairs(report, row.action.inputs, "input").flat().join(" ");
      case "outputs": return actionFactPairs(report, row.action.outputs, "output").flat().join(" ");
      case "error": return actionFactPairs(report, row.action.error, "error").flat().join(" ");
      case "timestamps": return `${textValue(row.action.started_at)} ${textValue(row.action.ended_at)}`;
      default: return "";
    }
  });
  const directionFor = (key: string) => sort?.key === key ? sort.direction : undefined;
  const ariaSortFor = (key: string) => sort?.key === key
    ? sort.direction === "asc" ? "ascending" as const : "descending" as const
    : undefined;

  return (
    <details open className="min-w-0 rounded-(--radius) border border-border bg-(--card)">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="font-medium">Action details</span>
        <span className="text-xs text-muted-foreground">
          Inputs, outputs, errors, IDs &amp; timestamps · {actions.length} actions
        </span>
      </summary>
      <div className="min-w-0 overflow-x-auto border-t border-border">
        <table className="w-full min-w-[112rem] border-collapse text-sm" aria-label="Action details">
          <thead className="sticky top-0 z-10 bg-muted text-muted-foreground">
            <tr className="border-b border-border">
              <th scope="col" aria-sort={ariaSortFor("status")} className="w-32 whitespace-nowrap px-3 py-2 text-sm font-medium"><SortableHeader label="Status" sort={directionFor("status")} onSort={() => setSort((current) => cycleSort(current, "status"))} /></th>
              <th scope="col" aria-sort={ariaSortFor("action")} className="w-48 whitespace-nowrap px-3 py-2 text-sm font-medium"><SortableHeader label="Action" sort={directionFor("action")} onSort={() => setSort((current) => cycleSort(current, "action"))} /></th>
              <th scope="col" aria-sort={ariaSortFor("start")} className="w-40 whitespace-nowrap px-3 py-2 text-sm font-medium"><SortableHeader label="Start · action duration" sort={directionFor("start")} onSort={() => setSort((current) => cycleSort(current, "start"))} /></th>
              <th scope="col" aria-sort={ariaSortFor("summary")} className="w-64 whitespace-nowrap px-3 py-2 text-sm font-medium"><SortableHeader label="Action summary" sort={directionFor("summary")} onSort={() => setSort((current) => cycleSort(current, "summary"))} /></th>
              <th scope="col" aria-sort={ariaSortFor("artifacts")} className="w-28 whitespace-nowrap px-3 py-2 text-right text-sm font-medium"><SortableHeader label="Artifacts" sort={directionFor("artifacts")} onSort={() => setSort((current) => cycleSort(current, "artifacts"))} className="justify-end" /></th>
              <th scope="col" aria-sort={ariaSortFor("type-id")} className="w-56 whitespace-nowrap px-3 py-2 text-sm font-medium"><SortableHeader label="Type · ID" sort={directionFor("type-id")} onSort={() => setSort((current) => cycleSort(current, "type-id"))} /></th>
              <th scope="col" aria-sort={ariaSortFor("inputs")} className="w-64 whitespace-nowrap px-3 py-2 text-sm font-medium"><SortableHeader label="Inputs" sort={directionFor("inputs")} onSort={() => setSort((current) => cycleSort(current, "inputs"))} /></th>
              <th scope="col" aria-sort={ariaSortFor("outputs")} className="w-64 whitespace-nowrap px-3 py-2 text-sm font-medium"><SortableHeader label="Outputs" sort={directionFor("outputs")} onSort={() => setSort((current) => cycleSort(current, "outputs"))} /></th>
              <th scope="col" aria-sort={ariaSortFor("error")} className="w-64 whitespace-nowrap px-3 py-2 text-sm font-medium"><SortableHeader label="Error" sort={directionFor("error")} onSort={() => setSort((current) => cycleSort(current, "error"))} /></th>
              <th scope="col" aria-sort={ariaSortFor("timestamps")} className="w-80 whitespace-nowrap px-3 py-2 text-sm font-medium"><SortableHeader label="Timestamps (UTC)" sort={directionFor("timestamps")} onSort={() => setSort((current) => cycleSort(current, "timestamps"))} /></th>
            </tr>
          </thead>
          <tbody className="[&_tr]:border-t [&_tr]:border-border">
            {displayedActions.map((row) => {
              const error = asRecord(row.action.error);
              const errorRows = error.code || error.message
                ? ([
                    ...(error.code ? [["Code", textValue(error.code)] as [string, string]] : []),
                    ...(error.message ? [["Message", textValue(error.message)] as [string, string]] : []),
                  ] as Array<[string, string]>)
                : [];
              return (
                <tr key={row.id} className="align-top">
                  <td className="px-3 py-3">
                    <Badge
                      className="rounded-(--radius)"
                      count={row.status}
                      status={statusVariant(row.status)}
                    />
                  </td>
                  <th scope="row" className="px-3 py-3 text-left font-medium">{row.name}</th>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                    +{numberValue(row.action.t0_s)?.toFixed(1) ?? "—"} s · {recordDuration(row.action)}
                  </td>
                  <td className="max-w-64 px-3 py-3 break-words">{row.summary}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {row.artifactCount}
                  </td>
                  <td className="px-3 py-3 break-words">
                    <code className="break-all">{textValue(row.action.type)}</code>
                    <div className="mt-1 break-words text-muted-foreground">
                      <code>{row.id}</code> · <code>{executionId}</code>
                    </div>
                  </td>
                  <td className="px-3 py-3"><ActionFactCell rows={actionFactPairs(report, row.action.inputs, "input")} /></td>
                  <td className="px-3 py-3"><ActionFactCell rows={actionFactPairs(report, row.action.outputs, "output")} /></td>
                  <td className="px-3 py-3"><ActionFactCell rows={errorRows} /></td>
                  <td className="px-3 py-3 tabular-nums">
                    {textValue(row.action.started_at)}<br />
                    <span aria-hidden="true">→ </span>{textValue(row.action.ended_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function EventStreamTable({
  events,
  gaps,
}: {
  events: TimelineEventRow[];
  gaps: SequenceGapSample[];
}) {
  const rows = [
    ...events.map((event) => ({ kind: "event" as const, order: event.sequence, event })),
    ...gaps.map((gap) => ({ kind: "gap" as const, order: gap.from, gap })),
  ].sort((a, b) => a.order - b.order);
  const [sort, setSort] = useState<TableSort>(null);
  const displayedRows = sortedRows(rows, sort, (row, key) => {
    if (row.kind === "gap") {
      switch (key) {
        case "sequence": return row.gap.from;
        case "time": return row.gap.time;
        case "type": return row.gap.type;
        case "component": return row.gap.component;
        default: return "";
      }
    }
    switch (key) {
      case "sequence": return row.event.sequence;
      case "time": return row.event.time;
      case "type": return row.event.type;
      case "component": return row.event.component;
      default: return "";
    }
  });
  const directionFor = (key: string) => sort?.key === key ? sort.direction : undefined;
  const ariaSortFor = (key: string) => sort?.key === key
    ? sort.direction === "asc" ? "ascending" as const : "descending" as const
    : undefined;

  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full min-w-[48rem] border-collapse rounded-(--radius) border border-border text-sm" aria-label="Event stream rows">
        <thead className="sticky top-0 z-10 bg-muted text-muted-foreground">
          <tr className="border-b border-border">
            <th scope="col" aria-sort={ariaSortFor("sequence")} className="w-28 whitespace-nowrap px-3 py-2 text-right text-sm font-medium"><SortableHeader label="Sequence" sort={directionFor("sequence")} onSort={() => setSort((current) => cycleSort(current, "sequence"))} className="justify-end" /></th>
            <th scope="col" aria-sort={ariaSortFor("time")} className="w-28 whitespace-nowrap px-3 py-2 text-right text-sm font-medium"><SortableHeader label="Time" sort={directionFor("time")} onSort={() => setSort((current) => cycleSort(current, "time"))} className="justify-end" /></th>
            <th scope="col" aria-sort={ariaSortFor("type")} className="whitespace-nowrap px-3 py-2 text-sm font-medium"><SortableHeader label="Type" sort={directionFor("type")} onSort={() => setSort((current) => cycleSort(current, "type"))} /></th>
            <th scope="col" aria-sort={ariaSortFor("component")} className="w-52 whitespace-nowrap px-3 py-2 text-sm font-medium"><SortableHeader label="Component" sort={directionFor("component")} onSort={() => setSort((current) => cycleSort(current, "component"))} /></th>
          </tr>
        </thead>
        <tbody className="[&_tr]:border-t [&_tr]:border-border">
          {displayedRows.length ? displayedRows.map((row) => row.kind === "event" ? (
            <tr key={row.event.id}>
              <td className="px-3 py-2 text-right tabular-nums">{row.event.sequence.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums">{row.event.timeLabel}</td>
              <td className="px-3 py-2">
                <span className="inline-flex items-center gap-2">
                  <Badge
                    count=""
                    status={row.event.status}
                    className="size-1.5 min-w-1.5 rounded-full p-0"
                    aria-hidden="true"
                  />
                  <code className="text-xs text-foreground">{row.event.type}</code>
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{row.event.component}</td>
            </tr>
          ) : (
            <tr key={row.gap.id} className="bg-warning/10">
              <td className="px-3 py-2 text-right text-warning">Sequence gap</td>
              <td className="px-3 py-2 text-right tabular-nums">{row.gap.time.toFixed(1)} s</td>
              <td className="px-3 py-2">
                <span className="inline-flex items-center gap-2">
                  <Badge
                    count=""
                    status="warning"
                    className="size-1.5 min-w-1.5 rounded-full p-0"
                    aria-hidden="true"
                  />
                  <span>{row.gap.missing} events missing (sequence {row.gap.from}–{row.gap.to}) · <code className="text-xs">EVENTS_DROPPED</code></span>
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{row.gap.component} · dropped at {row.gap.time.toFixed(1)} s</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                No events match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TimelineTab({
  sample,
  selectedIssueCode,
}: {
  sample: MissionInsightSample;
  selectedIssueCode: string | null;
}) {
  const report = reportForSample(sample);
  const actions = useMemo(() => actionRows(report), [report]);
  const events = useMemo(() => eventRows(sample.key), [sample.key]);
  const diagnostics = asRecords(asRecord(report.diagnostics).items);
  const stream = asRecords(report.event_streams)[0] ?? {};
  const gaps = asRecords(stream.sequence_gaps);
  const droppedCount = gaps.reduce(
    (sum, gap) => sum + (numberValue(gap.missing) ?? 0),
    0,
  );
  const gapRows = useMemo(
    () => sequenceGapRows(report, sample.key),
    [report, sample.key],
  );
  const eventTypes = [...new Set([
    ...events.map((event) => event.type),
    ...(gapRows.length ? ["Sequence gap"] : []),
  ])].sort();
  const eventComponents = [
    ...new Set([
      ...events.map((event) => event.component),
      ...gapRows.map((gap) => gap.component),
    ]),
  ].sort();
  const [timelineView, setTimelineView] = useState(
    selectedIssueCode ? "issues" : "actions",
  );
  const [activeIssueCode, setActiveIssueCode] = useState(selectedIssueCode);
  const selectedIssueRef = useRef<HTMLElement | null>(null);
  const [eventType, setEventType] = useState("all");
  const [eventComponent, setEventComponent] = useState("all");

  useEffect(() => {
    setEventType("all");
    setEventComponent("all");
  }, [sample.key]);

  useEffect(() => {
    if (!selectedIssueCode) return;
    setTimelineView("issues");
    setActiveIssueCode(selectedIssueCode);
    const frame = window.requestAnimationFrame(() => {
      selectedIssueRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedIssueCode]);

  const filteredEvents = events.filter(
    (row) =>
      (eventType === "all" || row.type === eventType) &&
      (eventComponent === "all" || row.component === eventComponent),
  );
  const filteredGaps = gapRows.filter(
    (row) =>
      (eventType === "all" || row.type === eventType) &&
      (eventComponent === "all" || row.component === eventComponent),
  );

  const activityBadge =
    timelineView === "actions" ? (
      <Badge
        className="rounded-(--radius)"
        count={`${actions.length} records`}
        status="secondary"
      />
    ) : timelineView === "issues" ? (
      <Badge
        className="rounded-(--radius)"
        count={`${diagnostics.length} ${diagnostics.length === 1 ? "issue" : "issues"}`}
        status={diagnostics.some((issue) => textValue(issue.severity).toLowerCase() === "error") ? "error" : "secondary"}
      />
  ) : null;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <DetailSection title="Run activity" toolbar={activityBadge}>
        <Tabs value={timelineView} onValueChange={setTimelineView}>
          <TabsList variant="line" className="w-full overflow-x-auto">
            <TabsTab className="flex-none" value="actions">Actions</TabsTab>
            <TabsTab className="flex-none" value="issues">Issues</TabsTab>
            <TabsTab className="flex-none" value="events">Events</TabsTab>
          </TabsList>
          <TabsPanel value="actions" className="flex min-w-0 flex-col gap-4 pt-6">
            <ActionTimeline report={report} actions={actions} />
            <ActionDetailsTable report={report} actions={actions} />
          </TabsPanel>
          <TabsPanel value="issues" className="flex min-w-0 flex-col gap-4 pt-6">
              {diagnostics.length ? (
                <div className="flex min-w-0 flex-col gap-3">
                  {diagnostics.map((issue, index) => {
                    const code = textValue(issue.code, `Issue ${index + 1}`);
                    const severity = textValue(issue.severity, "Unknown");
                    const selected = code === activeIssueCode;
                    const issueTime = numberValue(issue.time_s);
                    return (
                      <article
                        key={`${code}-${index}`}
                        ref={selected ? selectedIssueRef : undefined}
                        aria-current={selected ? "true" : undefined}
                        className={`flex min-w-0 flex-col gap-3 rounded-(--radius) border p-4 ${selected ? "border-primary bg-(--accent)" : "border-border bg-(--background)"}`}
                      >
                        <header className="flex min-w-0 flex-wrap items-center gap-3">
                          <Badge
                            className="rounded-(--radius)"
                            count={statusLabel(severity)}
                            status={statusVariant(severity)}
                          />
                          <code className="min-w-0 break-all">{code}</code>
                          <span className="ml-auto text-muted-foreground tabular-nums">
                            {issueTime === null
                              ? "Time unknown"
                              : `${issueTime.toFixed(1)} s`}
                          </span>
                        </header>
                        <p className="m-0 break-words">
                          {textValue(issue.message, "No issue message supplied.")}
                        </p>
                        {selected ? (
                          <KeyValueList
                            columns="grid-cols-1 sm:grid-cols-2"
                            rows={[
                              ["Component", textValue(issue.component, "Not supplied")],
                              ["Action ID", textValue(issue.action_id, "Not supplied")],
                            ]}
                          />
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="m-0 text-muted-foreground">
                  No issues are recorded in this report.
                </p>
              )}
          </TabsPanel>
          <TabsPanel value="events" className="flex min-w-0 flex-col gap-4 pt-6">
              <div className="flex min-w-0 flex-wrap justify-end gap-4">
                <EventFilter
                  label="Type"
                  value={eventType}
                  onValueChange={setEventType}
                  options={[
                    { value: "all", label: "All types" },
                    ...eventTypes.map((value) => ({
                      value,
                      label: value,
                    })),
                  ]}
                />
                <EventFilter
                  label="Component"
                  value={eventComponent}
                  onValueChange={setEventComponent}
                  options={[
                    { value: "all", label: "All components" },
                    ...eventComponents.map((value) => ({
                      value,
                      label: value,
                    })),
                  ]}
                />
              </div>
              <section className="flex min-w-0 flex-col gap-3 rounded-(--radius) border border-border bg-(--card) p-4 text-(--card-foreground)" aria-labelledby="event-stream-heading">
                <header className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                    <h3 id="event-stream-heading" className="m-0 text-lg font-medium text-foreground">Event stream</h3>
                    <span className="text-xs text-muted-foreground">
                      <code className="text-xs text-foreground">events/events.jsonl</code>
                      {" · sequence "}
                      {numberValue(stream.first_sequence)?.toLocaleString() ?? "Not supplied"}–{numberValue(stream.last_sequence)?.toLocaleString() ?? "Not supplied"}
                      {gapRows.length ? ` · ${gapRows.length} ${gapRows.length === 1 ? "gap" : "gaps"}: sequence ${gapRows.map((gap) => `${gap.from}–${gap.to}`).join(", ")}` : " · 0 gaps"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Showing {filteredEvents.length} of {numberValue(stream.event_count)?.toLocaleString() ?? "Not supplied"} events{droppedCount ? ` · ${droppedCount} missing` : ""}
                  </span>
                </header>
                <EventStreamTable events={filteredEvents} gaps={filteredGaps} />
              </section>
          </TabsPanel>
        </Tabs>
      </DetailSection>
    </div>
  );
}
