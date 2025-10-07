// services/imageStore.ts

const DB_NAME = 'KonyhaMikiImageStore';
const DB_VERSION = 1;
const STORE_NAME = 'images';

/**
 * A helper function to create the object store during a version upgrade.
 * This is the ONLY place where the database structure can be modified.
 * @param event The onupgradeneeded event.
 */
const upgradeDatabase = (event: IDBVersionChangeEvent) => {
  console.log('IndexedDB: Upgrade needed.');
  const db = (event.target as IDBOpenDBRequest).result;
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    console.log(`IndexedDB: Object store '${STORE_NAME}' created.`);
  }
};


/**
 * Saves or updates an image in the database.
 * This function opens a new connection, performs a single transaction, and closes the connection.
 */
export const saveImage = (id: string, imageDataUrl: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(DB_NAME, DB_VERSION);
    
    openRequest.onupgradeneeded = upgradeDatabase;

    openRequest.onsuccess = () => {
      const db = openRequest.result;
      
      // Gracefully handle attempts to open this DB with a lower version number from another tab.
      db.onversionchange = () => {
        db.close();
        console.warn("IndexedDB version change detected, closing connection for saveImage.");
        reject(new Error("A database update is pending, please reload the page."));
      };

      // Safeguard against transaction starting before upgrade is complete.
      if (!db.objectStoreNames.contains(STORE_NAME)) {
          console.error("saveImage: Object store not found after connection. This indicates a serious timing issue.");
          db.close();
          reject(new Error("Database object store not found. Please try reloading the page."));
          return;
      }
      
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };

        transaction.onerror = () => {
          console.error('saveImage transaction error:', transaction.error);
          db.close();
          reject(transaction.error);
        };

        const store = transaction.objectStore(STORE_NAME);
        store.put({ id, data: imageDataUrl });

      } catch (error) {
        console.error('Failed to create saveImage transaction:', error);
        db.close();
        reject(error);
      }
    };

    openRequest.onerror = () => {
      console.error('saveImage connection error:', openRequest.error);
      reject(openRequest.error);
    };
  });
};


/**
 * Retrieves an image from the database.
 * This function opens a new connection, performs a single transaction, and closes the connection.
 */
export const getImage = (id: string): Promise<string | undefined> => {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(DB_NAME, DB_VERSION);

    openRequest.onupgradeneeded = upgradeDatabase;

    openRequest.onsuccess = () => {
      const db = openRequest.result;
      let resultData: string | undefined;

      db.onversionchange = () => {
        db.close();
        console.warn("IndexedDB version change detected, closing connection for getImage.");
        reject(new Error("A database update is pending, please reload the page."));
      };
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
          console.error("getImage: Object store not found after connection.");
          db.close();
          // We resolve with undefined because not finding the store is like not finding the image.
          // This prevents a hard crash if the DB is in a weird state.
          resolve(undefined);
          return;
      }

      try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        
        transaction.oncomplete = () => {
          db.close();
          resolve(resultData);
        };

        transaction.onerror = () => {
          console.error('getImage transaction error:', transaction.error);
          db.close();
          reject(transaction.error);
        };

        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          if (request.result) {
            resultData = request.result.data;
          }
        };

      } catch (error) {
        console.error('Failed to create getImage transaction:', error);
        db.close();
        reject(error);
      }
    };

    openRequest.onerror = () => {
      console.error('getImage connection error:', openRequest.error);
      reject(openRequest.error);
    };
  });
};

/**
 * Deletes an image from the database.
 * This function opens a new connection, performs a single transaction, and closes the connection.
 */
export const deleteImage = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(DB_NAME, DB_VERSION);

    openRequest.onupgradeneeded = upgradeDatabase;

    openRequest.onsuccess = () => {
      const db = openRequest.result;
      
      db.onversionchange = () => {
        db.close();
        console.warn("IndexedDB version change detected, closing connection for deleteImage.");
        reject(new Error("A database update is pending, please reload the page."));
      };

      if (!db.objectStoreNames.contains(STORE_NAME)) {
          console.error("deleteImage: Object store not found after connection.");
          db.close();
          resolve(); // Resolve gracefully, as there's nothing to delete.
          return;
      }

      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };

        transaction.onerror = () => {
          console.error('deleteImage transaction error:', transaction.error);
          db.close();
          reject(transaction.error);
        };

        const store = transaction.objectStore(STORE_NAME);
        store.delete(id);

      } catch (error) {
        console.error('Failed to create deleteImage transaction:', error);
        db.close();
        reject(error);
      }
    };

    openRequest.onerror = () => {
      console.error('deleteImage connection error:', openRequest.error);
      reject(openRequest.error);
    };
  });
};

/**
 * Retrieves all images from the database, for backup/export purposes.
 * This function opens a new connection, performs a single transaction, and closes the connection.
 */
export const getAllImages = (): Promise<Record<string, string>> => {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(DB_NAME, DB_VERSION);
    
    openRequest.onupgradeneeded = upgradeDatabase;
    
    openRequest.onsuccess = () => {
      const db = openRequest.result;
      let allData: { id: string, data: string }[] = [];
      
      db.onversionchange = () => {
        db.close();
        console.warn("IndexedDB version change detected, closing connection for getAllImages.");
        reject(new Error("A database update is pending, please reload the page."));
      };
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
          console.error("getAllImages: Object store not found after connection.");
          db.close();
          resolve({}); // Resolve with empty object if store doesn't exist.
          return;
      }
      
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        
        transaction.oncomplete = () => {
          db.close();
          const images: Record<string, string> = {};
          allData.forEach(item => {
            if (item.id && item.data) {
              images[item.id] = item.data;
            }
          });
          resolve(images);
        };
        
        transaction.onerror = () => {
          console.error('getAllImages transaction error:', transaction.error);
          db.close();
          reject(transaction.error);
        };
        
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
          if (Array.isArray(request.result)) {
            allData = request.result;
          }
        };

      } catch (error) {
        console.error('Failed to create getAllImages transaction:', error);
        db.close();
        reject(error);
      }
    };
    
    openRequest.onerror = () => {
      console.error('getAllImages connection error:', openRequest.error);
      reject(openRequest.error);
    };
  });
};
