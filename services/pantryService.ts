import type { PantryItem } from '../types';
import { safeSetLocalStorage } from '../utils/storage';

const PANTRY_KEY = 'ai-recipe-generator-pantry';

/**
 * Validates and recovers a raw pantry list array, typically from an import.
 * @param data The raw data to validate.
 * @returns An object with the cleaned list and an optional recovery notification.
 */
export const validateAndRecover = (data: unknown): { list: PantryItem[]; recoveryNotification?: string } => {
  if (!Array.isArray(data)) {
    return { list: [], recoveryNotification: "Az importált kamra lista formátuma érvénytelen volt." };
  }

  let hadCorruptedEntries = false;
  const validList: PantryItem[] = [];
  
  data.forEach((item: any, index: number) => {
    if (typeof item === 'object' && item !== null && typeof item.text === 'string' && typeof item.dateAdded === 'string') {
      validList.push(item);
    } else {
      console.warn(`Skipping corrupted pantry item during import at index ${index}.`, item);
      hadCorruptedEntries = true;
    }
  });

  return {
    list: validList,
    recoveryNotification: hadCorruptedEntries ? 'Néhány sérült kamraelemet kihagytunk az importálás során.' : undefined
  };
};

/**
 * Reads the list from localStorage, attempting to recover from partial corruption.
 * @returns An object containing the list data and an optional recovery notification.
 * @throws An error if data is unrecoverably corrupted.
 */
export const getPantry = (): { list: PantryItem[]; recoveryNotification?: string } => {
  const listJson = localStorage.getItem(PANTRY_KEY);
  if (!listJson) {
      return { list: [] };
  }

  let parsedData: any;
  try {
    parsedData = JSON.parse(listJson);
  } catch (error) {
    console.error("Fatal JSON parsing error for pantry list. Backing up corrupted data.", error);
    localStorage.setItem(`${PANTRY_KEY}_corrupted_${Date.now()}`, listJson);
    throw new Error('A kamra listája súlyosan sérült, ezért nem sikerült betölteni. A sérült adatokról biztonsági mentés készült.');
  }
  
  const { list, recoveryNotification } = validateAndRecover(parsedData);
  
  if (recoveryNotification) {
    console.log("Saving cleaned pantry list back to localStorage to prevent future errors.");
    savePantry(list);
  }

  return { list, recoveryNotification };
};

// Saves the list to localStorage.
export const savePantry = (list: PantryItem[]): void => {
  safeSetLocalStorage(PANTRY_KEY, list);
};

/**
 * Merges an imported pantry list into the current one, avoiding duplicates.
 * @param currentList The existing pantry list.
 * @param importedList The list from the imported file.
 * @returns An object with the merged list and the count of new items added.
 */
export const mergePantries = (currentList: PantryItem[], importedList: PantryItem[]): { mergedList: PantryItem[]; newItemsCount: number } => {
  const newList = [...currentList];
  let newItemsCount = 0;
  
  const existingItems = new Set(currentList.map(item => item.text.toLowerCase().trim()));

  importedList.forEach(item => {
    if (item.text.trim() && !existingItems.has(item.text.toLowerCase().trim())) {
      newList.push(item);
      newItemsCount++;
    }
  });

  return { mergedList: newList, newItemsCount };
};


// Adds one or more items, avoiding duplicates.
export const addItems = (itemsToAdd: string[]): PantryItem[] => {
  const { list: currentList } = getPantry();
  const existingItems = new Set(currentList.map(item => item.text.toLowerCase().trim()));
  
  const newItems: PantryItem[] = itemsToAdd
    .filter(item => item.trim() && !existingItems.has(item.toLowerCase().trim()))
    .map(text => ({ text, dateAdded: new Date().toISOString() }));

  if (newItems.length > 0) {
    const updatedList = [...currentList, ...newItems];
    savePantry(updatedList);
    return updatedList;
  }
  return currentList;
};

// Updates a single item.
export const updateItem = (index: number, updatedItem: PantryItem): PantryItem[] => {
    const { list: currentList } = getPantry();
    if (index >= 0 && index < currentList.length) {
        currentList[index] = updatedItem;
        savePantry(currentList);
    }
    return currentList;
}

// Removes a single item by its index.
export const removeItem = (index: number): PantryItem[] => {
    const { list: currentList } = getPantry();
    const updatedList = currentList.filter((_, i) => i !== index);
    savePantry(updatedList);
    return updatedList;
}

// Removes all items from the list.
export const clearAll = (): PantryItem[] => {
    const emptyList: PantryItem[] = [];
    savePantry(emptyList);
    return emptyList;
}
