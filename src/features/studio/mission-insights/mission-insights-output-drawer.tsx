import { CheckIcon, ClipboardIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "skytrack-ui/button";
import {
  Drawer,
  DrawerBackdrop,
  DrawerContent,
  DrawerDescription,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
} from "skytrack-ui/drawer";
import { Separator } from "skytrack-ui/separator";
import type { InsightOutput } from "./mission-insights-output-data";
import { MissionInsightsOutputPreview } from "./mission-insights-output-preview";

export function MissionInsightsOutputDrawer({
  output,
  onOpenChange,
  onOpenSurveyImages,
}: {
  output: InsightOutput | null;
  onOpenChange: (open: boolean) => void;
  onOpenSurveyImages: () => void;
}) {
  const [copyNotice, setCopyNotice] = useState("");

  useEffect(() => {
    setCopyNotice("");
  }, [output?.id]);

  async function copyPath(label: string, path: string) {
    try {
      await navigator.clipboard.writeText(path);
      setCopyNotice(`${label} path copied.`);
    } catch {
      setCopyNotice(`Could not copy the ${label} path.`);
    }
  }

  return (
    <Drawer
      open={output !== null}
      onOpenChange={onOpenChange}
      swipeDirection="right"
    >
      <DrawerPortal>
        <DrawerBackdrop />
        <DrawerViewport side="right">
          {output ? (
            <DrawerPopup
              side="right"
              className="w-[min(38rem,calc(100vw-1rem))] max-w-full"
              aria-label={`${output.name} details`}
            >
              <DrawerContent className="flex h-full min-h-0 flex-col gap-4 p-5 sm:p-6">
                <header className="flex min-w-0 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <DrawerTitle className="h4 m-0">{output.name}</DrawerTitle>
                    <DrawerDescription className="mt-2">
                      {output.summary}
                    </DrawerDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Close ${output.name} details`}
                    onClick={() => onOpenChange(false)}
                  >
                    <XIcon aria-hidden="true" />
                  </Button>
                </header>
                {output.remoteFileCount ? (
                  <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      title="Remote files cannot be fetched from this local browser preview."
                    >
                      Download from Mission Computer ({output.remoteFileCount})
                    </Button>
                    <span className="text-(--muted-foreground)">
                      Remote download is unavailable in this preview.
                    </span>
                  </div>
                ) : null}
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="flex flex-col gap-4">
                    {output.preview ? (
                      <MissionInsightsOutputPreview
                        preview={output.preview}
                        onOpenSurveyImages={
                          output.id === "survey-image-set"
                            ? () => {
                                onOpenChange(false);
                                onOpenSurveyImages();
                              }
                            : undefined
                        }
                      />
                    ) : null}
                    {output.details.map((section, index) => (
                      <section
                        key={section.title}
                        className="flex min-w-0 flex-col gap-3"
                        aria-labelledby={`ms-output-${output.id}-${index}`}
                      >
                        {index > 0 ? <Separator /> : null}
                        <h3
                          id={`ms-output-${output.id}-${index}`}
                          className="m-0 text-lg font-medium text-foreground"
                        >
                          {section.title}
                        </h3>
                        <dl className="m-0 grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-[minmax(7rem,0.7fr)_minmax(0,1.8fr)]">
                          {section.rows.map(([label, value, copyValue]) => (
                            <div
                              key={`${section.title}-${label}`}
                              className="contents"
                            >
                              <dt className="text-(--muted-foreground)">
                                {label}
                              </dt>
                              <dd className="m-0 min-w-0 break-words">
                                {value}
                                {copyValue ? (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => copyPath(label, copyValue)}
                                      title={`Copy path: ${copyValue}`}
                                      aria-label={`Copy path for ${label}`}
                                    >
                                      {copyNotice ===
                                      `${label} path copied.` ? (
                                        <CheckIcon aria-hidden="true" />
                                      ) : (
                                        <ClipboardIcon aria-hidden="true" />
                                      )}
                                      Copy path
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled
                                      title="Show in Finder is unavailable in this browser preview."
                                    >
                                      Show in Finder
                                    </Button>
                                  </div>
                                ) : null}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </section>
                    ))}
                  </div>
                </div>
                {copyNotice ? (
                  <p
                    role="status"
                    aria-live="polite"
                    className="m-0 text-(--muted-foreground)"
                  >
                    {copyNotice}
                  </p>
                ) : null}
              </DrawerContent>
            </DrawerPopup>
          ) : null}
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}
