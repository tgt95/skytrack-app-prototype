import type { MapDataFileRecord } from "@/features/map-data/map-data";

const DATABASE_NAME = "skytrack-mission-studio-world-map-data-v1";
const DATABASE_VERSION = 1;
const STORE_NAME = "world_map_data_assets";

export interface MapDataAsset {
  id: string;
  files: MapDataFileRecord[];
}

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = null;
      reject(
        new Error(request.error?.message || "Map data storage failed to open."),
      );
    };
    request.onblocked = () => {
      databasePromise = null;
      reject(
        new Error(
          "Map data storage is busy in another tab. Close it and try again.",
        ),
      );
    };
  });
  return databasePromise;
}

async function withAssetStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, mode);
  const request = run(transaction.objectStore(STORE_NAME));
  return new Promise((resolve, reject) => {
    let result: T;
    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () =>
      reject(new Error(request.error?.message || "Map data storage failed."));
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () =>
      reject(
        new Error(transaction.error?.message || "Map data storage failed."),
      );
    transaction.onabort = () =>
      reject(
        new Error(
          transaction.error?.message || "Map data storage was interrupted.",
        ),
      );
  });
}

export async function saveMapDataAsset(
  asset: MapDataAsset,
): Promise<void> {
  await withAssetStore("readwrite", (store) => store.put(asset));
}

export async function loadMapDataAsset(
  id: string,
): Promise<MapDataAsset | null> {
  return (await withAssetStore("readonly", (store) => store.get(id))) ?? null;
}

export async function deleteMapDataAsset(id: string): Promise<void> {
  await withAssetStore("readwrite", (store) => store.delete(id));
}
