export interface MapDataSelectionFile {
  id: string;
  name: string;
  type: "boundary" | "scene";
  content: string;
}

export function resolveMapDataDatasetSelection<
  TFile extends MapDataSelectionFile,
  TLayer,
  TTerrain,
>(
  files: readonly TFile[],
  parseScene: (content: string, name: string) => TLayer | null,
  parseTerrain: (content: string, name: string) => TTerrain | null,
  retainedTerrain: TTerrain | null,
) {
  const sceneFiles = files.filter(
    (file) => file.type === "scene" && parseScene(file.content, file.name),
  );
  const datasetTerrain =
    files
      .map((file) => parseTerrain(file.content, file.name))
      .find((terrain) => terrain !== null) ?? null;
  const sceneFile = sceneFiles[0] ?? null;
  const layer = sceneFile
    ? parseScene(sceneFile.content, sceneFile.name)
    : null;
  const sceneTerrain = sceneFile
    ? parseTerrain(sceneFile.content, sceneFile.name)
    : null;

  if (!sceneFile && !datasetTerrain) {
    throw new Error("This dataset has no supported map feature layer.");
  }
  if (!layer && !datasetTerrain) {
    throw new Error(
      "This scene has no supported building, tree or landmark geometry.",
    );
  }

  return {
    sceneFiles,
    sceneFile,
    layer,
    datasetTerrain: datasetTerrain ?? sceneTerrain,
    terrain: sceneTerrain ?? datasetTerrain ?? retainedTerrain,
  };
}
