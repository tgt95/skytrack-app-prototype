import { useState } from "react";
import { QuestionIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { Badge } from "skytrack-ui/badge";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "skytrack-ui/dialog";
import {
  Popover,
  PopoverArrow,
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverTitle,
  PopoverTrigger,
} from "skytrack-ui/popover";

interface ReleaseNote {
  id: string;
  title: string;
  category: string;
  date: string;
  dateTime: string;
  summary: string;
  details: string[];
}

const RELEASE_NOTES: ReleaseNote[] = [
  {
    id: "mission-summaries",
    title: "Mission summaries, at a glance",
    category: "Mission planning",
    date: "Oct 24, 2026",
    dateTime: "2026-10-24",
    summary:
      "Compare survey area, waypoints, actions, and photo coverage from the mission list.",
    details: [
      "Mission cards now show the mapped area and route totals beside the mission name.",
      "2D mission cards open with a satellite preview of the survey location.",
      "Area values use hectares for sites of one hectare or larger.",
    ],
  },
  {
    id: "world-reconstruction",
    title: "Turn survey imagery into a 3D World",
    category: "Worlds",
    date: "Oct 20, 2026",
    dateTime: "2026-10-20",
    summary:
      "Keep the 2D capture and the resulting 3D World connected in your workspace.",
    details: [
      "Start with a 2D photogrammetry mission and use its survey area as the source for reconstruction.",
      "Find completed Worlds in one library alongside their source and flight references.",
      "Choose a World when planning a later 3D mission.",
    ],
  },
  {
    id: "ai-model-library",
    title: "Find models from across your workspace",
    category: "AI models",
    date: "Oct 16, 2026",
    dateTime: "2026-10-16",
    summary:
      "Browse SkyTrack models, member uploads, and your own imports from one library.",
    details: [
      "All brings together every model available to the workspace.",
      "Members shows models shared by other workspace members.",
      "Me keeps your uploaded model packages in a separate view.",
    ],
  },
];

export function ReleaseNotesPopover() {
  const [open, setOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<ReleaseNote | null>(
    null,
  );

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label="Help and what's new"
          data-testid="ms-lib-help-trigger"
          render={
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              className="relative shrink-0 text-(--sidebar-foreground) [&:hover]:bg-(--sidebar-accent) [&:hover]:text-(--sidebar-accent-foreground)"
            >
              <QuestionIcon aria-hidden="true" />
              <span
                className="absolute right-1 top-1 size-1.5 rounded-full bg-(--primary)"
                aria-hidden="true"
                data-testid="ms-lib-help-new-indicator"
              />
            </Button>
          }
        />
        <PopoverPortal>
          <PopoverPositioner side="right" align="end" sideOffset={4}>
            <PopoverPopup
              className="w-[min(23rem,calc(100vw-2rem))] max-h-[min(80vh,38rem)] overflow-y-auto rounded-(--radius) border border-(--border) bg-(--card) p-2 text-(--foreground) shadow-lg"
              aria-label="What's new"
              data-testid="ms-lib-release-notes-popover"
            >
              <PopoverArrow />
              <div className="px-2 pb-2 pt-1">
                <PopoverTitle className="heading text-base font-semibold">
                  What's new?
                </PopoverTitle>
                <p className="mb-0 mt-1 text-sm text-(--muted-foreground)">
                  Recent updates to SkyTrack.
                </p>
              </div>
              <div
                className="flex flex-col gap-1"
                aria-label="Recent release notes"
              >
                {RELEASE_NOTES.map((release, index) => (
                  <button
                    key={release.id}
                    type="button"
                    className="flex w-full items-start gap-3 rounded-(--radius) p-2 text-left hover:bg-(--accent) focus-visible:outline-2 focus-visible:outline-(--ring)"
                    onClick={() => {
                      setOpen(false);
                      setSelectedRelease(release);
                    }}
                    data-testid={`ms-lib-release-note-${release.id}`}
                  >
                    {/* <span
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-(--primary)"
                      aria-hidden="true"
                    /> */}
                    <div className="flex items-center h-4">
                      <Badge
                        status="processing"
                        dot={true}
                        aria-hidden="true"
                        className="shrink-0"
                      />
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="mb-1 flex items-center gap-2 text-xs text-(--muted-foreground)">
                        <span>{release.date}</span>
                        {index === 0 ? (
                          <span className="rounded-sm bg-(--accent) px-1.5 py-0.5 font-medium text-(--accent-foreground)">
                            New
                          </span>
                        ) : null}
                      </span>
                      <span className="block text-sm font-medium leading-5">
                        {release.title}
                      </span>
                      <span className="mt-0.5 block text-sm text-(--muted-foreground)">
                        {release.category}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </PopoverPopup>
          </PopoverPositioner>
        </PopoverPortal>
      </Popover>

      <Dialog
        open={selectedRelease !== null}
        onOpenChange={(nextOpen: boolean) => {
          if (!nextOpen) setSelectedRelease(null);
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup
            aria-label={selectedRelease?.title ?? "Release details"}
            data-testid="ms-lib-release-note-detail"
          >
            {selectedRelease ? (
              <>
                <DialogHeader>
                  <p className="m-0 text-sm font-medium text-(--primary)">
                    {selectedRelease.category}
                  </p>
                  <DialogTitle className="heading">
                    {selectedRelease.title}
                  </DialogTitle>
                  <DialogDescription>
                    <time dateTime={selectedRelease.dateTime}>
                      {selectedRelease.date}
                    </time>
                    {" · "}
                    {selectedRelease.summary}
                  </DialogDescription>
                </DialogHeader>
                <ul className="m-0 flex list-disc flex-col gap-2 pl-5 text-sm text-(--muted-foreground)">
                  {selectedRelease.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
                <DialogFooter>
                  <DialogClose className="w-auto flex-[0_0_auto]">
                    Close
                  </DialogClose>
                </DialogFooter>
              </>
            ) : null}
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </>
  );
}
