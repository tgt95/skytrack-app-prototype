import { type JsonRecord, textValue, numberValue, reportForSample, asRecords } from "./mission-insights-report-data";
import { type ReplayEvent } from "./replay-sample";
import { Drawer, DrawerPortal, DrawerBackdrop, DrawerViewport, DrawerPopup, DrawerContent, DrawerTitle, DrawerDescription } from "skytrack-ui/drawer";
import { Button } from "skytrack-ui/button";
import { XIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Separator } from "skytrack-ui/separator";
import { KeyValueList, statusLabel, recordDuration, textRecord } from "./mission-insights-report-shared.tsx";
import { Alert, AlertDescription } from "skytrack-ui/alert";
import { FieldRoot } from "skytrack-ui/field";
import { Select, SelectLabel, SelectTrigger, SelectValue, SelectIcon, SelectPortal, SelectPositioner, SelectPopup, SelectList, SelectItem, SelectItemIndicator, SelectItemText } from "skytrack-ui/select";
import { type MissionInsightSample } from "./mission-insights-data";
import { type MissionInsightsReportTab } from "@/features/studio/mission-report-url";
import { useMemo, useState } from "react";
import { actionRows, eventRows, actionColumns, eventColumns, sequenceGapColumns } from "./mission-insights-report-timeline-data";
import { Tabs, TabsList, TabsTab, TabsPanel } from "skytrack-ui/tabs";
import { DetailSection } from "./mission-insights-page-sections";
import { Badge } from "skytrack-ui/badge";
import { DataTable } from "skytrack-ui/data-table";

export function TimelineRecordDrawer({
  action,
  event,
  open,
  onOpenChange,
  onSeek,
}: {
  action: JsonRecord | null;
  event: ReplayEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSeek: (time: number, label?: string) => void;
}) {
  const actionTitle = action
    ? textValue(action.name, "Action details")
    : "Replay event details";
  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <DrawerPortal>
        <DrawerBackdrop />
        <DrawerViewport side="right">
          {action || event ? (
            <DrawerPopup
              side="right"
              className="w-[min(38rem,calc(100vw-1rem))] max-w-full"
              aria-label={`${actionTitle} details`}
            >
              <DrawerContent className="flex h-full min-h-0 flex-col gap-4 p-5 sm:p-6">
                <header className="flex min-w-0 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <DrawerTitle className="h4 m-0">{actionTitle}</DrawerTitle>
                    <DrawerDescription className="mt-2">
                      {action
                        ? textValue(action.action_id)
                        : `${event?.lvl} · ${event?.seg}`}
                    </DrawerDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Close timeline details"
                    onClick={() => onOpenChange(false)}
                  >
                    <XIcon aria-hidden="true" />
                  </Button>
                </header>
                <Separator />
                {action ? (
                  <KeyValueList
                    columns="sm:grid-cols-1"
                    rows={[
                      ["Type", textValue(action.type)],
                      ["Status", statusLabel(action.status)],
                      [
                        "Start · action duration",
                        `${
                          numberValue(action.t0_s)?.toFixed(1) ?? "—"
                        } s · ${recordDuration(action)}`,
                      ],
                      ["Inputs", textRecord(action.inputs)],
                      ["Outputs", textRecord(action.outputs)],
                      ["Error", textRecord(action.error)],
                    ]}
                  />
                ) : event ? (
                  <KeyValueList
                    columns="sm:grid-cols-1"
                    rows={[
                      ["Replay time", `${event.t.toFixed(1)} s`],
                      ["Level", event.lvl],
                      ["Component", event.seg],
                      ["Tag", event.tag],
                      ["Message", event.msg],
                    ]}
                  />
                ) : null}
                <Alert variant="info">
                  <AlertDescription>
                    This record is from an illustrative shared replay sample.
                    Selecting it does not change a live system.
                  </AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  className="self-start"
                  onClick={() => {
                    const time = numberValue(action?.t0_s) ?? event?.t;
                    if (time !== undefined) onSeek(time, actionTitle);
                    onOpenChange(false);
                  }}
                >
                  Seek shared replay
                </Button>
              </DrawerContent>
            </DrawerPopup>
          ) : null}
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}

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
    <FieldRoot className="flex min-w-0 flex-col gap-1">
      <Select
        value={value}
        onValueChange={(next) => {
          if (typeof next === "string") onValueChange(next);
        }}
        items={options}
      >
        <SelectLabel className="text-xs sub-heading">{label}</SelectLabel>
        <SelectTrigger size="sm" className="min-w-48">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`}>
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
    </FieldRoot>
  );
}

export function TimelineTab({
  sample,
  onNavigate,
  onSeek,
}: {
  sample: MissionInsightSample;
  onNavigate: (tab: MissionInsightsReportTab) => void;
  onSeek: (time: number, label?: string) => void;
}) {
  const report = reportForSample(sample);
  const actions = useMemo(() => actionRows(report), [report]);
  const events = useMemo(() => eventRows(), []);
  const stream = asRecords(report.event_streams)[0] ?? {};
  const gaps = asRecords(stream.sequence_gaps);
  const droppedCount = gaps.reduce(
    (sum, gap) => sum + (numberValue(gap.missing) ?? 0),
    0,
  );
  const gapRows = gaps.map((gap, index) => ({
    id: `gap-${index}`,
    from: textValue(gap.from),
    to: textValue(gap.to),
    missing: numberValue(gap.missing) ?? 0,
  }));
  const eventTypes = [...new Set(events.map((event) => event.level))].sort();
  const eventComponents = [
    ...new Set(events.map((event) => event.component)),
  ].sort();
  const [timelineView, setTimelineView] = useState("actions");
  const [eventType, setEventType] = useState("all");
  const [eventComponent, setEventComponent] = useState("all");
  const [selectedAction, setSelectedAction] = useState<JsonRecord | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ReplayEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredEvents = events.filter(
    (row) =>
      (eventType === "all" || row.level === eventType) &&
      (eventComponent === "all" || row.component === eventComponent),
  );
  const actionTableColumns = useMemo(
    () =>
      actionColumns((action) => {
        setSelectedAction(action);
        setSelectedEvent(null);
        setDrawerOpen(true);
      }),
    [],
  );
  const replayEventTableColumns = useMemo(
    () =>
      eventColumns((event) => {
        setSelectedEvent(event);
        setSelectedAction(null);
        setDrawerOpen(true);
      }),
    [],
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-4">
        <Tabs value={timelineView} onValueChange={setTimelineView}>
          <TabsList variant="line" className="max-w-full overflow-x-auto">
            <TabsTab value="actions">Actions</TabsTab>
            <TabsTab value="events">Events</TabsTab>
          </TabsList>
          <TabsPanel value="actions" className="pt-6">
            <DetailSection
              title="Actions"
              toolbar={
                <Badge
                  className="rounded-(--radius)"
                  count={`${actions.length} records`}
                  status="secondary"
                />
              }
            >
              <p className="m-0 text-(--muted-foreground)">
                Action durations and inputs/outputs come from the selected
                prototype fixture. Inspect a row for complete record fields.
              </p>
              <DataTable
                columns={actionTableColumns}
                data={actions}
                getRowId={(row) => row.id}
                pageSize={10}
                searchPlaceholder="Search actions"
                emptyMessage="No actions match this search."
                className="min-w-0"
              />
            </DetailSection>
          </TabsPanel>
          <TabsPanel value="events" className="pt-6">
            <DetailSection
              title="Events"
              toolbar={
                <Badge
                  className="rounded-(--radius)"
                  count={`${
                    numberValue(stream.event_count) ?? 0
                  } report events`}
                  status="secondary"
                />
              }
            >
              <Alert variant="info" role="note">
                <AlertDescription>
                  The rows below are shared prototype replay samples (
                  {events.length} records), separate from the selected sample's
                  report event stream.
                </AlertDescription>
              </Alert>
              {droppedCount ? (
                <Alert variant="warning" role="status">
                  <WarningCircleIcon
                    className="size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <AlertDescription>
                    Report event sequence gap: {droppedCount} events are marked
                    missing between sequences {textValue(gaps[0]?.from)} and{" "}
                    {textValue(gaps[0]?.to)}.
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="m-0 text-(--muted-foreground)">
                  No sequence gaps are listed in this report fixture.
                </p>
              )}
              {gapRows.length ? (
                <section
                  className="flex min-w-0 flex-col gap-3"
                  aria-label="Report sequence gaps"
                >
                  <h3 className="m-0 text-lg font-medium text-foreground">
                    Report sequence gaps
                  </h3>
                  <DataTable
                    columns={sequenceGapColumns()}
                    data={gapRows}
                    getRowId={(row) => row.id}
                    pageSize={5}
                    emptyMessage="No sequence gaps are recorded."
                    className="min-w-0"
                  />
                </section>
              ) : null}
              <div className="flex min-w-0 flex-wrap items-end gap-4">
                <EventFilter
                  label="Event type"
                  value={eventType}
                  onValueChange={setEventType}
                  options={[
                    { value: "all", label: "All event types" },
                    ...eventTypes.map((value) => ({
                      value,
                      label: statusLabel(value),
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
                <span className="text-(--muted-foreground)">
                  Showing {filteredEvents.length} of {events.length} replay
                  event rows.
                </span>
              </div>
              <DataTable
                columns={replayEventTableColumns}
                data={filteredEvents}
                getRowId={(row) => row.id}
                pageSize={10}
                searchPlaceholder="Search replay events"
                emptyMessage="No replay events match these filters."
                className="min-w-0"
              />
            </DetailSection>
          </TabsPanel>
        </Tabs>
      </div>
      <TimelineRecordDrawer
        action={selectedAction}
        event={selectedEvent}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSeek={(time, label) => {
          onSeek(time, label);
          onNavigate("flight-path");
        }}
      />
    </div>
  );
}
