import type { CSSProperties } from "react";
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
  height,
  className = "",
}: {
  selectedEvent: number | null;
  onSelectedEventChange: (index: number) => void;
  onSeek: (time: number, label?: string) => void;
  height: number | null;
  className?: string;
}) {
  const style = height
    ? ({ "--planner-events-height": `${height}px` } as CSSProperties)
    : undefined;

  return (
    <section
      className={`flex min-w-0 flex-col gap-3 rounded-(--radius) border border-border bg-card p-4 xl:min-h-0 xl:rounded-bl-none xl:rounded-br-(--radius) xl:rounded-tl-none xl:rounded-tr-(--radius) xl:border-l-0 ${
        height ? "xl:h-[var(--planner-events-height)] xl:overflow-hidden" : ""
      } ${className}`}
      style={style}
      aria-labelledby="ms-planner-events-title"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        {/* <h3
          id="ms-planner-events-title"
          className="m-0 text-lg font-medium text-foreground"
        >
          Planner events
        </h3>
        <span className="text-muted-foreground">
          {replayTimeline.events.length} events
        </span> */}
        <span className="text-xs sub-heading">
          {replayTimeline.events.length} events
        </span>
      </header>
      <ol
        className={`m-0 flex max-h-80 min-h-0 flex-1 list-none flex-col gap-1 overflow-y-auto rounded-(--radius) -mx-1.5 ${
          height ? "xl:max-h-none" : ""
        }`}
      >
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
                className="h-auto min-h-9 w-full justify-start items-start whitespace-normal px-2 py-1.5 text-left"
                variant={isSelected ? "secondary" : "ghost"}
                aria-pressed={isSelected}
                onClick={() => {
                  onSelectedEventChange(index);
                  onSeek(event.t, `${event.tag} event`);
                }}
              >
                <span className="w-12 shrink-0">
                  {formatClock(event.t)}
                </span>
                <div className="w-full flex flex-col gap-1">
                  <Badge
                    className="shrink-0 flex-none self-start w-fit"
                    count={event.tag}
                    status={status}
                  />
                  <span className="min-w-0 text-sm font-normal break-words">
                    {event.msg}
                  </span>
                </div>
              </Button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
