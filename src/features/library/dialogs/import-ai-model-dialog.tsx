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
import {
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldRoot,
} from "skytrack-ui/field";
import { Dropzone } from "skytrack-ui/dropzone";

export interface ImportedAIModelPackage {
  name: string;
  fileName: string;
  fileSize: number;
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function nameFromFile(fileName: string): string {
  return fileName
    .replace(/\.zip$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

export function ImportAIModelDialog({
  open,
  existingNames,
  onClose,
  onImport,
}: {
  open: boolean;
  existingNames: string[];
  onClose: () => void;
  onImport: (model: ImportedAIModelPackage) => boolean;
}) {
  const [modelName, setModelName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (!open) return;
    setModelName("");
    setFile(null);
    setFileError("");
    setNameError("");
  }, [open]);

  const pickFile = (candidate?: File) => {
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith(".zip")) {
      setFile(null);
      setFileError("Choose a ZIP file.");
      return;
    }
    setFile(candidate);
    setFileError("");
    if (!modelName.trim()) setModelName(nameFromFile(candidate.name));
  };

  const hasDuplicate = Boolean(
    modelName.trim() &&
    existingNames.some(
      (name) =>
        name.trim().toLocaleLowerCase() ===
        modelName.trim().toLocaleLowerCase(),
    ),
  );

  const submit = () => {
    const cleanName = modelName.trim();
    const duplicate = existingNames.some(
      (name) =>
        name.trim().toLocaleLowerCase() === cleanName.toLocaleLowerCase(),
    );
    setNameError(
      !cleanName
        ? "Enter a model name."
        : duplicate
          ? "A model with this name already exists in this Workspace."
          : "",
    );
    if (!cleanName || duplicate || !file) {
      if (!file) setFileError("Choose a ZIP file.");
      return;
    }
    if (onImport({ name: cleanName, fileName: file.name, fileSize: file.size }))
      onClose();
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
        <DialogPopup aria-label="Import AI models">
          <DialogHeader>
            <DialogTitle className="heading">Import AI models</DialogTitle>
            <DialogDescription>
              Add an ONNX model package and JSON class map to your uploaded
              models.
            </DialogDescription>
          </DialogHeader>
          <FieldRoot invalid={Boolean(nameError) || hasDuplicate}>
            <FieldLabel>Model name *</FieldLabel>
            <FieldControl
              autoFocus
              required
              value={modelName}
              onValueChange={(value: unknown) => {
                setModelName(String(value));
                setNameError("");
              }}
              placeholder="Enter a model name"
              aria-invalid={Boolean(nameError) || hasDuplicate}
            />
            {nameError || hasDuplicate ? (
              <FieldError match={true}>
                {nameError ||
                  "A model with this name already exists in this Workspace."}
              </FieldError>
            ) : null}
          </FieldRoot>
          <FieldRoot invalid={Boolean(fileError)}>
            <FieldLabel id="ms-ai-model-file-label">Model file *</FieldLabel>
            <Dropzone
              className="w-full"
              accept=".zip,application/zip"
              multiple={false}
              aria-labelledby="ms-ai-model-file-label"
              data-testid="ms-ai-model-file-dropzone"
              buttonLabel={file ? "Choose another ZIP" : "Choose ZIP file"}
              hint="Choose a ZIP file containing one ONNX model and one JSON class map."
              onFilesSelected={(files) => pickFile(files[0])}
            />
            {file ? (
              <FieldDescription>
                Selected: {file.name} ({formatFileSize(file.size)}){" "}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFile(null);
                    setFileError("");
                  }}
                >
                  Remove file
                </Button>
              </FieldDescription>
            ) : null}
            {fileError ? (
              <FieldError match={true}>{fileError}</FieldError>
            ) : null}
            <FieldDescription>
              The class order in the ONNX model and JSON file must match.
            </FieldDescription>
          </FieldRoot>
          <DialogFooter>
            <DialogClose className="w-auto flex-[0_0_auto]">Cancel</DialogClose>
            <Button
              size="sm"
              variant="default"
              disabled={!file || hasDuplicate}
              onClick={submit}
              className="w-auto flex-[0_0_auto]"
            >
              Import model
            </Button>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
