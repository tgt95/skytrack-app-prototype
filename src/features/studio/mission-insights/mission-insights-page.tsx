import { useCallback, useEffect, useState } from "react";
import {
  AirplaneTiltIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  DroneIcon,
  GlobeHemisphereWestIcon,
  HashIcon,
  TimerIcon,
  WarningIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Alert, AlertDescription } from "skytrack-ui/alert";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogPortal,
  AlertDialogTitle,
} from "skytrack-ui/alert-dialog";
import { PageHeader } from "skytrack-ui/page-header";
import {
  missionInsightsTabSearch,
  missionReportHref,
  parseMissionInsightsReportTab,
  type MissionInsightsReportTab,
} from "../mission-report-url";
import { sampleForRun, type MissionReportRun } from "./mission-insights-data";
import { MissionInsightsSampleNotice } from "./mission-insights-page-sections";
import type { InsightOutput } from "./mission-insights-output-data";
import { MissionInsightsOutputDrawer } from "./mission-insights-output-drawer";
import { replayTimeline } from "./replay-sample";
import { SkyTooltip } from "../../../ui/components/sky-tooltip";
import { MissionInsightsReportTabs } from "./mission-insights-report-tabs";
import { MissionInsightsPageToolbar } from "./mission-insights-page-toolbar";

function noSampleMessage(run: MissionReportRun | null) {
  if (!run)
    return "No Mission Reports row matches this run ID. Return to the report list and select a run.";
  if (run.type === "Real" && run.status === "Failed") {
    return "The supplied overview has no Real Failed sample. No metrics or output values are available for this type and status.";
  }
  if (run.type === "HITL") {
    return "The supplied overview has no HITL report state. HITL uses its separate readiness and evidence report; this selected HITL status has no matching sample here.";
  }
  return "No sample report matches this run type and status.";
}

export function MissionInsightsPage({
  run,
  onBack,
  onOpenMissionDesign,
}: {
  run: MissionReportRun | null;
  onBack: () => void;
  onOpenMissionDesign: () => void;
}) {
  const sample = run ? sampleForRun(run) : null;
  const [selectedOutput, setSelectedOutput] = useState<InsightOutput | null>(
    null,
  );
  const [applyOpen, setApplyOpen] = useState(false);
  const [replayTime, setReplayTime] = useState(0);
  const [seekNotice, setSeekNotice] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const [activeTab, setActiveTab] = useState(() =>
    parseMissionInsightsReportTab(window.location.search),
  );

  useEffect(() => {
    const restoreReportTab = () => {
      setActiveTab(parseMissionInsightsReportTab(window.location.search));
    };
    window.addEventListener("popstate", restoreReportTab);
    return () => window.removeEventListener("popstate", restoreReportTab);
  }, []);

  const navigateReportTab = useCallback(
    (nextTab: MissionInsightsReportTab) => {
      if (nextTab === activeTab) return;
      const currentState = window.history.state;
      const historyState: Record<string, unknown> =
        typeof currentState === "object" && currentState !== null
          ? { ...currentState }
          : {};
      if (historyState.__skytrackMissionInsightsOpenedFromList === true) {
        historyState.__skytrackMissionInsightsHistoryDepth =
          Number(historyState.__skytrackMissionInsightsHistoryDepth ?? 0) + 1;
      }
      const nextSearch = missionInsightsTabSearch(
        window.location.search,
        nextTab,
      );
      window.history.pushState(
        historyState,
        "",
        missionReportHref(window.location, nextSearch),
      );
      setActiveTab(nextTab);
    },
    [activeTab],
  );

  const openSurveyImages = useCallback(() => {
    setSelectedOutput(null);
    navigateReportTab("media-files");
  }, [navigateReportTab]);

  async function copyReportUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyNotice("Report URL copied.");
    } catch {
      setCopyNotice(
        "Could not copy the report URL. Copy it from the address bar.",
      );
    }
  }

  const seekReplay = useCallback((requestedTime: number, label?: string) => {
    const end = replayTimeline.durationSeconds;
    const nextTime = Math.max(0, Math.min(end, requestedTime));
    setReplayTime(nextTime);
    setSeekNotice(
      requestedTime > end
        ? `${label ?? "Selected time"} is ${requestedTime.toFixed(
            1,
          )} s, beyond this ${end.toFixed(
            1,
          )} s replay sample; the marker is shown at the final sample time.`
        : label
          ? `Replay moved to ${label} at ${nextTime.toFixed(1)} s.`
          : "",
    );
  }, []);

  const pageToolbar = (
    <MissionInsightsPageToolbar
      sample={sample}
      run={run}
      onApply={() => setApplyOpen(true)}
      onCopyUrl={copyReportUrl}
    />
  );

  return (
    <section
      className="flex w-full min-w-0 flex-col gap-0"
      aria-label="Mission Insights"
      data-testid="ms-mission-insights"
    >
      {!sample ? (
        <PageHeader title="Mission Insights" toolbar={pageToolbar} />
      ) : null}

      {sample ? (
        <div className="flex w-full min-w-0 flex-col gap-6">
          <MissionInsightsSampleNotice />
          <MissionInsightsReportTabs
            renderPageHeader={(tabNavigation) => (
              <PageHeader title="Mission Insights" toolbar={pageToolbar}>
                <section
                  aria-labelledby="mission-general-info-title"
                  className="mb-3 flex min-w-0 flex-col gap-3"
                >
                  {run && sample ? (
                    <>
                      {/* Long World values span two desktop tracks; Started and Duration then share row two. */}
                      {/* <dl className="m-0 grid min-w-0 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 xl:grid-cols-6">
                        {[
                          ["Run ID", run.id],
                          ["Drone", sample.vehicle],
                          ["World", sample.world],
                          ["Type", run.type],
                          ["Status", run.status],
                          ["Started", run.startedAtLabel],
                          ["Duration", `${run.durationSeconds.toFixed(1)} s`],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className={
                              label === "World"
                                ? "min-w-0 xl:col-span-2"
                                : "min-w-0"
                            }
                          >
                            <dt className="text-(--muted-foreground)">
                              {label}
                            </dt>
                            <dd className="m-0 mt-1 break-words">{value}</dd>
                          </div>
                        ))}
                      </dl> */}
                      <section
                        aria-labelledby="mission-general-info-compact-title"
                        className="flex min-w-0 flex-col gap-3"
                      >
                        <dl className="m-0 grid min-w-0 max-w-400 grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3 xl:grid-cols-8">
                          {[
                            { label: "Run ID", value: run.id, Icon: HashIcon },
                            {
                              label: "Drone",
                              value: sample.vehicle,
                              Icon: DroneIcon,
                            },
                            {
                              label: "World",
                              value: sample.world,
                              Icon: GlobeHemisphereWestIcon,
                            },
                            {
                              label: "Type",
                              value: run.type,
                              Icon: AirplaneTiltIcon,
                            },
                            {
                              label: "Status",
                              value: run.status,
                              Icon:
                                run.status === "Succeeded"
                                  ? CheckCircleIcon
                                  : WarningIcon,
                            },
                            {
                              label: "Started",
                              value: run.startedAtLabel,
                              Icon: CalendarBlankIcon,
                            },
                            {
                              label: "Duration",
                              value: `${run.durationSeconds.toFixed(1)} s`,
                              Icon: TimerIcon,
                            },
                          ].map(({ label, value, Icon }) => (
                            <div
                              key={label}
                              className={
                                label === "World"
                                  ? "min-w-0 xl:col-span-2"
                                  : "min-w-0"
                              }
                            >
                              <dt className="sr-only">{label}</dt>
                              <dd className="m-0 inline-flex min-w-0 items-center gap-2 wrap-break-word">
                                <SkyTooltip>
                                  <span
                                    role="img"
                                    aria-label={label}
                                    title={label}
                                    tabIndex={0}
                                    className="inline-flex shrink-0 rounded-(--radius) text-(--muted-foreground) focus-visible:outline-2 focus-visible:outline-(--ring) focus-visible:outline-offset-2"
                                  >
                                    <Icon
                                      aria-hidden="true"
                                      className={`${value === "Succeeded" ? "text-success" : value === "Failed" ? "text-destructive" : ""} size-4`}
                                      weight={
                                        value === "Succeeded" ||
                                        value === "Failed"
                                          ? "fill"
                                          : "regular"
                                      }
                                    />
                                  </span>
                                </SkyTooltip>
                                <span
                                  className={`${value === "Succeeded" ? "text-success" : value === "Failed" ? "text-destructive" : ""} min-w-0 wrap-break-word`}
                                >
                                  {value}
                                </span>
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </section>
                    </>
                  ) : (
                    <Badge
                      className="rounded-(--radius)"
                      count="Unknown run"
                      status="warning"
                    />
                  )}
                  {/* {sample ? (
                    <p className='m-0 text-(--muted-foreground)'>
                      Prototype sample: {sample.runLabel} · {sample.world} ·{' '}
                      {sample.vehicle}
                    </p>
                  ) : null} */}
                  {copyNotice ? (
                    <span role="status" className="text-(--muted-foreground)">
                      {copyNotice}
                    </span>
                  ) : null}
                </section>
                {tabNavigation}
              </PageHeader>
            )}
            sample={sample}
            activeTab={activeTab}
            onTabChange={navigateReportTab}
            onOpenOutput={setSelectedOutput}
            onOpenSurveyImages={openSurveyImages}
            replayTime={replayTime}
            seekNotice={seekNotice}
            onSeek={seekReplay}
          />
        </div>
      ) : (
        <div className="flex w-full min-w-0 flex-col gap-6 p-6">
          <Alert variant="warning" role="status">
            <WarningCircleIcon className="size-5 shrink-0" aria-hidden="true" />
            <AlertDescription>{noSampleMessage(run)}</AlertDescription>
          </Alert>
          <Button variant="outline" className="self-start" onClick={onBack}>
            Back to Mission Reports
          </Button>
        </div>
      )}

      <MissionInsightsOutputDrawer
        output={selectedOutput}
        onOpenSurveyImages={openSurveyImages}
        onOpenChange={(open) => {
          if (!open) setSelectedOutput(null);
        }}
      />

      <AlertDialog open={applyOpen} onOpenChange={setApplyOpen}>
        <AlertDialogPortal>
          <AlertDialogBackdrop />
          <AlertDialogPopup className="sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Apply mission logic to Mission Design?
              </AlertDialogTitle>
              <AlertDialogDescription>
                The sample records {sample?.missionLogicFile} (
                {sample?.missionLogicDescription}) as the mission logic for this
                run. This local preview can open Mission Design, but it does not
                import or replace saved mission content.
              </AlertDialogDescription>
              {sample ? (
                <p className="m-0 text-(--muted-foreground)">
                  Source file: {sample.missionLogicFile}
                </p>
              ) : null}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="outline" />}>
                Cancel
              </AlertDialogClose>
              <Button
                onClick={() => {
                  setApplyOpen(false);
                  onOpenMissionDesign();
                }}
              >
                Open Mission Design
              </Button>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialogPortal>
      </AlertDialog>
      <span id="ms-pfa-unavailable" className="sr-only">
        Post Flight Analysis is not available in this Mission Studio preview.
      </span>
    </section>
  );
}
