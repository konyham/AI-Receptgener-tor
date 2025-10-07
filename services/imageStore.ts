// services/imageStore.ts

const DB_NAME = 'KonyhaMikiImageStore';
const DB_VERSION = 1;
const STORE_NAME = 'images';

/**
 * A helper function to handle the entire DB operation lifecycle for each request.
 * This "stateless" approach is more resilient to browser-specific connection management bugs.
 * @param mode The transaction mode ('readonly' or 'readwrite').
 * @param operation A function that receives an object store and performs an action (e.g., get, put).
 * @returns A promise that resolves with the result of the IDBRequest.
 */
function performDbOperation<T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        let db: IDBDatabase | null = null;
        const openRequest = indexedDB.open(DB_NAME, DB_VERSION);

        openRequest.onupgradeneeded = event => {
            const dbInstance = (event.target as IDBOpenDBRequest).result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        openRequest.onerror = () => {
            console.error("DB Open Error:", openRequest.error);
            reject(new Error(`Hiba az adatbázis megnyitása közben: ${openRequest.error?.message}`));
        };

        openRequest.onsuccess = () => {
            db = openRequest.result;
            let transaction: IDBTransaction;

            try {
                transaction = db.transaction(STORE_NAME, mode);
            } catch (error) {
                console.error("Transaction creation error:", error);
                db.close();
                reject(error);
                return;
            }

            const store = transaction.objectStore(STORE_NAME);
            const request = operation(store);

            transaction.oncomplete = () => {
                db?.close();
                resolve(request.result);
            };

            transaction.onerror = () => {
                console.error("Transaction Error:", transaction.error);
                db?.close();
                reject(new Error(`Adatbázis tranzakciós hiba: ${transaction.error?.message}`));
            };
            
            transaction.onabort = () => {
                console.warn("Transaction Aborted:", transaction.error);
                db?.close();
                reject(new Error(`Adatbázis tranzakció megszakítva: ${transaction.error?.message}`));
            };
        };
        
        openRequest.onblocked = () => {
            console.error("Database open request is blocked.");
            reject(new Error("Az adatbázis-kapcsolat blokkolva van. Kérjük, zárja be az alkalmazás többi példányát."));
        };
    });
}

/**
 * Saves or updates an image in the database.
 */
export const saveImage = (id: string, imageDataUrl: string): Promise<void> => {
    // The result of a 'put' is the key (IDBValidKey), but we want to resolve with void.
    // We cast the promise to `Promise<any>` and then chain a `.then()` to return a `Promise<void>`.
    return (performDbOperation<any>(
        'readwrite',
        store => store.put({ id, data: imageDataUrl })
    )).then(() => Promise.resolve());
};

/**
 * Retrieves an image from the database.
 */
export const getImage = async (id: string): Promise<string | undefined> => {
    const result = await performDbOperation<{ id: string, data: string } | undefined>(
        'readonly',
        store => store.get(id)
    );
    return result?.data;
};

/**
 * Deletes an image from the database.
 */
export const deleteImage = (id: string): Promise<void> => {
    return performDbOperation<void>(
        'readwrite',
        store => store.delete(id)
    );
};

/**
 * Retrieves all images from the database, for backup/export purposes.
 */
export const getAllImages = async (): Promise<Record<string, string>> => {
    const results = await performDbOperation<{ id: string, data: string }[]>(
        'readonly',
        store => store.getAll()
    );
    
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
