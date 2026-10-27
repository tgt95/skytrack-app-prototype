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

const SHORTCUT_GROUPS: {
  title: string;
  shortcuts: { keys: string; what: string }[];
}[] = [
  {
    title: "Workspace & tools",
    shortcuts: [
      { keys: "1 / 2", what: "Design / Simulation stage" },
      {
        keys: "A / R / N / H",
        what: "Area / Route / Avoid-zone / Home tool (Design)",
      },
      { keys: "C", what: "Toggle Design / Code view (Design)" },
      {
        keys: "Esc",
        what: "Close settings, cancel drawing, then clear selection",
      },
    ],
  },
  {
    title: "Simulation",
    shortcuts: [
      { keys: "Space", what: "Start / Abort simulation" },
      { keys: "P", what: "Pause / Resume simulation" },
      { keys: "D / E", what: "Mission details / Events tab" },
      { keys: "L", what: "Go to Console tab, Code mode only" },
      { keys: "V", what: "Toggle LiDAR preview" },
    ],
  },
  {
    title: "Scene & view",
    shortcuts: [
      { keys: "+ / −", what: "Zoom 3D scene" },
      { keys: "0", what: "Reset camera" },
      { keys: "F", what: "Focus vehicle / selected point" },
      { keys: "\\", what: "Collapse / expand inspector" },
    ],
  },
  {
    title: "Editing & history",
    shortcuts: [
      { keys: "Delete", what: "Delete selection (Design)" },
      {
        keys: "Z + drag · ⇧ + drag · drag",
        what: "Waypoint altitude (Z or Shift, ground-clamped) · move waypoint, Z kept (Design)",
      },
      { keys: "Ctrl/⌘+S", what: "Save local state" },
      { keys: "Ctrl/⌘+Z · ⇧+Ctrl/⌘+Z", what: "Undo / redo design edit" },
    ],
  },
];

interface ShortcutsDialogProps {
  restoreDialogFocus: () => HTMLElement | null;
  shortcutsOpen: boolean;
  onShortcutsOpenChange: (open: boolean) => void;
}

export function ShortcutsDialog({
  restoreDialogFocus,
  shortcutsOpen,
  onShortcutsOpenChange,
}: ShortcutsDialogProps) {
  return (
    <Dialog open={shortcutsOpen} onOpenChange={onShortcutsOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup
          aria-label="Keyboard shortcuts"
          finalFocus={restoreDialogFocus}
          className=" w-[min(56rem,calc(100vw-2rem))] max-w-none max-h-[calc(100dvh-2rem)] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle className="heading">Keyboard shortcuts</DialogTitle>
            <DialogDescription>
              Shortcuts are ignored while typing in fields or the code editor.
            </DialogDescription>
          </DialogHeader>
          <div
            className=" grid grid-cols-[minmax(0,1fr)] gap-5"
            data-testid="ms-shortcut-groups"
          >
            {SHORTCUT_GROUPS.map((group) => (
              <section
                key={group.title}
                className=" min-w-0"
                aria-labelledby={`ms-shortcuts-${group.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}
                data-testid="ms-shortcut-group"
              >
                <h3
                  id={`ms-shortcuts-${group.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}
                  className="heading mt-0 mx-0 mb-2.5 pt-2.5 border-t border-t-border text-[0.9375rem] font-semibold leading-[1.4]"
                >
                  {group.title}
                </h3>
                <ul className="ms-shortcuts [list-style:none] m-0 p-0 flex flex-col gap-2.5">
                  {group.shortcuts.map((shortcut) => (
                    <li
                      key={shortcut.keys}
                      className={
                        ' flex min-w-0 gap-3 items-center justify-between text-sm leading-[1.4] **:data-[slot="badge-count"]:flex-[0_0_auto] **:data-[slot="badge-count"]:whitespace-nowrap'
                      }
                      data-testid="ms-shortcut-row"
                    >
                      <span>{shortcut.what}</span>
                      <Badge count={shortcut.keys} status="outline" />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <DialogFooter>
            <DialogClose className="w-auto flex-[0_0_auto]">Close</DialogClose>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
