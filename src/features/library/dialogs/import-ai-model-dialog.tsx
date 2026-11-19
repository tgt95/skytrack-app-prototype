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
import { RequiredMarker } from "@/ui/components/required-marker";

export interface ImportedAIModelPackage {
  name: string;
  description: string;
  fileName: string;
  fileSize: number;
  thumbnailDataUrl?: string;
}

async function createThumbnailDataUrl(file: File): Promise<string> {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();

    const maxWidth = 480;
    const maxHeight = 270;
    const scale = Math.min(
      1,
      maxWidth / image.naturalWidth,
      maxHeight / image.naturalHeight,
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Thumbnail canvas is unavailable.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.78, 0.68, 0.58]) {
      const thumbnail = canvas.toDataURL("image/jpeg", quality);
      if (thumbnail.length <= 120_000) return thumbnail;
    }
    throw new Error("Thumbnail is too large to store.");
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
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
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [nameError, setNameError] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailError, setThumbnailError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setModelName("");
    setDescription("");
    setFile(null);
    setFileError("");
    setNameError("");
    setThumbnailFile(null);
    setThumbnailError("");
    setIsSubmitting(false);
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

  const pickThumbnail = (candidate?: File) => {
    if (!candidate) return;
    const isImage = candidate.type.startsWith("image/");
    if (!isImage) {
      setThumbnailFile(null);
      setThumbnailError("Choose an image file for the thumbnail.");
      return;
    }
    if (candidate.size > 10 * 1024 * 1024) {
      setThumbnailFile(null);
      setThumbnailError("Choose an image smaller than 10 MB.");
      return;
    }
    setThumbnailFile(candidate);
    setThumbnailError("");
  };

  const hasDuplicate = Boolean(
    modelName.trim() &&
    existingNames.some(
      (name) =>
        name.trim().toLocaleLowerCase() ===
        modelName.trim().toLocaleLowerCase(),
    ),
  );

  const submit = async () => {
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
    setIsSubmitting(true);
    try {
      const thumbnailDataUrl = thumbnailFile
        ? await createThumbnailDataUrl(thumbnailFile)
        : undefined;
      if (
        onImport({
          name: cleanName,
          description: description.trim(),
          fileName: file.name,
          fileSize: file.size,
          thumbnailDataUrl,
        })
      ) {
        onClose();
      }
    } catch {
      setThumbnailError(
        "Thumbnail could not be processed. Choose another image.",
      );
    } finally {
      setIsSubmitting(false);
    }
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
            <FieldLabel>
              Model name <RequiredMarker />
            </FieldLabel>
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
          <FieldRoot>
            <FieldLabel>Description (optional)</FieldLabel>
            <FieldControl
              value={description}
              onValueChange={(value: unknown) => setDescription(String(value))}
              placeholder="Describe what this model detects"
              data-testid="ms-ai-model-description"
            />
          </FieldRoot>
          <FieldRoot invalid={Boolean(fileError)}>
            <FieldLabel id="ms-ai-model-file-label">
              Model file <RequiredMarker />
            </FieldLabel>
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
          <FieldRoot invalid={Boolean(thumbnailError)}>
            <FieldLabel id="ms-ai-model-thumbnail-label">
              Thumbnail (optional)
            </FieldLabel>
            <Dropzone
              className="w-full"
              accept="image/*"
              multiple={false}
              aria-labelledby="ms-ai-model-thumbnail-label"
              data-testid="ms-ai-model-thumbnail-dropzone"
              buttonLabel={
                thumbnailFile ? "Choose another image" : "Choose image"
              }
              hint="Choose an image thumbnail for this AI model."
              onFilesSelected={(files) => pickThumbnail(files[0])}
            />
            {thumbnailFile ? (
              <FieldDescription>
                Selected: {thumbnailFile.name} (
                {formatFileSize(thumbnailFile.size)}){" "}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setThumbnailFile(null);
                    setThumbnailError("");
                  }}
                >
                  Remove thumbnail
                </Button>
              </FieldDescription>
            ) : null}
            {thumbnailError ? (
              <FieldError match={true}>{thumbnailError}</FieldError>
            ) : null}
          </FieldRoot>
          <DialogFooter className="flex-row flex-wrap items-center justify-end">
            <DialogClose className="w-auto flex-[0_0_auto]">Cancel</DialogClose>
            <Button
              size="sm"
              variant="default"
              disabled={!file || hasDuplicate || isSubmitting}
              onClick={() => void submit()}
              className="w-auto flex-[0_0_auto]"
            >
              {isSubmitting ? "Importing model…" : "Import model"}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
