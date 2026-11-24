import { useMemo, useState } from "react";
import {
  FileIcon,
  FileTextIcon,
  MapTrifoldIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import {
  Attachment,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "skytrack-ui/attachment";
import { CheckboxIndicator, CheckboxRoot } from "skytrack-ui/checkbox";
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
} from "skytrack-ui/drawer";
import { Dropzone } from "skytrack-ui/dropzone";
import {
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldRoot,
} from "skytrack-ui/field";
import type {
  MapDataFileRecord,
  MapDataPreflight,
} from "@/features/map-data/map-data";
import { MapDataPreview } from "@/features/map-data/map-data-preview";
import {
  inspectMapDataFile,
  loadBundledMapSpaceSample,
} from "@/features/map-data/map-data";

interface ImportFile extends MapDataPreflight {
  id: string;
  included: boolean;
}

function formatSize(bytes: number) {
  if (bytes === 0) return "0 B";
  return bytes < 1_000_000
    ? `${Math.max(1, Math.round(bytes / 1_000))} KB`
    : `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export function MapDataImportDrawer({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (name: string, files: MapDataFileRecord[]) => Promise<unknown>;
}) {
  const [datasetName, setDatasetName] = useState("");
  const [files, setFiles] = useState<ImportFile[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [fileError, setFileError] = useState("");
  const [nameError, setNameError] = useState("");

  const includedFiles = useMemo(
    () => files.filter((file) => file.included),
    [files],
  );
  const includedBytes = useMemo(
    () => includedFiles.reduce((sum, file) => sum + file.size, 0),
    [includedFiles],
  );
  const previewFile = includedFiles[0] ?? null;

  const reset = () => {
    setDatasetName("");
    setFiles([]);
    setErrors([]);
    setLoading(false);
    setImporting(false);
    setImportError("");
    setFileError("");
    setNameError("");
  };

  const addFiles = async (selected: File[]) => {
    setFileError("");
    setErrors([]);
    const nextFiles: ImportFile[] = [];
    const nextErrors: string[] = [];
    for (const file of selected) {
      if (
        files.some(
          (existing) =>
            existing.name === file.name && existing.size === file.size,
        )
      ) {
        nextErrors.push(`${file.name}: already selected.`);
        continue;
      }
      try {
        const result = await inspectMapDataFile(file);
        nextFiles.push({ ...result, id: crypto.randomUUID(), included: true });
      } catch (error) {
        nextErrors.push(
          error instanceof Error
            ? error.message
            : `${file.name} could not be read.`,
        );
      }
    }
    const allFiles = [...files, ...nextFiles];
    const bytes = allFiles.reduce((sum, file) => sum + file.size, 0);
    if (bytes > 50_000_000) {
      nextErrors.push(
        "Selected map data exceeds the 50 MB total limit. Remove files and try again.",
      );
    } else {
      setFiles(allFiles.slice(0, 100));
    }
    if (allFiles.length > 100) {
      nextErrors.push("Select up to 100 files at a time.");
    }
    setErrors(nextErrors);
  };

  const addSample = async () => {
    setLoading(true);
    setFileError("");
    setImportError("");
    try {
      await addFiles(await loadBundledMapSpaceSample());
      setDatasetName((value) => value.trim() || "Mission Studio map sample");
    } catch (error) {
      setFileError(
        error instanceof Error
          ? error.message
          : "Sample map data could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    const cleanName = datasetName.trim();
    const selected = files.filter((file) => file.included);
    const hasMapFeatureLayer = selected.some(
      (file) => file.type === "scene" && file.featureCount > 0,
    );
    setNameError(cleanName ? "" : "Enter a World name.");
    setFileError(
      selected.length === 0
        ? "Include at least one map layer."
        : hasMapFeatureLayer
          ? ""
          : "Include at least one map feature file. Elevation can be added separately in Step 2.",
    );
    setImportError("");
    if (!cleanName || selected.length === 0 || !hasMapFeatureLayer) return;
    setImporting(true);
    try {
      await onImport(
        cleanName,
        selected.map(
          ({
            id,
            name,
            type,
            size,
            featureCount,
            bbox,
            sceneSummary,
            content,
          }) => ({
            id,
            name,
            type,
            size,
            featureCount,
            bbox,
            sceneSummary,
            content,
          }),
        ),
      );
      reset();
      onOpenChange(false);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Map data could not be saved.",
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && importing) return;
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
      }}
    >
      <DrawerPortal>
        <DrawerBackdrop />
        <DrawerViewport side="right">
          <DrawerPopup
            side="right"
            className="flex h-full max-h-dvh w-[min(100vw,48rem)] flex-col overflow-hidden"
            aria-label="Import map data"
            data-testid="ms-map-data-import-drawer"
          >
            <DrawerContent className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
              <div className="shrink-0 border-b border-border px-6 py-5">
                <div className="flex items-start justify-between gap-4 max-sm:flex-col">
                  <div className="grid gap-1">
                    <DrawerTitle>Import map data</DrawerTitle>
                    <DrawerDescription>
                      Add building context from GeoJSON or GeoPackage, with
                      optional terrain from GeoTIFF or Cloud Optimized GeoTIFF.
                      Files stay in this browser.
                    </DrawerDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading || importing}
                    onClick={addSample}
                    data-testid="ms-mapspace-sample"
                  >
                    <MapTrifoldIcon aria-hidden="true" />
                    {loading ? "Loading sample…" : "Use sample map data"}
                  </Button>
                </div>
              </div>
              <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-6">
                <section
                  className="grid gap-3"
                  aria-labelledby="ms-map-source-title"
                >
                  <h2
                    id="ms-map-source-title"
                    className="text-lg font-medium text-(--foreground)"
                  >
                    Source files
                  </h2>
                  <Dropzone
                    accept=".geojson,.gpkg,.json,.tif,.tiff,application/geo+json,application/json,application/geopackage+sqlite3,image/tiff"
                    multiple
                    disabled={loading || importing || files.length >= 100}
                    buttonLabel="Choose files"
                    hint="Drop GeoJSON, GeoPackage, or GeoTIFF files · up to 25 MB per file, 50 MB total, 100 files"
                    onFilesSelected={addFiles}
                    data-testid="ms-map-data-dropzone"
                  />
                  <FieldRoot>
                    <FieldDescription>
                      Include at least one map feature file; add an elevation
                      GeoTIFF in the same dataset or separately in Step 2.
                      Buildings and trees appear as simplified 3D context. For a
                      separate 3D model, use Create Mission → World → 3D →
                      Import world.
                    </FieldDescription>
                  </FieldRoot>
                  <FieldRoot>
                    <FieldDescription>
                      The sample adds seven selectable landmark scenes across Ho
                      Chi Minh City, Da Nang and Hanoi, plus Vietnam province
                      boundaries. Six new scenes include OpenStreetMap context
                      and GEDTM30 elevation grids.
                    </FieldDescription>
                    {fileError ? <FieldError>{fileError}</FieldError> : null}
                    {errors.length > 0 ? (
                      <ul
                        className="m-0 grid gap-1 pl-5 text-sm text-destructive"
                        role="alert"
                      >
                        {errors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    ) : null}
                  </FieldRoot>
                </section>

                <section
                  className="grid gap-3"
                  aria-labelledby="ms-map-layers-title"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2
                      id="ms-map-layers-title"
                      className="text-lg font-medium text-(--foreground)"
                    >
                      Detected layers
                    </h2>
                    <Badge
                      count={includedFiles.length}
                      status="secondary"
                      size="sm"
                      className="rounded-(--radius)"
                    />
                  </div>
                  {files.length === 0 ? (
                    <p className="m-0 text-sm text-muted-foreground">
                      Choose files to see their type, coverage and feature
                      count.
                    </p>
                  ) : (
                    <div
                      className="grid gap-2"
                      role="list"
                      aria-label="Detected map data files"
                    >
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
                          role="listitem"
                        >
                          <FieldRoot className="min-w-0">
                            <FieldLabel className="m-0 flex min-w-0 cursor-pointer items-center gap-3">
                              <CheckboxRoot
                                checked={file.included}
                                onCheckedChange={(checked) =>
                                  setFiles((current) =>
                                    current.map((item) =>
                                      item.id === file.id
                                        ? {
                                            ...item,
                                            included: Boolean(checked),
                                          }
                                        : item,
                                    ),
                                  )
                                }
                                aria-label={`Include ${file.name}`}
                              >
                                <CheckboxIndicator />
                              </CheckboxRoot>
                              <Attachment
                                className="min-w-0 flex-1"
                                size="sm"
                                state="done"
                              >
                                <AttachmentMedia>
                                  {file.type === "boundary" ? (
                                    <FileIcon aria-hidden="true" />
                                  ) : (
                                    <FileTextIcon aria-hidden="true" />
                                  )}
                                </AttachmentMedia>
                                <AttachmentContent className="min-w-0">
                                  <AttachmentTitle className="truncate">
                                    {file.name}
                                  </AttachmentTitle>
                                  <AttachmentDescription>
                                    {file.type === "boundary"
                                      ? "Map features"
                                      : file.sceneSummary?.buildings
                                        ? "Map features · 3D buildings"
                                        : "Elevation grid"}{" "}
                                    ·{" "}
                                    {file.sceneSummary
                                      ? `${file.sceneSummary.buildings} buildings · ${file.sceneSummary.roads} roads · ${file.sceneSummary.water} water · ${file.sceneSummary.trees} trees · `
                                      : ""}
                                    {formatSize(file.size)} ·{" "}
                                    {file.featureCount.toLocaleString()}{" "}
                                    features
                                  </AttachmentDescription>
                                </AttachmentContent>
                              </Attachment>
                            </FieldLabel>
                          </FieldRoot>
                          <AttachmentActions>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Remove ${file.name}`}
                              onClick={() =>
                                setFiles((current) =>
                                  current.filter((item) => item.id !== file.id),
                                )
                              }
                            >
                              <TrashIcon aria-hidden="true" />
                            </Button>
                          </AttachmentActions>
                        </div>
                      ))}
                    </div>
                  )}
                  <FieldRoot>
                    <FieldDescription>
                      {includedFiles.length} of {files.length} files included ·{" "}
                      {formatSize(includedBytes)}
                    </FieldDescription>
                  </FieldRoot>
                </section>

                <section
                  className="grid gap-3"
                  aria-labelledby="ms-map-preview-title"
                >
                  <h2
                    id="ms-map-preview-title"
                    className="text-lg font-medium text-(--foreground)"
                  >
                    Map preview
                  </h2>
                  {previewFile ? (
                    <div className="grid gap-2 rounded-(--radius) border border-border bg-muted/30 p-4">
                      <div className="flex items-center gap-2">
                        <MapTrifoldIcon
                          aria-hidden="true"
                          className="size-5 text-primary"
                        />
                        <span className="text-sm font-medium">
                          {previewFile.type === "boundary"
                            ? "Map features"
                            : previewFile.sceneSummary?.buildings
                              ? "Building footprints"
                              : "Elevation surface"}
                        </span>
                        {previewFile.terrain ? (
                          <Badge
                            count="Elevation"
                            status="secondary"
                            size="sm"
                            className="rounded-(--radius)"
                          />
                        ) : null}
                      </div>
                      <MapDataPreview file={previewFile} />
                      {previewFile.terrain ? (
                        <p className="m-0 text-sm text-muted-foreground">
                          {previewFile.terrain.gridSize} ×{" "}
                          {previewFile.terrain.gridSize} elevation samples ·{" "}
                          {previewFile.terrain.widthM} m coverage ·{" "}
                          {(
                            previewFile.terrain.widthM /
                            (previewFile.terrain.gridSize - 1)
                          ).toFixed(1)}{" "}
                          m sample spacing · vertical datum unverified
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="m-0 text-sm text-muted-foreground">
                      A geographic preview appears after a valid layer is
                      selected.
                    </p>
                  )}
                </section>

                <section
                  className="grid gap-3"
                  aria-labelledby="ms-map-dataset-title"
                >
                  <h2
                    id="ms-map-dataset-title"
                    className="text-lg font-medium text-(--foreground)"
                  >
                    Dataset details
                  </h2>
                  <FieldRoot name="dataset-name" invalid={Boolean(nameError)}>
                    <FieldLabel>Dataset name</FieldLabel>
                    <FieldControl
                      value={datasetName}
                      onValueChange={(value: unknown) => {
                        setDatasetName(String(value));
                        setNameError("");
                      }}
                      placeholder="e.g. Landmark 81 survey data"
                      aria-invalid={Boolean(nameError)}
                    />
                    {nameError ? (
                      <FieldError match={true}>{nameError}</FieldError>
                    ) : (
                      <FieldDescription>
                        Saved to this workspace's map datasets.
                      </FieldDescription>
                    )}
                  </FieldRoot>
                  {importError ? (
                    <p className="m-0 text-sm text-destructive" role="alert">
                      {importError}
                    </p>
                  ) : null}
                </section>
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
                <DrawerClose variant="secondary" disabled={importing}>
                  Cancel
                </DrawerClose>
                <Button
                  type="button"
                  disabled={
                    importing ||
                    includedFiles.length === 0 ||
                    !datasetName.trim()
                  }
                  onClick={submit}
                  data-testid="ms-map-data-import"
                >
                  {importing ? "Importing…" : "Import map data"}
                </Button>
              </div>
            </DrawerContent>
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}
