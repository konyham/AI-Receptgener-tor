// services/imageStore.ts

const DB_NAME = 'KonyhaMikiImageStore';
const DB_VERSION = 1;
const STORE_NAME = 'images';

/**
 * A robust way to get a database instance.
 * It memoizes the promise to avoid multiple open requests concurrently.
 */
let dbPromise: Promise<IDBDatabase> | null = null;
const getDB = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                dbPromise = null; // Reset on error
                reject(new Error('Hiba az adatbázis megnyitása közben.'));
            };

            request.onsuccess = () => {
                const db = request.result;
                // Handle unexpected closing
                db.onclose = () => {
                    console.warn('IndexedDB connection closed unexpectedly. It will be reopened on next request.');
                    dbPromise = null;
                };
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const dbInstance = (event.target as IDBOpenDBRequest).result;
                if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                    dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    }
    return dbPromise;
};

/**
 * Executes a database transaction.
 * @param mode The transaction mode ('readonly' or 'readwrite').
 * @param callback The function to execute within the transaction. It receives the object store.
 * @returns A promise that resolves when the transaction is complete.
 */
const executeTransaction = <T>(
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | void> => {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await getDB();
            const transaction = db.transaction(STORE_NAME, mode);
            const store = transaction.objectStore(STORE_NAME);

            let request: IDBRequest | undefined;
            const result = callback(store);
            if (result instanceof IDBRequest) {
                request = result;
            }

            transaction.oncomplete = () => {
                if (request) {
                    resolve(request.result);
                } else {
                    resolve();
                }
            };

            transaction.onerror = () => {
                console.error('Transaction error:', transaction.error);
                reject(transaction.error);
            };
        } catch (error) {
            console.error('Failed to start transaction:', error);
            reject(error);
        }
    });
};


/**
 * Saves or updates an image in the database.
 */
export const saveImage = (id: string, imageDataUrl: string): Promise<void> => {
    return executeTransaction('readwrite', (store) => {
        store.put({ id, data: imageDataUrl });
    }) as Promise<void>;
};

/**
 * Retrieves an image from the database.
 */
export const getImage = async (id: string): Promise<string | undefined> => {
    const result = await executeTransaction('readonly', (store) => {
        return store.get(id);
    });
    // The result of a `get` transaction is the record itself.
    return (result as { id: string, data: string } | undefined)?.data;
};

/**
 * Deletes an image from the database.
 */
export const deleteImage = (id: string): Promise<void> => {
    return executeTransaction('readwrite', (store) => {
        store.delete(id);
    }) as Promise<void>;
};

/**
 * Retrieves all images from the database, for backup/export purposes.
 */
export const getAllImages = async (): Promise<Record<string, string>> => {
    const results = (await executeTransaction('readonly', (store) => {
        return store.getAll();
    })) as { id: string, data: string }[];

    const images: Record<string, string> = {};
    if (results && Array.isArray(results)) {
        results.forEach(item => {
            if (item.id && item.data) {
                images[item.id] = item.data;
            }
        });
    }
    return images;
};
