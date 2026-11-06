import type { ReactNode } from "react";
import { useState } from "react";
import type { MissionInsightsReportTab } from "@/features/studio/mission-report-url";
import type { InsightOutput } from "./mission-insights-output-data";
import type { MissionInsightSample } from "./mission-insights-data";
import type { InsightMedia } from "./mission-insights-report-data";
import { asRecord, asRecords, missionLogicLanguage, missionLogicLineCount, numberValue, reportForSample, sampleActions, sampleGalleryMedia } from "./mission-insights-report-data";
import { replayTimeline } from "./replay-sample";
import { Tabs, TabsList, TabsPanel, TabsTab } from "skytrack-ui/tabs";
import { DetailSection } from "./mission-insights-page-sections";
import { KeyValueList, statusLabel } from "./mission-insights-report-shared";
import { OverviewTab } from "./mission-insights-report-overview";
import { FlightPathTab } from "./mission-insights-report-flight-path";
import { AIModelsTab, modelRows } from "./mission-insights-report-ai-models";
import { TimelineTab } from "./mission-insights-report-timeline";
import { MissionLogicTab } from "./mission-insights-report-logic";
import { RawJsonTab } from "./mission-insights-report-raw-json";
import { MediaFilesTab } from "./mission-insights-report-media-tab";

const tabItems: ReadonlyArray<{
  value: MissionInsightsReportTab;
  label: string;
}> = [
  { value: "overview", label: "Overview" },
  { value: "flight-path", label: "Flight path" },
  { value: "media-files", label: "Media & Files" },
  { value: "ai-models", label: "AI Models" },
  { value: "timeline", label: "Timeline" },
  { value: "mission-logic", label: "Mission Logic" },
  { value: "raw-json", label: "Raw JSON" },
];

export function MissionInsightsReportTabs({
  sample,
  activeTab,
  onTabChange,
  onOpenOutput,
  onOpenSurveyImages,
  replayTime,
  seekNotice,
  onSeek,
  renderPageHeader,
}: {
  sample: MissionInsightSample;
  activeTab: MissionInsightsReportTab;
  onTabChange: (tab: MissionInsightsReportTab) => void;
  onOpenOutput: (output: InsightOutput) => void;
  onOpenSurveyImages: () => void;
  replayTime: number;
  seekNotice: string;
  onSeek: (time: number, label?: string) => void;
  renderPageHeader: (tabNavigation: ReactNode) => ReactNode;
}) {
  const [selectedMedia, setSelectedMedia] = useState<InsightMedia | null>(null);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as MissionInsightsReportTab)}
      className="gap-0"
    >
      {renderPageHeader(
        <TabsList variant="line" className="w-full max-w-full overflow-x-auto border-0">
          {tabItems.map((tab) => (
            <TabsTab key={tab.value} value={tab.value} className="flex-none">
              {tab.label}
            </TabsTab>
          ))}
        </TabsList>,
      )}
      <TabsPanel value="overview" className="min-w-0">
        <ReportWorkspace sample={sample} activeTab="overview">
          <OverviewTab
            sample={sample}
            onOpenOutput={onOpenOutput}
            onOpenSurveyImages={onOpenSurveyImages}
            onOpenFlightPath={() => onTabChange("flight-path")}
            onSeek={onSeek}
          />
        </ReportWorkspace>
      </TabsPanel>
      <TabsPanel value="flight-path" className="min-w-0">
        <ReportWorkspace sample={sample} activeTab="flight-path">
          <FlightPathTab
            sample={sample}
            time={replayTime}
            seekNotice={seekNotice}
            onSeek={onSeek}
            onNavigate={onTabChange}
          />
        </ReportWorkspace>
      </TabsPanel>
      <TabsPanel value="media-files" className="min-w-0">
        <ReportWorkspace
          sample={sample}
          activeTab="media-files"
          selectedMedia={selectedMedia}
        >
          <MediaFilesTab
            sample={sample}
            onNavigate={onTabChange}
            onSelectionChange={setSelectedMedia}
          />
        </ReportWorkspace>
      </TabsPanel>
      <TabsPanel value="ai-models" className="min-w-0">
        <ReportWorkspace sample={sample} activeTab="ai-models">
          <AIModelsTab sample={sample} onNavigate={onTabChange} />
        </ReportWorkspace>
      </TabsPanel>
      <TabsPanel value="timeline" className="min-w-0">
        <ReportWorkspace sample={sample} activeTab="timeline">
          <TimelineTab
            sample={sample}
            onNavigate={onTabChange}
            onSeek={onSeek}
          />
        </ReportWorkspace>
      </TabsPanel>
      <TabsPanel value="mission-logic" className="min-w-0">
        <ReportWorkspace sample={sample} activeTab="mission-logic">
          <MissionLogicTab sample={sample} />
        </ReportWorkspace>
      </TabsPanel>
      <TabsPanel value="raw-json" className="min-w-0">
        <ReportWorkspace sample={sample} activeTab="raw-json">
          <RawJsonTab sample={sample} />
        </ReportWorkspace>
      </TabsPanel>
    </Tabs>
  );
}

function ReportWorkspace({
  sample,
  activeTab,
  selectedMedia,
  children,
}: {
  sample: MissionInsightSample;
  activeTab: MissionInsightsReportTab;
  selectedMedia?: InsightMedia | null;
  children: ReactNode;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
      <div className="min-w-0">{children}</div>
      <ReportContextRail
        sample={sample}
        activeTab={activeTab}
        selectedMedia={selectedMedia}
      />
    </div>
  );
}

function ReportContextRail({
  sample,
  activeTab,
  selectedMedia,
}: {
  sample: MissionInsightSample;
  activeTab: MissionInsightsReportTab;
  selectedMedia?: InsightMedia | null;
}) {
  const report = reportForSample(sample);
  const models = modelRows(report);
  const actions = sampleActions(report);
  const events = replayTimeline.events;
  const media = sampleGalleryMedia(sample);
  const contextTitle: Record<MissionInsightsReportTab, string> = {
    overview: "Run context",
    "flight-path": "Flight summary",
    "media-files": "Selected media",
    "ai-models": "Model activity",
    timeline: "Timeline summary",
    "mission-logic": "Mission definition",
    "raw-json": "Report data",
  };

  let contextRows: ReadonlyArray<readonly [string, ReactNode]>;
  switch (activeTab) {
    case "overview":
      contextRows = [
        ["Outcome", sample.outcomeTitle],
        ["Evidence", sample.evidenceCompleteness],
        ["Availability", sample.evidenceAvailability],
        ["Signature", sample.evidenceSignature],
      ];
      break;
    case "flight-path": {
      const flight = asRecord(report.flight_path);
      const waypoints = asRecords(report.waypoints);
      contextRows = [
        ["Distance", `${numberValue(flight.distance_m)?.toFixed(1) ?? "—"} m`],
        [
          "Maximum altitude",
          `${numberValue(flight.max_altitude_m)?.toFixed(1) ?? "—"} m`,
        ],
        [
          "Waypoints reached",
          `${waypoints.filter((point) => point.reached === true).length} of ${
            waypoints.length
          }`,
        ],
        ["Replay", "Shared prototype sample"],
      ];
      break;
    }
    case "media-files":
      contextRows = selectedMedia
        ? [
            ["File", selectedMedia.name],
            ["Group", selectedMedia.actionName],
            [
              "Availability",
              selectedMedia.syntheticPreview
                ? "Generated preview"
                : statusLabel(selectedMedia.availability),
            ],
            [
              "Detections",
              selectedMedia.syntheticPreview
                ? "Not linked to run data"
                : selectedMedia.detectionCount,
            ],
          ]
        : [
            ["Media records", media.length],
            ["Selection", "Choose an item in the gallery to see its context."],
          ];
      break;
    case "ai-models": {
      const invocations = asRecords(report.invocations);
      contextRows = [
        ["Models", models.length],
        ["Invocations", invocations.length],
        [
          "With results",
          models.reduce(
            (sum, model) => sum + (numberValue(model.calls.with_results) ?? 0),
            0,
          ),
        ],
        [
          "Failed",
          models.reduce(
            (sum, model) => sum + (numberValue(model.calls.failed) ?? 0),
            0,
          ),
        ],
      ];
      break;
    }
    case "timeline":
      contextRows = [
        ["Mission actions", actions.length],
        ["Replay events", events.length],
        ["Replay source", "Shared sample, not selected-run telemetry"],
      ];
      break;
    case "mission-logic":
      contextRows = [
        ["Source file", sample.missionLogicFile],
        ["Language", missionLogicLanguage(sample)],
        ["Lines", missionLogicLineCount(sample)],
        ["Summary", sample.missionLogicDescription],
      ];
      break;
    case "raw-json":
      contextRows = [
        ["Dataset", "Prototype report fixture"],
        ["Run type", sample.type],
        ["Run status", sample.status],
        ["Scope", "Illustrative data, not live telemetry"],
      ];
      break;
  }

  return (
    <aside
      className="flex min-w-0 flex-col gap-4 xl:col-start-2 xl:row-start-1 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2rem)] xl:self-start xl:overflow-y-auto"
      aria-label="Report context"
    >
      <DetailSection title={contextTitle[activeTab]} className="p-4">
        <KeyValueList columns="grid-cols-1" rows={contextRows} />
      </DetailSection>
    </aside>
  );
}
