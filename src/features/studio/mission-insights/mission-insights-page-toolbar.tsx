import {
  DotsThreeIcon,
  DownloadSimpleIcon,
  LinkSimpleIcon,
} from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuTrigger,
} from "skytrack-ui/menu";
import { Toolbar, ToolbarGroup } from "skytrack-ui/toolbar";
import {
  MISSION_INSIGHTS_SAMPLE_DISCLOSURE,
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
  onApply,
  onCopyUrl,
}: {
  sample: MissionInsightSample | null;
  run: MissionReportRun | null;
  onApply: () => void;
  onCopyUrl: () => void;
}) {
  if (!sample) return null;

  return (
    <Toolbar
      aria-label="Mission Insights actions"
      className="max-w-full border-0 bg-transparent p-0"
    >
      <ToolbarGroup className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onApply}>
          Apply to Mission Design
        </Button>
        <Menu>
          <MenuTrigger
            aria-label="More actions"
            data-testid="ms-insights-more-actions"
            render={
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="More actions"
              />
            }
          >
            <DotsThreeIcon aria-hidden="true" />
          </MenuTrigger>
          <MenuPortal>
            <MenuPositioner side="bottom" align="end" sideOffset={4}>
              <MenuPopup aria-label="Mission Insights actions">
                <MenuItem onSelect={onCopyUrl}>
                  <LinkSimpleIcon aria-hidden="true" />
                  Copy URL
                </MenuItem>
                <MenuItem
                  onSelect={() =>
                    downloadReport(run, sample.key, {
                      selectedRun: run,
                      sample,
                      replay: replayTimeline,
                      sampleDisclosure: MISSION_INSIGHTS_SAMPLE_DISCLOSURE,
                    })
                  }
                >
                  <DownloadSimpleIcon aria-hidden="true" />
                  Download report
                </MenuItem>
              </MenuPopup>
            </MenuPositioner>
          </MenuPortal>
        </Menu>
      </ToolbarGroup>
    </Toolbar>
  );
}
