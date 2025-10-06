// services/imageStore.ts

const DB_NAME = 'KonyhaMikiImageStore';
const DB_VERSION = 1;
const STORE_NAME = 'images';

let db: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(new Error('Hiba az adatbázis megnyitása közben.'));
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveImage = async (id: string, imageDataUrl: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
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
