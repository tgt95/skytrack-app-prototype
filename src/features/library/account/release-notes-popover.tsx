import { useState } from "react";
import { QuestionIcon } from "@phosphor-icons/react";
import ReactMarkdown, { type Components } from "react-markdown";
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
import { RELEASE_NOTES, type ReleaseNote } from "./release-notes-data";

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="heading m-0 text-base font-semibold">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="heading m-0 text-base font-semibold">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="heading m-0 text-sm font-semibold">{children}</h3>
  ),
  p: ({ children }) => <p className="m-0 leading-6">{children}</p>,
  ul: ({ children }) => (
    <ul className="m-0 list-disc space-y-2 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="m-0 list-decimal space-y-2 pl-5">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-0.5 leading-6">{children}</li>,
  a: ({ children, href }) => (
    <a
      className="text-(--primary) underline underline-offset-2"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="m-0 border-l-2 border-(--border) pl-3 italic">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded-sm bg-(--muted) px-1 py-0.5 font-mono text-xs">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="m-0 overflow-x-auto rounded-(--radius) bg-(--muted) p-3">
      {children}
    </pre>
  ),
};

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
                <div className="flex flex-col gap-3 text-sm text-(--muted-foreground)">
                  <ReactMarkdown components={markdownComponents}>
                    {selectedRelease.content}
                  </ReactMarkdown>
                </div>
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
