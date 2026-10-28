export interface ValidatedWorldGlbFile {
  fileName: string;
  buffer: ArrayBuffer;
}

/** Reads a selected GLB and validates its glTF 2.0 binary header. */
export async function readAndValidateWorldGlbFile(
  file: File,
): Promise<ValidatedWorldGlbFile> {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("A valid File instance must be provided to prepareWorldGlbAsset.");
  }

  const fileName = (file.name || "").trim();
  if (!fileName.toLowerCase().endsWith(".glb")) {
    throw new Error(
      `Unsupported file extension for "${fileName || "unnamed"}". Only binary glTF (.glb) files are supported.`,
    );
  }
  if (file.size <= 0) {
    throw new Error(`Invalid GLB file "${fileName}": file is empty (0 bytes).`);
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read file data from "${fileName}": ${message}`);
  }

  if (buffer.byteLength < 12) {
    throw new Error(
      `Invalid GLB binary: "${fileName}" is ${buffer.byteLength} bytes, smaller than the required 12-byte header.`,
    );
  }

  const dataView = new DataView(buffer);
  const magic = dataView.getUint32(0, true);
  const gltfMagic = 0x46546c67;
  if (magic !== gltfMagic) {
    throw new Error(
      `Invalid GLB binary: "${fileName}" lacks the glTF magic header (found 0x${magic.toString(16)}, expected 0x${gltfMagic.toString(16)}).`,
    );
  }

  const version = dataView.getUint32(4, true);
  if (version !== 2) {
    throw new Error(
      `Unsupported GLB version ${version} in "${fileName}". Only glTF 2.0 binary (.glb) files are supported.`,
    );
  }

  const declaredLength = dataView.getUint32(8, true);
  if (declaredLength !== buffer.byteLength) {
    throw new Error(
      `Malformed GLB binary: "${fileName}" header declares ${declaredLength} bytes, but file buffer is ${buffer.byteLength} bytes.`,
    );
  }

  return { fileName, buffer };
}
