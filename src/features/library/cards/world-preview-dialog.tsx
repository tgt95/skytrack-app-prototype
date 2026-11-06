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
import type { WorkspaceWorldRecord } from "@/features/library/database/workspace-resources-store";
import { WorldModelViewer } from "./world-model-viewer";

function formatWorldSize(size: number | undefined): string {
  return typeof size === "number" && size > 0
    ? `${(size / 1_000_000).toFixed(1)} MB`
    : "—";
}

export function WorldPreviewDialog({
  world,
  onClose,
}: {
  world: WorkspaceWorldRecord | null;
  onClose: () => void;
}) {
  if (!world) return null;

  return (
    <Dialog
      open
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}
    >
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup
          className="ms-world-preview-dialog flex w-[min(96vw,68rem)] max-w-none max-h-[min(92dvh,52rem)] flex-col overflow-hidden"
          aria-label={`Preview ${world.name}`}
        >
          <DialogHeader>
            <DialogTitle className="heading">{world.name}</DialogTitle>
            <DialogDescription>
              3D World{world.location ? ` · ${world.location}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="ms-world-preview-layout grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(12rem,15rem)] gap-4 overflow-y-auto [@media_(max-width:_48rem)]:grid-cols-1">
            <WorldModelViewer
              assetId={world.glbAssetId}
              worldName={world.name}
            />
            <aside className="ms-world-preview-details min-w-0 border-l border-border pl-4 [@media_(max-width:_48rem)]:border-l-0 [@media_(max-width:_48rem)]:border-t [@media_(max-width:_48rem)]:border-border [@media_(max-width:_48rem)]:pt-3 [@media_(max-width:_48rem)]:pl-0">
              <h2 className="heading m-0 text-sm font-semibold">
                World details
              </h2>
              <dl className="ms-world-preview-meta mt-3 mb-0 grid gap-3 [&_div]:min-w-0 [&_dt]:text-xs [&_dt]:text-muted-foreground [&_dd]:mt-0.5 [&_dd]:mb-0 [&_dd]:break-words [&_dd]:text-sm [&_dd]:text-foreground">
                <div>
                  <dt>Location</dt>
                  <dd>{world.location || "Not set"}</dd>
                </div>
                <div>
                  <dt>File</dt>
                  <dd>{world.glbFileName || "No GLB attached"}</dd>
                </div>
                <div>
                  <dt>File size</dt>
                  <dd>{formatWorldSize(world.glbFileSize)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{world.status}</dd>
                </div>
                {world.sourceMissionLabel ? (
                  <div>
                    <dt>Source mission</dt>
                    <dd>{world.sourceMissionLabel}</dd>
                  </div>
                ) : null}
                {world.reconstructionReference ? (
                  <div>
                    <dt>Reconstruction</dt>
                    <dd>{world.reconstructionReference}</dd>
                  </div>
                ) : null}
              </dl>
            </aside>
          </div>
          <DialogFooter className="flex-row flex-wrap items-center justify-end">
            <DialogClose className="w-auto flex-[0_0_auto]">
              Close preview
            </DialogClose>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
