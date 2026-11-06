import { DownloadSimpleIcon, GooglePlayLogoIcon } from "@phosphor-icons/react";
import { Badge } from "skytrack-ui/badge";
import { Button, buttonVariants } from "skytrack-ui/button";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "skytrack-ui/accordion";
import { runEnvironmentToastManager } from "@/features/library/library-topbar";
import {
  androidMark,
  HOST_OPTIONS,
  SKYTRACK_OS_TARGETS,
  type DesktopHost,
} from "./download-page-data";
import downloadContent from "@content/download/platforms.json";

export default function DownloadPlatformOptions({
  platformId,
  hostOs,
  onHostOsChange,
  selectedTargetId,
  onSelectedTargetChange,
}: {
  platformId: string;
  hostOs: DesktopHost;
  onHostOsChange: (host: DesktopHost) => void;
  selectedTargetId: string;
  onSelectedTargetChange: (targetId: string) => void;
}) {
  const selectedSkyTrackOsTarget = SKYTRACK_OS_TARGETS.find(
    (target) => target.id === selectedTargetId,
  )!;
  const downloadLabel =
    platformId === "desktop"
      ? HOST_OPTIONS.find((option) => option.label === hostOs)!.downloadLabel
      : "";

  return (
    <AccordionItem
      value={
        platformId === "desktop"
          ? "select-os"
          : platformId === "field"
            ? "android-platform"
            : "select-target"
      }
    >
      <AccordionTrigger className="text-lg font-semibold">
        {platformId === "desktop"
          ? "Select OS"
          : platformId === "field"
            ? "Select platform"
            : "Select hardware"}
      </AccordionTrigger>
      <AccordionContent>
        <div
          role="group"
          aria-label={
            platformId === "desktop"
              ? "Select a Desktop host operating system"
              : platformId === "field"
                ? "Select platform"
                : "Select hardware"
          }
          className="grid grid-cols-1 gap-3 pb-4 md:grid-cols-3"
        >
          {platformId === "desktop" &&
            HOST_OPTIONS.map(({ label, version, detail, logo }) => (
              <Button
                key={label}
                type="button"
                variant="outline"
                aria-pressed={hostOs === label}
                onClick={() => onHostOsChange(label)}
                className={`h-auto w-full justify-start gap-3 rounded-(--radius) border-border py-3 ${
                  hostOs === label ? "border-primary text-primary" : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className="size-8 shrink-0 [&>svg]:block"
                  dangerouslySetInnerHTML={{ __html: logo }}
                />
                <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                  <span className="flex items-center gap-2 text-base font-semibold">
                    {label}
                    <Badge variant="outline" className="normal-case">
                      {version}
                    </Badge>
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {detail}
                  </span>
                </span>
              </Button>
            ))}
          {platformId === "field" && (
            <div
              role="group"
              aria-label="Android, the only available Mobile platform"
              className="flex h-auto w-full items-center gap-3 rounded-(--radius) border border-primary bg-card px-3 py-3 text-primary"
            >
              <span
                aria-hidden="true"
                className="size-8 shrink-0 [&>svg]:block"
                dangerouslySetInnerHTML={{ __html: androidMark }}
              />
              <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                <span className="flex items-center gap-2 text-base font-semibold">
                  Android
                  <Badge variant="outline" className="normal-case">
                    {downloadContent.android.version}
                  </Badge>
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {downloadContent.android.detail}
                </span>
              </span>
            </div>
          )}
          {platformId === "os" &&
            SKYTRACK_OS_TARGETS.map((target) => (
              <Button
                key={target.id}
                type="button"
                variant="outline"
                disabled={target.disabled}
                aria-pressed={selectedTargetId === target.id}
                onClick={() => onSelectedTargetChange(target.id)}
                className={`h-auto w-full justify-start gap-3 rounded-(--radius) border-border py-3 ${
                  selectedTargetId === target.id
                    ? "border-primary text-primary"
                    : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className="size-8 shrink-0 [&>svg]:block"
                  dangerouslySetInnerHTML={{ __html: target.logo }}
                />
                <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                  <span className="flex items-center gap-2 text-base font-semibold">
                    {target.label}
                    <Badge variant="outline" className="normal-case">
                      {target.badgeLabel}
                    </Badge>
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {target.detail}
                  </span>
                </span>
              </Button>
            ))}
          {platformId === "field" ? (
            <a
              href={downloadContent.android.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Get SkyTrack Field on Google Play"
              className={`${buttonVariants()} justify-self-start md:col-span-3`}
            >
              <GooglePlayLogoIcon
                aria-hidden="true"
                className="size-5"
                weight="fill"
              />
              {downloadContent.android.storeButtonLabel}
            </a>
          ) : platformId === "os" ? (
            <div className="flex w-full flex-col gap-2">
              <div className="flex flex-row gap-3">
                {selectedSkyTrackOsTarget.downloadImages.map((image) => (
                  <Button
                    key={image.filename}
                    aria-label={`${image.label}: ${image.downloadLabel}; ${image.filename}; demo package has no installer attached`}
                    onClick={() =>
                      runEnvironmentToastManager.add({
                        title: "Demo package only — no installer file attached",
                      })
                    }
                  >
                    <DownloadSimpleIcon aria-hidden="true" />
                    {image.downloadLabel}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 justify-self-start md:col-span-3">
              <Button
                type="button"
                aria-label={`${hostOs} ${downloadLabel}; demo package has no installer attached`}
                onClick={() =>
                  runEnvironmentToastManager.add({
                    title: "Demo package only — no installer file attached",
                  })
                }
                className="h-auto py-2"
              >
                <DownloadSimpleIcon aria-hidden="true" />
                {downloadLabel}
              </Button>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
