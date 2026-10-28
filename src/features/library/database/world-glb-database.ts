export const WORLD_GLB_DB_NAME = "skytrack-mission-studio-world-glb-v1";
export const WORLD_GLB_DB_VERSION = 1;
export const WORLD_GLB_STORE_NAME = "world_glb_assets";

let cachedDb: IDBDatabase | null = null;
let dbOpeningPromise: Promise<IDBDatabase> | null = null;

function getIndexedDBFactory(): IDBFactory {
  const factory =
    typeof window !== "undefined" && window.indexedDB
      ? window.indexedDB
      : typeof globalThis !== "undefined"
        ? globalThis.indexedDB
        : null;
  if (!factory) {
    throw new Error(
      "IndexedDB storage is not available or is disabled in this environment.",
    );
  }
  return factory;
}

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

function openDatabase(): Promise<IDBDatabase> {
  if (cachedDb) return Promise.resolve(cachedDb);
  if (dbOpeningPromise) return dbOpeningPromise;

  let openingPromise: Promise<IDBDatabase>;
  openingPromise = new Promise<IDBDatabase>((resolve, reject) => {
    let wasBlocked = false;
    const clearOpening = () => {
      if (dbOpeningPromise === openingPromise) dbOpeningPromise = null;
    };
    let factory: IDBFactory;
    try {
      factory = getIndexedDBFactory();
    } catch (error) {
      dbOpeningPromise = null;
      reject(error);
      return;
    }

    let request: IDBOpenDBRequest;
    try {
      request = factory.open(WORLD_GLB_DB_NAME, WORLD_GLB_DB_VERSION);
    } catch (error) {
      dbOpeningPromise = null;
      const message = error instanceof Error ? error.message : String(error);
      reject(
        new Error(
          `Failed to initiate opening IndexedDB "${WORLD_GLB_DB_NAME}": ${message}`,
        ),
      );
      return;
    }

    request.onblocked = () => {
      wasBlocked = true;
      clearOpening();
      reject(
        new Error(
          `IndexedDB "${WORLD_GLB_DB_NAME}" open operation is blocked. Please close other open tabs using this application.`,
        ),
      );
    };
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WORLD_GLB_STORE_NAME)) {
        db.createObjectStore(WORLD_GLB_STORE_NAME, { keyPath: "id" });
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
      db.onversionchange = closeWorldGlbDatabase;
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
      reject(
        new Error(
          `Failed to open IndexedDB "${WORLD_GLB_DB_NAME}": ${request.error?.message || "Unknown open error"}`,
        ),
      );
    };
  });
  dbOpeningPromise = openingPromise;
  return openingPromise;
}

export async function withWorldGlbStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, transaction: IDBTransaction) => Promise<T>,
): Promise<T> {
  let db = await openDatabase();
  let transaction: IDBTransaction;
  try {
    transaction = db.transaction(WORLD_GLB_STORE_NAME, mode);
  } catch {
    closeWorldGlbDatabase();
    try {
      db = await openDatabase();
      transaction = db.transaction(WORLD_GLB_STORE_NAME, mode);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to open IndexedDB transaction on store "${WORLD_GLB_STORE_NAME}": ${message}`,
      );
    }
  }

  const store = transaction.objectStore(WORLD_GLB_STORE_NAME);
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const succeed = (value: T) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    transaction.onerror = () =>
      fail(
        new Error(
          `IndexedDB transaction error on store "${WORLD_GLB_STORE_NAME}": ${transaction.error?.message || "Unknown transaction error"}`,
        ),
      );
    transaction.onabort = () =>
      fail(
        new Error(
          `IndexedDB transaction was aborted on store "${WORLD_GLB_STORE_NAME}": ${transaction.error?.message || "Transaction aborted"}`,
        ),
      );

    let actionPromise: Promise<T>;
    try {
      actionPromise = action(store, transaction);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        transaction.abort();
      } catch {
        // Ignore secondary abort failure
      }
      fail(
        new Error(
          `Operation failed on store "${WORLD_GLB_STORE_NAME}": ${message}`,
        ),
      );
      return;
    }

    actionPromise
      .then((value) => {
        transaction.oncomplete = () => succeed(value);
      })
      .catch((error: unknown) => {
        try {
          transaction.abort();
        } catch {
          // Ignore secondary abort failure
        }
        fail(error instanceof Error ? error : new Error(String(error)));
      });
  });
}
