import { type JsonRecord, sampleActions, asRecord, textValue } from "./mission-insights-report-data";
import { formatValue, statusLabel, recordDuration, statusVariant } from "./mission-insights-report-shared.tsx";
import { type ReplayEvent, replayTimeline } from "./replay-sample";
import { type DataTableColumnDef } from "skytrack-ui/data-table";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";

export type ActionRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  duration: string;
  summary: string;
  artifactCount: number;
  action: JsonRecord;
};

export function actionRows(report: JsonRecord): ActionRow[] {
  return sampleActions(report).map((action) => {
    const inputs = asRecord(action.inputs);
    const outputs = asRecord(action.outputs);
    const inputSummary = Object.entries(inputs).map(
      ([key, value]) => `${key.replaceAll("_", " ")} ${formatValue(value)}`,
    );
    const outputSummary = Object.entries(outputs).map(
      ([key, value]) => `${key.replaceAll("_", " ")} ${formatValue(value)}`,
    );
    const error = asRecord(action.error);
    const artifactCount = Object.keys(outputs).length;
    return {
      id: textValue(action.action_id),
      name: textValue(action.name),
      type: textValue(action.type),
      status: statusLabel(action.status),
      duration: recordDuration(action),
      summary:
        [...inputSummary, ...outputSummary, textValue(error.code, "")]
          .filter(Boolean)
          .join(" · ") || "No input or output summary is recorded.",
      artifactCount,
      action,
    };
  });
}

export type TimelineEventRow = {
  id: string;
  time: number;
  timeLabel: string;
  level: string;
  component: string;
  summary: string;
  event: ReplayEvent;
};

export type SequenceGapRow = {
  id: string;
  from: string;
  to: string;
  missing: number;
};

export function sequenceGapColumns(): DataTableColumnDef<SequenceGapRow>[] {
  return [
    {
      id: "Record",
      accessorFn: () => "Missing report events",
      header: "Record",
    },
    {
      id: "From",
      accessorKey: "from",
      header: "From sequence",
      meta: { align: "right" },
    },
    {
      id: "To",
      accessorKey: "to",
      header: "To sequence",
      meta: { align: "right" },
    },
    {
      id: "Missing",
      accessorKey: "missing",
      header: "Events missing",
      meta: { align: "right" },
    },
  ];
}

export function eventRows(): TimelineEventRow[] {
  return replayTimeline.events.map((event, index) => ({
    id: `${event.t}-${event.tag}-${index}`,
    time: event.t,
    timeLabel: `${event.t.toFixed(1)} s`,
    level: event.lvl,
    component: event.seg,
    summary: event.msg,
    event,
  }));
}

export function actionColumns(
  onInspect: (action: JsonRecord) => void,
): DataTableColumnDef<ActionRow>[] {
  return [
    {
      id: "Status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className="rounded-(--radius)"
          count={row.original.status}
          status={statusVariant(row.original.status)}
        />
      ),
    },
    { id: "Action", accessorKey: "name", header: "Action" },
    { id: "Type", accessorKey: "type", header: "Type" },
    {
      id: "Duration",
      accessorKey: "duration",
      header: "Duration",
      meta: { align: "right" },
    },
    { id: "Summary", accessorKey: "summary", header: "Inputs · outputs" },
    {
      id: "Artifacts",
      accessorKey: "artifactCount",
      header: "Output fields",
      meta: { align: "right" },
    },
    {
      id: "Details",
      header: "Details",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="xs"
          onClick={() => onInspect(row.original.action)}
        >
          Inspect
        </Button>
      ),
    },
  ];
}

export function eventColumns(
  onInspect: (event: ReplayEvent) => void,
): DataTableColumnDef<TimelineEventRow>[] {
  return [
    {
      id: "Time",
      accessorKey: "time",
      header: "Replay time",
      meta: { align: "right" },
      cell: ({ row }) => row.original.timeLabel,
    },
    { id: "Level", accessorKey: "level", header: "Level" },
    { id: "Component", accessorKey: "component", header: "Component" },
    { id: "Event", accessorKey: "summary", header: "Event" },
    {
      id: "Details",
      header: "Details",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="xs"
          onClick={() => onInspect(row.original.event)}
        >
          Inspect
        </Button>
      ),
    },
  ];
}
