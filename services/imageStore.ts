// services/imageStore.ts

const DB_NAME = 'KonyhaMikiImageStore';
const DB_VERSION = 1;
const STORE_NAME = 'images';

/**
 * A robust wrapper that handles opening, transaction, and closing for a single operation.
 * It is slower than a singleton connection but more resilient to unexpected connection closures
 * that can occur in some browser environments.
 * @param mode The transaction mode ('readonly' or 'readwrite').
 * @param callback A function that receives the object store and should return an IDBRequest.
 * @returns A promise that resolves with the result of the IDBRequest.
 */
function dbRequest<T>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        const openRequest = indexedDB.open(DB_NAME, DB_VERSION);

        openRequest.onupgradeneeded = event => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        openRequest.onerror = () => {
            console.error("DB Open Error:", openRequest.error);
            reject(new Error(`Hiba az adatbázis megnyitása közben: ${openRequest.error?.message}`));
        };

        openRequest.onsuccess = () => {
            const db = openRequest.result;
            
            // This event can fire if another tab deletes the DB.
            db.onversionchange = () => {
                db.close();
            };

            const transaction = db.transaction(STORE_NAME, mode);
            const store = transaction.objectStore(STORE_NAME);
            const request = callback(store);
            
            // This variable will hold the result from the successful request.
            let result: T;

            request.onsuccess = () => {
                result = request.result;
            };

            request.onerror = () => {
                // The transaction's onerror handler will catch this and reject the promise.
            };

            transaction.oncomplete = () => {
                db.close();
                resolve(result);
            };

            transaction.onerror = () => {
                console.error("Transaction Error:", transaction.error);
                db.close();
                reject(new Error(`Adatbázis tranzakciós hiba: ${transaction.error?.message}`));
            };
        };
    });
}


/**
 * Saves or updates an image in the database.
 */
export const saveImage = (id: string, imageDataUrl: string): Promise<void> => {
    return dbRequest('readwrite', store => {
        return store.put({ id, data: imageDataUrl });
    }).then(() => {}); // Discard the result (the key) to match Promise<void>
};

/**
 * Retrieves an image from the database.
 */
export const getImage = async (id: string): Promise<string | undefined> => {
    const result = await dbRequest<{id: string, data: string} | undefined>('readonly', store => {
        return store.get(id);
    });
    return result?.data;
};

/**
 * Deletes an image from the database.
 */
export const deleteImage = (id: string): Promise<void> => {
    return dbRequest('readwrite', store => {
        return store.delete(id);
    }).then(() => {});
};

/**
 * Retrieves all images from the database, for backup/export purposes.
 */
export const getAllImages = async (): Promise<Record<string, string>> => {
    const results = await dbRequest<{ id: string, data: string }[]>('readonly', store => {
        return store.getAll();
    });
    
    const images: Record<string, string> = {};
    if (Array.isArray(results)) {
        results.forEach(item => {
            if (item.id && item.data) {
                images[item.id] = item.data;
            }
        });
    }
    return images;
};
