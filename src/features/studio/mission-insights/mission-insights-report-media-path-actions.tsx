import { useEffect, useRef, useState } from "react";
import {
  CheckIcon,
  CopySimpleIcon,
  FolderOpenIcon,
} from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";

export function MediaPathActions({
  value,
  copyValue = value,
}: {
  value: string;
  copyValue?: string;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  async function copyPath() {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard API is unavailable");
      await navigator.clipboard.writeText(copyValue);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    resetTimer.current = setTimeout(() => setCopyState("idle"), 1800);
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={copyState === "error" ? "Copy failed" : "Copy path"}
          title={
            copyState === "copied"
              ? "Path copied"
              : copyState === "error"
                ? "Copy failed"
                : "Copy path"
          }
          onClick={copyPath}
        >
          {copyState === "copied" ? (
            <CheckIcon aria-hidden="true" />
          ) : (
            <CopySimpleIcon aria-hidden="true" />
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Show in Finder"
          title="Show in Finder is unavailable in this browser preview."
          disabled
        >
          <FolderOpenIcon aria-hidden="true" />
        </Button>
      </div>
      <span
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {copyState === "copied"
          ? "Path copied"
          : copyState === "error"
            ? "Could not copy path"
            : ""}
      </span>
    </>
  );
}
