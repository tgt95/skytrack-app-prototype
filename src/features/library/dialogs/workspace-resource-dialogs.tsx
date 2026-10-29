import { useEffect, useState } from "react";
import { Button } from "skytrack-ui/button";
import { Dropzone } from "skytrack-ui/dropzone";
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
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldRoot,
} from "skytrack-ui/field";
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
  error,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
}) {
  return (
    <FieldRoot className="ms-field" invalid={Boolean(error)}>
      <FieldLabel>{label}</FieldLabel>
      <FieldControl
        value={value}
        onValueChange={(next: unknown) => onChange(String(next))}
        placeholder={placeholder}
        required={required}
      />
      {error ? <FieldError match={true}>{error}</FieldError> : null}
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
  onImportWorld,
}: {
  open: boolean;
  mode: "create" | "edit";
  profile: WorkspaceWorldRecord | null;
  sourceMissions: SourceMissionOption[];
  onClose: () => void;
  onSave: (profile: WorkspaceWorldRecord) => void;
  onImportWorld: (
    profile: WorkspaceWorldRecord,
    file: File,
    mode: "create" | "edit",
  ) => Promise<void>;
}) {
  const [draft, setDraft] = useState<WorkspaceWorldRecord | null>(profile);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [worldFile, setWorldFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDraft(profile);
    setError("");
    setNameError("");
    setWorldFile(null);
    setFileError("");
    setSubmitting(false);
  }, [profile, open]);
  if (!draft) return null;

  const patch = (values: Partial<WorkspaceWorldRecord>) =>
    setDraft((current) => (current ? { ...current, ...values } : current));
  const save = async () => {
    setError("");
    const hasName = Boolean(draft.name.trim());
    const hasFile = mode !== "create" || Boolean(worldFile);
    setNameError(hasName ? "" : "Enter a World name.");
    setFileError(hasFile ? "" : "Choose a .glb file.");
    if (!hasName || !hasFile) return;
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
    const cleanDraft = { ...draft, name: draft.name.trim() };
    if (worldFile) {
      setSubmitting(true);
      setError("");
      try {
        await onImportWorld(cleanDraft, worldFile, mode);
      } catch (importError) {
        setFileError(
          importError instanceof Error
            ? importError.message
            : "The World could not be imported. Check the GLB file and try again.",
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }
    onSave(cleanDraft);
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
          <div className="ms-drone-dialog-body flex-1">
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
              <div className="ms-drone-form-grid gap-2">
                <TextField
                  label="World name *"
                  value={draft.name}
                  onChange={(name) => {
                    patch({ name });
                    setNameError("");
                  }}
                  placeholder="e.g. East campus reconstruction"
                  required
                  error={nameError}
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
                <FieldRoot
                  className="ms-field ms-drone-form-wide"
                  invalid={Boolean(fileError)}
                >
                  <FieldLabel id="ms-world-glb-file-label">
                    {mode === "create" ? "World file *" : "World file"}
                  </FieldLabel>
                  {mode === "edit" && draft.glbFileName ? (
                    <FieldDescription>
                      Current file: {draft.glbFileName}
                      {draft.glbFileSize
                        ? ` · ${(draft.glbFileSize / 1_000_000).toFixed(1)} MB`
                        : ""}
                    </FieldDescription>
                  ) : null}
                  <Dropzone
                    className="w-full min-h-28 p-2"
                    accept=".glb,model/gltf-binary"
                    multiple={false}
                    disabled={submitting}
                    aria-labelledby="ms-world-glb-file-label"
                    data-testid="ms-world-glb-file-dropzone"
                    buttonLabel={
                      worldFile
                        ? "Choose another GLB"
                        : mode === "edit" && draft.glbFileName
                          ? "Replace GLB file"
                          : "Choose GLB file"
                    }
                    hint="Choose a .glb model or drop it here."
                    onFilesSelected={(files) => {
                      const file = files[0];
                      if (!file) return;
                      if (!file.name.toLowerCase().endsWith(".glb")) {
                        setWorldFile(null);
                        setFileError("Choose a .glb file.");
                        return;
                      }
                      setWorldFile(file);
                      setFileError("");
                      if (mode === "create" && !draft.name.trim()) {
                        patch({
                          name: file.name.replace(/\.glb$/iu, "").trim(),
                        });
                        setNameError("");
                      }
                    }}
                  />
                  {worldFile ? (
                    <FieldDescription>
                      Selected: {worldFile.name}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={submitting}
                        onClick={() => {
                          setWorldFile(null);
                          setFileError("");
                        }}
                      >
                        Remove file
                      </Button>
                    </FieldDescription>
                  ) : null}
                  {mode === "edit" && worldFile ? (
                    <FieldDescription
                      role="alert"
                      className="text-(--warning)"
                      data-testid="ms-world-glb-replacement-warning"
                    >
                      {draft.glbFileName
                        ? `Saving will replace ${draft.glbFileName} with ${worldFile.name}.`
                        : `Saving will add ${worldFile.name} to this World.`}
                    </FieldDescription>
                  ) : null}
                  {fileError ? (
                    <FieldError match={true}>{fileError}</FieldError>
                  ) : null}
                </FieldRoot>
                <div className="ms-resource-note ms-drone-form-wide">
                  {mode === "create"
                    ? "The GLB file is stored in this browser. Source and reconstruction references remain text only."
                    : "Source and reconstruction references are saved as text only. The GLB file is stored in this browser."}
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
            <DialogClose
              disabled={submitting}
              className="w-auto flex-[0_0_auto]"
            >
              Cancel
            </DialogClose>
            <Button
              size="sm"
              variant="default"
              onClick={save}
              disabled={submitting}
              className="w-auto flex-[0_0_auto]"
            >
              {submitting
                ? "Importing World…"
                : mode === "create"
                  ? "Save World"
                  : worldFile
                    ? draft.glbFileName
                      ? "Replace file & save"
                      : "Add file & save"
                    : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
