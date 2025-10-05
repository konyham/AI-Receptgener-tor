import type { PantryItem, PantryLocation, BackupData } from '../types';
import { PANTRY_LOCATIONS, StorageType } from '../types';
import { safeSetLocalStorage } from '../utils/storage';

const PANTRY_KEY = 'ai-recipe-generator-pantry';

const getDefaultPantry = (): Record<PantryLocation, PantryItem[]> => ({
    Tiszadada: [],
    Vásárosnamény: [],
});

/**
 * Validates and recovers a raw pantry object, typically from an import.
 * @param data The raw data to validate.
 * @returns An object with the cleaned pantry data and an optional recovery notification.
 */
export const validateAndRecover = (data: unknown): { pantry: Record<PantryLocation, PantryItem[]>; recoveryNotification?: string } => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { pantry: getDefaultPantry(), recoveryNotification: "Az importált kamra formátuma érvénytelen volt." };
  }
  
  const validPantry: Record<PantryLocation, PantryItem[]> = getDefaultPantry();
  let hadCorruptedEntries = false;

  for (const location of PANTRY_LOCATIONS) {
    if (Object.prototype.hasOwnProperty.call(data, location)) {
      const items = (data as any)[location];
      if (Array.isArray(items)) {
        const validItems: PantryItem[] = [];
        items.forEach((item: any, index: number) => {
          if (typeof item === 'object' && item !== null && typeof item.text === 'string' && typeof item.dateAdded === 'string') {
            // Migration for old items without storageType
            if (typeof item.storageType === 'undefined') {
                item.storageType = StorageType.PANTRY;
            }
            validItems.push(item);
          } else {
            console.warn(`Skipping corrupted pantry item during import at index ${index} in location "${location}".`, item);
            hadCorruptedEntries = true;
          }
        });
        if (validItems.length > 0) {
          validPantry[location] = validItems;
        }
      } else {
        console.warn(`Skipping corrupted location "${location}" during import (not an array).`, items);
        hadCorruptedEntries = true;
      }
    }
  }

  return {
    pantry: validPantry,
    recoveryNotification: hadCorruptedEntries ? 'Néhány sérült kamraelemet kihagytunk az importálás során.' : undefined
  };
};

/**
 * Reads the pantry from localStorage, migrating old format if necessary.
 * @returns An object containing the pantry data and an optional recovery notification.
 * @throws An error if data is unrecoverably corrupted.
 */
export const getPantry = (): { pantry: Record<PantryLocation, PantryItem[]>; recoveryNotification?: string } => {
  const listJson = localStorage.getItem(PANTRY_KEY);
  if (!listJson) {
      return { pantry: getDefaultPantry() };
  }

  let parsedData: any;
  try {
    parsedData = JSON.parse(listJson);
  } catch (error) {
    console.error("Fatal JSON parsing error for pantry list. Backing up corrupted data.", error);
    localStorage.setItem(`${PANTRY_KEY}_corrupted_${Date.now()}`, listJson);
    throw new Error('A kamra listája súlyosan sérült, ezért nem sikerült betölteni. A sérült adatokról biztonsági mentés készült.');
  }

  // Migration from old format (array) to new format (object with locations)
  if (Array.isArray(parsedData)) {
    console.log("Migrating old pantry format to new multi-location format.");
    const migratedData: Record<PantryLocation, PantryItem[]> = {
        Tiszadada: parsedData.map(item => ({...item, storageType: item.storageType || StorageType.PANTRY})),
        Vásárosnamény: [],
    };
    savePantry(migratedData);
    return { pantry: migratedData, recoveryNotification: "A kamra adatformátuma frissült az új, több helyszínes kezeléshez." };
  }
  
  const { pantry, recoveryNotification } = validateAndRecover(parsedData);
  
  if (recoveryNotification) {
    console.log("Saving cleaned pantry object back to localStorage to prevent future errors.");
    savePantry(pantry);
  }

  return { pantry, recoveryNotification };
};

// Saves the pantry to localStorage.
export const savePantry = (pantry: Record<PantryLocation, PantryItem[]>): void => {
  safeSetLocalStorage(PANTRY_KEY, pantry);
};

/**
 * Merges an imported pantry object into the current one, avoiding duplicates.
 * @param currentPantry The existing pantry object.
 * @param importedPantry The object from the imported file.
 * @returns An object with the merged pantry and the count of new items added.
 */
export const mergePantries = (currentPantry: Record<PantryLocation, PantryItem[]>, importedPantry: Record<PantryLocation, PantryItem[]>): { mergedPantry: Record<PantryLocation, PantryItem[]>; newItemsCount: number } => {
  const newPantry = JSON.parse(JSON.stringify(currentPantry));
  let newItemsCount = 0;
  
  for (const location of PANTRY_LOCATIONS) {
      const existingItems = new Set((newPantry[location] || []).map(item => item.text.toLowerCase().trim()));
      const itemsToMerge = importedPantry[location] || [];

      itemsToMerge.forEach(item => {
          if (item.text.trim() && !existingItems.has(item.text.toLowerCase().trim())) {
              if (!newPantry[location]) {
                newPantry[location] = [];
              }
              newPantry[location].push(item);
              newItemsCount++;
          }
      });
  }

  return { mergedPantry: newPantry, newItemsCount };
};

// Adds one or more items to a specific location, avoiding duplicates.
export const addItems = (itemsToAdd: string[], location: PantryLocation, date: string, storageType: StorageType): Record<PantryLocation, PantryItem[]> => {
  const { pantry: currentPantry } = getPantry();
  const currentList = currentPantry[location] || [];
  const existingItems = new Set(currentList.map(item => item.text.toLowerCase().trim()));
  
  const newItems: PantryItem[] = itemsToAdd
    .filter(item => item.trim() && !existingItems.has(item.toLowerCase().trim()))
    .map(text => ({ 
        text, 
        dateAdded: date,
        storageType: storageType 
    }));

  if (newItems.length > 0) {
    const updatedList = [...currentList, ...newItems];
    const updatedPantry = { ...currentPantry, [location]: updatedList };
    savePantry(updatedPantry);
    return updatedPantry;
  }
  return currentPantry;
};

// Updates a single item at a specific location.
export const updateItem = (index: number, updatedItem: PantryItem, location: PantryLocation): Record<PantryLocation, PantryItem[]> => {
    const { pantry: currentPantry } = getPantry();
    const currentList = currentPantry[location] || [];
    if (index >= 0 && index < currentList.length) {
        currentList[index] = updatedItem;
        const updatedPantry = { ...currentPantry, [location]: currentList };
        savePantry(updatedPantry);
        return updatedPantry;
    }
    return currentPantry;
}

// Removes a single item by its index from a specific location.
export const removeItem = (index: number, location: PantryLocation): Record<PantryLocation, PantryItem[]> => {
    const { pantry: currentPantry } = getPantry();
    const currentList = currentPantry[location] || [];
    const updatedList = currentList.filter((_, i) => i !== index);
    const updatedPantry = { ...currentPantry, [location]: updatedList };
    savePantry(updatedPantry);
    return updatedPantry;
}

// Removes all items from a specific location.
export const clearAll = (location: PantryLocation): Record<PantryLocation, PantryItem[]> => {
    const { pantry: currentPantry } = getPantry();
    const updatedPantry = { ...currentPantry, [location]: [] };
    savePantry(updatedPantry);
    return updatedPantry;
}