/* Route-local library dialogs. Data and persistence remain owned by StudioLibrary. */

import { useEffect, useState } from "react";
import { CopyIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
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
  FieldControl,
  FieldError,
  FieldLabel,
  FieldRoot,
} from "skytrack-ui/field";
import {
  Select,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "skytrack-ui/select";
import type { LibProject } from "./database/store";

export function MissionDialog({
  dlg,
  onClose,
  onSubmit,
}: {
  dlg: {
    mode: "rename";
    projectId: string;
    missionId: string;
    initialName: string;
  } | null;
  onClose: () => void;
  onSubmit: (title: string) => void;
}) {
  const [title, setTitle] = useState("");
  const canSubmit =
    dlg !== null && title.trim() !== "" && title !== dlg.initialName;
  const doSubmit = () => {
    if (dlg && canSubmit) onSubmit(title.trim());
  };
  const key = dlg ? `${dlg.missionId}-${dlg.initialName}` : "closed";
  return (
    <Dialog
      open={dlg !== null}
      onOpenChange={(v: boolean) => {
        if (!v) onClose();
      }}
    >
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup aria-label="Update mission">
          <DialogHeader>
            <DialogTitle>Update Mission</DialogTitle>
          </DialogHeader>
          {dlg ? (
            <MissionDialogForm
              key={key}
              initialTitle={dlg.initialName}
              title={title}
              setTitle={setTitle}
              onCommit={doSubmit}
            />
          ) : null}
          <DialogFooter>
            <DialogClose className="w-auto flex-[0_0_auto]">Cancel</DialogClose>
            <Button
              size="sm"
              variant="default"
              disabled={!canSubmit}
              onClick={doSubmit}
              className="w-auto flex-[0_0_auto]"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}

function MissionDialogForm({
  initialTitle,
  title,
  setTitle,
  onCommit,
}: {
  initialTitle: string;
  title: string;
  setTitle: (v: string) => void;
  onCommit: () => void;
}) {
  useEffect(() => {
    setTitle(initialTitle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="ms-lib-form">
      <FieldRoot name="mission-title">
        <FieldLabel>Mission title</FieldLabel>
        <FieldControl
          value={title}
          onValueChange={(v) => setTitle(typeof v === "string" ? v : "")}
          placeholder="e.g. Facade inspection"
          maxLength={120}
          aria-label="Mission title"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onCommit();
            }
          }}
        />
      </FieldRoot>
    </div>
  );
}

export function ProjectDialog({
  dlg,
  onClose,
  onSubmit,
}: {
  dlg:
    | { mode: "create" }
    | { mode: "rename"; projectId: string; initialName: string }
    | null;
  onClose: () => void;
  onSubmit: (title: string) => void;
}) {
  const [title, setTitle] = useState("");
  const key = dlg
    ? `${dlg.mode}-${dlg.mode === "rename" ? dlg.initialName : "new"}`
    : "closed";
  useEffect(() => {
    setTitle(dlg && dlg.mode === "rename" ? dlg.initialName : "");
  }, [key, dlg]);
  const unchanged =
    dlg !== null && dlg.mode === "rename" && title === dlg.initialName;
  const canSubmit = title.trim() !== "" && !unchanged;
  const doSubmit = () => {
    if (canSubmit) onSubmit(title.trim());
  };
  return (
    <Dialog
      open={dlg !== null}
      onOpenChange={(v: boolean) => {
        if (!v) onClose();
      }}
    >
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup
          aria-label={dlg?.mode === "rename" ? "Update project" : "New project"}
        >
          <DialogHeader>
            <DialogTitle>
              {dlg?.mode === "rename" ? "Update Project" : "New Project"}
            </DialogTitle>
            <DialogDescription>
              {dlg?.mode === "rename"
                ? ""
                : "Create project to manage your missions"}
            </DialogDescription>
          </DialogHeader>
          <div className="ms-lib-form" key={key}>
            <FieldRoot name="project-title">
              <FieldLabel>Project title</FieldLabel>
              <FieldControl
                value={title}
                onValueChange={(v) => setTitle(typeof v === "string" ? v : "")}
                placeholder="e.g. Downtown surveys"
                maxLength={120}
                aria-label="Project title"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    doSubmit();
                  }
                }}
              />
            </FieldRoot>
          </div>
          <DialogFooter>
            <DialogClose className="w-auto flex-[0_0_auto]">Cancel</DialogClose>
            <Button
              size="sm"
              variant="default"
              disabled={!canSubmit}
              onClick={doSubmit}
              className="w-auto flex-[0_0_auto]"
            >
              {dlg?.mode === "rename" ? "Save" : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}

function isEmailLike(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function ShareDialog({
  dlg,
  onClose,
  onSubmit,
}: {
  dlg: { projectId: string; missionId: string; name: string } | null;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [email, setEmail] = useState("");
  useEffect(() => {
    setEmail("");
  }, [dlg]);
  const valid = isEmailLike(email);
  return (
    <Dialog
      open={dlg !== null}
      onOpenChange={(v: boolean) => {
        if (!v) onClose();
      }}
    >
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup aria-label="Share mission">
          <DialogHeader>
            <DialogTitle>Share mission</DialogTitle>
            <DialogDescription>
              {dlg ? <>Invite someone to &ldquo;{dlg.name}&rdquo;.</> : null}
            </DialogDescription>
          </DialogHeader>
          <div className="ms-lib-form">
            <FieldRoot
              name="share-email"
              validationMode="onChange"
              validate={(v) => {
                const text = typeof v === "string" ? v : "";
                if (text.length > 0 && !isEmailLike(text))
                  return "Enter a valid email address";
                return undefined;
              }}
            >
              <FieldLabel>Email</FieldLabel>
              <FieldControl
                value={email}
                onValueChange={(v) => setEmail(typeof v === "string" ? v : "")}
                placeholder="teammate@example.com"
                maxLength={254}
                aria-label="Email"
              />
              <FieldError />
            </FieldRoot>
            <div className="ms-field">
              <span className="ms-field-label" id="ms-lib-share-perm-label">
                Permission
              </span>
              <Select value="view-only" onValueChange={() => undefined}>
                <SelectTrigger
                  aria-labelledby="ms-lib-share-perm-label"
                  className="ms-lib-select"
                >
                  <SelectValue>View only</SelectValue>
                </SelectTrigger>
                <SelectPortal>
                  <SelectPositioner>
                    <SelectPopup>
                      <SelectList>
                        <SelectItem value="view-only">
                          <SelectItemIndicator />
                          <SelectItemText>View only</SelectItemText>
                        </SelectItem>
                      </SelectList>
                    </SelectPopup>
                  </SelectPositioner>
                </SelectPortal>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose className="w-auto flex-[0_0_auto]">Cancel</DialogClose>
            <Button
              size="sm"
              variant="default"
              disabled={!valid}
              onClick={onSubmit}
              className="w-auto flex-[0_0_auto]"
            >
              Share Mission
            </Button>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}

export function CloneProjectPicker({
  projects,
  onPick,
  onNewProject,
}: {
  projects: LibProject[];
  onPick: (projectId: string) => void;
  onNewProject: () => void;
}) {
  const [pid, setPid] = useState(projects[0]?.id ?? "");
  return (
    <div className="ms-lib-form">
      <div className="ms-field">
        <span className="ms-field-label" id="ms-lib-clone-project-label">
          Project
        </span>
        <Select
          value={pid}
          onValueChange={(v) => setPid(typeof v === "string" ? v : String(v))}
        >
          <SelectTrigger
            aria-labelledby="ms-lib-clone-project-label"
            className="ms-lib-select"
          >
            <SelectValue placeholder="Select a project">
              {projects.find((p) => p.id === pid)?.name ?? ""}
            </SelectValue>
          </SelectTrigger>
          <SelectPortal>
            <SelectPositioner>
              <SelectPopup>
                <SelectList>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <SelectItemIndicator />
                      <SelectItemText>{p.name}</SelectItemText>
                    </SelectItem>
                  ))}
                </SelectList>
              </SelectPopup>
            </SelectPositioner>
          </SelectPortal>
        </Select>
      </div>
      <div className="ms-btnrow">
        <Button
          size="sm"
          variant="default"
          disabled={pid === ""}
          onClick={() => onPick(pid)}
        >
          <CopyIcon aria-hidden="true" /> Clone here
        </Button>
        <Button size="sm" variant="outline" onClick={onNewProject}>
          <PlusIcon aria-hidden="true" /> New project
        </Button>
      </div>
    </div>
  );
}
