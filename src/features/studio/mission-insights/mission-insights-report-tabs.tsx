import type { ReactNode } from "react";
import { useState } from "react";
import type { MissionInsightsReportTab } from "@/features/studio/mission-report-url";
import type { MissionInsightSample } from "./mission-insights-data";
import { Tabs, TabsList, TabsPanel, TabsTab } from "skytrack-ui/tabs";
import { OverviewTab } from "./mission-insights-report-overview";
import { FlightPathTab } from "./mission-insights-report-flight-path";
import { AIModelsTab } from "./mission-insights-report-ai-models";
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
  onApply,
  replayTime,
  seekNotice,
  onSeek,
  renderPageHeader,
}: {
  sample: MissionInsightSample;
  activeTab: MissionInsightsReportTab;
  onTabChange: (tab: MissionInsightsReportTab) => void;
  onApply: () => void;
  replayTime: number;
  seekNotice: string;
  onSeek: (time: number, label?: string) => void;
  renderPageHeader: (tabNavigation: ReactNode) => ReactNode;
}) {
  const [requestedMediaId, setRequestedMediaId] = useState<string | null>(null);
  const [selectedIssueCode, setSelectedIssueCode] = useState<string | null>(
    null,
  );
  const [selectedIssueRequest, setSelectedIssueRequest] = useState(0);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as MissionInsightsReportTab)}
      className="gap-0"
    >
      {renderPageHeader(
        <TabsList
          variant="line"
          className="w-full max-w-full overflow-x-auto border-0"
        >
          {tabItems.map((tab) => (
            <TabsTab key={tab.value} value={tab.value} className="flex-none">
              {tab.label}
            </TabsTab>
          ))}
        </TabsList>,
      )}
      <TabsPanel value="overview" className="min-w-0">
        <ReportWorkspace width="wide">
          <OverviewTab
            sample={sample}
            onOpenMedia={(id) => {
              setRequestedMediaId(id);
              onTabChange("media-files");
            }}
            onOpenMediaFiles={() => {
              setRequestedMediaId(null);
              onTabChange("media-files");
            }}
            onOpenIssue={(issueCode) => {
              setSelectedIssueCode(issueCode);
              setSelectedIssueRequest((request) => request + 1);
              onTabChange("timeline");
            }}
            replayTime={replayTime}
            seekNotice={seekNotice}
            onSeek={(time, label) => {
              if (time !== null) onSeek(time, label);
            }}
          />
        </ReportWorkspace>
      </TabsPanel>
      <TabsPanel value="flight-path" className="min-w-0">
        <ReportWorkspace width="wide">
          <FlightPathTab
            sample={sample}
            onNavigate={onTabChange}
            onOpenMedia={(id) => {
              setRequestedMediaId(id);
              onTabChange("media-files");
            }}
          />
        </ReportWorkspace>
      </TabsPanel>
      <TabsPanel value="media-files" className="min-w-0">
        <ReportWorkspace width="wide" padding="none">
          <MediaFilesTab
            sample={sample}
            selectedMediaId={requestedMediaId}
            active={activeTab === "media-files"}
            onNavigate={onTabChange}
          />
        </ReportWorkspace>
      </TabsPanel>
      <TabsPanel value="ai-models" className="min-w-0">
        <ReportWorkspace width="wide">
          <AIModelsTab
            sample={sample}
            onNavigate={onTabChange}
            onOpenMedia={(id) => {
              setRequestedMediaId(id);
              onTabChange("media-files");
            }}
          />
        </ReportWorkspace>
      </TabsPanel>
      <TabsPanel value="timeline" className="min-w-0">
        <ReportWorkspace width="wide">
          <TimelineTab
            sample={sample}
            selectedIssueCode={selectedIssueCode}
            selectedIssueRequest={selectedIssueRequest}
            onNavigate={onTabChange}
            onOpenMedia={(id) => {
              setRequestedMediaId(id);
              onTabChange("media-files");
            }}
            onOpenMediaFiles={() => {
              setRequestedMediaId(null);
              onTabChange("media-files");
            }}
          />
        </ReportWorkspace>
      </TabsPanel>
      <TabsPanel value="mission-logic" className="min-w-0">
        <ReportWorkspace width="wide" padding="none">
          <MissionLogicTab sample={sample} onApply={onApply} />
        </ReportWorkspace>
      </TabsPanel>
      <TabsPanel value="raw-json" className="min-w-0">
        <ReportWorkspace width="wide" padding="none">
          <RawJsonTab sample={sample} />
        </ReportWorkspace>
      </TabsPanel>
    </Tabs>
  );
}

function ReportWorkspace({
  children,
  width = "standard",
  padding = "default",
}: {
  children: ReactNode;
  width?: "standard" | "wide";
  padding?: "default" | "none";
}) {
  return (
    <div
      className={`mx-auto w-full min-w-0 ${padding === "default" ? "p-6" : "p-0"} ${width === "standard" ? "max-w-[1366px]" : "max-w-none"}`}
    >
      {children}
    </div>
  );
}
