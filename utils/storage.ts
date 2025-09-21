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
