// services/imageStore.ts

const DB_NAME = 'KonyhaMikiImageStore';
const DB_VERSION = 1;
const STORE_NAME = 'images';

/**
 * A helper function to open the database and create the object store if needed.
 * This is the core of the connection management.
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(new Error('Hiba az adatbázis megnyitása közben.'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

/**
 * Saves or updates an image in the database.
 * This function handles the entire lifecycle of opening the DB, running a transaction, and closing it.
 */
export const saveImage = async (id: string, imageDataUrl: string): Promise<void> => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put({ id, data: imageDataUrl });

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        console.error('Transaction error while saving image:', transaction.error);
        db.close();
        reject(new Error('A kép mentése közben tranzakciós hiba történt.'));
      };
    } catch (error) {
        console.error('Error initiating transaction for saveImage:', error);
        db.close();
        reject(error);
    }
  });
};

/**
 * Retrieves an image from the database.
 * This function also handles the full DB open/transaction/close lifecycle.
 */
export const getImage = async (id: string): Promise<string | undefined> => {
  const db = await openDB();
  return new Promise<string | undefined>((resolve, reject) => {
    try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result?.data);
        };

        request.onerror = () => {
          console.error('Error getting image from IndexedDB:', request.error);
          reject(new Error('Hiba a kép betöltése közben.'));
        };

        transaction.oncomplete = () => {
            db.close();
        };

        transaction.onerror = (event) => {
          console.error('Transaction error while getting image:', transaction.error);
          db.close();
          reject(new Error('A kép betöltése közben tranzakciós hiba történt.'));
        };
    } catch (error) {
        console.error('Error initiating transaction for getImage:', error);
        db.close();
        reject(error);
    }
  });
};

/**
 * Deletes an image from the database.
 */
export const deleteImage = async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.delete(id);

            transaction.oncomplete = () => {
                db.close();
                resolve();
            };

            transaction.onerror = () => {
                console.error('Transaction error while deleting image:', transaction.error);
                db.close();
                reject(new Error('A kép törlése közben tranzakciós hiba történt.'));
            };
        } catch (error) {
            console.error('Error initiating transaction for deleteImage:', error);
            db.close();
            reject(error);
        }
    });
};

/**
 * Retrieves all images from the database, for backup/export purposes.
 */
export const getAllImages = async (): Promise<Record<string, string>> => {
  const db = await openDB();
  return new Promise<Record<string, string>>((resolve, reject) => {
    try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const images: Record<string, string> = {};
            if (request.result && Array.isArray(request.result)) {
                request.result.forEach(item => {
                    if (item.id && item.data) {
                        images[item.id] = item.data;
                    }
                });
            }
            resolve(images);
        };

        request.onerror = () => {
            console.error('Error getting all images from IndexedDB:', request.error);
            reject(new Error('Hiba történt az összes kép betöltése közben.'));
        };

        transaction.oncomplete = () => {
            db.close();
        };
        
        transaction.onerror = () => {
            console.error('Transaction error while getting all images:', transaction.error);
            db.close();
            reject(new Error('Az összes kép betöltése közben tranzakciós hiba történt.'));
        };
    } catch (error) {
        console.error('Error initiating transaction for getAllImages:', error);
        db.close();
        reject(error);
    }
  });
};
