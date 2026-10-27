import { useEffect, useState } from "react";
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
import { FieldControl, FieldLabel, FieldRoot } from "skytrack-ui/field";
import {
  Select,
  SelectIcon,
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
import type {
  ResourceStatus,
  WorkspaceWorldRecord,
  WorldSourceType,
} from "../database/workspace-resources-store";

const RESOURCE_STATUSES: ResourceStatus[] = [
  "Sample",
  "Draft",
  "Registered",
  "Archived",
];
const WORLD_SOURCE_TYPES: { value: WorldSourceType; label: string }[] = [
  { value: "none", label: "No source yet" },
  { value: "mission", label: "Saved 2D mission" },
  { value: "flight-reference", label: "User-entered flight reference" },
];

function TextField({
  label,
  value,
  placeholder,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <FieldRoot className="ms-field">
      <FieldLabel>{label}</FieldLabel>
      <FieldControl
        value={value}
        onValueChange={(next: unknown) => onChange(String(next))}
        placeholder={placeholder}
        required={required}
      />
    </FieldRoot>
  );
}

function StatusField({
  value,
  onChange,
}: {
  value: ResourceStatus;
  onChange: (value: ResourceStatus) => void;
}) {
  return (
    <FieldRoot className="ms-field">
      <FieldLabel>Status</FieldLabel>
      <Select<ResourceStatus>
        items={RESOURCE_STATUSES.map((status) => ({
          value: status,
          label: status,
        }))}
        value={value}
        onValueChange={(next: unknown) =>
          onChange(String(next) as ResourceStatus)
        }
      >
        <SelectTrigger>
          <SelectValue />
          <SelectIcon />
        </SelectTrigger>
        <SelectPortal>
          <SelectPositioner side="bottom" align="start" sideOffset={4}>
            <SelectPopup>
              <SelectList>
                {RESOURCE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    <SelectItemIndicator />
                    <SelectItemText>{status}</SelectItemText>
                  </SelectItem>
                ))}
              </SelectList>
            </SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </Select>
    </FieldRoot>
  );
}

export interface SourceMissionOption {
  id: string;
  projectName: string;
  missionName: string;
}

export function WorldProfileDialog({
  open,
  mode,
  profile,
  sourceMissions,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: "create" | "edit";
  profile: WorkspaceWorldRecord | null;
  sourceMissions: SourceMissionOption[];
  onClose: () => void;
  onSave: (profile: WorkspaceWorldRecord) => void;
}) {
  const [draft, setDraft] = useState<WorkspaceWorldRecord | null>(profile);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(profile);
    setError("");
  }, [profile, open]);
  if (!draft) return null;

  const patch = (values: Partial<WorkspaceWorldRecord>) =>
    setDraft((current) => (current ? { ...current, ...values } : current));
  const save = () => {
    if (!draft.name.trim()) {
      setError("Enter a World name.");
      return;
    }
    if (draft.status === "Registered") {
      const hasSource =
        draft.sourceType === "mission"
          ? Boolean(draft.sourceMissionId)
          : draft.sourceType === "flight-reference" &&
            Boolean(draft.sourceFlightReference.trim());
      if (!hasSource || !draft.reconstructionReference.trim()) {
        setError(
          "A registered World needs a source 2D mission or flight reference and a reconstruction reference.",
        );
        return;
      }
    }
    onSave({ ...draft, name: draft.name.trim() });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value: boolean) => {
        if (!value) onClose();
      }}
    >
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup
          className=" sm:max-w-[760px] max-h-[min(90dvh,100%)] flex flex-col overflow-hidden"
          aria-label={
            mode === "create"
              ? "Add World"
              : `Edit ${profile?.name ?? draft.name}`
          }
        >
          <DialogHeader>
            <DialogTitle className="heading">
              {mode === "create"
                ? "Add World"
                : `Edit ${profile?.name ?? draft.name}`}
            </DialogTitle>
            <DialogDescription>
              Manage the source mission, location, and 3D reconstruction for
              this World.
            </DialogDescription>
          </DialogHeader>
          <div className="ms-drone-dialog-body">
            <section className="ms-drone-form-section">
              <div className="ms-drone-section-heading">
                <h2 className="heading m-0 text-sm font-semibold">
                  World details
                </h2>
                <p className="m-0 text-(--muted-foreground) text-xs leading-[1.5]">
                  Add the source mission and reconstruction reference for this
                  World.
                </p>
              </div>
              <div className="ms-drone-form-grid">
                <TextField
                  label="World name"
                  value={draft.name}
                  onChange={(name) => patch({ name })}
                  placeholder="e.g. East campus reconstruction"
                  required
                />
                <TextField
                  label="Location"
                  value={draft.location}
                  onChange={(location) => patch({ location })}
                  placeholder="Optional location"
                />
                <StatusField
                  value={draft.status}
                  onChange={(status) => patch({ status })}
                />
                <FieldRoot className="ms-field">
                  <FieldLabel>Source</FieldLabel>
                  <Select<WorldSourceType>
                    items={WORLD_SOURCE_TYPES}
                    value={draft.sourceType}
                    onValueChange={(next: unknown) =>
                      patch({
                        sourceType: String(next) as WorldSourceType,
                        sourceMissionId: "",
                        sourceMissionLabel: "",
                        sourceFlightReference: "",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                      <SelectIcon />
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectPositioner
                        side="bottom"
                        align="start"
                        sideOffset={4}
                      >
                        <SelectPopup>
                          <SelectList>
                            {WORLD_SOURCE_TYPES.map((source) => (
                              <SelectItem
                                key={source.value}
                                value={source.value}
                              >
                                <SelectItemIndicator />
                                <SelectItemText>{source.label}</SelectItemText>
                              </SelectItem>
                            ))}
                          </SelectList>
                        </SelectPopup>
                      </SelectPositioner>
                    </SelectPortal>
                  </Select>
                </FieldRoot>
                {draft.sourceType === "mission" ? (
                  <FieldRoot className="ms-field ms-drone-form-wide">
                    <FieldLabel>Source 2D mission</FieldLabel>
                    <Select<string>
                      items={sourceMissions.map((mission) => ({
                        value: mission.id,
                        label: `${mission.projectName} · ${mission.missionName}`,
                      }))}
                      value={draft.sourceMissionId}
                      onValueChange={(next: unknown) => {
                        const selected = sourceMissions.find(
                          (mission) => mission.id === String(next),
                        );
                        patch({
                          sourceMissionId: String(next),
                          sourceMissionLabel: selected
                            ? `${selected.projectName} · ${selected.missionName}`
                            : "",
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            sourceMissions.length
                              ? "Select a saved 2D mission"
                              : "No saved 2D missions in this Workspace"
                          }
                        />
                        <SelectIcon />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectPositioner
                          side="bottom"
                          align="start"
                          sideOffset={4}
                        >
                          <SelectPopup>
                            <SelectList>
                              {sourceMissions.map((mission) => (
                                <SelectItem key={mission.id} value={mission.id}>
                                  <SelectItemIndicator />
                                  <SelectItemText>
                                    {mission.projectName} ·{" "}
                                    {mission.missionName}
                                  </SelectItemText>
                                </SelectItem>
                              ))}
                            </SelectList>
                          </SelectPopup>
                        </SelectPositioner>
                      </SelectPortal>
                    </Select>
                  </FieldRoot>
                ) : null}
                {draft.sourceType === "flight-reference" ? (
                  <TextField
                    label="Flight reference"
                    value={draft.sourceFlightReference}
                    onChange={(sourceFlightReference) =>
                      patch({ sourceFlightReference })
                    }
                    placeholder="User-entered flight or mission reference"
                  />
                ) : null}
                <TextField
                  label="3D reconstruction reference"
                  value={draft.reconstructionReference}
                  onChange={(reconstructionReference) =>
                    patch({ reconstructionReference })
                  }
                  placeholder="URL or storage path; reference only"
                />
                <div className="ms-resource-note ms-drone-form-wide">
                  Source and reconstruction references are saved as text only.
                  No flight or reconstruction asset is verified.
                </div>
                <TextField
                  label="Note"
                  value={draft.note}
                  onChange={(note) => patch({ note })}
                  placeholder="Optional note"
                />
              </div>
            </section>
            {error ? (
              <p
                className=" m-0 text-(--muted-foreground) text-xs leading-[1.5] text-(--destructive)"
                role="alert"
                data-testid="ms-resource-error"
              >
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <DialogClose className="w-auto flex-[0_0_auto]">Cancel</DialogClose>
            <Button
              size="sm"
              variant="default"
              onClick={save}
              className="w-auto flex-[0_0_auto]"
            >
              {mode === "create" ? "Save World" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
