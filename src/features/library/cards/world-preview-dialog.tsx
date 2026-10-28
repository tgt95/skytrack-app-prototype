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
import type { WorkspaceWorldRecord } from "../database/workspace-resources-store";
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
          className="ms-world-preview-dialog"
          aria-label={`Preview ${world.name}`}
        >
          <DialogHeader>
            <DialogTitle className="heading">{world.name}</DialogTitle>
            <DialogDescription>
              3D World{world.location ? ` · ${world.location}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="ms-world-preview-layout">
            <WorldModelViewer
              assetId={world.glbAssetId}
              worldName={world.name}
            />
            <aside className="ms-world-preview-details">
              <h2 className="heading m-0 text-sm font-semibold">
                World details
              </h2>
              <dl className="ms-world-preview-meta">
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
          <DialogFooter>
            <DialogClose className="w-auto flex-[0_0_auto]">
              Close preview
            </DialogClose>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
