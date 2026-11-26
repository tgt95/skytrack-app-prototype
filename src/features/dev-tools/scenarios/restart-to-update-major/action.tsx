import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckIcon,
  DownloadSimpleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from "skytrack-ui/progress";
import { Spinner } from "@/components/ui/spinner";
import type { DevScenarioActionProps } from "@/features/dev-tools/types";
import {
  DEV_SCENARIO_IDS,
  useDevScenarioControls,
} from "@/shared/dev-scenario-state";
import skyTrackLogoFull from "@/assets/skytrack-logo-full.svg?raw";

type UpdatePhase =
  | "required"
  | "downloading"
  | "installing"
  | "update-ready"
  | "restarting"
  | "error";

function SkeletonBar({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-(--radius) bg-muted/75 motion-reduce:animate-none ${className}`}
    />
  );
}

function UpdateLibrarySkeleton() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 top-16 overflow-hidden bg-background"
    >
      <div className="flex h-full">
        <aside className="hidden w-60 shrink-0 flex-col gap-5 border-r border-border bg-card p-6 sm:flex">
          <SkeletonBar className="mb-2 h-7 w-36" />
          {Array.from({ length: 7 }, (_, index) => (
            <div className="flex items-center gap-3" key={index}>
              <SkeletonBar className="size-4 rounded-sm" />
              <SkeletonBar
                className={`h-4 ${index % 3 === 0 ? "w-32" : "w-24"}`}
              />
            </div>
          ))}
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden p-6 sm:p-8">
          <SkeletonBar className="h-9 w-64 max-w-full" />
          <div className="mt-10 flex items-center justify-between gap-4">
            <SkeletonBar className="h-7 w-44 max-w-[50%]" />
            <SkeletonBar className="h-8 w-24" />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                className="overflow-hidden rounded-(--radius) border border-border bg-card p-3"
                key={index}
              >
                <SkeletonBar className="h-36 w-full sm:h-44" />
                <SkeletonBar className="mt-4 h-5 w-3/4" />
                <SkeletonBar className="mt-3 h-4 w-1/2" />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function RestartToUpdateMajorAction({
  onAnnounce,
}: DevScenarioActionProps) {
  const [phase, setPhase] = useState<UpdatePhase>("required");
  const [progressValue, setProgressValue] = useState(5);
  const { setScenarioEnabled } = useDevScenarioControls();
  const isPending =
    phase === "downloading" || phase === "installing" || phase === "restarting";

  useEffect(() => {
    const appRoot = document.getElementById("root");
    const wasInert = appRoot?.inert ?? false;
    if (appRoot) appRoot.inert = true;

    return () => {
      if (appRoot) appRoot.inert = wasInert;
    };
  }, []);

  useEffect(() => {
    if (phase === "downloading") {
      let step = 0;
      const milestones = [22, 46, 70, 94];
      const timer = window.setInterval(() => {
        if (!navigator.onLine) {
          window.clearInterval(timer);
          setPhase("error");
          return;
        }

        if (step >= milestones.length) {
          window.clearInterval(timer);
          setPhase("installing");
          return;
        }

        setProgressValue(milestones[step]);
        step += 1;
      }, 3000);

      return () => window.clearInterval(timer);
    }

    if (phase === "installing") {
      const timer = window.setTimeout(() => {
        setPhase(navigator.onLine ? "update-ready" : "error");
      }, 3000);
      return () => window.clearTimeout(timer);
    }

    if (phase === "restarting") {
      const timer = window.setTimeout(() => {
        onAnnounce("SkyTrack is up to date.");
        setScenarioEnabled(DEV_SCENARIO_IDS.restartToUpdateMajor, false);
      }, 850);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [onAnnounce, phase, setScenarioEnabled]);

  const title =
    phase === "downloading"
      ? "Updating SkyTrack"
      : phase === "installing"
        ? "Installing update"
        : phase === "update-ready"
          ? "Update ready"
          : phase === "restarting"
            ? "Restarting SkyTrack…"
            : phase === "error"
              ? "Update didn’t complete"
              : "Update required";
  const description =
    phase === "required"
      ? "Update the latest version for the better experience."
      : phase === "downloading"
        ? "Downloading the latest version."
        : phase === "installing"
          ? "Finishing the installation."
          : phase === "update-ready"
            ? "Restart to finish. It takes a few seconds."
            : phase === "restarting"
              ? "Starting SkyTrack with the update."
              : "The update didn’t finish. Check your connection and try again.";

  const buttonLabel =
    phase === "required"
      ? "Update"
      : phase === "error"
        ? "Try again"
        : phase === "update-ready"
          ? "Restart to update"
          : phase === "restarting"
            ? "Restarting…"
            : phase === "installing"
              ? "Installing update…"
              : "Downloading update…";
  const showProgress = [
    "downloading",
    "installing",
    "restarting",
  ].includes(phase);
  const progressLabel =
    phase === "downloading"
      ? "Downloading SkyTrack update"
      : phase === "installing"
        ? "Installing update"
        : phase === "restarting"
          ? "Restarting SkyTrack"
          : "Update ready";
  const displayedProgress =
    phase === "downloading"
      ? progressValue
      : phase === "installing"
        ? null
        : 100;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <UpdateLibrarySkeleton />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 top-16 bg-background/70 backdrop-blur-sm"
      />
      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
        <span
          aria-label="SkyTrack"
          className="inline-flex max-w-48 items-center [&_svg]:block [&_svg]:max-h-8 [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: skyTrackLogoFull }}
          role="img"
        />
        <div aria-hidden="true" className="flex items-center gap-3">
          <SkeletonBar className="h-8 w-24" />
          <SkeletonBar className="h-8 w-28" />
          <SkeletonBar className="size-8 rounded-full" />
        </div>
      </header>
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-12 text-center">
        <main
          aria-describedby="major-update-description"
          aria-labelledby="major-update-title"
          className="flex w-full max-w-md flex-col items-center"
        >
          <span
            className={`mb-6 grid size-16 place-items-center rounded-full ${
              phase === "error"
                ? "bg-destructive/10 text-destructive"
                : isPending
                  ? "bg-card text-foreground"
                  : "bg-primary/10 text-primary"
            }`}
          >
            {isPending ? (
              <Spinner className="size-8 text-foreground" />
            ) : phase === "error" ? (
              <WarningCircleIcon aria-hidden="true" className="size-8" />
            ) : phase === "update-ready" ? (
              <CheckIcon aria-hidden="true" className="size-8" />
            ) : (
              <DownloadSimpleIcon aria-hidden="true" className="size-8" />
            )}
          </span>
          <div
            aria-label={title}
            aria-live="polite"
            className="h3"
            id="major-update-title"
          >
            {Array.from(title).map((character, index) => (
              <span
                aria-hidden="true"
                className={`inline-block ${
                  phase === "required"
                    ? ""
                    : isPending
                      ? "animate-ms-update-title-slide-left-loop motion-reduce:animate-none"
                      : "animate-ms-update-title-slide-left motion-reduce:animate-none"
                }`}
                key={`${phase}-${index}`}
                style={{ animationDelay: `${index * 35}ms` }}
              >
                {character === " " ? "\u00a0" : character}
              </span>
            ))}
          </div>
          <p
            aria-live="polite"
            className="mt-2 text-base text-muted-foreground"
            id="major-update-description"
          >
            {description}
          </p>

          {showProgress ? (
            <Progress
              className="mt-8 w-full grid-cols-1 gap-y-2"
              value={displayedProgress}
            >
              <ProgressLabel className="sr-only">{progressLabel}</ProgressLabel>
              <ProgressTrack className="col-span-1 h-1.5">
                <ProgressIndicator />
              </ProgressTrack>
              <ProgressValue className="col-span-1 text-center text-base font-medium" />
            </Progress>
          ) : null}

          {phase !== "downloading" && phase !== "installing" ? (
            <Button
              aria-disabled={isPending}
              autoFocus
              className="mt-8 w-full"
              onClick={() => {
                if (phase === "required" || phase === "error") {
                  setProgressValue(5);
                  setPhase("downloading");
                } else if (phase === "update-ready") {
                  setPhase("restarting");
                }
              }}
              size="lg"
            >
              {buttonLabel}
            </Button>
          ) : null}
        </main>
      </div>
    </div>,
    document.body,
  );
}
