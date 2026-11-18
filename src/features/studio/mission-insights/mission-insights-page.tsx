import { useCallback, useEffect, useLayoutEffect, useState } from "react";
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
  ToastClose,
  ToastContent,
  ToastPortal,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
  createToastManager,
  useToastManager,
} from "skytrack-ui/toast";
import {
  missionInsightsTabSearch,
  missionReportHref,
  parseMissionInsightsReportTab,
  type MissionInsightsReportTab,
} from "@/features/studio/mission-report-url";
import { sampleForRun, type MissionReportRun } from "./mission-insights-data";
import { replayTimeline } from "./replay-sample";
import { SkyTooltip } from "@/ui/components/sky-tooltip";
import { MissionInsightsReportTabs } from "./mission-insights-report-tabs";
import { MissionInsightsPageToolbar } from "./mission-insights-page-toolbar";
import { useMissionCapturePreviews } from "./mission-insights-simulated-captures";
import { getMissionReportSurface } from "./mission-insights-surface";

const missionInsightsToastManager = createToastManager();

function MissionInsightsToastList() {
  const { toasts } = useToastManager();
  return toasts.map((toast) => (
    <ToastRoot key={toast.id} toast={toast}>
      <ToastContent>
        <div className="min-w-0 flex-1">
          <ToastTitle />
        </div>
        <ToastClose size="icon" variant="ghost" aria-label="Dismiss toast" />
      </ToastContent>
    </ToastRoot>
  ));
}

function noSampleMessage(run: MissionReportRun | null) {
  if (!run)
    return "No Mission Reports row matches this run ID. Return to the report list and select a run.";
  if (run.type === "Real" && run.status === "Failed") {
    return "No report data is available for failed real flights.";
  }
  if (run.type === "HITL") {
    return "No report data is available for this HITL run.";
  }
  return "No report data is available for this run type and status.";
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
  const [applyOpen, setApplyOpen] = useState(false);
  const [replayTime, setReplayTime] = useState(0);
  const [seekNotice, setSeekNotice] = useState("");
  const [activeTab, setActiveTab] = useState(() =>
    parseMissionInsightsReportTab(window.location.search),
  );
  const reportSurface = getMissionReportSurface("mission-insights", activeTab);

  useLayoutEffect(() => {
    const rootStyle = document.documentElement.style;
    const previousSurface = rootStyle.getPropertyValue(
      "--mission-report-surface",
    );
    rootStyle.setProperty(
      "--mission-report-surface",
      `var(--${reportSurface})`,
    );
    return () => {
      if (previousSurface) {
        rootStyle.setProperty("--mission-report-surface", previousSurface);
      } else {
        rootStyle.removeProperty("--mission-report-surface");
      }
    };
  }, [reportSurface]);

  useMissionCapturePreviews(
    sample,
    activeTab === "flight-path" || activeTab === "media-files",
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

  async function copyReportUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      missionInsightsToastManager.add({
        title: "Report URL copied.",
        type: "success",
      });
    } catch {
      missionInsightsToastManager.add({
        title: "Could not copy report URL. Copy it from the address bar.",
        type: "error",
      });
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
          )} s replay; the marker is shown at the final replay time.`
        : label
          ? `Replay moved to ${label} at ${nextTime.toFixed(1)} s.`
          : "",
    );
  }, []);

  const pageToolbar = (
    <MissionInsightsPageToolbar
      sample={sample}
      run={run}
      onCopyUrl={copyReportUrl}
    />
  );

  return (
    <section
      className="flex w-full min-w-0 flex-col gap-0"
      aria-label="Mission Insights"
      data-testid="ms-mission-insights"
    >
      <ToastProvider toastManager={missionInsightsToastManager}>
        <ToastPortal>
          <ToastViewport className="fixed bottom-4 left-4 right-auto mx-0 flex max-w-sm flex-col-reverse">
            <MissionInsightsToastList />
          </ToastViewport>
        </ToastPortal>
      </ToastProvider>
      {!sample ? (
        <PageHeader
          title="Mission Insights"
          toolbar={pageToolbar}
          className="sticky top-0 z-20"
        />
      ) : null}

      {sample ? (
        <div className="flex w-full min-w-0 flex-col gap-6">
          <MissionInsightsReportTabs
            renderPageHeader={(tabNavigation) => (
              <PageHeader
                title="Mission Insights"
                toolbar={pageToolbar}
                className="sticky top-0 z-20"
              >
                <section
                  aria-labelledby="mission-general-info-title"
                  className="mb-3 flex min-w-0 flex-col gap-3"
                >
                  {run && sample ? (
                    <>
                      <section
                        aria-labelledby="mission-general-info-compact-title"
                        className="flex min-w-0 flex-col gap-3"
                      >
                        <dl className="flex flex-col sm:flex-row min-w-0 max-w-400 gap-x-12 gap-y-1">
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
                              value:
                                run.type === "Real" ? "Real flight" : run.type,
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
                                  ? "min-w-0 xl:col-span-1"
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
                                    className="inline-flex shrink-0 rounded-(--radius) text-muted-foreground focus-visible:outline-2 focus-visible:outline-(--ring) focus-visible:outline-offset-2"
                                  >
                                    <Icon
                                      aria-hidden="true"
                                      className={`${value === "Succeeded" ? "text-success" : value === "Failed" ? "text-destructive" : ""} size-4`}
                                      weight={
                                        value === "Succeeded" ||
                                        value === "Failed"
                                          ? "regular"
                                          : "regular"
                                      }
                                    />
                                  </span>
                                </SkyTooltip>
                                <span
                                  className={`${value === "Succeeded" ? "text-success" : value === "Failed" ? "text-destructive" : ""} min-w-0 w-full max-w-[190px] wrap-break-word truncate`}
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
                </section>
                {tabNavigation}
              </PageHeader>
            )}
            sample={sample}
            activeTab={activeTab}
            onTabChange={navigateReportTab}
            onApply={() => setApplyOpen(true)}
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

      <AlertDialog open={applyOpen} onOpenChange={setApplyOpen}>
        <AlertDialogPortal>
          <AlertDialogBackdrop />
          <AlertDialogPopup className="sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Apply mission logic to Mission Design?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {sample?.missionLogicFile} ({sample?.missionLogicDescription})
                as the mission logic for this run.
              </AlertDialogDescription>
              {sample ? (
                <p className="m-0 text-muted-foreground">
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
    </section>
  );
}
