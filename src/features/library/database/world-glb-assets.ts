/**
 * World 3D GLB Asset Model and Native IndexedDB Persistence Store.
 *
 * Implements asset preparation, validation, 4:3 PNG thumbnail generation,
 * and isolated IndexedDB storage for SkyTrack Mission Studio custom 3D terrain/mesh worlds.
 */

export interface WorldGlbAsset {
  /** Stable unique asset ID provided by caller. */
  id: string;
  /** Original file name (e.g. "terrain-valley.glb"). */
  fileName: string;
  /** Size of the original GLB binary in bytes. */
  fileSize: number;
  /** The 3D model binary payload stored as a Blob. */
  model: Blob;
  /** Rendered 4:3 PNG preview thumbnail stored as a Blob. */
  thumbnail: Blob;
  /** Preview renderer version used to create the stored thumbnail. */
  thumbnailVersion?: number;
}

export const WORLD_GLB_DB_NAME = 'skytrack-mission-studio-world-glb-v1';
export const WORLD_GLB_DB_VERSION = 1;
export const WORLD_GLB_STORE_NAME = 'world_glb_assets';

let cachedDb: IDBDatabase | null = null;
let dbOpeningPromise: Promise<IDBDatabase> | null = null;

/**
 * Accesses native browser IndexedDB factory or throws an informative error if unavailable.
 */
function getIndexedDBFactory(): IDBFactory {
  const factory =
    typeof window !== 'undefined' && window.indexedDB
      ? window.indexedDB
      : typeof globalThis !== 'undefined' && globalThis.indexedDB
        ? globalThis.indexedDB
        : null;

  if (!factory) {
    throw new Error('IndexedDB storage is not available or is disabled in this environment.');
  }
  return factory;
}

/**
 * Closes the cached IndexedDB connection safely and resets internal references.
 */
export function closeWorldGlbDatabase(): void {
  if (cachedDb) {
    try {
      cachedDb.close();
    } catch {
      // Ignore errors on close
    }
    cachedDb = null;
  }
  dbOpeningPromise = null;
}

/**
 * Opens or reuses a versioned connection to the world GLB IndexedDB database.
 */
function openDatabase(): Promise<IDBDatabase> {
  if (cachedDb) {
    return Promise.resolve(cachedDb);
  }
  if (dbOpeningPromise) {
    return dbOpeningPromise;
  }

  let openingPromise: Promise<IDBDatabase>;
  openingPromise = new Promise<IDBDatabase>((resolve, reject) => {
    let wasBlocked = false;
    const clearOpening = () => {
      if (dbOpeningPromise === openingPromise) dbOpeningPromise = null;
    };
    let factory: IDBFactory;
    try {
      factory = getIndexedDBFactory();
    } catch (err) {
      dbOpeningPromise = null;
      return reject(err);
    }

    let request: IDBOpenDBRequest;
    try {
      request = factory.open(WORLD_GLB_DB_NAME, WORLD_GLB_DB_VERSION);
    } catch (err) {
      dbOpeningPromise = null;
      const message = err instanceof Error ? err.message : String(err);
      return reject(new Error(`Failed to initiate opening IndexedDB "${WORLD_GLB_DB_NAME}": ${message}`));
    }

    request.onblocked = () => {
      wasBlocked = true;
      clearOpening();
      reject(
        new Error(
          `IndexedDB "${WORLD_GLB_DB_NAME}" open operation is blocked. Please close other open tabs using this application.`
        )
      );
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WORLD_GLB_STORE_NAME)) {
        db.createObjectStore(WORLD_GLB_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      if (wasBlocked) {
        db.close();
        clearOpening();
        return;
      }
      cachedDb = db;

      db.onversionchange = () => {
        closeWorldGlbDatabase();
      };

      db.onclose = () => {
        if (cachedDb === db) {
          cachedDb = null;
          dbOpeningPromise = null;
        }
      };

      resolve(db);
    };

    request.onerror = () => {
      clearOpening();
      const error = request.error;
      reject(new Error(`Failed to open IndexedDB "${WORLD_GLB_DB_NAME}": ${error?.message || 'Unknown open error'}`));
    };
  });
  dbOpeningPromise = openingPromise;

  return openingPromise;
}

/**
 * Runs an action inside an IndexedDB transaction, waiting for transaction completion.
 */
async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, transaction: IDBTransaction) => Promise<T>
): Promise<T> {
  let db = await openDatabase();

  let tx: IDBTransaction;
  try {
    tx = db.transaction(WORLD_GLB_STORE_NAME, mode);
  } catch {
    // If the connection was invalidated or closed, attempt reconnect once
    closeWorldGlbDatabase();
    try {
      db = await openDatabase();
      tx = db.transaction(WORLD_GLB_STORE_NAME, mode);
    } catch (retryErr) {
      const message = retryErr instanceof Error ? retryErr.message : String(retryErr);
      throw new Error(`Failed to open IndexedDB transaction on store "${WORLD_GLB_STORE_NAME}": ${message}`);
    }
  }

  const store = tx.objectStore(WORLD_GLB_STORE_NAME);

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const fail = (error: Error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };
    const succeed = (val: T) => {
      if (!settled) {
        settled = true;
        resolve(val);
      }
    };

    tx.onerror = () => {
      fail(
        new Error(
          `IndexedDB transaction error on store "${WORLD_GLB_STORE_NAME}": ${tx.error?.message || 'Unknown transaction error'}`
        )
      );
    };

    tx.onabort = () => {
      fail(
        new Error(
          `IndexedDB transaction was aborted on store "${WORLD_GLB_STORE_NAME}": ${tx.error?.message || 'Transaction aborted'}`
        )
      );
    };

    let actionPromise: Promise<T>;
    try {
      actionPromise = action(store, tx);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      try {
        tx.abort();
      } catch {
        // Ignore secondary abort failure
      }
      return fail(new Error(`Operation failed on store "${WORLD_GLB_STORE_NAME}": ${message}`));
    }

    actionPromise
      .then((res) => {
        // Wait for transaction commit to ensure durability
        tx.oncomplete = () => {
          succeed(res);
        };
      })
      .catch((err) => {
        try {
          tx.abort();
        } catch {
          // Ignore secondary abort failure
        }
        fail(err instanceof Error ? err : new Error(String(err)));
      });
  });
}

/**
 * Validates a user-supplied GLB file, parses it to generate a 4:3 PNG thumbnail,
 * and packages the asset metadata into a WorldGlbAsset structure ready for persistence.
 *
 * Dynamically imports the thumbnail renderer module to prevent Three.js and GLTFLoader
 * from being bundled into initial app startup.
 *
 * @param file The input File object selected by the user
 * @param id The stable caller-provided asset identifier
 * @returns Promise resolving to the validated WorldGlbAsset
 */
export async function prepareWorldGlbAsset(file: File, id: string): Promise<WorldGlbAsset> {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('A valid non-empty asset ID must be provided.');
  }

  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new Error('A valid File instance must be provided to prepareWorldGlbAsset.');
  }

  const normalizedFileName = (file.name || '').trim();
  if (!normalizedFileName.toLowerCase().endsWith('.glb')) {
    throw new Error(
      `Unsupported file extension for "${normalizedFileName || 'unnamed'}". Only binary glTF (.glb) files are supported.`
    );
  }

  if (file.size <= 0) {
    throw new Error(`Invalid GLB file "${normalizedFileName}": file is empty (0 bytes).`);
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read file data from "${normalizedFileName}": ${message}`);
  }

  // Binary validation: standard glTF 2.0 binary header is 12 bytes
  if (buffer.byteLength < 12) {
    throw new Error(
      `Invalid GLB binary: "${normalizedFileName}" is ${buffer.byteLength} bytes, smaller than the required 12-byte header.`
    );
  }

  const dataView = new DataView(buffer);
  const magic = dataView.getUint32(0, true);
  const GLTF_MAGIC = 0x46546c67; // 'glTF' in ASCII little-endian

  if (magic !== GLTF_MAGIC) {
    throw new Error(
      `Invalid GLB binary: "${normalizedFileName}" lacks the glTF magic header (found 0x${magic.toString(16)}, expected 0x${GLTF_MAGIC.toString(16)}).`
    );
  }

  const version = dataView.getUint32(4, true);
  if (version !== 2) {
    throw new Error(
      `Unsupported GLB version ${version} in "${normalizedFileName}". Only glTF 2.0 binary (.glb) files are supported.`
    );
  }

  const declaredLength = dataView.getUint32(8, true);
  if (declaredLength !== buffer.byteLength) {
    throw new Error(
      `Malformed GLB binary: "${normalizedFileName}" header declares ${declaredLength} bytes, but file buffer is ${buffer.byteLength} bytes.`
    );
  }

  // Dynamically import world-glb-preview so Three.js & GLTFLoader are only loaded on demand
  const {
    renderGlbThumbnail,
    WORLD_GLB_THUMBNAIL_VERSION,
  } = await import('./world-glb-preview.ts');

  const thumbnail = await renderGlbThumbnail(buffer);

  // Preserve model as a Blob with standard gltf-binary MIME type
  const modelBlob = file.type === 'model/gltf-binary' ? file : new Blob([buffer], { type: 'model/gltf-binary' });

  return {
    id: id.trim(),
    fileName: normalizedFileName,
    fileSize: file.size,
    model: modelBlob,
    thumbnail,
    thumbnailVersion: WORLD_GLB_THUMBNAIL_VERSION,
  };
}

/**
 * Persists a WorldGlbAsset into native IndexedDB.
 *
 * @param asset The WorldGlbAsset to store
 */
export async function saveWorldGlbAsset(asset: WorldGlbAsset): Promise<void> {
  if (!asset || typeof asset !== 'object') {
    throw new Error('A valid WorldGlbAsset object must be provided to saveWorldGlbAsset.');
  }
  if (!asset.id || typeof asset.id !== 'string' || asset.id.trim().length === 0) {
    throw new Error('WorldGlbAsset must contain a non-empty string "id".');
  }
  if (!asset.fileName || typeof asset.fileName !== 'string') {
    throw new Error('WorldGlbAsset must contain a valid string "fileName".');
  }
  if (typeof asset.fileSize !== 'number' || asset.fileSize < 0) {
    throw new Error('WorldGlbAsset must contain a valid non-negative number "fileSize".');
  }
  if (!asset.model || !(asset.model instanceof Blob)) {
    throw new Error('WorldGlbAsset must contain a valid Blob for "model".');
  }
  if (!asset.thumbnail || !(asset.thumbnail instanceof Blob)) {
    throw new Error('WorldGlbAsset must contain a valid Blob for "thumbnail".');
  }

  const record: WorldGlbAsset = {
    id: asset.id.trim(),
    fileName: asset.fileName,
    fileSize: asset.fileSize,
    model: asset.model,
    thumbnail: asset.thumbnail,
    thumbnailVersion: asset.thumbnailVersion,
  };

  await withStore('readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      let request: IDBRequest;
      try {
        request = store.put(record);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reject(new Error(`Failed to put asset "${record.id}" into IndexedDB: ${message}`));
      }

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to save GLB asset "${record.id}" to store "${WORLD_GLB_STORE_NAME}": ${request.error?.message || 'Unknown request error'}`
          )
        );
      };
    });
  });
}

/**
 * Loads a WorldGlbAsset from native IndexedDB by ID.
 * Returns null if no record exists for the given ID.
 *
 * @param id The unique asset identifier
 * @returns Promise resolving to WorldGlbAsset or null
 */
export async function loadWorldGlbAsset(id: string): Promise<WorldGlbAsset | null> {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('A valid non-empty asset ID must be provided to loadWorldGlbAsset.');
  }

  const cleanId = id.trim();

  const asset = await withStore('readonly', (store) => {
    return new Promise<WorldGlbAsset | null>((resolve, reject) => {
      let request: IDBRequest;
      try {
        request = store.get(cleanId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reject(new Error(`Failed to request asset "${cleanId}" from IndexedDB: ${message}`));
      }

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        const isBlobLike = (val: unknown): val is Blob =>
          val instanceof Blob ||
          (typeof val === 'object' && val !== null && 'size' in val && typeof (val as Blob).slice === 'function');

        if (
          typeof result.id === 'string' &&
          typeof result.fileName === 'string' &&
          typeof result.fileSize === 'number' &&
          isBlobLike(result.model) &&
          isBlobLike(result.thumbnail)
        ) {
          resolve({
            id: result.id,
            fileName: result.fileName,
            fileSize: result.fileSize,
            model: result.model,
            thumbnail: result.thumbnail,
            thumbnailVersion: result.thumbnailVersion
          });
        } else {
          reject(
            new Error(
              `Persisted record for asset "${cleanId}" in IndexedDB is corrupted or has an invalid structure.`
            )
          );
        }
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to load GLB asset "${cleanId}" from store "${WORLD_GLB_STORE_NAME}": ${request.error?.message || 'Unknown request error'}`
          )
        );
      };
    });
  });

  if (!asset) return null;
  const { WORLD_GLB_THUMBNAIL_VERSION } = await import('./world-glb-preview.ts');
  if ((asset.thumbnailVersion ?? 0) >= WORLD_GLB_THUMBNAIL_VERSION) return asset;

  try {
    const { renderGlbThumbnail } = await import('./world-glb-preview.ts');
    const thumbnail = await renderGlbThumbnail(await asset.model.arrayBuffer());
    const refreshedAsset = {
      ...asset,
      thumbnail,
      thumbnailVersion: WORLD_GLB_THUMBNAIL_VERSION,
    };
    await saveWorldGlbAsset(refreshedAsset);
    return refreshedAsset;
  } catch {
    // Keep the existing thumbnail if this browser cannot regenerate it.
    return asset;
  }
}

/**
 * Deletes a WorldGlbAsset from native IndexedDB by ID.
 *
 * @param id The unique asset identifier
 */
export async function deleteWorldGlbAsset(id: string): Promise<void> {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('A valid non-empty asset ID must be provided to deleteWorldGlbAsset.');
  }

  const cleanId = id.trim();

  await withStore('readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      let request: IDBRequest;
      try {
        request = store.delete(cleanId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reject(new Error(`Failed to issue delete request for asset "${cleanId}": ${message}`));
      }

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to delete GLB asset "${cleanId}" from store "${WORLD_GLB_STORE_NAME}": ${request.error?.message || 'Unknown request error'}`
          )
        );
      };
    });
  });
}
