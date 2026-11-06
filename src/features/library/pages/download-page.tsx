import { useState } from "react";
import { Accordion } from "skytrack-ui/accordion";
import { PageHeader } from "skytrack-ui/page-header";
import { Button } from "skytrack-ui/button";
import {
  DESKTOP_HOSTS,
  PLATFORMS,
  SKYTRACK_OS_COMPATIBILITY,
  SKYTRACK_OS_TARGETS,
  type DesktopHost,
} from "./download-page-data";
import DownloadPlatformOptions from "./download-platform-options";
import DownloadSystemRequirements from "./download-system-requirements";
import DownloadSetupGuideline from "./download-setup-guideline";

function PlatformDetails({
  platformId,
  hostOs,
  onHostOsChange,
  platformName,
}: {
  platformId: string;
  hostOs: DesktopHost;
  onHostOsChange: (host: DesktopHost) => void;
  platformName: string;
}) {
  const [skyTrackOsTarget, setSkyTrackOsTarget] = useState<string>(
    SKYTRACK_OS_TARGETS[0].id,
  );
  const selectedSkyTrackOsTarget = SKYTRACK_OS_TARGETS.find(
    (target) => target.id === skyTrackOsTarget,
  )!;
  const compatibility =
    platformId === "desktop" || platformId === "field"
      ? null
      : SKYTRACK_OS_COMPATIBILITY.replace(
          "{target}",
          selectedSkyTrackOsTarget.label,
        );

  return (
    <section
      aria-live="polite"
      aria-label={`${platformName} compatibility and setup`}
      className="flex min-w-0 flex-col"
    >
      <Accordion
        multiple
        defaultValue={
          platformId === "desktop"
            ? ["select-os", "requirements", "setup"]
            : platformId === "os"
              ? ["select-target", "requirements", "setup"]
              : ["android-platform", "requirements", "setup"]
        }
        className="w-full"
      >
        <DownloadPlatformOptions
          platformId={platformId}
          hostOs={hostOs}
          onHostOsChange={onHostOsChange}
          selectedTargetId={skyTrackOsTarget}
          onSelectedTargetChange={setSkyTrackOsTarget}
        />
        <DownloadSystemRequirements
          platformId={platformId}
          hostOs={hostOs}
          compatibility={compatibility}
        />
        <DownloadSetupGuideline platformId={platformId} hostOs={hostOs} />
      </Accordion>
    </section>
  );
}

export default function DownloadPage() {
  const [activePlatform, setActivePlatform] = useState<string>("desktop");
  const [hostOs, setHostOs] = useState<(typeof DESKTOP_HOSTS)[number]>("macOS");
  const active = PLATFORMS.find((platform) => platform.id === activePlatform)!;

  return (
    <div className="min-w-0">
      <PageHeader
        title="Download"
        // toolbar={
        //   <Button variant='outline' size='sm' onClick={onGoHome}>
        //     Back to Home
        //   </Button>
        // }
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 p-6">
        <section
          aria-labelledby="download-platform-title"
          className="flex flex-col gap-4"
        >
          {/* <div id='download-platform-title' className='h4 m-0'>
            Explore our applications
          </div> */}
          <div className="overflow-hidden border border-border bg-card">
            <div
              role="group"
              aria-label="Select an application"
              className="grid grid-cols-1 md:grid-cols-3"
            >
              {PLATFORMS.map((platform, index) => {
                const selected = activePlatform === platform.id;
                const titleId = `download-${platform.id}-title`;
                const summaryId = `download-${platform.id}-summary`;
                const illustration = platform.illustration
                  .replace("<svg ", '<svg class="size-auto" ')
                  .replaceAll('stroke="#161616"', 'stroke="var(--foreground)"');
                return (
                  <div key={platform.id} className="relative min-w-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="lg"
                      nativeButton={false}
                      render={<div />}
                      aria-labelledby={titleId}
                      aria-describedby={summaryId}
                      aria-pressed={selected}
                      aria-controls="download-application-details"
                      onClick={() => setActivePlatform(platform.id)}
                      className={`relative isolate flex h-full min-h-44 w-full min-w-0 items-center justify-start gap-0 p-6 text-left whitespace-normal rounded-none ${
                        selected
                          ? "bg-card dark:bg-card"
                          : "bg-muted dark:bg-muted"
                      } ${
                        index < PLATFORMS.length - 1
                          ? "md:border-r border-border"
                          : ""
                      } hover:bg-accent/50`}
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <span
                          aria-hidden="true"
                          className="flex size-32 shrink-0 items-center justify-center overflow-hidden [&>svg]:block"
                          dangerouslySetInnerHTML={{ __html: illustration }}
                        />
                        <div className="flex min-w-0 flex-col gap-1">
                          <h3
                            id={titleId}
                            className="h4 m-0 flex items-center gap-2 leading-7 lg:text-xl"
                          >
                            {platform.cardTitle}
                          </h3>
                          <p
                            id={summaryId}
                            className="text-sm text-muted-foreground font-normal"
                          >
                            {platform.summary}
                          </p>
                        </div>
                      </div>
                      {selected && (
                        <>
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 z-2 h-1 bg-primary"
                          />
                          {/* <span
                            aria-hidden="true"
                            className="pointer-events-none absolute right-6 left-6 bottom-0 z-2 h-px bg-border"
                          /> */}
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
            <div id="download-application-details" className="bg-card p-6">
              <PlatformDetails
                key={activePlatform}
                platformId={activePlatform}
                platformName={active.name}
                hostOs={hostOs}
                onHostOsChange={setHostOs}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
