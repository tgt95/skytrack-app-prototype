import { Button } from "skytrack-ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "skytrack-ui/empty";

export function MissionInsightsFlightPathEmpty({
  onOpenTimeline,
}: {
  onOpenTimeline: () => void;
}) {
  return (
    <Empty>
      <EmptyTitle>No flight path data</EmptyTitle>
      <EmptyDescription>
        No flight path data is available for this run.
      </EmptyDescription>
      <EmptyContent>
        <Button variant="outline" size="sm" onClick={onOpenTimeline}>
          Open actions and report event metadata
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function MissionInsightsOpenTimelineButton({
  onOpenTimeline,
}: {
  onOpenTimeline: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="self-start"
      onClick={onOpenTimeline}
    >
      Open actions and report event metadata
    </Button>
  );
}
