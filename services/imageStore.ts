// services/imageStore.ts

const DB_NAME = 'KonyhaMikiImageStore';
const DB_VERSION = 1;
const STORE_NAME = 'images';

let db: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  // If we have a valid, open connection, return it immediately.
  if (db) {
    return Promise.resolve(db);
  }

  // If a connection attempt is already in progress, return that promise to avoid multiple connection attempts.
  if (dbPromise) {
    return dbPromise;
  }

  // Start a new connection attempt.
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      dbPromise = null; // Clear the promise to allow for a retry on the next call.
      reject(new Error('Hiba az adatbázis megnyitása közben.'));
    };

    request.onsuccess = () => {
      db = request.result;
      // Set up a handler for when the connection unexpectedly closes.
      db.onclose = () => {
        console.warn('IndexedDB connection closed unexpectedly. It will be reopened on the next request.');
        db = null; // Invalidate the connection variable so a new one will be created.
      };
      dbPromise = null; // Clear the promise, as the connection is now established.
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
};


export const saveImage = async (id: string, imageDataUrl: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.onabort = () => {
        console.error('Transaction aborted while saving image:', transaction.error);
        reject(new Error('A kép mentése közben a tranzakció megszakadt.'));
    };
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ id, data: imageDataUrl });

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Error saving image to IndexedDB:', request.error);
      reject(new Error('Hiba a kép mentése közben.'));
    };
  });
};

export const getImage = async (id: string): Promise<string | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    transaction.onabort = () => {
        console.error('Transaction aborted while getting image:', transaction.error);
        reject(new Error('A kép betöltése közben a tranzakció megszakadt.'));
    };
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.data);
      } else {
        resolve(undefined);
      }
    };
    request.onerror = () => {
      console.error('Error getting image from IndexedDB:', request.error);
      reject(new Error('Hiba a kép betöltése közben.'));
    };
  });
};

export const deleteImage = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.onabort = () => {
        console.error('Transaction aborted while deleting image:', transaction.error);
        reject(new Error('A kép törlése közben a tranzakció megszakadt.'));
    };
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Error deleting image from IndexedDB:', request.error);
      reject(new Error('Hiba a kép törlése közben.'));
    };
  });
};

export const getAllImages = async (): Promise<Record<string, string>> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        transaction.onabort = () => {
            console.error('Transaction aborted while getting all images:', transaction.error);
            reject(new Error('Az összes kép betöltése közben a tranzakció megszakadt.'));
        };
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const imageMap: Record<string, string> = {};
            request.result.forEach(item => {
                imageMap[item.id] = item.data;
            });
            resolve(imageMap);
        };
        request.onerror = () => {
            console.error('Error getting all images from IndexedDB:', request.error);
            reject(new Error('Hiba az összes kép betöltése közben.'));
        };
    });
};