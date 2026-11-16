import { DownloadSimpleIcon, LinkSimpleIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { Toolbar, ToolbarGroup } from "skytrack-ui/toolbar";
import {
  type MissionReportRun,
  type MissionInsightSample,
} from "./mission-insights-data";
import { replayTimeline } from "./replay-sample";

function downloadReport(
  run: MissionReportRun | null,
  sampleKey: string,
  payload: unknown,
) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mission-insights-${run?.id ?? sampleKey}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function MissionInsightsPageToolbar({
  sample,
  run,
  onCopyUrl,
}: {
  sample: MissionInsightSample | null;
  run: MissionReportRun | null;
  onCopyUrl: () => void;
}) {
  if (!sample) return null;

  return (
    <Toolbar
      aria-label="Mission Insights actions"
      className="max-w-full border-0 bg-transparent p-0"
    >
      <ToolbarGroup className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onCopyUrl}>
          <LinkSimpleIcon aria-hidden="true" />
          Copy URL
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadReport(run, sample.key, {
              selectedRun: run,
              sample,
              replay: replayTimeline,
            })
          }
        >
          <DownloadSimpleIcon aria-hidden="true" />
          Download report
        </Button>
      </ToolbarGroup>
    </Toolbar>
  );
}
