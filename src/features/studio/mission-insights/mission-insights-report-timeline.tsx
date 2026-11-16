import {
  type JsonRecord,
  textValue,
  numberValue,
  reportForSample,
  asRecord,
  asRecords,
} from "./mission-insights-report-data";
import { statusVariant } from "./mission-insights-report-shared.tsx";
import {
  Menu,
  MenuPortal,
  MenuPositioner,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRadioItemIndicator,
  MenuTrigger,
} from "skytrack-ui/menu";
import { type MissionInsightSample } from "./mission-insights-data";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  actionRows,
  eventRows,
  sequenceGapRows,
  type SequenceGapSample,
  type TimelineEventRow,
  type ActionRow,
} from "./mission-insights-report-timeline-data";
import { Tabs, TabsList, TabsTab, TabsPanel } from "skytrack-ui/tabs";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import { Search } from "skytrack-ui/search";
import { DataTable, type DataTableColumnDef } from "skytrack-ui/data-table";
import {
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipProvider,
  TooltipTrigger,
} from "skytrack-ui/tooltip";
import {
  CaretDownIcon,
  CaretUpIcon,
  CaretUpDownIcon,
  CheckIcon,
  XIcon,
} from "@phosphor-icons/react";
import { TimelineActionDetail } from "./mission-insights-report-timeline-action-detail";
import { type MissionInsightsReportTab } from "@/features/studio/mission-report-url";

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
  const active = value !== "all";
  return (
    <div className="flex items-center">
      <Menu>
        <MenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={active ? "gap-2 rounded-r-none" : "gap-2"}
            />
          }
        >
          {label}
          {active ? <Badge count="1" status="processing" size="sm" /> : null}
          <CaretDownIcon aria-hidden="true" className="size-4" />
        </MenuTrigger>
        <MenuPortal>
          <MenuPositioner side="bottom" align="end" sideOffset={4}>
            <MenuPopup aria-label={`${label} filter`}>
              <MenuRadioGroup
                value={value}
                onValueChange={(next) => onValueChange(next)}
              >
                {options.map((option) => (
                  <MenuRadioItem
                    key={option.value}
                    value={option.value}
                    inset
                    className="!pl-8"
                  >
                    <MenuRadioItemIndicator>
                      <CheckIcon
                        aria-hidden="true"
                        weight="bold"
                        className="size-3.5"
                      />
                    </MenuRadioItemIndicator>
                    {option.label}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuPopup>
          </MenuPositioner>
        </MenuPortal>
      </Menu>
      {active ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Clear ${label} filter`}
          className="-ml-px rounded-l-none px-2"
          onClick={() => onValueChange("all")}
        >
          <XIcon aria-hidden="true" />
        </Button>
      ) : null}
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
  const SortIcon =
    sort === "asc"
      ? CaretUpIcon
      : sort === "desc"
        ? CaretDownIcon
        : CaretUpDownIcon;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={
        sort
          ? `Sort by ${label}, ${sort === "asc" ? "ascending" : "descending"}`
          : `Sort by ${label}`
      }
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

function compareSortValues(
  left: string | number,
  right: string | number,
): number {
  if (typeof left === "number" && typeof right === "number")
    return left - right;
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
  return [...rows].sort(
    (left, right) =>
      direction *
      compareSortValues(getValue(left, sort.key), getValue(right, sort.key)),
  );
}

function ActionsTable({
  report,
  actions,
  sample,
  onOpenMedia,
  onOpenMediaFiles,
  onNavigate,
}: {
  report: JsonRecord;
  actions: ActionRow[];
  sample: MissionInsightSample;
  onOpenMedia: (id: string) => void;
  onOpenMediaFiles: () => void;
  onNavigate: (tab: MissionInsightsReportTab) => void;
}) {
  const executionId = textValue(asRecords(report.executions)[0]?.execution_id);
  const run = asRecord(report.run);
  const durationMs = numberValue(run.duration_ms);
  const durationSeconds = durationMs === null ? null : durationMs / 1000;
  let tickStep = 0;
  if (durationSeconds !== null && durationSeconds > 0) {
    const rawStep = durationSeconds / 5;
    const magnitude = 10 ** Math.floor(Math.log10(rawStep));
    const normalizedStep = rawStep / magnitude;
    const multiplier =
      normalizedStep <= 1.5
        ? 1
        : normalizedStep <= 3.5
          ? 2
          : normalizedStep <= 7.5
            ? 5
            : 10;
    tickStep = magnitude * multiplier;
    while (Math.floor(durationSeconds / tickStep) > 5) {
      const stepMagnitude = 10 ** Math.floor(Math.log10(tickStep));
      const normalizedTickStep = tickStep / stepMagnitude;
      const nextMultiplier =
        normalizedTickStep < 1.5 ? 2 : normalizedTickStep < 3.5 ? 5 : 10;
      tickStep = stepMagnitude * nextMultiplier;
    }
  }
  const axisMarks =
    durationSeconds === null || durationSeconds <= 0
      ? [{ fraction: 0, label: "—" }]
      : (() => {
          const tickSeconds = Array.from(
            { length: Math.floor(durationSeconds / tickStep) + 1 },
            (_, index) => Number((index * tickStep).toPrecision(6)),
          );
          if (tickSeconds[tickSeconds.length - 1] < durationSeconds) {
            tickSeconds.push(durationSeconds);
          }
          return tickSeconds.map((seconds) => ({
            fraction: seconds / durationSeconds,
            label: `${
              Number.isInteger(seconds) ? seconds : seconds.toFixed(1)
            }s`,
          }));
        })();

  const columns: DataTableColumnDef<ActionRow>[] = [
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className="rounded-(--radius) whitespace-nowrap"
          count={row.original.status}
          status={statusVariant(row.original.status)}
        />
      ),
    },
    {
      id: "action",
      accessorKey: "name",
      header: "Action",
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-medium text-foreground">
            {row.original.name}
          </span>
          <span className="break-words text-muted-foreground">
            {row.original.summary}
          </span>
        </div>
      ),
    },
    {
      id: "start-duration",
      accessorFn: (row) => numberValue(row.action.t0_s) ?? -1,
      header: "Start · action duration",
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">
          +{numberValue(row.original.action.t0_s)?.toFixed(1) ?? "—"} s ·{" "}
          {row.original.duration}
        </span>
      ),
    },
    {
      id: "run-timeline",
      accessorFn: (row) => numberValue(row.action.t0_s) ?? -1,
      enableSorting: false,
      header: () => (
        <div
          className="flex min-w-[28rem] flex-col gap-1"
          role="group"
          aria-label="Run timeline scale"
        >
          <span className="sr-only">Run timeline scale</span>
          {/* <div
            aria-hidden="true"
            className="relative h-3 border-t border-border"
          >
            {axisMarks.map((mark) => (
              <span
                key={mark.fraction}
                className="absolute top-0 h-2 border-l border-border"
                style={{ left: `${mark.fraction * 100}%` }}
              />
            ))}
          </div> */}
          <div className="relative h-4 text-xs font-normal text-muted-foreground">
            {axisMarks.map((mark, index) => (
              <span
                key={mark.fraction}
                className={`absolute top-0 whitespace-nowrap ${
                  index === 0
                    ? "translate-x-0"
                    : index === axisMarks.length - 1 && mark.fraction === 1
                      ? "-translate-x-full"
                      : "-translate-x-1/2"
                }`}
                style={{ left: `${mark.fraction * 100}%` }}
              >
                {mark.label}
              </span>
            ))}
          </div>
        </div>
      ),
      cell: ({ row }) => {
        const start = numberValue(row.original.action.t0_s);
        const end = numberValue(row.original.action.t1_s);
        const hasInterval =
          start !== null && end !== null && end > start && durationSeconds;
        const left = hasInterval ? (start / durationSeconds) * 100 : 0;
        const width = hasInterval ? ((end - start) / durationSeconds) * 100 : 0;
        const tone =
          row.original.status.toLowerCase() === "failed"
            ? "bg-destructive"
            : row.original.status.toLowerCase() === "partial"
              ? "bg-warning"
              : "bg-success";
        const timelineDescription = `${row.original.name}: ${row.original.status}, starts at ${row.original.start}, lasts ${row.original.duration}`;

        return (
          <Tooltip>
            <TooltipTrigger
              render={
                <div
                  role="img"
                  aria-label={timelineDescription}
                  tabIndex={0}
                  className="relative h-3 min-w-[28rem] overflow-hidden rounded-(--radius) bg-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              }
            >
              {hasInterval ? (
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-0 rounded-(--radius) ${tone}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              ) : null}
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipPositioner side="top" sideOffset={8}>
                <TooltipPopup className="flex-col items-start gap-1">
                  <TooltipArrow />
                  <span className="font-medium">{row.original.name}</span>
                  <span>
                    {row.original.status} · Start {row.original.start} ·
                    Duration {row.original.duration}
                  </span>
                </TooltipPopup>
              </TooltipPositioner>
            </TooltipPortal>
          </Tooltip>
        );
      },
    },
    {
      id: "artifacts",
      accessorKey: "artifactCount",
      header: "Artifacts",
      meta: { align: "right" },
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">
          {row.original.artifactCount}{" "}
          {row.original.artifactCount <= 1 ? "artifact" : "artifacts"}
        </span>
      ),
    },
  ];

  return (
    <TooltipProvider>
      <DataTable
        columns={columns}
        data={actions}
        getRowId={(row) => row.id}
        getRowCanExpand={() => true}
        pageSize={Math.max(actions.length, 1)}
        size="lg"
        renderSearch={() => null}
        renderColumnVisibility={() => null}
        renderPagination={() => null}
        tableContainerClassName="overflow-x-auto [&>table]:!w-full [&>table]:table-fixed [&>table>thead>tr>th]:!whitespace-normal [&>table>tbody>tr>td]:!whitespace-normal [&>table>thead>tr>th:nth-child(1)]:!w-12 [&>table>tbody>tr>td:first-child:not([colspan])]:!w-12 [&>table>thead>tr>th:nth-child(2)]:w-[8%] [&>table>thead>tr>th:nth-child(3)]:w-[37%] [&>table>thead>tr>th:nth-child(4)]:w-[13%] [&>table>thead>tr>th:nth-child(5)]:w-[34%] [&>table>thead>tr>th:nth-child(6)]:w-[8%]"
        className="min-w-0"
        emptyMessage="No actions are recorded for this run."
        renderExpandedRow={({ row }) => (
          <TimelineActionDetail
            report={report}
            action={row.original.action}
            sample={sample}
            executionId={executionId}
            onOpenMedia={onOpenMedia}
            onOpenMediaFiles={onOpenMediaFiles}
            onNavigate={onNavigate}
          />
        )}
      />
    </TooltipProvider>
  );
}

function eventIdForIssue(
  issueCode: string | null,
  events: TimelineEventRow[],
  gaps: SequenceGapSample[],
  diagnostics: JsonRecord[],
) {
  if (!issueCode) return null;

  const directEvent = events.find((event) =>
    event.type.split(/\s+/).includes(issueCode),
  );
  if (directEvent) return directEvent.id;

  const diagnostic = diagnostics.find(
    (item) => textValue(item.code, "") === issueCode,
  );
  if (!diagnostic) return null;

  const issueTime = numberValue(diagnostic.time_s);
  const issueComponent = textValue(diagnostic.component, "");
  const relatedEvent = events.find(
    (event) => event.time === issueTime && event.component === issueComponent,
  );
  if (relatedEvent) return relatedEvent.id;

  return (
    gaps.find(
      (gap) => gap.time === issueTime && gap.component === issueComponent,
    )?.id ?? null
  );
}

function EventStreamTable({
  events,
  gaps,
  selectedRowId,
  selectionRequest,
}: {
  events: TimelineEventRow[];
  gaps: SequenceGapSample[];
  selectedRowId: string | null;
  selectionRequest: number;
}) {
  const rows = [
    ...events.map((event) => ({
      kind: "event" as const,
      order: event.sequence,
      event,
    })),
    ...gaps.map((gap) => ({ kind: "gap" as const, order: gap.from, gap })),
  ].sort((a, b) => a.order - b.order);
  const [sort, setSort] = useState<TableSort>(null);
  const displayedRows = sortedRows(rows, sort, (row, key) => {
    if (row.kind === "gap") {
      switch (key) {
        case "sequence":
          return row.gap.from;
        case "time":
          return row.gap.time;
        case "type":
          return row.gap.type;
        case "component":
          return row.gap.component;
        default:
          return "";
      }
    }
    switch (key) {
      case "sequence":
        return row.event.sequence;
      case "time":
        return row.event.time;
      case "type":
        return row.event.type;
      case "component":
        return row.event.component;
      default:
        return "";
    }
  });
  const selectedRowRef = useRef<HTMLTableRowElement | null>(null);
  const selectedRowVisible = displayedRows.some(
    (row) =>
      (row.kind === "event" ? row.event.id : row.gap.id) === selectedRowId,
  );

  useEffect(() => {
    if (!selectedRowId || !selectedRowVisible) return;
    const frame = window.requestAnimationFrame(() => {
      selectedRowRef.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedRowId, selectedRowVisible, selectionRequest]);

  const directionFor = (key: string) =>
    sort?.key === key ? sort.direction : undefined;
  const ariaSortFor = (key: string) =>
    sort?.key === key
      ? sort.direction === "asc"
        ? ("ascending" as const)
        : ("descending" as const)
      : undefined;

  return (
    <div className="min-w-0 overflow-x-auto">
      <table
        className="w-full min-w-[48rem] table-fixed border-collapse rounded-(--radius) border border-border text-sm"
        aria-label="Event stream rows"
      >
        <thead className="sticky top-0 z-10 bg-muted text-muted-foreground">
          <tr className="border-b border-border">
            <th
              scope="col"
              aria-sort={ariaSortFor("sequence")}
              className="w-[16%] whitespace-nowrap px-3 py-2 text-right text-sm font-medium"
            >
              <SortableHeader
                label="Sequence"
                sort={directionFor("sequence")}
                onSort={() =>
                  setSort((current) => cycleSort(current, "sequence"))
                }
                className="justify-end"
              />
            </th>
            <th
              scope="col"
              aria-sort={ariaSortFor("time")}
              className="w-[14%] whitespace-nowrap px-3 py-2 text-right text-sm font-medium"
            >
              <SortableHeader
                label="Time"
                sort={directionFor("time")}
                onSort={() => setSort((current) => cycleSort(current, "time"))}
                className="justify-end"
              />
            </th>
            <th
              scope="col"
              aria-sort={ariaSortFor("type")}
              className="w-[48%] whitespace-nowrap px-3 py-2 text-sm font-medium"
            >
              <SortableHeader
                label="Type"
                sort={directionFor("type")}
                onSort={() => setSort((current) => cycleSort(current, "type"))}
              />
            </th>
            <th
              scope="col"
              aria-sort={ariaSortFor("component")}
              className="w-[22%] whitespace-nowrap px-3 py-2 text-sm font-medium"
            >
              <SortableHeader
                label="Component"
                sort={directionFor("component")}
                onSort={() =>
                  setSort((current) => cycleSort(current, "component"))
                }
              />
            </th>
          </tr>
        </thead>
        <tbody className="[&_tr]:border-t [&_tr]:border-border">
          {displayedRows.length ? (
            displayedRows.map((row) => {
              const rowId = row.kind === "event" ? row.event.id : row.gap.id;
              const selected = rowId === selectedRowId;
              const rowClassName = selected
                ? "bg-(--accent) ring-2 ring-inset ring-primary"
                : row.kind === "gap"
                  ? "bg-warning/10"
                  : undefined;

              return row.kind === "event" ? (
                <tr
                  key={row.event.id}
                  ref={selected ? selectedRowRef : undefined}
                  aria-current={selected ? "true" : undefined}
                  className={rowClassName}
                >
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.event.sequence.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.event.timeLabel}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2">
                      <Badge
                        count=""
                        status={row.event.status}
                        className={`size-2 min-w-2 rounded-full p-0 ${
                          row.event.status === "secondary"
                            ? "bg-muted-foreground"
                            : ""
                        }`}
                        aria-hidden="true"
                      />
                      <code
                        className={`text-sm ${
                          row.event.status === "warning"
                            ? "text-warning"
                            : row.event.status === "error"
                              ? "text-destructive"
                              : "text-foreground"
                        }`}
                      >
                        {row.event.type}
                      </code>
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {row.event.component}
                  </td>
                </tr>
              ) : (
                <tr
                  key={row.gap.id}
                  ref={selected ? selectedRowRef : undefined}
                  aria-current={selected ? "true" : undefined}
                  className={rowClassName}
                >
                  <td className="px-3 py-2 text-right text-warning">
                    Sequence gap
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.gap.time.toFixed(1)} s
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2">
                      <Badge
                        count=""
                        status="warning"
                        className="size-2 min-w-2 rounded-full p-0"
                        aria-hidden="true"
                      />
                      <span>
                        {row.gap.missing} events missing (sequence{" "}
                        {row.gap.from}–{row.gap.to}) ·{" "}
                        <code className="text-sm">EVENTS_DROPPED</code>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.gap.component} · dropped at {row.gap.time.toFixed(1)} s
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={4}
                className="px-3 py-8 text-center text-muted-foreground"
              >
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
  selectedIssueRequest,
  onNavigate,
  onOpenMedia,
  onOpenMediaFiles,
}: {
  sample: MissionInsightSample;
  selectedIssueCode: string | null;
  selectedIssueRequest: number;
  onNavigate: (tab: MissionInsightsReportTab) => void;
  onOpenMedia: (id: string) => void;
  onOpenMediaFiles: () => void;
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
  const eventTypes = [
    ...new Set([
      ...events.map((event) => event.type),
      ...(gapRows.length ? ["Sequence gap"] : []),
    ]),
  ].sort();
  const eventComponents = [
    ...new Set([
      ...events.map((event) => event.component),
      ...gapRows.map((gap) => gap.component),
    ]),
  ].sort();
  const [timelineView, setTimelineView] = useState(
    selectedIssueCode ? "events" : "actions",
  );
  const [eventType, setEventType] = useState("all");
  const [eventComponent, setEventComponent] = useState("all");
  const [eventSearch, setEventSearch] = useState("");

  useEffect(() => {
    setEventType("all");
    setEventComponent("all");
    setEventSearch("");
  }, [sample.key]);

  useEffect(() => {
    if (!selectedIssueCode) return;
    setTimelineView("events");
    setEventType("all");
    setEventComponent("all");
    setEventSearch("");
  }, [selectedIssueCode, selectedIssueRequest]);

  const selectedEventId = eventIdForIssue(
    selectedIssueCode,
    events,
    gapRows,
    diagnostics,
  );

  const filteredEvents = events.filter(
    (row) =>
      (eventType === "all" || row.type === eventType) &&
      (eventComponent === "all" || row.component === eventComponent) &&
      [row.sequence, row.timeLabel, row.type, row.component]
        .join(" ")
        .toLowerCase()
        .includes(eventSearch.trim().toLowerCase()),
  );
  const filteredGaps = gapRows.filter(
    (row) =>
      (eventType === "all" || row.type === eventType) &&
      (eventComponent === "all" || row.component === eventComponent) &&
      [row.from, row.to, row.missing, row.time, row.type, row.component]
        .join(" ")
        .toLowerCase()
        .includes(eventSearch.trim().toLowerCase()),
  );
  const firstSequence = numberValue(stream.first_sequence);
  const lastSequence = numberValue(stream.last_sequence);
  const eventCount = numberValue(stream.event_count);
  const visibleEventCount = filteredEvents.length;
  const visibleEventCountText = `${visibleEventCount.toLocaleString()} ${visibleEventCount === 1 ? "event" : "events"}`;
  const eventCountText =
    eventCount === null || eventCount === visibleEventCount
      ? visibleEventCountText
      : visibleEventCount < eventCount
        ? `${visibleEventCount.toLocaleString()} of ${eventCount.toLocaleString()} events`
        : `${visibleEventCountText} · report total ${eventCount.toLocaleString()}`;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section
        className="flex min-w-0 flex-col gap-4"
        aria-labelledby="run-activity-heading"
      >
        {/* <header className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <h2 id="run-activity-heading" className="h4 m-0">
            Run activity
          </h2>
          {activityBadge ? (
            <div className="flex min-w-0 items-center gap-2">
              {activityBadge}
            </div>
          ) : null}
        </header> */}
        <Tabs value={timelineView} onValueChange={setTimelineView}>
          <TabsList variant="filled" className="overflow-x-auto">
            <TabsTab className="flex-none" value="actions">
              Actions
            </TabsTab>
            <TabsTab className="flex-none" value="events">
              Events
            </TabsTab>
          </TabsList>
          <TabsPanel
            value="actions"
            className="flex min-w-0 flex-col gap-4 pt-3"
          >
            <ActionsTable
              report={report}
              actions={actions}
              sample={sample}
              onOpenMedia={onOpenMedia}
              onOpenMediaFiles={onOpenMediaFiles}
              onNavigate={onNavigate}
            />
          </TabsPanel>
          <TabsPanel
            value="events"
            className="flex min-w-0 flex-col gap-4 pt-3"
          >
            <section
              className="flex min-w-0 flex-col gap-3"
              aria-labelledby="event-stream-heading"
            >
              <header className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
                <div id="event-stream-heading" className="h4">
                  Event stream
                </div>
                <span className="w-full text-sm text-muted-foreground">
                  <code className="text-sm text-foreground">
                    events/events.jsonl
                  </code>
                  {" · "}
                  {firstSequence !== null && lastSequence !== null
                    ? `Sequence ${firstSequence.toLocaleString()}–${lastSequence.toLocaleString()}`
                    : "Sequence unavailable"}
                  {gapRows.length
                    ? ` · ${gapRows.length} ${
                        gapRows.length === 1 ? "gap" : "gaps"
                      }: sequence ${gapRows
                        .map((gap) => `${gap.from}–${gap.to}`)
                        .join(", ")}`
                    : " · 0 gaps"}
                </span>
              </header>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Search
                  value={eventSearch}
                  onValueChange={setEventSearch}
                  placeholder="Search events"
                  aria-label="Search events"
                  size="sm"
                  className="min-w-0 sm:max-w-64"
                />
                <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
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
              </div>
              <div className="mt-2 flex min-w-0 items-baseline justify-between gap-3">
                <div className="text-xs sub-heading tabular-nums">
                  {eventCountText}
                  {droppedCount ? ` · ${droppedCount} missing` : ""}
                </div>
              </div>
              <EventStreamTable
                events={filteredEvents}
                gaps={filteredGaps}
                selectedRowId={selectedEventId}
                selectionRequest={selectedIssueRequest}
              />
            </section>
          </TabsPanel>
        </Tabs>
      </section>
    </div>
  );
}
