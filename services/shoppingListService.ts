import type { ShoppingListItem } from '../types';
import { safeSetLocalStorage } from '../utils/storage';

const SHOPPING_LIST_KEY = 'ai-recipe-generator-shopping-list';

/**
 * Reads the list from localStorage, attempting to recover from partial corruption.
 * @returns An object containing the list data and an optional recovery notification.
 * @throws An error if data is unrecoverably corrupted.
 */
export const getShoppingList = (): { list: ShoppingListItem[]; recoveryNotification?: string } => {
  const listJson = localStorage.getItem(SHOPPING_LIST_KEY);
  if (!listJson) {
      return { list: [] };
  }

  let parsedData: any;
  try {
    parsedData = JSON.parse(listJson);
  } catch (error) {
    console.error("Fatal JSON parsing error for shopping list. Backing up corrupted data.", error);
    localStorage.setItem(`${SHOPPING_LIST_KEY}_corrupted_${Date.now()}`, listJson);
    throw new Error('A bevásárlólista súlyosan sérült, ezért nem sikerült betölteni. A sérült adatokról biztonsági mentés készült.');
  }
  
  if (!Array.isArray(parsedData)) {
    console.error("Malformed shopping list data structure (not an array). Backing up corrupted data.");
    localStorage.setItem(`${SHOPPING_LIST_KEY}_corrupted_${Date.now()}`, listJson);
    throw new Error('A bevásárlólista formátuma érvénytelen. A sérült adatokról biztonsági mentés készült.');
  }

  let hadCorruptedEntries = false;
  const validList: ShoppingListItem[] = [];
  
  parsedData.forEach((item: any, index: number) => {
    if (typeof item === 'object' && item !== null && typeof item.text === 'string' && typeof item.checked === 'boolean') {
      validList.push(item);
    } else {
      console.warn(`Skipping corrupted shopping list item at index ${index}.`, item);
      hadCorruptedEntries = true;
    }
  });

  if (hadCorruptedEntries) {
    console.log("Saving cleaned shopping list back to localStorage to prevent future errors.");
    saveShoppingList(validList);
    return {
      list: validList,
      recoveryNotification: 'A bevásárlólista részben sérült volt, de a menthető tételeket sikeresen helyreállítottuk.'
    };
  }

  return { list: parsedData };
};


// Saves the list to localStorage.
export const saveShoppingList = (list: ShoppingListItem[]): void => {
  safeSetLocalStorage(SHOPPING_LIST_KEY, list);
};

// Adds one or more items, avoiding duplicates.
export const addItems = (itemsToAdd: string[]): ShoppingListItem[] => {
  const { list: currentList } = getShoppingList();
  const existingItems = new Set(currentList.map(item => item.text.toLowerCase().trim()));
  
  const newItems: ShoppingListItem[] = itemsToAdd
    .filter(item => item.trim() && !existingItems.has(item.toLowerCase().trim()))
    .map(text => ({ text, checked: false }));

  if (newItems.length > 0) {
    const updatedList = [...currentList, ...newItems];
    saveShoppingList(updatedList);
    return updatedList;
  }
  return currentList;
};

// Updates a single item (e.g., toggles its 'checked' state).
export const updateItem = (index: number, updatedItem: ShoppingListItem): ShoppingListItem[] => {
    const { list: currentList } = getShoppingList();
    if (index >= 0 && index < currentList.length) {
        currentList[index] = updatedItem;
        saveShoppingList(currentList);
    }
    return currentList;
}

// Removes a single item by its index.
export const removeItem = (index: number): ShoppingListItem[] => {
    const { list: currentList } = getShoppingList();
    const updatedList = currentList.filter((_, i) => i !== index);
    saveShoppingList(updatedList);
    return updatedList;
}

// Removes all items from the list.
export const clearAll = (): ShoppingListItem[] => {
    const emptyList: ShoppingListItem[] = [];
    saveShoppingList(emptyList);
    return emptyList;
}

// Removes only the items that have been checked off.
export const clearChecked = (): ShoppingListItem[] => {
    const { list: currentList } = getShoppingList();
    const updatedList = currentList.filter(item => !item.checked);
    saveShoppingList(updatedList);
    return updatedList;
}