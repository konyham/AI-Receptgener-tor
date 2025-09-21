/**
 * Checks if localStorage is available and writable in the current browser environment.
 * @returns {boolean} Returns true if localStorage can be used, false otherwise.
 */
export const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__test_local_storage_availability__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    // localStorage is not available (e.g., private browsing, security settings)
    return false;
  }
};

/**
 * A robust wrapper for localStorage.setItem that handles potential errors.
 * @param key The key to save data under.
 * @param value The value to save (will be JSON.stringified).
 * @throws An error with a user-friendly message if saving fails.
 */
export const safeSetLocalStorage = (key: string, value: any): void => {
  try {
    const stringifiedValue = JSON.stringify(value);
    window.localStorage.setItem(key, stringifiedValue);
  } catch (error: any) {
    console.error(`Error saving to localStorage with key "${key}"`, error);
    if (error.name === 'QuotaExceededError') {
      throw new Error('A böngésző tárolója megtelt. A mentéshez töröljön elemeket, vagy ürítse a webhely adatait.');
    }
    throw new Error('Ismeretlen hiba történt a mentés közben.');
  }
};
