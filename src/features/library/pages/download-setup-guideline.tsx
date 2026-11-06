import {
  CheckIcon,
  CodeIcon,
  CopySimpleIcon,
  DownloadSimpleIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "skytrack-ui/accordion";
import { Badge } from "skytrack-ui/badge";
import { Button, buttonVariants } from "skytrack-ui/button";
import {
  ANDROID_SETUP_STEPS,
  DESKTOP_SETUP,
  DOCKER_DESKTOP_INSTALL_GUIDES,
  JETSON_FLASH_GUIDE,
  type DesktopHost,
} from "./download-page-data";

function CopyableCodeBlock({
  code,
  description,
}: {
  code: string;
  description: string;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <div className="overflow-hidden rounded-(--radius) border border-border bg-muted">
      <div className="flex items-center justify-between border-b border-border px-3 py-1">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <CodeIcon aria-hidden="true" className="size-4" />
          Plain Text
        </span>
        <span className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={
              copyState === "copied"
                ? `Copied ${description}`
                : copyState === "failed"
                  ? `Could not copy ${description}`
                  : `Copy ${description}`
            }
            onClick={copyCode}
          >
            {copyState === "copied" ? (
              <CheckIcon aria-hidden="true" />
            ) : (
              <CopySimpleIcon aria-hidden="true" />
            )}
          </Button>
          {copyState !== "idle" && (
            <span className="text-xs text-muted-foreground">
              {copyState === "copied" ? "Copied" : "Copy failed"}
            </span>
          )}
        </span>
        <span className="sr-only" aria-live="polite">
          {copyState === "copied"
            ? `${description} copied to clipboard.`
            : copyState === "failed"
              ? `Could not copy ${description}.`
              : ""}
        </span>
      </div>
      <pre className="m-0 overflow-x-auto px-4 py-3 text-sm leading-6 text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const setupMarkdownComponents: Components = {
  h1: ({ children }) => (
    <h4 className="m-0 text-base font-semibold text-foreground">{children}</h4>
  ),
  h2: ({ children }) => (
    <div className="m-0 text-base font-semibold text-foreground">
      {children}
    </div>
  ),
  p: ({ children }) => <p className="m-0 text-muted-foreground">{children}</p>,
  ol: ({ children }) => (
    <ol className="m-0 flex list-[lower-roman] flex-col gap-1 pl-6 text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="text-base">{children}</li>,
  code: ({ children, className }) =>
    className ? (
      <CopyableCodeBlock
        description="setup guide code block"
        code={String(children).replace(/\n$/, "")}
      />
    ) : (
      <code className="rounded-(--radius) border border-border p-1 font-mono text-sm text-foreground">
        {children}
      </code>
    ),
  pre: ({ children }) => <>{children}</>,
};

function JetsonFlashGuideline() {
  return (
    <div className="flex flex-col gap-4 text-base">
      <ReactMarkdown components={setupMarkdownComponents}>
        {JETSON_FLASH_GUIDE}
      </ReactMarkdown>
    </div>
  );
}

export default function DownloadSetupGuideline({
  platformId,
  hostOs,
}: {
  platformId: string;
  hostOs: DesktopHost;
}) {
  const setupSteps = ANDROID_SETUP_STEPS;
  return (
    <AccordionItem value="setup">
      <AccordionTrigger className="text-lg font-semibold">
        Setup guideline
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex flex-col gap-5 pb-4">
          {platformId === "desktop" ? (
            <>
              <div className="flex items-center gap-3">
                <Badge variant="outline" count="1" />
                <div className="text-lg font-medium text-foreground">
                  {DESKTOP_SETUP.heading}
                </div>
              </div>
              <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4 text-base">
                <article className="flex min-w-0 flex-col gap-4 border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-lg font-medium">
                      {DESKTOP_SETUP.localTitle}
                    </div>
                    <Badge variant="outline">{DESKTOP_SETUP.localBadge}</Badge>
                  </div>
                  <ol className="m-0 flex list-decimal flex-col gap-2 pl-5 text-muted-foreground">
                    {DESKTOP_SETUP.localSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <div className="mt-auto flex flex-col gap-2">
                    <div className="text-lg font-medium text-foreground">
                      {DESKTOP_SETUP.readyTitle}
                    </div>
                    <p className="m-0 text-muted-foreground">
                      {DESKTOP_SETUP.readyDescription}
                    </p>
                    <a
                      href={DOCKER_DESKTOP_INSTALL_GUIDES[hostOs]}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open Docker Desktop installation instructions for ${hostOs}`}
                      className={`${buttonVariants()} self-start`}
                    >
                      <DownloadSimpleIcon aria-hidden="true" />
                      {DESKTOP_SETUP.dockerDownloadLabel}
                    </a>
                  </div>
                </article>
                <span className="self-center text-center text-muted-foreground">
                  or
                </span>
                <article className="flex min-w-0 flex-col gap-4 border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-lg font-medium">
                      {DESKTOP_SETUP.cloudTitle}
                    </div>
                    <Badge variant="outline">{DESKTOP_SETUP.cloudBadge}</Badge>
                  </div>
                  <p className="m-0 text-muted-foreground">
                    {DESKTOP_SETUP.cloudDescription}
                  </p>
                  {/* <Button
                        type='button'
                        variant='outline'
                        className='mt-auto self-start'
                      >
                        Select Cloud
                      </Button> */}
                </article>
              </div>
              <ol className="m-0 flex list-none flex-col gap-3 p-0 text-muted-foreground">
                <li className="flex items-center gap-3">
                  <Badge variant="outline" className="rounded-none">
                    2
                  </Badge>
                  <span className="text-lg font-medium text-foreground">
                    {DESKTOP_SETUP.pendingSteps[0]}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Badge variant="outline" className="rounded-none">
                    3
                  </Badge>
                  <span className="text-lg font-medium text-foreground">
                    {DESKTOP_SETUP.pendingSteps[1]}
                  </span>
                </li>
              </ol>
            </>
          ) : (
            <>
              {platformId === "os" ? (
                <JetsonFlashGuideline />
              ) : (
                <>
                  <ol className="m-0 flex list-decimal flex-col gap-2 pl-5 text-muted-foreground">
                    {setupSteps.map((step) => (
                      <li key={step} className="text-base text-foreground">
                        {step}
                      </li>
                    ))}
                  </ol>
                  {/* <Button type='button' disabled className='self-start'>
                        Open setup guide
                      </Button> */}
                </>
              )}
            </>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
