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
import { RequiredMarker } from "@/ui/components/required-marker";
import { Tabs, TabsList, TabsPanel, TabsTab } from "skytrack-ui/tabs";
import {
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldRoot,
} from "skytrack-ui/field";
import type {
  WorkspaceMapDatasetRecord,
  WorkspaceWorldRecord,
} from "@/features/library/database/workspace-resources-store";
import { loadMapDataAsset } from "@/features/library/database/world-map-data-store";
import { MapDataImportDrawer } from "@/features/library/dialogs/map-data-import-drawer";
import { resolveMapDataDatasetSelection } from "./map-data-dataset-selection";
import type { MapTerrainLayer } from "@/features/map-data/map-data";
import type { MapDataFileRecord } from "@/features/map-data/map-data";
import {
  inspectMapDataFile,
  parseMapTerrainLayer,
  parseMapSceneLayer,
} from "@/features/map-data/map-data";
import type { MissionMapSceneLayer } from "@/domain/mission-model";
import { TerrainLayerPreview } from "@/features/map-data/map-data-preview";

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
  terrainLayer: MapTerrainLayer | null;
  mapSceneLayer: MissionMapSceneLayer | null;
  onMapDatasetSelect: (
    layer: MissionMapSceneLayer | null,
    terrain: MapTerrainLayer | null,
  ) => void;
  mapDatasets: WorkspaceMapDatasetRecord[];
  onImportMapData: (
    name: string,
    files: MapDataFileRecord[],
  ) => Promise<WorkspaceMapDatasetRecord>;
};

function fileNameAsWorldName(fileName: string) {
  return fileName
    .replace(/\.glb$/iu, "")
    .replace(/[_-]+/gu, " ")
    .trim();
}

function mapSceneLabel(file: MapDataFileRecord) {
  try {
    const value = JSON.parse(file.content) as {
      scene?: {
        name?: string;
        locality?: string;
        landmarks?: { name?: string }[];
      };
    };
    const name = value.scene?.name ?? value.scene?.landmarks?.[0]?.name;
    if (name) {
      return `${name}${
        value.scene?.locality ? ` · ${value.scene.locality}` : ""
      }`;
    }
  } catch {
    // Use the filename for older scene records without display metadata.
  }
  return file.name;
}

function buildingHeightSummary(layer: MissionMapSceneLayer) {
  const buildingCount = layer.buildings.length;
  if (buildingCount === 0) return "";
  const withHeightData = layer.buildings.filter(
    (building) => building.heightLabel !== "unknown",
  ).length;
  if (withHeightData === 0)
    return "No building height data; blocks use default heights.";
  if (withHeightData === buildingCount)
    return `Height data available for all ${buildingCount} buildings.`;
  return `Height data available for ${withHeightData} of ${buildingCount} buildings; others use default heights.`;
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
  terrainLayer,
  mapSceneLayer,
  onMapDatasetSelect,
  mapDatasets,
  onImportMapData,
}: WorldStepProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [worldName, setWorldName] = useState("");
  const [worldFile, setWorldFile] = useState<File | null>(null);
  const [nameError, setNameError] = useState("");
  const [fileError, setFileError] = useState("");
  const [importError, setImportError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [terrainError, setTerrainError] = useState("");
  const [terrainFileName, setTerrainFileName] = useState("");
  const [selectedDatasetTerrain, setSelectedDatasetTerrain] =
    useState<MapTerrainLayer | null>(null);
  const [mapDatasetId, setMapDatasetId] = useState("");
  const [mapDataImportOpen, setMapDataImportOpen] = useState(false);
  const [mapSceneFiles, setMapSceneFiles] = useState<MapDataFileRecord[]>([]);
  const [selectedMapSceneId, setSelectedMapSceneId] = useState("");
  const [mapDatasetError, setMapDatasetError] = useState("");
  const [loadingMapDataset, setLoadingMapDataset] = useState(false);

  const selectMapDataset = async (
    datasetId: string,
    datasetOverride?: WorkspaceMapDatasetRecord,
  ) => {
    const retainedTerrain = selectedDatasetTerrain ? null : terrainLayer;
    setMapDatasetId(datasetId);
    setMapDatasetError("");
    setTerrainError("");
    setSelectedDatasetTerrain(null);
    if (!datasetId) {
      onMapDatasetSelect(null, retainedTerrain);
      if (!retainedTerrain) setTerrainFileName("");
      setMapSceneFiles([]);
      setSelectedMapSceneId("");
      return;
    }
    setMapSceneFiles([]);
    setSelectedMapSceneId("");
    const dataset =
      datasetOverride ?? mapDatasets.find((item) => item.id === datasetId);
    if (!dataset?.mapDataAssetId) return;
    setLoadingMapDataset(true);
    try {
      const asset = await loadMapDataAsset(dataset.mapDataAssetId);
      const files = asset?.files ?? [];
      const selection = resolveMapDataDatasetSelection(
        files,
        parseMapSceneLayer,
        parseMapTerrainLayer,
        retainedTerrain,
      );
      onMapDatasetSelect(selection.layer, selection.terrain);
      setSelectedDatasetTerrain(selection.datasetTerrain);
      setMapSceneFiles(selection.sceneFiles);
      setSelectedMapSceneId(selection.sceneFile?.id ?? "");
      if (selection.datasetTerrain)
        setTerrainFileName(selection.datasetTerrain.sourceFileName);
      else if (!retainedTerrain) setTerrainFileName("");
    } catch (error) {
      setMapDatasetId("");
      setSelectedDatasetTerrain(null);
      setMapSceneFiles([]);
      setSelectedMapSceneId("");
      onMapDatasetSelect(null, null);
      setMapDatasetError(
        error instanceof Error
          ? error.message
          : "Map data could not be loaded.",
      );
    } finally {
      setLoadingMapDataset(false);
    }
  };

  const importMapData = async (name: string, files: MapDataFileRecord[]) => {
    const dataset = await onImportMapData(name, files);
    await selectMapDataset(dataset.id, dataset);
    return dataset;
  };

  const selectMapScene = async (sceneId: string) => {
    const retainedTerrain = selectedDatasetTerrain ? null : terrainLayer;
    setSelectedMapSceneId(sceneId);
    const sceneFile = mapSceneFiles.find((item) => item.id === sceneId);
    if (!sceneFile) return;
    setMapDatasetError("");
    setLoadingMapDataset(true);
    try {
      const layer = parseMapSceneLayer(sceneFile.content, sceneFile.name);
      if (!layer) throw new Error("This scene has no supported map geometry.");
      const sceneTerrain = parseMapTerrainLayer(
        sceneFile.content,
        sceneFile.name,
      );
      onMapDatasetSelect(
        layer,
        sceneTerrain ?? selectedDatasetTerrain ?? retainedTerrain,
      );
      if (sceneTerrain) setTerrainFileName(sceneTerrain.sourceFileName);
      else if (selectedDatasetTerrain)
        setTerrainFileName(selectedDatasetTerrain.sourceFileName);
      else if (!retainedTerrain) setTerrainFileName("");
    } catch (error) {
      setMapDatasetError(
        error instanceof Error
          ? error.message
          : "Map scene could not be loaded.",
      );
    } finally {
      setLoadingMapDataset(false);
    }
  };

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
      <TabsPanel
        value="2"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
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
                          <AttachmentDescription className="w-fit rounded-(--radius) bg-muted px-2 py-0.5 font-semibold">
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
        <div className="flex flex-col gap-4">
          {worldType === "2D" ? (
            <FieldRoot>
              <div className="flex items-center justify-between gap-3">
                <FieldLabel id="ms-wizard-mapdata-label">
                  Map data (Optional)
                </FieldLabel>
                <Button
                  type="button"
                  size="sm"
                  variant="link"
                  onClick={() => setMapDataImportOpen(true)}
                  data-testid="ms-wizard-import-map-data"
                >
                  Import map data
                </Button>
              </div>
              <RadioGroup
                value={mapDatasetId || "none"}
                onValueChange={(value: unknown) =>
                  void selectMapDataset(
                    String(value) === "none" ? "" : String(value),
                  )
                }
                aria-labelledby="ms-wizard-mapdata-label"
                className="w-full"
              >
                <label className="block w-full cursor-pointer">
                  <Attachment
                    data-selected={!mapDatasetId}
                    className="w-full gap-2.5 px-3 py-2.5 transition-colors hover:border-primary/60 data-[selected=true]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                  >
                    <AttachmentContent className="gap-1">
                      <AttachmentTitle>No map dataset</AttachmentTitle>
                      <AttachmentDescription>
                        Start with a basemap
                      </AttachmentDescription>
                    </AttachmentContent>
                    <RadioRoot value="none" aria-label="No map dataset" />
                  </Attachment>
                </label>
                {mapDatasets.map((dataset) => (
                  <label
                    key={dataset.id}
                    className="block w-full cursor-pointer"
                  >
                    <Attachment
                      data-selected={dataset.id === mapDatasetId}
                      className="w-full gap-2.5 px-3 py-2.5 transition-colors hover:border-primary/60 data-[selected=true]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                    >
                      <AttachmentContent className="gap-1">
                        <AttachmentTitle>{dataset.name}</AttachmentTitle>
                        <AttachmentDescription>
                          {(dataset.mapDataFeatureCount ?? 0) > 0
                            ? `${dataset.mapDataFeatureCount} map features`
                            : "Map features"}
                          {dataset.mapDataHasTerrain
                            ? " · elevation data included"
                            : ""}
                        </AttachmentDescription>
                      </AttachmentContent>
                      <RadioRoot
                        value={dataset.id}
                        aria-label={`${dataset.name} map dataset`}
                      />
                    </Attachment>
                  </label>
                ))}
              </RadioGroup>
              <FieldDescription>
                Map features provide building, tree, and landmark context and
                center the mission on their coverage. OpenStreetMap is selected
                as the basemap by default. Choose Satellite in the map controls
                for aerial imagery.
              </FieldDescription>
              {loadingMapDataset ? (
                <FieldDescription role="status">
                  Loading map data…
                </FieldDescription>
              ) : null}
              {mapSceneFiles.length > 1 ? (
                <FieldRoot name="mission-map-scene">
                  <FieldLabel id="ms-wizard-map-scene-label">
                    Map area
                  </FieldLabel>
                  <Select
                    value={selectedMapSceneId}
                    onValueChange={(value) =>
                      void selectMapScene(String(value))
                    }
                  >
                    <SelectTrigger aria-labelledby="ms-wizard-map-scene-label">
                      <SelectValue placeholder="Choose a scene">
                        {mapSceneFiles.find(
                          (item) => item.id === selectedMapSceneId,
                        )
                          ? mapSceneLabel(
                              mapSceneFiles.find(
                                (item) => item.id === selectedMapSceneId,
                              )!,
                            )
                          : ""}
                      </SelectValue>
                      <SelectIcon />
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectPositioner>
                        <SelectPopup>
                          <SelectList>
                            {mapSceneFiles.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                <SelectItemIndicator />
                                <SelectItemText>
                                  {mapSceneLabel(item)}
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
              {mapDatasetError ? (
                <FieldError match={true} role="alert">
                  {mapDatasetError}
                </FieldError>
              ) : null}
              {mapSceneLayer ? (
                <FieldDescription role="status">
                  {mapSceneLayer.buildings.length} building footprints ·{" "}
                  {(mapSceneLayer.trees ?? []).length} trees ·{" "}
                  {mapSceneLayer.landmarks.length} landmark models
                  {buildingHeightSummary(mapSceneLayer)
                    ? ` · ${buildingHeightSummary(mapSceneLayer)}`
                    : ""}
                </FieldDescription>
              ) : null}
              {mapDatasets.length === 0 ? (
                <FieldDescription>
                  Import a map dataset to add local building, tree and elevation
                  layers.
                </FieldDescription>
              ) : null}
            </FieldRoot>
          ) : null}
          {worldType === "2D" ? (
            <FieldRoot
              name={worldType}
              invalid={Boolean(terrainError)}
              data-testid="ms-wizard-dropzone"
            >
              <FieldLabel id="ms-wizard-terrain-label">
                Elevation data{selectedDatasetTerrain ? "" : " (Optional)"}
              </FieldLabel>
              {selectedDatasetTerrain ? (
                <FieldDescription role="status">
                  Elevation is included with the selected map dataset. No
                  separate elevation file is needed.
                </FieldDescription>
              ) : (
                <>
                  <Dropzone
                    className="w-full"
                    data-testid="ms-wizard-filebtn"
                    aria-labelledby="ms-wizard-terrain-label"
                    accept=".tif,.tiff,image/tiff"
                    hint={
                      terrainFileName ||
                      "Choose an elevation GeoTIFF or COG file."
                    }
                    buttonLabel={
                      terrainFileName
                        ? "Replace elevation file"
                        : "Choose elevation file"
                    }
                    multiple={false}
                    onFilesSelected={async (files) => {
                      const file = files[0];
                      if (!file) return;
                      try {
                        const parsed = await inspectMapDataFile(file);
                        if (!parsed.terrain) {
                          throw new Error(
                            "This file does not contain a supported elevation grid.",
                          );
                        }
                        onMapDatasetSelect(
                          parsed.sceneLayer ?? mapSceneLayer,
                          parsed.terrain,
                        );
                        setTerrainFileName(file.name);
                        setTerrainError("");
                      } catch (error) {
                        setTerrainError(
                          error instanceof Error
                            ? error.message
                            : "Elevation data could not be read.",
                        );
                      }
                    }}
                  />
                  <FieldDescription>
                    Optional. Supports GeoTIFF and Cloud Optimized GeoTIFF
                    (.tif, .tiff). The map surface follows its elevation grid
                    within coverage and stays flat outside it. Vertical
                    reference: {terrainLayer?.verticalReference ?? "unverified"}
                    .
                  </FieldDescription>
                </>
              )}
              {terrainError ? (
                <FieldError match={true} role="alert">
                  {terrainError}
                </FieldError>
              ) : null}
              {terrainLayer ? (
                <div
                  className="grid gap-2"
                  role="status"
                  aria-label="Elevation data preview"
                >
                  <TerrainLayerPreview terrain={terrainLayer} />
                  <FieldDescription>
                    {terrainLayer.gridSize} × {terrainLayer.gridSize} samples ·{" "}
                    {terrainLayer.widthM} m coverage ·{" "}
                    {(
                      terrainLayer.widthM /
                      (terrainLayer.gridSize - 1)
                    ).toFixed(1)}{" "}
                    m sample spacing ·{" "}
                    {terrainLayer.elevationsM
                      .reduce(
                        (minimum, value) => Math.min(minimum, value),
                        Number.POSITIVE_INFINITY,
                      )
                      .toFixed(2)}{" "}
                    to{" "}
                    {terrainLayer.elevationsM
                      .reduce(
                        (maximum, value) => Math.max(maximum, value),
                        Number.NEGATIVE_INFINITY,
                      )
                      .toFixed(2)}{" "}
                    m elevation. This grid shapes the map surface inside its
                    coverage. Vertical reference:{" "}
                    {terrainLayer.verticalReference}.
                  </FieldDescription>
                </div>
              ) : null}
            </FieldRoot>
          ) : null}
        </div>
      </TabsPanel>

      <MapDataImportDrawer
        open={mapDataImportOpen}
        onOpenChange={setMapDataImportOpen}
        onImport={importMapData}
      />

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
            <div className="ms-lib-form flex flex-col gap-3 py-1 px-0">
              <FieldRoot name="world-name" invalid={Boolean(nameError)}>
                <FieldLabel>
                  World name <RequiredMarker />
                </FieldLabel>
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
                  World file <RequiredMarker />
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
            <DialogFooter className="flex-row flex-wrap items-center justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={submitting}
                onClick={() => setImportOpen(false)}
                size="default"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                disabled={submitting}
                onClick={() => void submitImport()}
                data-testid="ms-wizard-import-world-submit"
                size="default"
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
