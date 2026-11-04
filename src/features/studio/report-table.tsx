import { useCallback, useEffect, useMemo, useState } from "react";
import { ChartScatterIcon, AirplaneLandingIcon } from "@phosphor-icons/react";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import { DataTable, type DataTableColumnDef } from "skytrack-ui/data-table";
import { PageHeader } from "skytrack-ui/page-header";
import {
  missionInsightsSearch,
  missionReportHref,
  missionReportsSearch,
  parseMissionInsightsRoute,
} from "./mission-report-url";
import {
  formatMissionRunLabel,
  type MissionReportRun,
} from "./mission-insights/mission-insights-data";
import { MissionInsightsPage } from "./mission-insights/mission-insights-page";
import { HitlMissionInsightsPreview } from "./hitl-mission-insights-preview";

type SimulationReport = MissionReportRun;

const simulationReports: SimulationReport[] = [
  {
    id: "10092026-130606",
    project: "Sim-escape-4-1",
    type: "Simulation",
    status: "Succeeded",
    startedAt: "2026-10-09T13:06",
    startedAtLabel: "Oct 09, 2026 - 13:06",
    durationSeconds: 281.8,
    reports: ["Insights", "Post Flight"],
  },
  {
    id: "10092026-130231",
    project: "Sim-escape-4-1",
    type: "Simulation",
    status: "Succeeded",
    startedAt: "2026-10-09T13:02",
    startedAtLabel: "Oct 09, 2026 - 13:02",
    durationSeconds: 171.8,
    reports: ["Insights", "Post Flight"],
  },
  {
    id: "10092026-125714",
    project: "Sim-escape-4-1",
    type: "Simulation",
    status: "Succeeded",
    startedAt: "2026-10-09T12:57",
    startedAtLabel: "Oct 09, 2026 - 12:57",
    durationSeconds: 85.3,
    reports: ["Insights", "Post Flight"],
  },
  {
    id: "10092026-125400",
    project: "Sim-escape-4-1",
    type: "Simulation",
    status: "Failed",
    startedAt: "2026-10-09T12:54",
    startedAtLabel: "Oct 09, 2026 - 12:54",
    durationSeconds: 46.2,
    reports: ["Insights", "Post Flight"],
  },
  {
    id: "10092026-125000",
    project: "Sim-escape-4-1",
    type: "Real",
    status: "Succeeded",
    startedAt: "2026-10-09T12:50",
    startedAtLabel: "Oct 09, 2026 - 12:50",
    durationSeconds: 193.6,
    reports: ["Insights", "Post Flight"],
  },
  {
    id: "10092026-124500",
    project: "Sim-escape-4-1",
    type: "Real",
    status: "Failed",
    startedAt: "2026-10-09T12:45",
    startedAtLabel: "Oct 09, 2026 - 12:45",
    durationSeconds: 72.4,
    reports: ["Insights", "Post Flight"],
  },
  {
    id: "10092026-123000",
    project: "Sim-escape-4-1",
    type: "HITL",
    status: "Succeeded",
    startedAt: "2026-10-09T12:30",
    startedAtLabel: "Oct 09, 2026 - 12:30",
    durationSeconds: 248.1,
    reports: ["Insights", "Post Flight"],
  },
  {
    id: "10092026-121500",
    project: "Sim-escape-4-1",
    type: "HITL",
    status: "Failed",
    startedAt: "2026-10-09T12:15",
    startedAtLabel: "Oct 09, 2026 - 12:15",
    durationSeconds: 58.9,
    reports: ["Insights", "Post Flight"],
  },
];

function buildColumns(
  onOpenMissionInsights: (report: SimulationReport) => void,
): DataTableColumnDef<SimulationReport>[] {
  return [
    {
      id: "Run",
      accessorFn: formatMissionRunLabel,
      header: "Run",
      cell: ({ row }) => formatMissionRunLabel(row.original),
    },
    {
      id: "Type",
      accessorKey: "type",
      header: "Type",
    },
    {
      id: "Status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className="rounded-(--radius)"
          count={row.original.status}
          status={row.original.status === "Succeeded" ? "success" : "error"}
        />
      ),
    },
    {
      id: "Started",
      accessorKey: "startedAt",
      header: "Started",
      cell: ({ row }) => row.original.startedAtLabel,
    },
    {
      id: "Duration",
      accessorKey: "durationSeconds",
      header: "Duration",
      meta: { align: "right" },
      cell: ({ row }) => `${row.original.durationSeconds.toFixed(1)} s`,
    },
    {
      id: "Reports",
      accessorFn: (report) => report.reports.join(" "),
      header: "Reports",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div
          className="flex flex-row flex-wrap gap-2"
          role="group"
          aria-label={`Reports for ${row.original.id}`}
          aria-describedby="ms-report-preview-help"
        >
          {row.original.reports.map((report) => {
            const available = report === "Insights";
            return (
              <Button
                key={report}
                variant="outline"
                size="sm"
                disabled={!available}
                onClick={
                  available
                    ? () => onOpenMissionInsights(row.original)
                    : undefined
                }
                title={
                  available
                    ? undefined
                    : "Post Flight is not available in this Mission Studio preview."
                }
              >
                {report === "Insights" ? (
                  <ChartScatterIcon />
                ) : (
                  <AirplaneLandingIcon />
                )}
                {report}
              </Button>
            );
          })}
        </div>
      ),
    },
  ];
}

export default function SimulationReportTable({
  onSubpageChange,
  onOpenMissionDesign,
}: {
  onSubpageChange: (open: boolean) => void;
  onOpenMissionDesign: () => void;
}) {
  const [insightsRunId, setInsightsRunId] = useState(
    () => parseMissionInsightsRoute(window.location.search)?.runId ?? null,
  );
  const showInsights = insightsRunId !== null;

  const openMissionInsights = useCallback(
    (report: SimulationReport) => {
      const nextSearch = missionInsightsSearch(
        window.location.search,
        report.id,
      );
      const nextUrl = missionReportHref(window.location, nextSearch);
      const currentState = window.history.state;
      const historyState: Record<string, unknown> =
        typeof currentState === "object" && currentState !== null
          ? { ...currentState }
          : {};

      historyState.__skytrackMissionInsightsOpenedFromList = true;
      historyState.__skytrackMissionInsightsHistoryDepth = 0;
      window.history.pushState(historyState, "", nextUrl);
      setInsightsRunId(report.id);
      onSubpageChange(true);
    },
    [onSubpageChange],
  );

  const returnToMissionReports = useCallback(() => {
    const currentState = window.history.state;
    const historyState: Record<string, unknown> =
      typeof currentState === "object" && currentState !== null
        ? { ...currentState }
        : {};

    if (historyState.__skytrackMissionInsightsOpenedFromList === true) {
      const nestedDepth = Number(
        historyState.__skytrackMissionInsightsHistoryDepth ?? 0,
      );
      window.history.go(-(Math.max(0, nestedDepth) + 1));
      return;
    }

    delete historyState.__skytrackMissionInsightsOpenedFromList;
    const nextSearch = missionReportsSearch(window.location.search);
    window.history.replaceState(
      historyState,
      "",
      missionReportHref(window.location, nextSearch),
    );
    setInsightsRunId(null);
    onSubpageChange(false);
  }, [onSubpageChange]);

  useEffect(() => {
    const restoreSubpageFromUrl = () => {
      const nextRunId =
        parseMissionInsightsRoute(window.location.search)?.runId ?? null;
      setInsightsRunId(nextRunId);
      onSubpageChange(nextRunId !== null);
    };

    window.addEventListener("popstate", restoreSubpageFromUrl);
    return () => window.removeEventListener("popstate", restoreSubpageFromUrl);
  }, [onSubpageChange]);

  useEffect(() => {
    const handleTopbarBack = () => returnToMissionReports();
    window.addEventListener("ms:back-to-mission-reports", handleTopbarBack);
    return () =>
      window.removeEventListener(
        "ms:back-to-mission-reports",
        handleTopbarBack,
      );
  }, [returnToMissionReports]);

  const columns = useMemo(
    () => buildColumns(openMissionInsights),
    [openMissionInsights],
  );
  const selectedRun =
    insightsRunId === null
      ? null
      : (simulationReports.find((report) => report.id === insightsRunId) ??
        null);
  const showHitlSuccessPreview =
    selectedRun?.type === "HITL" && selectedRun.status === "Succeeded";

  return (
    <>
      <section
        id="mission-reports"
        className="flex min-w-0 flex-col gap-0"
        aria-label="Mission Reports"
        hidden={showInsights}
      >
        <PageHeader
          className="sm:[&_[data-slot=page-header-main]]:!flex-row"
          title="Mission Reports"
        />
        <div className="p-6">
          <p id="ms-report-preview-help" className="sr-only">
            Insights opens the selected run overview. Values without a
            matching prototype state are identified as unavailable samples. Post
            Flight Analysis is unavailable in this preview.
          </p>
          <DataTable
            columns={columns}
            data={simulationReports}
            getRowId={(report) => report.id}
            pageSize={10}
            searchPlaceholder="Search"
            emptyMessage="No simulation runs match this search."
          />
        </div>
      </section>
      {insightsRunId !== null ? (
        showHitlSuccessPreview ? (
          <HitlMissionInsightsPreview />
        ) : (
          <MissionInsightsPage
            run={selectedRun}
            onBack={returnToMissionReports}
            onOpenMissionDesign={onOpenMissionDesign}
          />
        )
      ) : null}
    </>
  );
}
