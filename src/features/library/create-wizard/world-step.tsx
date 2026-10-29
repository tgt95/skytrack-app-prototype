import { useState } from "react";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "skytrack-ui/attachment";
import {
  Dialog,
  DialogBackdrop,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "skytrack-ui/dialog";
import { Dropzone } from "skytrack-ui/dropzone";
import { RadioGroup, RadioRoot } from "skytrack-ui/radio";
import { Tabs, TabsList, TabsPanel, TabsTab } from "skytrack-ui/tabs";
import {
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldRoot,
} from "skytrack-ui/field";
import type { WorkspaceWorldRecord } from "../database/workspace-resources-store";

type WorldType = "2D" | "3D";

type WorldStepProps = {
  worldType: WorldType;
  onWorldTypeChange: (worldType: WorldType) => void;
  worlds: WorkspaceWorldRecord[];
  worldId: string;
  onWorldSelect: (worldId: string) => void;
  onImportWorld: (file: File, worldName: string) => Promise<void>;
  importingWorld: boolean;
  worldImportMessage: string | null;
  terrainFile: string | null;
  onTerrainFileSelect: (fileName: string) => void;
};

function fileNameAsWorldName(fileName: string) {
  return fileName
    .replace(/\.glb$/iu, "")
    .replace(/[_-]+/gu, " ")
    .trim();
}

export function WorldStep({
  worldType,
  onWorldTypeChange,
  worlds,
  worldId,
  onWorldSelect,
  onImportWorld,
  importingWorld,
  worldImportMessage,
  terrainFile,
  onTerrainFileSelect,
}: WorldStepProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [worldName, setWorldName] = useState("");
  const [worldFile, setWorldFile] = useState<File | null>(null);
  const [nameError, setNameError] = useState("");
  const [fileError, setFileError] = useState("");
  const [importError, setImportError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openImport = () => {
    setWorldName("");
    setWorldFile(null);
    setNameError("");
    setFileError("");
    setImportError("");
    setImportOpen(true);
  };

  const selectWorldFile = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setImportError("");
    if (!file.name.toLowerCase().endsWith(".glb")) {
      setWorldFile(null);
      setFileError("Choose a .glb file.");
      return;
    }
    setWorldFile(file);
    setFileError("");
    setWorldName((current) => current.trim() || fileNameAsWorldName(file.name));
  };

  const submitImport = async () => {
    const cleanName = worldName.trim();
    setNameError(cleanName ? "" : "Enter a World name.");
    setFileError(worldFile ? "" : "Choose a .glb file.");
    setImportError("");
    if (!cleanName || !worldFile) return;

    setSubmitting(true);
    try {
      await onImportWorld(worldFile, cleanName);
      setImportOpen(false);
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "The World could not be imported. Check the GLB file and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <TabsPanel value="2">
        <FieldRoot name={worldType}>
          <FieldLabel id="ms-wizard-worldtype-label">World type</FieldLabel>
          <Tabs
            value={worldType}
            onValueChange={(value) => {
              if (value === "2D" || value === "3D") {
                onWorldTypeChange(value);
              }
            }}
            data-testid="ms-wizard-mode-tabs"
            className="flex flex-col gap-4"
          >
            <TabsList
              variant="filled"
              aria-labelledby="ms-wizard-worldtype-label"
              data-testid="ms-wizard-toggle"
            >
              <TabsTab value="2D" variant="filled">
                2D
              </TabsTab>
              <TabsTab value="3D" variant="filled">
                3D
              </TabsTab>
            </TabsList>
            <TabsPanel value="2D" />
            <TabsPanel value="3D">
              <FieldRoot>
                <div className="flex w-full flex-row items-center justify-between gap-3">
                  <FieldLabel id="ms-wizard-world-label">World list</FieldLabel>
                  <Button
                    type="button"
                    size="sm"
                    variant="link"
                    disabled={importingWorld}
                    onClick={openImport}
                    data-testid="ms-wizard-import-world"
                  >
                    Import world
                  </Button>
                </div>
                <RadioGroup
                  value={worldId}
                  onValueChange={(value: unknown) =>
                    onWorldSelect(String(value))
                  }
                  aria-labelledby="ms-wizard-world-label"
                  className="w-full"
                >
                  {worlds.map((world) => (
                    <label
                      key={world.id}
                      className="block w-full cursor-pointer"
                    >
                      <Attachment
                        data-selected={world.id === worldId}
                        className="w-full gap-2.5 px-3 py-2.5 transition-colors hover:border-primary/60 data-[selected=true]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                      >
                        <AttachmentMedia>
                          <GlobeHemisphereWestIcon
                            aria-hidden="true"
                            className="size-5 text-muted-foreground"
                          />
                        </AttachmentMedia>
                        <AttachmentContent className="gap-1">
                          <AttachmentTitle>{world.name}</AttachmentTitle>
                          <AttachmentDescription className="w-fit rounded-(--radius-sm) bg-muted px-2 py-0.5 font-semibold">
                            {world.status}
                          </AttachmentDescription>
                        </AttachmentContent>
                        <RadioRoot
                          value={world.id}
                          aria-label={`${world.name} · ${world.status}`}
                        />
                      </Attachment>
                    </label>
                  ))}
                </RadioGroup>
                {worlds.length === 0 ? (
                  <FieldDescription>
                    Import a .glb file to add a 3D World. Imported files stay in
                    this browser.
                  </FieldDescription>
                ) : (
                  <FieldDescription>
                    Select a World or import a .glb file. Imported models will
                    replace the 3D World in the mission.
                  </FieldDescription>
                )}
                {importingWorld ? (
                  <FieldDescription role="status">
                    Importing the GLB and creating its local preview…
                  </FieldDescription>
                ) : null}
                {worldImportMessage ? (
                  <FieldDescription role="status">
                    {worldImportMessage}
                  </FieldDescription>
                ) : null}
              </FieldRoot>
            </TabsPanel>
          </Tabs>
        </FieldRoot>
        {worldType === "2D" ? (
          <FieldRoot name={worldType} data-testid="ms-wizard-dropzone">
            <FieldLabel id="ms-wizard-terrain-label">
              Terrain layer (Optional)
            </FieldLabel>
            <Dropzone
              className="w-full"
              data-testid="ms-wizard-filebtn"
              aria-labelledby="ms-wizard-terrain-label"
              hint={terrainFile ?? "Choose a file or drag it here to upload."}
              buttonLabel="Choose File"
              multiple={false}
              onFilesSelected={(files) => {
                const file = files[0];
                if (file) onTerrainFileSelect(file.name);
              }}
            />
          </FieldRoot>
        ) : null}
      </TabsPanel>

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          if (!open && submitting) return;
          setImportOpen(open);
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup
            aria-label="Import World"
            data-testid="ms-wizard-import-world-dialog"
          >
            <DialogHeader>
              <div className="flex items-center gap-3">
                {/* <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={submitting}
                  aria-label="Back to World list"
                  onClick={() => setImportOpen(false)}
                >
                  <ArrowLeftIcon aria-hidden="true" />
                </Button> */}
                <DialogTitle className="heading">Import World</DialogTitle>
              </div>
            </DialogHeader>
            <div className="ms-lib-form">
              <FieldRoot name="world-name" invalid={Boolean(nameError)}>
                <FieldLabel>World name *</FieldLabel>
                <FieldControl
                  autoFocus
                  required
                  value={worldName}
                  onValueChange={(value: unknown) => {
                    setWorldName(String(value));
                    setNameError("");
                  }}
                  placeholder="Enter a World name"
                  aria-label="World name"
                  data-testid="ms-wizard-world-name"
                />
                {nameError ? (
                  <FieldError match={true}>{nameError}</FieldError>
                ) : null}
              </FieldRoot>
              <FieldRoot
                invalid={Boolean(fileError || importError)}
                data-testid="ms-wizard-world-file-field"
              >
                <FieldLabel id="ms-wizard-world-file-label">
                  World file *
                </FieldLabel>
                <Dropzone
                  className="w-full"
                  accept=".glb,model/gltf-binary"
                  multiple={false}
                  disabled={submitting}
                  aria-labelledby="ms-wizard-world-file-label"
                  data-testid="ms-wizard-world-file-dropzone"
                  buttonLabel={
                    worldFile ? "Choose another GLB" : "Choose GLB file"
                  }
                  hint="Choose a .glb model or drop it here."
                  onFilesSelected={selectWorldFile}
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
                        setImportError("");
                      }}
                    >
                      Remove file
                    </Button>
                  </FieldDescription>
                ) : null}
                {fileError || importError ? (
                  <FieldError match={true}>
                    {fileError || importError}
                  </FieldError>
                ) : null}
              </FieldRoot>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                disabled={submitting}
                onClick={() => setImportOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                disabled={submitting}
                onClick={() => void submitImport()}
                data-testid="ms-wizard-import-world-submit"
              >
                {submitting ? "Importing…" : "Import world"}
              </Button>
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </>
  );
}
