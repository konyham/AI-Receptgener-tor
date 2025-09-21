import type { ShoppingListItem } from '../types';

const SHOPPING_LIST_KEY = 'ai-recipe-generator-shopping-list';

// Reads the list from localStorage.
export const getShoppingList = (): ShoppingListItem[] => {
  const listJson = localStorage.getItem(SHOPPING_LIST_KEY);
  if (!listJson) {
      return [];
  }

  try {
    const list = JSON.parse(listJson);
    // Add more robust validation for the array and its items.
    if (Array.isArray(list) && list.every(item => typeof item === 'object' && item !== null && 'text' in item && 'checked' in item)) {
        return list;
    }
     throw new Error('Malformed shopping list data structure.');
  } catch (error) {
    console.error("Error parsing shopping list from localStorage. Backing up corrupted data.", error);
    localStorage.setItem(`${SHOPPING_LIST_KEY}_corrupted_${Date.now()}`, listJson);
    // DO NOT remove the corrupted item. This prevents data loss on a parsing error.
    throw new Error('A bevásárlólista sérült, ezért nem sikerült betölteni. A sérült adatokról biztonsági mentés készült, és az eredeti adatok megmaradtak a tárolóban.');
  }
};


// Saves the list to localStorage.
export const saveShoppingList = (list: ShoppingListItem[]): void => {
  try {
    localStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(list));
  } catch (error) {
    console.error("Error saving shopping list to localStorage", error);
  }
};

// Adds one or more items, avoiding duplicates.
export const addItems = (itemsToAdd: string[]): ShoppingListItem[] => {
  const currentList = getShoppingList();
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
    const currentList = getShoppingList();
    if (index >= 0 && index < currentList.length) {
        currentList[index] = updatedItem;
        saveShoppingList(currentList);
    }
    return currentList;
}

// Removes a single item by its index.
export const removeItem = (index: number): ShoppingListItem[] => {
    const currentList = getShoppingList();
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
    const currentList = getShoppingList();
    const updatedList = currentList.filter(item => !item.checked);
    saveShoppingList(updatedList);
    return updatedList;
}