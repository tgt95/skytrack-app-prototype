import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import { replayTimeline } from "./replay-sample";

function formatClock(seconds: number) {
  return `${seconds.toFixed(1)} s`;
}

export function MissionInsightsPlannerEvents({
  selectedEvent,
  onSelectedEventChange,
  onSeek,
}: {
  selectedEvent: number | null;
  onSelectedEventChange: (index: number) => void;
  onSeek: (time: number, label?: string) => void;
}) {
  return (
    <section
      className="flex min-w-0 flex-col gap-3"
      aria-labelledby="ms-planner-events-title"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h3
          id="ms-planner-events-title"
          className="m-0 text-lg font-medium text-(--foreground)"
        >
          Planner events
        </h3>
        <span className="text-(--muted-foreground)">
          {replayTimeline.events.length} events · select one to seek
        </span>
      </header>
      <ol className="m-0 flex max-h-80 list-none flex-col gap-1 overflow-y-auto rounded-(--radius) border border-border p-2">
        {replayTimeline.events.map((event, index) => {
          const isSelected = selectedEvent === index;
          const status =
            event.lvl === "ERROR"
              ? "error"
              : event.lvl === "WARNING"
                ? "warning"
                : "secondary";
          return (
            <li key={`${event.t}-${event.tag}-${index}`}>
              <Button
                className="h-auto min-h-9 w-full justify-start whitespace-normal px-2 py-1.5 text-left"
                variant={isSelected ? "secondary" : "ghost"}
                aria-pressed={isSelected}
                onClick={() => {
                  onSelectedEventChange(index);
                  onSeek(event.t, `${event.tag} event`);
                }}
              >
                <span className="shrink-0 tabular-nums">
                  {formatClock(event.t)}
                </span>
                <Badge
                  className="rounded-(--radius)"
                  count={event.tag}
                  status={status}
                />
                <span className="min-w-0 break-words">{event.msg}</span>
              </Button>
            </li>
          );
        })}
      </ol>
      <p className="m-0 text-(--muted-foreground)">
        Replay controls operate on this local sample only; they are not
        connected to a vehicle or live telemetry.
      </p>
    </section>
  );
}
